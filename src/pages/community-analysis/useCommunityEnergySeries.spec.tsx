import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useGetCommunityDailyEnergySeries,
  useGetCommunityEnergyMetrics,
  useGetCommunityHourlyEnergySeries,
  useGetCommunityMonthlyEnergySeries,
  type getCommunityDailyEnergySeries,
  type getCommunityEnergyMetrics,
} from "../../api/communities/communities";
import { apiError } from "../../test/apiError";
import { query } from "../../test/queryState";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import type { HistoricalPeriod } from "../../components/period/historicalPeriod";
import { useHistoricalPeriod } from "../../components/period/HistoricalPeriodContext";
import { COMMUNITY_ID, SEPTEMBER_2026, communityDay, communityMetrics } from "./communityAnalysis.testData";
import { useCommunityEnergySeries } from "./useCommunityEnergySeries";
import { useCommunityPeriodMetrics } from "./useCommunityPeriodMetrics";
import { useCommunityAnchorQuery } from "./useCommunityAnchorQuery";

vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityEnergyMetrics: vi.fn(),
  useGetCommunityHourlyEnergySeries: vi.fn(),
  useGetCommunityDailyEnergySeries: vi.fn(),
  useGetCommunityMonthlyEnergySeries: vi.fn(),
}));
vi.mock(import("../../components/period/HistoricalPeriodContext"), async (importOriginal) => ({
  ...(await importOriginal()),
  useHistoricalPeriod: vi.fn(),
}));

const SEPTEMBER: HistoricalPeriod = { ...SEPTEMBER_2026, granularity: "daily", label: "Del 1 al 30 de septiembre de 2026" };
const LAST_12: HistoricalPeriod = {
  startDate: "2025-10-01T00:00:00+02:00",
  endDate: "2026-10-01T00:00:00+02:00",
  granularity: "monthly",
  label: "De octubre de 2025 a septiembre de 2026",
};
const ONE_DAY: HistoricalPeriod = {
  startDate: "2026-09-15T00:00:00+02:00",
  endDate: "2026-09-16T00:00:00+02:00",
  granularity: "hourly",
  label: "15 de septiembre de 2026",
};

type Options = { query?: { enabled?: boolean } } | undefined;
const enabled = (calls: unknown[][], optionsAt: number) =>
  calls.filter((call) => (call[optionsAt] as Options)?.query?.enabled !== false);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGetCommunityEnergyMetrics).mockReturnValue(query.success<typeof getCommunityEnergyMetrics>(communityMetrics(SEPTEMBER_2026)));
  vi.mocked(useGetCommunityHourlyEnergySeries).mockReturnValue(query.disabled());
  vi.mocked(useGetCommunityDailyEnergySeries).mockReturnValue(query.success<typeof getCommunityDailyEnergySeries>([communityDay("2026/09/01")]));
  vi.mocked(useGetCommunityMonthlyEnergySeries).mockReturnValue(query.disabled());
});

describe("UI-CAN-007 the series follows the period's granularity, one request at a time", () => {
  it.each([
    ["hourly", ONE_DAY, [1, 0, 0]],
    ["daily", SEPTEMBER, [0, 1, 0]],
    ["monthly", LAST_12, [0, 0, 1]],
  ] as const)("UI-CAN-007 a %s period asks only the %s series, by the period's bounds", (_name, period, counts) => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(period);
    renderHookWithProviders(() => useCommunityEnergySeries(), { activeCommunityId: COMMUNITY_ID });

    const calls = [useGetCommunityHourlyEnergySeries, useGetCommunityDailyEnergySeries, useGetCommunityMonthlyEnergySeries].map((hook) =>
      enabled(vi.mocked(hook).mock.calls, 2),
    );
    expect(calls.map((list) => (list.length > 0 ? 1 : 0))).toEqual(counts);
    const asked = calls.flat();
    expect(asked.every(([communityId, params]) => communityId === COMMUNITY_ID && JSON.stringify(params) === JSON.stringify({ startDate: period.startDate, endDate: period.endDate }))).toBe(true);
  });

  it("UI-CAN-007 asks nothing while the period is unknown", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(undefined);
    const { result } = renderHookWithProviders(() => useCommunityEnergySeries(), { activeCommunityId: COMMUNITY_ID });

    for (const hook of [useGetCommunityHourlyEnergySeries, useGetCommunityDailyEnergySeries, useGetCommunityMonthlyEnergySeries]) {
      expect(enabled(vi.mocked(hook).mock.calls, 2)).toEqual([]);
    }
    expect(result.current).toEqual({ status: "loading" });
  });

  it("UI-CAN-007 asks nothing while the community is unknown", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(SEPTEMBER);
    renderHookWithProviders(() => useCommunityEnergySeries(), { activeCommunityId: null });

    for (const hook of [useGetCommunityHourlyEnergySeries, useGetCommunityDailyEnergySeries, useGetCommunityMonthlyEnergySeries]) {
      expect(enabled(vi.mocked(hook).mock.calls, 2)).toEqual([]);
    }
  });

  it("UI-CAN-007 a failed series is an error with a retry", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(SEPTEMBER);
    const failed = query.error(apiError(500));
    vi.mocked(useGetCommunityDailyEnergySeries).mockReturnValue(failed);
    const { result } = renderHookWithProviders(() => useCommunityEnergySeries(), { activeCommunityId: COMMUNITY_ID });

    expect(result.current.status).toBe("error");
    if (result.current.status === "error") result.current.retry();
    expect(failed.refetch).toHaveBeenCalled();
  });
});

describe("UI-CAN-003 the period's metrics", () => {
  it("UI-CAN-003 are one request by the period's explicit bounds", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(SEPTEMBER);
    const { result } = renderHookWithProviders(() => useCommunityPeriodMetrics(), { activeCommunityId: COMMUNITY_ID });

    const calls = enabled(vi.mocked(useGetCommunityEnergyMetrics).mock.calls, 2);
    expect(calls.map(([communityId, params]) => [communityId, params])).toEqual([[COMMUNITY_ID, { startDate: SEPTEMBER.startDate, endDate: SEPTEMBER.endDate }]]);
    expect(result.current.status).toBe("ready");
  });

  it("UI-CAN-003 are not asked while the period is unknown", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(undefined);
    renderHookWithProviders(() => useCommunityPeriodMetrics(), { activeCommunityId: COMMUNITY_ID });

    expect(enabled(vi.mocked(useGetCommunityEnergyMetrics).mock.calls, 2)).toEqual([]);
  });
});

describe("UI-CAN-002 the anchor", () => {
  it("UI-CAN-002 asks the community's latest published month, and nothing before the community is known", () => {
    renderHookWithProviders(() => useCommunityAnchorQuery(), { activeCommunityId: null });
    expect(enabled(vi.mocked(useGetCommunityEnergyMetrics).mock.calls, 2)).toEqual([]);

    renderHookWithProviders(() => useCommunityAnchorQuery(), { activeCommunityId: COMMUNITY_ID });
    expect(enabled(vi.mocked(useGetCommunityEnergyMetrics).mock.calls, 2).map(([communityId, params]) => [communityId, params])).toEqual([
      [COMMUNITY_ID, { period: "LATEST_PUBLISHED_MONTH" }],
    ]);
  });
});
