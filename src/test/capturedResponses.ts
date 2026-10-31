import type {
  MembershipEnergyMetricsResponse,
  MembershipMonthlyConsumptionBucketResponse,
  SupplyResponse,
} from "../api/models";

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
 * Field names updated to the renamed contract in #294; values unchanged except assignedProductionKWh.
 */
export const CAPTURED_MEMBERSHIP_MONTHLY_CONSUMPTION: MembershipMonthlyConsumptionBucketResponse[] = [
  { date: "2022/10/01", time: "00:00", gridImportKWh: 0, surplusKWh: 0, assignedProductionKWh: 0, selfConsumptionKWh: 0, savingsEur: null, tariffSource: null, supplyCount: 2, suppliesWithData: 0 },
  { date: "2022/11/01", time: "00:00", gridImportKWh: 0, surplusKWh: 0, assignedProductionKWh: 0, selfConsumptionKWh: 0, savingsEur: null, tariffSource: null, supplyCount: 2, suppliesWithData: 0 },
  { date: "2022/12/01", time: "00:00", gridImportKWh: 0, surplusKWh: 0, assignedProductionKWh: 0, selfConsumptionKWh: 0, savingsEur: null, tariffSource: null, supplyCount: 2, suppliesWithData: 0 },
  { date: "2023/01/01", time: "00:00", gridImportKWh: 0, surplusKWh: 0, assignedProductionKWh: 0, selfConsumptionKWh: 0, savingsEur: null, tariffSource: null, supplyCount: 2, suppliesWithData: 0 },
  { date: "2023/02/01", time: "00:00", gridImportKWh: 0, surplusKWh: 0, assignedProductionKWh: 0, selfConsumptionKWh: 0, savingsEur: null, tariffSource: null, supplyCount: 2, suppliesWithData: 0 },
  { date: "2023/03/01", time: "00:00", gridImportKWh: 0, surplusKWh: 0, assignedProductionKWh: 0, selfConsumptionKWh: 0, savingsEur: null, tariffSource: null, supplyCount: 2, suppliesWithData: 0 },
  { date: "2023/04/01", time: "00:00", gridImportKWh: 0, surplusKWh: 0, assignedProductionKWh: 0, selfConsumptionKWh: 0, savingsEur: null, tariffSource: null, supplyCount: 2, suppliesWithData: 0 },
  { date: "2023/05/01", time: "00:00", gridImportKWh: 0.169, surplusKWh: 0.0, assignedProductionKWh: 0.0, selfConsumptionKWh: 0.0, savingsEur: 0.0, tariffSource: "ESTIMATE", supplyCount: 2, suppliesWithData: 2 },
  { date: "2023/06/01", time: "00:00", gridImportKWh: 94.211004, surplusKWh: 484.14, assignedProductionKWh: 484.14, selfConsumptionKWh: 0.0, savingsEur: 0.0, tariffSource: "ESTIMATE", supplyCount: 2, suppliesWithData: 2 },
  { date: "2023/07/01", time: "00:00", gridImportKWh: 73.008, surplusKWh: 616.642, assignedProductionKWh: 616.642, selfConsumptionKWh: 0.0, savingsEur: 0.0, tariffSource: "ESTIMATE", supplyCount: 2, suppliesWithData: 2 },
  { date: "2023/08/01", time: "00:00", gridImportKWh: 101.187, surplusKWh: 558.787, assignedProductionKWh: 558.787, selfConsumptionKWh: 0.0, savingsEur: 0.0, tariffSource: "ESTIMATE", supplyCount: 2, suppliesWithData: 2 },
  { date: "2023/09/01", time: "00:00", gridImportKWh: 110.658, surplusKWh: 423.894, assignedProductionKWh: 423.894, selfConsumptionKWh: 0.0, savingsEur: 0.0, tariffSource: "ESTIMATE", supplyCount: 2, suppliesWithData: 2 },
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

/**
 * `GET /api/v1/communities/{communityId}/memberships/{userId}/energy-metrics?period=LATEST_PUBLISHED_MONTH`
 * for a member with two supplies, captured on 2026-10-28 from a backend on
 * lucoenergia/conluz b3366ce, the half-open periods of lucoenergia/conluz#409
 * (#324). August 2026 resolved, so `period.endDate` is 00:00 on 1 September,
 * the first instant not included.
 */
export const CAPTURED_MEMBERSHIP_ENERGY_METRICS_LATEST_PUBLISHED_MONTH: MembershipEnergyMetricsResponse = {
  period: {
    startDate: "2026-08-01T00:00:00+02:00",
    endDate: "2026-09-01T00:00:00+02:00",
  },
  coverage: {
    hoursWithData: 1488,
    expectedHours: 1488,
    supplyCount: 2,
    suppliesWithData: 2,
  },
  energy: {
    totalConsumptionKWh: 409.331,
    gridImportKWh: 155.622,
    selfConsumptionKWh: 253.709,
    surplusKWh: 610.711,
    assignedProductionKWh: 864.42,
  },
  savings: {
    amountEur: 38.06,
    tariffSource: "ESTIMATE",
    estimatedPrice: {
      eurPerKWh: 0.15,
    },
  },
  selfSufficiencyRatio: 0.6198137939131192,
  selfConsumptionRatio: 0.2935020018321226,
  // Not in the capture: the backend added these two fields after it was taken.
  // They are derived from the captured figures, for two supplies neither of
  // which is a plant's own supply.
  selfConsumptionRatioStatus: "AVAILABLE",
  selfConsumptionRatioBasis: { selfConsumptionKWh: 253.709, assignedProductionKWh: 864.42, excludedPlantSupplyCount: 0 },
};

/**
 * `GET /api/v1/users/{userId}/supplies` for a member who owns two supplies,
 * each in a different community and each a plant's own supply, captured from a
 * backend containing lucoenergia/conluz#411, which added `plant` (#247).
 */
export const CAPTURED_SUPPLIES_BY_USER_ID: SupplyResponse[] = [
  {
    capabilities: {
      canRead: true,
      canEdit: true,
      canDelete: true,
      canReadPartitionCoefficients: true,
      canCreatePlant: true,
    },
    ownerRecord: {
      fullName: "Member 0",
      memberNumber: 0,
      contactEmail: "member-40b25fbd-4d3f-426a-825f-5686364db282@example.invalid",
      address: "Test address 0",
      phoneNumber: "+34000000000",
    },
    plant: {
      id: "71e6cccb-e323-4e54-a8f5-8bb1a04aca33",
      name: "21088 Luco de Jiloca",
    },
    id: "fd883a4b-a42a-4fbe-ae8b-6b1776ca9476",
    code: "ES0031300806333002ET0F",
    user: {
      id: "40b25fbd-4d3f-426a-825f-5686364db282",
    },
    name: "fd883a4b-a42a-4fbe-ae8b-6b1776ca9476",
    address: "Supply address fd883a4b-a42a-4fbe-ae8b-6b1776ca9476",
    addressRef: null,
    enabled: true,
    contract: {
      validDateFrom: "2023-05-01",
    },
    distributor: {
      name: "EDISTRIBUCIÓN",
      code: "2",
      pointType: 3,
    },
    shelly: {
      macAddress: null,
      id: null,
      mqttPrefix: null,
    },
    community: {
      id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      name: "Default Community",
    },
  },
  {
    capabilities: {
      canRead: true,
      canEdit: true,
      canDelete: true,
      canReadPartitionCoefficients: true,
      canCreatePlant: true,
    },
    ownerRecord: {
      fullName: "Member 0",
      memberNumber: 0,
      contactEmail: "member-40b25fbd-4d3f-426a-825f-5686364db282@example.invalid",
      address: "Test address 0",
      phoneNumber: "+34000000000",
    },
    plant: {
      id: "a8d180a3-3a2c-42b1-90bb-e4535e124f68",
      name: "Planta Solar 1",
    },
    id: "711df0db-dd7b-4ab9-868c-91b14c93ea4d",
    code: "ccc",
    user: {
      id: "40b25fbd-4d3f-426a-825f-5686364db282",
    },
    name: "Planta",
    address: "ccc",
    addressRef: "ccc",
    enabled: true,
    contract: null,
    distributor: null,
    shelly: null,
    community: {
      id: "c2898d8c-c632-4a20-852b-3a009982c565",
      name: "Nueva comunidad",
    },
  },
];
