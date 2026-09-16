import type { PartitionCoefficientResponse, PlantReferenceResponse } from "../../api/models";
import { formatCalendarDate, SHORT_CALENDAR_DATE } from "../../utils/formatCalendarDate";

/**
 * One plant's slice of a supply's timeline. `plant` is carried whole rather
 * than as a bare id so the renderer never has to look the name up again.
 */
export interface CoefficientHistoryGroup {
  plant: PlantReferenceResponse;
  periods: PartitionCoefficientResponse[];
}

/**
 * Periods the distributor has actually applied.
 *
 * A pending period (`validFrom === null`) was authored inside a draft and has
 * never been in force, so it has no place on a timeline of what *was* true.
 * The backend already withholds them from non-admins, which is precisely why
 * this filter has to exist on the client too: an admin genuinely receives
 * them, and without this the same screen would read differently depending on
 * who opened it.
 */
export function selectAppliedPeriods(
  periods: readonly PartitionCoefficientResponse[] | undefined,
): PartitionCoefficientResponse[] {
  return (periods ?? []).filter((period) => period.validFrom !== null && period.validFrom !== undefined);
}

/**
 * A period is active when it has started and has no end. Both halves matter:
 * a pending period also has `validTo === null`, so testing the end alone
 * would mark something that has never been in force as current.
 */
export function isActivePeriod(period: PartitionCoefficientResponse): boolean {
  return (
    period.validFrom !== null && period.validFrom !== undefined && (period.validTo === null || period.validTo === undefined)
  );
}

/**
 * Groups a supply's periods by the plant they belong to, newest first within
 * each group.
 *
 * Newest-first matches the agreement timeline the admin has just come from
 * (the backend orders agreements `createdAt DESC` and SharingAgreementTimeline
 * does no sorting of its own), so the two lists in the same flow read in the
 * same direction. Note this is the opposite of the endpoint's own ascending
 * order -- the sort here is deliberate, not incidental.
 *
 * Group order follows first appearance in the source, which is the endpoint's
 * ascending order, so it is stable across renders and independent of the
 * within-group sort.
 */
export function groupCoefficientHistoryByPlant(
  periods: readonly PartitionCoefficientResponse[] | undefined,
): CoefficientHistoryGroup[] {
  const groups = new Map<string, CoefficientHistoryGroup>();

  for (const period of periods ?? []) {
    const existing = groups.get(period.plant.id);
    if (existing) existing.periods.push(period);
    else groups.set(period.plant.id, { plant: period.plant, periods: [period] });
  }

  for (const group of groups.values()) {
    group.periods.sort((a, b) => (b.validFrom ?? "").localeCompare(a.validFrom ?? ""));
  }

  return [...groups.values()];
}

/**
 * The span a period covers, in the app's existing vocabulary.
 *
 * `validTo` is printed raw, with no minus-one-day adjustment, because that is
 * already how the agreement table presents the end of coverage: the backend
 * sets `endDate` to exactly `validTo` and it is formatted straight through.
 * Shifting it here would make the same instant read as two different days on
 * two screens.
 */
export function formatCoefficientPeriodRange(period: PartitionCoefficientResponse): string {
  const from = formatCalendarDate(period.validFrom ?? undefined, SHORT_CALENDAR_DATE);
  if (period.validTo === null || period.validTo === undefined) return `Desde ${from}`;
  return `${from} → ${formatCalendarDate(period.validTo, SHORT_CALENDAR_DATE)}`;
}
