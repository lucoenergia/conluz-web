import type { MembershipEnergyMetricsResponse, SupplyEnergyMetricsResponse, SupplyResponse } from "../../api/models";
import { CAPTURED_MEMBERSHIP_ENERGY_METRICS_LATEST_PUBLISHED_MONTH, CAPTURED_SUPPLIES_BY_USER_ID } from "../../test/capturedResponses";
import { buildCurrentUser } from "../../test/fixtures";

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

/** A month's bounds as the server writes them for LATEST_PUBLISHED_MONTH. */
export const AUGUST_2026 = { startDate: "2026-08-01T00:00:00+02:00", endDate: "2026-09-01T00:00:00+02:00" };
export const SEPTEMBER_2026 = { startDate: "2026-09-01T00:00:00+02:00", endDate: "2026-10-01T00:00:00+02:00" };
export const DECEMBER_2026 = { startDate: "2026-12-01T00:00:00+01:00", endDate: "2027-01-01T00:00:00+01:00" };
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
