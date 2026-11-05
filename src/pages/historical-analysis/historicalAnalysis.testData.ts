import type {
  MembershipDailyConsumptionBucketResponse,
  MembershipEnergyMetricsResponse,
  MembershipHourlyConsumptionBucketResponse,
  MembershipMonthlyConsumptionBucketResponse,
  SupplyConsumptionBucketResponse,
  SupplyEnergyMetricsResponse,
  SupplyHourlyConsumptionBucketResponse,
  SupplyResponse,
} from "../../api/models";
import { CAPTURED_MEMBERSHIP_ENERGY_METRICS_LATEST_PUBLISHED_MONTH, CAPTURED_SUPPLIES_BY_USER_ID } from "../../test/capturedResponses";
import {
  DOCUMENTED_MEMBERSHIP_DAILY_CONSUMPTION_BUCKET,
  DOCUMENTED_MEMBERSHIP_ENERGY_METRICS,
  DOCUMENTED_MEMBERSHIP_HOURLY_CONSUMPTION_BUCKET,
  DOCUMENTED_MEMBERSHIP_MONTHLY_CONSUMPTION_BUCKET,
  DOCUMENTED_SUPPLY_CONSUMPTION_BUCKET,
  DOCUMENTED_SUPPLY_ENERGY_METRICS,
  DOCUMENTED_SUPPLY_HOURLY_CONSUMPTION_BUCKET,
} from "../../test/documentedResponses";
import { buildCurrentUser } from "../../test/fixtures";
import { localIsoAt } from "../home/member/monthBounds";

// Data shared by the historical analysis page specs. No vi.mock here: each
// spec mocks its own modules.

const CAPTURED = CAPTURED_MEMBERSHIP_ENERGY_METRICS_LATEST_PUBLISHED_MONTH;
const [CAPTURED_PLANT_SUPPLY] = CAPTURED_SUPPLIES_BY_USER_ID;

export const COMMUNITY_ID = CAPTURED_PLANT_SUPPLY.community.id;
export const OWNER_ID = CAPTURED_PLANT_SUPPLY.user!.id;

export const member = () => buildCurrentUser({ id: OWNER_ID, memberships: { [COMMUNITY_ID]: "COMMUNITY_MEMBER" } });

/** Two of the caller's own supplies, from the captured listing with the fields a case needs overridden. */
export const HOME: SupplyResponse = { ...CAPTURED_PLANT_SUPPLY, id: "own-home", name: "Casa", code: "ES0021000000000001AA", plant: null };
export const GARAGE: SupplyResponse = { ...CAPTURED_PLANT_SUPPLY, id: "own-garage", name: "Garaje", code: "ES0021000000000002AA", plant: null };
/** A plant's own supply of the caller's: the captured one, keeping its plant, with a readable name. */
export const PLANT_SUPPLY: SupplyResponse = { ...CAPTURED_PLANT_SUPPLY, id: "own-plant", name: "Cubierta del polideportivo", code: "ES0021000000000003AA" };

/** A month's bounds as the server writes them for LATEST_PUBLISHED_MONTH. */
export const AUGUST_2026 = { startDate: "2026-08-01T00:00:00+02:00", endDate: "2026-09-01T00:00:00+02:00" };
export const SEPTEMBER_2026 = { startDate: "2026-09-01T00:00:00+02:00", endDate: "2026-10-01T00:00:00+02:00" };
export const DECEMBER_2025 = { startDate: "2025-12-01T00:00:00+01:00", endDate: "2026-01-01T00:00:00+01:00" };
export const NOTHING_PUBLISHED = { startDate: null, endDate: null };

type Period = { startDate: string | null; endDate: string | null };

/**
 * The membership's latest published month. Derived from the captured response,
 * whose August 2026 is the only month captured: `period` is replaced for the
 * other anchors, and the figures, which this page does not show yet, are kept.
 */
export function membershipLatest(period: Period): MembershipEnergyMetricsResponse {
  return { ...CAPTURED, period };
}

/**
 * A supply's latest published month. No supply response is captured; this is
 * derived from the captured membership response, with the membership-only
 * coverage fields left out and the supply named.
 */
export function supplyLatest(supply: SupplyResponse, period: Period): SupplyEnergyMetricsResponse {
  const { hoursWithData, expectedHours } = CAPTURED.coverage;
  return {
    ...CAPTURED,
    coverage: { hoursWithData, expectedHours },
    period,
    supply: { id: supply.id, code: supply.code, name: supply.name },
  };
}

/**
 * The period's figures for "Todos mis puntos" (#249). Derived from the
 * response documented in api-docs.json, which is no capture and whose fields
 * do not agree with each other, so no spec may rely on one field following
 * from another. Overridden here: complete coverage and no plant supply left
 * out, the plain case every other one departs from by its own overrides.
 */
export function derivedMembershipFigures(overrides: Partial<MembershipEnergyMetricsResponse> = {}): MembershipEnergyMetricsResponse {
  const documented = DOCUMENTED_MEMBERSHIP_ENERGY_METRICS;
  return {
    ...documented,
    coverage: { ...documented.coverage, hoursWithData: documented.coverage.expectedHours, suppliesWithData: documented.coverage.supplyCount },
    selfConsumptionRatioBasis: { ...documented.selfConsumptionRatioBasis, excludedPlantSupplyCount: 0 },
    ...overrides,
  };
}

/**
 * A single supply's figures for the period (#249), derived from the documented
 * supply response like derivedMembershipFigures: the supply named, complete
 * coverage, and no plant supply left out, which a single supply never does.
 */
