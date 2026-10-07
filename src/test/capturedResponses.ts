import type { MembershipMonthlyConsumptionBucketResponse } from "../api/models";

/**
 * Responses captured verbatim from the running backend, so a fixture can be
 * checked against what the server actually returns rather than against what
 * the code expects (#219). A hand-written fixture is only typed, and a type
 * says a field is a string, not how the string is written.
 *
 * Never edit a value here to suit a spec. If the backend changes its answer,
 * capture it again and replace the response whole.
 */

/**
 * `GET /api/v1/communities/{communityId}/memberships/{userId}/consumption/monthly`
 * for a member with two supplies, from 2022-10-01T00:00:00+02:00 to
 * 2023-09-30T23:00:00+02:00, captured on 2026-10-07. Seven months have nothing
 * stored and five are stored, so both shapes of a bucket are here.
 */
export const CAPTURED_MEMBERSHIP_MONTHLY_CONSUMPTION: MembershipMonthlyConsumptionBucketResponse[] = [
  { date: "2022/10/01", time: "00:00", consumptionKWh: 0, surplusEnergyKWh: 0, generationEnergyKWh: 0, selfConsumptionEnergyKWh: 0, savingsEur: null, tariffSource: null, supplyCount: 2, suppliesWithData: 0 },
  { date: "2022/11/01", time: "00:00", consumptionKWh: 0, surplusEnergyKWh: 0, generationEnergyKWh: 0, selfConsumptionEnergyKWh: 0, savingsEur: null, tariffSource: null, supplyCount: 2, suppliesWithData: 0 },
  { date: "2022/12/01", time: "00:00", consumptionKWh: 0, surplusEnergyKWh: 0, generationEnergyKWh: 0, selfConsumptionEnergyKWh: 0, savingsEur: null, tariffSource: null, supplyCount: 2, suppliesWithData: 0 },
  { date: "2023/01/01", time: "00:00", consumptionKWh: 0, surplusEnergyKWh: 0, generationEnergyKWh: 0, selfConsumptionEnergyKWh: 0, savingsEur: null, tariffSource: null, supplyCount: 2, suppliesWithData: 0 },
  { date: "2023/02/01", time: "00:00", consumptionKWh: 0, surplusEnergyKWh: 0, generationEnergyKWh: 0, selfConsumptionEnergyKWh: 0, savingsEur: null, tariffSource: null, supplyCount: 2, suppliesWithData: 0 },
  { date: "2023/03/01", time: "00:00", consumptionKWh: 0, surplusEnergyKWh: 0, generationEnergyKWh: 0, selfConsumptionEnergyKWh: 0, savingsEur: null, tariffSource: null, supplyCount: 2, suppliesWithData: 0 },
  { date: "2023/04/01", time: "00:00", consumptionKWh: 0, surplusEnergyKWh: 0, generationEnergyKWh: 0, selfConsumptionEnergyKWh: 0, savingsEur: null, tariffSource: null, supplyCount: 2, suppliesWithData: 0 },
  { date: "2023/05/01", time: "00:00", consumptionKWh: 0.169, surplusEnergyKWh: 0.0, generationEnergyKWh: 0.0, selfConsumptionEnergyKWh: 0.0, savingsEur: 0.0, tariffSource: "ESTIMATE", supplyCount: 2, suppliesWithData: 2 },
  { date: "2023/06/01", time: "00:00", consumptionKWh: 94.211004, surplusEnergyKWh: 484.14, generationEnergyKWh: 0.0, selfConsumptionEnergyKWh: 0.0, savingsEur: 0.0, tariffSource: "ESTIMATE", supplyCount: 2, suppliesWithData: 2 },
  { date: "2023/07/01", time: "00:00", consumptionKWh: 73.008, surplusEnergyKWh: 616.642, generationEnergyKWh: 0.0, selfConsumptionEnergyKWh: 0.0, savingsEur: 0.0, tariffSource: "ESTIMATE", supplyCount: 2, suppliesWithData: 2 },
  { date: "2023/08/01", time: "00:00", consumptionKWh: 101.187, surplusEnergyKWh: 558.787, generationEnergyKWh: 0.0, selfConsumptionEnergyKWh: 0.0, savingsEur: 0.0, tariffSource: "ESTIMATE", supplyCount: 2, suppliesWithData: 2 },
  { date: "2023/09/01", time: "00:00", consumptionKWh: 110.658, surplusEnergyKWh: 423.894, generationEnergyKWh: 0.0, selfConsumptionEnergyKWh: 0.0, savingsEur: 0.0, tariffSource: "ESTIMATE", supplyCount: 2, suppliesWithData: 2 },
];

/**
 * How a captured string is written, as a pattern: every digit stands for any
 * digit, everything else must appear as it is. "2023/05/01" gives
 * /^\d\d\d\d\/\d\d\/\d\d$/, which "2023-05-01" does not match.
 */
export function wireShapeOf(sample: string): RegExp {
  const pattern = sample.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&").replace(/\d/g, "\\d");
  return new RegExp(`^${pattern}$`);
}
