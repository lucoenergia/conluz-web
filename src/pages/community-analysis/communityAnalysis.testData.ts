import type {
  CommunityDailyEnergyBucketResponse,
  CommunityEnergyMetricsResponse,
  CommunityHourlyEnergyBucketResponse,
  CommunityMonthlyEnergyBucketResponse,
  CommunityPlantEnergyResponse,
} from "../../api/models";
import { buildCommunity, buildCurrentUser } from "../../test/fixtures";

// Data shared by the community energy page specs (#403). No vi.mock here:
// each spec mocks its own modules. No response is captured or documented for
// these endpoints yet, so every fixture is written out, typed to its generated
// model, and a spec overrides every figure it asserts on.

export const COMMUNITY_ID = "community-luco";
export const OTHER_COMMUNITY_ID = "community-vega";
export const COMMUNITY = buildCommunity({ id: COMMUNITY_ID, name: "Luco Energía" });
export const OTHER_COMMUNITY = buildCommunity({ id: OTHER_COMMUNITY_ID, name: "Vega Solar" });

/** An active member of both communities. */
export const member = () =>
  buildCurrentUser({ id: "member-ana", memberships: { [COMMUNITY_ID]: "COMMUNITY_MEMBER", [OTHER_COMMUNITY_ID]: "COMMUNITY_MEMBER" } });

/** A month's bounds as the server writes them for LATEST_PUBLISHED_MONTH. */
export const SEPTEMBER_2026 = { startDate: "2026-09-01T00:00:00+02:00", endDate: "2026-10-01T00:00:00+02:00" };
export const JULY_2026 = { startDate: "2026-07-01T00:00:00+02:00", endDate: "2026-08-01T00:00:00+02:00" };
export const NOTHING_PUBLISHED = { startDate: null, endDate: null };

export const PABELLON: CommunityPlantEnergyResponse = {
  plant: { id: "plant-pabellon", name: "Planta Pabellón" },
  installedPowerKWp: 60,
  productionKWh: 7776.5,
  productionShare: 0.5333,
};
export const ESCUELAS: CommunityPlantEnergyResponse = {
  plant: { id: "plant-escuelas", name: "Planta Escuelas" },
  installedPowerKWp: 37.5,
  productionKWh: 4861.9,
  productionShare: 0.3334,
};
export const LAVADERO: CommunityPlantEnergyResponse = {
  plant: { id: "plant-lavadero", name: "Planta Lavadero" },
  installedPowerKWp: 15,
  productionKWh: 1944.2,
  productionShare: 0.1333,
};

/**
 * A community's metrics for a period: complete coverage, three plants, every
 * figure present. The plain case every other one departs from by its own
 * overrides. No figure follows from another here, so none may be derived.
 */
export function communityMetrics(
  period: { startDate: string | null; endDate: string | null },
  overrides: Partial<CommunityEnergyMetricsResponse> = {},
): CommunityEnergyMetricsResponse {
  return {
    period,
    energy: { productionKWh: 14582.6, selfConsumptionKWh: 8457.9, surplusKWh: 6124.7 },
    selfConsumptionRatio: 0.58,
    surplusRatio: 0.42,
    installedPowerKWp: 112.5,
    coverage: { supplyCount: 14, suppliesWithData: 14 },
    plants: [PABELLON, ESCUELAS, LAVADERO],
    surplusIncome: { amountEur: 367.12, unpricedSurplusKWh: 0 },
    co2Avoided: { amountKg: 1570.4, factorYears: [2025] },
    ...overrides,
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

/** A day of the community series: complete by default, every supply reported. */
export function communityDay(date: string, overrides: Partial<CommunityDailyEnergyBucketResponse> = {}): CommunityDailyEnergyBucketResponse {
  return { date, time: "00:00", selfConsumptionKWh: 280.4, surplusKWh: 190.2, supplyCount: 3, suppliesWithData: 3, ...overrides };
}

/** A day nobody reported: both segments null. */
export const communityGapDay = (date: string) => communityDay(date, { selfConsumptionKWh: null, surplusKWh: null, suppliesWithData: 0 });

/** A month of the community series: complete by default. */
export function communityMonth(date: string, overrides: Partial<CommunityMonthlyEnergyBucketResponse> = {}): CommunityMonthlyEnergyBucketResponse {
  return { date, time: "00:00", selfConsumptionKWh: 8457.9, surplusKWh: 6124.7, supplyCount: 3, suppliesWithData: 3, ...overrides };
}

/** An hour of the community series, at its instant in Madrid's summer time. */
export function communityHour(date: string, hour: number, overrides: Partial<CommunityHourlyEnergyBucketResponse> = {}): CommunityHourlyEnergyBucketResponse {
  const day = date.replaceAll("/", "-");
  return {
    date,
    time: `${pad(hour)}:00`,
    startsAt: `${day}T${pad(hour)}:00:00+02:00`,
    selfConsumptionKWh: 12.5,
    surplusKWh: 4.25,
    supplyCount: 3,
    suppliesWithData: 3,
    ...overrides,
  };
}

/** The 30 days of September 2026, the anchor month, as bucket dates. */
export const SEPTEMBER_DAYS = Array.from({ length: 30 }, (_, index) => `2026/09/${pad(index + 1)}`);

/**
 * A formatted figure as Testing Library reads the page: Intl separates "%" and
 * "€" with a no-break space, which the queries' normaliser turns into a space.
 */
export const plain = (text: string) => text.replace(/\u00a0/g, " ");