export function derivedSupplyFigures(supply: SupplyResponse, overrides: Partial<SupplyEnergyMetricsResponse> = {}): SupplyEnergyMetricsResponse {
  const documented = DOCUMENTED_SUPPLY_ENERGY_METRICS;
  return {
    ...documented,
    supply: { id: supply.id, code: supply.code, name: supply.name },
    coverage: { ...documented.coverage, hoursWithData: documented.coverage.expectedHours },
    selfConsumptionRatioBasis: { ...documented.selfConsumptionRatioBasis, excludedPlantSupplyCount: 0 },
    ...overrides,
  };
}

// ─── Consumption series (#250) ───────────────────────────────────────────────
// Buckets derived from the documented ones (no capture exists), each dated by
// the caller. A spec overrides every figure it asserts on.

const NOTHING_STORED = { selfConsumptionKWh: 0, gridImportKWh: 0, surplusKWh: 0, assignedProductionKWh: 0 } as const;

/** A day of "Todos mis puntos": complete by default, every supply stored a record. */
export function membershipDay(
  date: string,
  overrides: Partial<MembershipDailyConsumptionBucketResponse> = {},
): MembershipDailyConsumptionBucketResponse {
  const documented = DOCUMENTED_MEMBERSHIP_DAILY_CONSUMPTION_BUCKET;
  return { ...documented, suppliesWithData: documented.supplyCount, date, ...overrides };
}

/** A day no supply stored a record on, as the server answers it: zeros, and null savings. */
export const membershipGapDay = (date: string) =>
  membershipDay(date, { ...NOTHING_STORED, savingsEur: null, tariffSource: null, suppliesWithData: 0 });

/** A day only some of the supplies stored a record on. */
export const membershipPartialDay = (date: string, suppliesWithData = 1, supplyCount = 2) =>
  membershipDay(date, { suppliesWithData, supplyCount });

/** A month of "Todos mis puntos": complete by default. */
export function membershipMonth(
  date: string,
  overrides: Partial<MembershipMonthlyConsumptionBucketResponse> = {},
): MembershipMonthlyConsumptionBucketResponse {
  const documented = DOCUMENTED_MEMBERSHIP_MONTHLY_CONSUMPTION_BUCKET;
  return { ...documented, suppliesWithData: documented.supplyCount, date, ...overrides };
}

/** A month no supply stored a record in. */
export const membershipGapMonth = (date: string) =>
  membershipMonth(date, { ...NOTHING_STORED, savingsEur: null, tariffSource: null, suppliesWithData: 0 });

/** A day or a month of a single supply, with a stored record. */
export function supplyBucket(date: string, overrides: Partial<SupplyConsumptionBucketResponse> = {}): SupplyConsumptionBucketResponse {
  return { ...DOCUMENTED_SUPPLY_CONSUMPTION_BUCKET, date, ...overrides };
}

/** A supply day with no stored record, as the server answers it: zeros and 0.00 €, told apart only by obtainMethod. */
export const supplyGapDay = (date: string) => supplyBucket(date, { ...NOTHING_STORED, savingsEur: 0, obtainMethod: null });

/** A supply day whose records were stored and measured zero. */
export const supplyMeasuredZeroDay = (date: string) => supplyBucket(date, { ...NOTHING_STORED, savingsEur: 0 });

// ─── Hourly series (#378) ────────────────────────────────────────────────────
// Buckets derived from the documented ones, each starting at the caller's
// `startsAt`. Their `date` and `time` stay the documented ones, which name
// another day and hour: an hourly bucket is matched by `startsAt` alone.

const MS_PER_HOUR = 3_600_000;

/**
 * The `startsAt` of every whole hour from `startDate` up to `endDate`, which
 * is excluded, as the backend writes them: stepped on the instant line and
 * written with the offset in force at each, so the day the clocks go back
 * has two distinct 02:00 hours.
 */
export function hoursOf(startDate: string, endDate: string): string[] {
  const hours: string[] = [];
  for (let instant = Date.parse(startDate); instant < Date.parse(endDate); instant += MS_PER_HOUR) hours.push(localIsoAt(instant));
  return hours;
}

/** An hour of "Todos mis puntos": complete by default, every supply stored a record. */
export function membershipHour(
  startsAt: string,
  overrides: Partial<MembershipHourlyConsumptionBucketResponse> = {},
): MembershipHourlyConsumptionBucketResponse {
  const documented = DOCUMENTED_MEMBERSHIP_HOURLY_CONSUMPTION_BUCKET;
  return { ...documented, suppliesWithData: documented.supplyCount, startsAt, ...overrides };
}

/** An hour no supply stored a record in, as the server answers it: zeros, and null savings. */
export const membershipGapHour = (startsAt: string) =>
  membershipHour(startsAt, { ...NOTHING_STORED, savingsEur: null, tariffSource: null, suppliesWithData: 0 });

/** An hour only some of the supplies stored a record in. */
export const membershipPartialHour = (startsAt: string, suppliesWithData = 1, supplyCount = 2) =>
  membershipHour(startsAt, { suppliesWithData, supplyCount });

/** An hour of a single supply, with a stored record. */
export function supplyHour(startsAt: string, overrides: Partial<SupplyHourlyConsumptionBucketResponse> = {}): SupplyHourlyConsumptionBucketResponse {
  return { ...DOCUMENTED_SUPPLY_HOURLY_CONSUMPTION_BUCKET, startsAt, ...overrides };
}

/** A supply hour with no stored record, as the server answers it: zeros and 0.00 €, told apart only by obtainMethod. */
export const supplyGapHour = (startsAt: string) => supplyHour(startsAt, { ...NOTHING_STORED, savingsEur: 0, obtainMethod: null });

/** A supply hour whose records were stored and measured zero. */
export const supplyMeasuredZeroHour = (startsAt: string) => supplyHour(startsAt, { ...NOTHING_STORED, savingsEur: 0 });
