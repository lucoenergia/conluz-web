import type {
  PlantDailyEnergyBucketResponse,
  PlantEnergyMetricsResponse,
  PlantMonthlyEnergyBucketResponse,
} from "../../../api/models";

// The plant production responses of the plant detail's specs (#406), typed to
// the generated models. The anchor is 8 November 2026, the plant's latest
// complete production day: after the October change, so its bounds carry
// +01:00.

/** The answer to ?period=LATEST_PRODUCTION_DAY: 8 November 2026. */
export const NOVEMBER_8_DAY: PlantEnergyMetricsResponse = {
  period: { startDate: "2026-11-08T00:00:00+01:00", endDate: "2026-11-09T00:00:00+01:00" },
  energy: { productionKWh: 412.5 },
  coverage: { hoursWithData: 24, expectedHours: 24 },
};

/** The answer for a plant with no production day yet. */
export const NO_PRODUCTION_DAY: PlantEnergyMetricsResponse = {
  period: { startDate: null, endDate: null },
  energy: { productionKWh: null },
  coverage: { hoursWithData: 0, expectedHours: 0 },
};

/** A period's metrics, its total and its coverage. */
export function plantMetrics(
  period: { startDate: string | null; endDate: string | null },
  productionKWh: number | null = 2_843.25,
  coverage: { hoursWithData: number; expectedHours: number } = { hoursWithData: 168, expectedHours: 168 },
): PlantEnergyMetricsResponse {
  return { period, energy: { productionKWh }, coverage };
}

/** "2026/11/02" to "2026/11/08": the days of "Últimos 7 días" against 8 November. */
export const LAST_7_DAYS = ["2026/11/02", "2026/11/03", "2026/11/04", "2026/11/05", "2026/11/06", "2026/11/07", "2026/11/08"];

export function plantDay(date: string, overrides: Partial<PlantDailyEnergyBucketResponse> = {}): PlantDailyEnergyBucketResponse {
  return { date, time: "00:00", productionKWh: 410.5, hoursWithData: 24, expectedHours: 24, ...overrides };
}

/** A day the plant stored no record for: a gap, never a zero. */
export const plantGapDay = (date: string) => plantDay(date, { productionKWh: null, hoursWithData: 0 });

export function plantMonth(date: string, overrides: Partial<PlantMonthlyEnergyBucketResponse> = {}): PlantMonthlyEnergyBucketResponse {
  return { date, time: "00:00", productionKWh: 9_120.4, hoursWithData: 744, expectedHours: 744, ...overrides };
}

/** January to November 2026, "Año 2026" against 8 November: November ends on the 8th, and is partial. */
export const YEAR_2026_MONTHS: PlantMonthlyEnergyBucketResponse[] = [
  plantMonth("2026/01/01"),
  plantMonth("2026/02/01", { hoursWithData: 672, expectedHours: 672 }),
  plantMonth("2026/03/01", { hoursWithData: 743, expectedHours: 743 }),
  plantMonth("2026/04/01", { hoursWithData: 720, expectedHours: 720 }),
  plantMonth("2026/05/01"),
  plantMonth("2026/06/01", { hoursWithData: 720, expectedHours: 720 }),
  plantMonth("2026/07/01"),
  plantMonth("2026/08/01"),
  plantMonth("2026/09/01", { hoursWithData: 720, expectedHours: 720 }),
  plantMonth("2026/10/01", { hoursWithData: 745, expectedHours: 745 }),
  plantMonth("2026/11/01", { productionKWh: 2_310.2, hoursWithData: 180, expectedHours: 192 }),
];
