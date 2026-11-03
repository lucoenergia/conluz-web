import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useGetMembershipDailyConsumption,
  useGetMembershipMonthlyConsumption,
  type getMembershipDailyConsumption,
} from "../../api/memberships/memberships";
import {
  useGetSupplyDailyConsumption,
  useGetSupplyMonthlyConsumption,
  type getSupplyMonthlyConsumption,
} from "../../api/supplies/supplies";
import { useLoggedUser } from "../../context/logged-user.context";
import { apiError } from "../../test/apiError";
import { query } from "../../test/queryState";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import type { HistoricalPeriod } from "./historicalPeriod";
import { useHistoricalPeriod } from "./HistoricalPeriodContext";
import { COMMUNITY_ID, HOME, OWNER_ID, member, membershipDay, supplyBucket } from "./historicalAnalysis.testData";
import { usePeriodConsumptionSeries } from "./usePeriodConsumptionSeries";

vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMembershipDailyConsumption: vi.fn(),
  useGetMembershipMonthlyConsumption: vi.fn(),
}));
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSupplyDailyConsumption: vi.fn(),
  useGetSupplyMonthlyConsumption: vi.fn(),
}));
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: vi.fn(),
}));
vi.mock(import("./HistoricalPeriodContext"), async (importOriginal) => ({
  ...(await importOriginal()),
  useHistoricalPeriod: vi.fn(),
}));

const JULY_AUGUST: HistoricalPeriod = {
  startDate: "2026-07-01T00:00:00+02:00",
  endDate: "2026-09-01T00:00:00+02:00",
  granularity: "daily",
  label: "Del 1 de julio al 31 de agosto de 2026",
};
const LAST_12: HistoricalPeriod = {
  startDate: "2025-09-01T00:00:00+02:00",
  endDate: "2026-09-01T00:00:00+02:00",
  granularity: "monthly",
  label: "De septiembre de 2025 a agosto de 2026",
};
const BOUNDS_OF = ({ startDate, endDate }: HistoricalPeriod) => ({ startDate, endDate });

const HOOKS = {
  membershipDaily: useGetMembershipDailyConsumption,
  membershipMonthly: useGetMembershipMonthlyConsumption,
  supplyDaily: useGetSupplyDailyConsumption,
  supplyMonthly: useGetSupplyMonthlyConsumption,
} as const;

/** Whether each hook was last asked to run. */
function enabledHooks() {
  return Object.fromEntries(
    Object.entries(HOOKS).map(([name, hook]) => {
      const options = vi.mocked(hook).mock.lastCall?.at(-1) as { query: { enabled: boolean } };
      return [name, options.query.enabled];
    }),
  );
}

function render(selected: typeof HOME | null) {
  return renderHookWithProviders(() => usePeriodConsumptionSeries(selected), { activeCommunityId: COMMUNITY_ID });
}

describe("usePeriodConsumptionSeries (#250)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLoggedUser).mockReturnValue(member());
    for (const hook of Object.values(HOOKS)) vi.mocked(hook).mockReturnValue(query.disabled());
  });

  it("UI-HIS-016 asks the membership daily series of the active community by the period's bounds, and nothing else", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(JULY_AUGUST);
    render(null);

    expect(useGetMembershipDailyConsumption).toHaveBeenLastCalledWith(COMMUNITY_ID, OWNER_ID, BOUNDS_OF(JULY_AUGUST), {
      query: { enabled: true },
    });
    expect(enabledHooks()).toEqual({ membershipDaily: true, membershipMonthly: false, supplyDaily: false, supplyMonthly: false });
  });

  it("UI-HIS-016 asks the membership monthly series by the period's bounds, and nothing else", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(LAST_12);
    render(null);

    expect(useGetMembershipMonthlyConsumption).toHaveBeenLastCalledWith(COMMUNITY_ID, OWNER_ID, BOUNDS_OF(LAST_12), {
      query: { enabled: true },
    });
    expect(enabledHooks()).toEqual({ membershipDaily: false, membershipMonthly: true, supplyDaily: false, supplyMonthly: false });
  });

  it("UI-HIS-016 asks the selected supply's daily series by the period's bounds, and nothing else", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(JULY_AUGUST);
    render(HOME);

    expect(useGetSupplyDailyConsumption).toHaveBeenLastCalledWith(HOME.id, BOUNDS_OF(JULY_AUGUST), { query: { enabled: true } });
    expect(enabledHooks()).toEqual({ membershipDaily: false, membershipMonthly: false, supplyDaily: true, supplyMonthly: false });
  });

  it("UI-HIS-016 asks the selected supply's monthly series by the period's bounds, and nothing else", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(LAST_12);
    render(HOME);

    expect(useGetSupplyMonthlyConsumption).toHaveBeenLastCalledWith(HOME.id, BOUNDS_OF(LAST_12), { query: { enabled: true } });
    expect(enabledHooks()).toEqual({ membershipDaily: false, membershipMonthly: false, supplyDaily: false, supplyMonthly: true });
  });

  it("UI-HIS-016 asks nothing while the period is unknown", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(undefined);
    const { result } = render(null);

    expect(Object.values(enabledHooks())).toEqual([false, false, false, false]);
    expect(result.current).toEqual({ status: "loading" });
  });

  it("UI-HIS-016 hands back the buckets tagged with the series they came from", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(JULY_AUGUST);
    const buckets = [membershipDay("2026/07/01"), membershipDay("2026/07/02")];
    vi.mocked(useGetMembershipDailyConsumption).mockReturnValue(query.success<typeof getMembershipDailyConsumption>(buckets));
    expect(render(null).result.current).toEqual({ status: "ready", series: { kind: "membershipDaily", buckets } });

    vi.mocked(useHistoricalPeriod).mockReturnValue(LAST_12);
    const months = [supplyBucket("2025/09/01"), supplyBucket("2025/10/01")];
    vi.mocked(useGetSupplyMonthlyConsumption).mockReturnValue(query.success<typeof getSupplyMonthlyConsumption>(months));
    expect(render(HOME).result.current).toEqual({ status: "ready", series: { kind: "supplyMonthly", buckets: months } });
  });

  it("UI-HIS-016 is loading while the selected series is, and retries it after a failure", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(JULY_AUGUST);
    vi.mocked(useGetSupplyDailyConsumption).mockReturnValue(query.loading());
    expect(render(HOME).result.current).toEqual({ status: "loading" });

    const failed = query.error(apiError(500));
    vi.mocked(useGetSupplyDailyConsumption).mockReturnValue(failed);
    const state = render(HOME).result.current;
    expect(state.status).toBe("error");
    if (state.status === "error") state.retry();
    expect(failed.refetch).toHaveBeenCalled();
  });
});
