import type { PlantSurplusClaimDayResponse, PlantSurplusClaimHourResponse } from "../../../api/models";
import { buildPlantSurplusClaimDay, buildPlantSurplusClaimHour } from "../../../test/fixtures";

const HOUR_MS = 60 * 60 * 1000;

const MADRID_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const madridDate = (instant: number) => MADRID_DAY.format(new Date(instant));

/**
 * The instants a local day of Madrid starts its hours at, as the contract
 * lists them: 23 on the day the clocks go forward, 25 on the day they go back.
 * Written as UTC instants; the contract adds Madrid's offset, the same instant.
 */
export function madridHourStarts(date: string): string[] {
  // Madrid is one or two hours ahead of UTC: its midnight is 22:00 or 23:00 UTC the day before.
  let instant = Date.parse(`${date}T00:00:00Z`) - 2 * HOUR_MS;
  while (madridDate(instant) !== date) instant += HOUR_MS;
  const starts: string[] = [];
  for (; madridDate(instant) === date; instant += HOUR_MS) starts.push(new Date(instant).toISOString());
  return starts;
}

/** A day of the claim with every hour measured at `surplusKWh`, unless `hour` says otherwise for one. */
export function claimDay(
  date: string,
  overrides: Partial<PlantSurplusClaimDayResponse> = {},
  hour: (startsAt: string, index: number) => Partial<PlantSurplusClaimHourResponse> = () => ({}),
): PlantSurplusClaimDayResponse {
  const hours = madridHourStarts(date).map((startsAt, index) =>
    buildPlantSurplusClaimHour({ startsAt, surplusKWh: 1, ...hour(startsAt, index) }),
  );
  return buildPlantSurplusClaimDay({ date, hours, surplusKWh: hours.length, peakHour: null, ...overrides });
}

/** The days of a month, "2026-10", each built by `claimDay`. */
export function claimMonthDays(month: string): PlantSurplusClaimDayResponse[] {
  const [year, monthOfYear] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year, monthOfYear, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => claimDay(`${month}-${String(index + 1).padStart(2, "0")}`));
}
