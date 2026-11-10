import type {
  MembershipDailyConsumptionBucketResponse,
  MembershipHourlyConsumptionBucketResponse,
  MembershipMonthlyConsumptionBucketResponse,
  SupplyConsumptionBucketResponse,
  SupplyHourlyConsumptionBucketResponse,
  SupplyResponse,
} from "../../api/models";
import { CAPTURED_SUPPLIES_BY_USER_ID } from "../../test/capturedResponses";
import {
  DOCUMENTED_MEMBERSHIP_DAILY_CONSUMPTION_BUCKET,
  DOCUMENTED_MEMBERSHIP_HOURLY_CONSUMPTION_BUCKET,
  DOCUMENTED_MEMBERSHIP_MONTHLY_CONSUMPTION_BUCKET,
  DOCUMENTED_SUPPLY_CONSUMPTION_BUCKET,
  DOCUMENTED_SUPPLY_HOURLY_CONSUMPTION_BUCKET,
} from "../../test/documentedResponses";
import { localIsoAt } from "../../utils/zonedTime";

// The consumption series buckets shared by the evolution and historical
// analysis specs. No vi.mock here: each spec mocks its own modules.

const [CAPTURED_PLANT_SUPPLY] = CAPTURED_SUPPLIES_BY_USER_ID;

/** One of the caller's own supplies, from the captured listing with the fields a case needs overridden. */
export const HOME: SupplyResponse = { ...CAPTURED_PLANT_SUPPLY, id: "own-home", name: "Casa", code: "ES0021000000000001AA", plant: null };

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
