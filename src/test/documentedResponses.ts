import type {
  MembershipDailyConsumptionBucketResponse,
  MembershipEnergyMetricsResponse,
  MembershipMonthlyConsumptionBucketResponse,
  SupplyConsumptionBucketResponse,
  SupplyEnergyMetricsResponse,
} from "../api/models";

/**
 * Responses assembled from the per-field `example` values the backend
 * documents in `api-docs.json` (the lucoenergia/conluz commit in `.api-ref`),
 * for endpoints with no capture taken against a backend containing
 * lucoenergia/conluz#411 yet (#249), and one bucket of each consumption series
 * the historical analysis charts read (#250).
 *
 * These are NOT captures, and that is why they do not live in
 * `capturedResponses.ts`. Each value is the schema's own example, so its type
 * and its written shape are the server's, but the examples were written one
 * field at a time: the objects are not internally consistent (`amountEur` is
 * not `selfConsumptionKWh` times `eurPerKWh`, the membership coverage counts
 * three supplies while the basis excludes one). No spec may rely on agreement
 * between two fields of these objects.
 *
 * Never edit a value here. `documentedResponses.spec.ts` rebuilds each object
 * from `api-docs.json` and fails when the two differ. A case that needs other
 * values spreads one of these with explicit overrides, under a name that says
 * it is derived.
 */

/** `GET /api/v1/communities/{communityId}/memberships/{userId}/energy-metrics`, from its schema examples. */
export const DOCUMENTED_MEMBERSHIP_ENERGY_METRICS: MembershipEnergyMetricsResponse = {
  period: {
    startDate: "2024-01-01T00:00:00+01:00",
    endDate: "2024-02-01T00:00:00+01:00",
  },
  coverage: {
    hoursWithData: 1450,
    expectedHours: 2232,
    supplyCount: 3,
    suppliesWithData: 2,
  },
  energy: {
    totalConsumptionKWh: 1155,
    gridImportKWh: 670,
    selfConsumptionKWh: 485,
    surplusKWh: 239,
    assignedProductionKWh: 724,
  },
  savings: {
    amountEur: 72.75,
    tariffSource: "ESTIMATE",
    estimatedPrice: {
      eurPerKWh: 0.15,
    },
  },
  selfSufficiencyRatio: 0.42,
  selfConsumptionRatio: 0.67,
  selfConsumptionRatioStatus: "AVAILABLE",
  selfConsumptionRatioBasis: {
    selfConsumptionKWh: 485,
    assignedProductionKWh: 724,
    excludedPlantSupplyCount: 1,
  },
};

/** `GET /api/v1/supplies/{supplyId}/energy-metrics`, from its schema examples. */
export const DOCUMENTED_SUPPLY_ENERGY_METRICS: SupplyEnergyMetricsResponse = {
  supply: {
    id: "ebbe60d1-f9db-455c-8c2d-c34ae7a1c23c",
    code: "ES0031300119158001DL0Y",
    name: "My house",
  },
  period: {
    startDate: "2024-01-01T00:00:00+01:00",
    endDate: "2024-02-01T00:00:00+01:00",
  },
  coverage: {
    hoursWithData: 3721,
    expectedHours: 3744,
  },
  energy: {
    totalConsumptionKWh: 1155,
    gridImportKWh: 670,
    selfConsumptionKWh: 485,
    surplusKWh: 239,
    assignedProductionKWh: 724,
  },
  savings: {
    amountEur: 72.75,
    tariffSource: "ESTIMATE",
    estimatedPrice: {
      eurPerKWh: 0.15,
    },
  },
  selfSufficiencyRatio: 0.42,
  selfConsumptionRatio: 0.67,
  selfConsumptionRatioStatus: "AVAILABLE",
  selfConsumptionRatioBasis: {
    selfConsumptionKWh: 485,
    assignedProductionKWh: 724,
    excludedPlantSupplyCount: 1,
  },
};

/**
 * One bucket of `GET /api/v1/communities/{communityId}/memberships/{userId}/consumption/daily`
 * (lucoenergia/conluz#410), from its schema examples. Partial as documented:
 * two of three supplies stored a record.
 */
export const DOCUMENTED_MEMBERSHIP_DAILY_CONSUMPTION_BUCKET: MembershipDailyConsumptionBucketResponse = {
  assignedProductionKWh: 4.25,
  date: "2024/01/15",
  gridImportKWh: 7.75,
  savingsEur: 0.38,
  selfConsumptionKWh: 2.5,
  suppliesWithData: 2,
  supplyCount: 3,
  surplusKWh: 1.75,
  tariffSource: "ESTIMATE",
  time: "00:00",
};

/** One bucket of `GET /api/v1/communities/{communityId}/memberships/{userId}/consumption/monthly`, from its schema examples. */
export const DOCUMENTED_MEMBERSHIP_MONTHLY_CONSUMPTION_BUCKET: MembershipMonthlyConsumptionBucketResponse = {
  assignedProductionKWh: 64.25,
  date: "2024/01/01",
  gridImportKWh: 107.75,
  savingsEur: 6.38,
  selfConsumptionKWh: 42.5,
  suppliesWithData: 2,
  supplyCount: 3,
  surplusKWh: 21.75,
  tariffSource: "ESTIMATE",
  time: "00:00",
};

/**
 * One bucket of `GET /api/v1/supplies/{supplyId}/consumption/daily` and
 * `/consumption/monthly`, which share the schema, from its examples.
 */
export const DOCUMENTED_SUPPLY_CONSUMPTION_BUCKET: SupplyConsumptionBucketResponse = {
  assignedProductionKWh: 8.75,
  cups: "ES0031406912345678JN0F",
  date: "2023/04/10",
  gridImportKWh: 12.5,
  obtainMethod: "Real",
  savingsEur: 0.83,
  selfConsumptionKWh: 5.5,
  surplusKWh: 3.25,
  tariffSource: "ESTIMATE",
  time: "00:00",
};
