import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useGetMembershipDailyConsumption,
  useGetMembershipHourlyConsumption,
  useGetMembershipMonthlyConsumption,
  type getMembershipDailyConsumption,
  type getMembershipHourlyConsumption,
} from "../../api/memberships/memberships";
import {
  useGetSupplyDailyConsumption,
  useGetSupplyHourlyConsumption,
  useGetSupplyMonthlyConsumption,
  type getSupplyHourlyConsumption,
  type getSupplyMonthlyConsumption,
} from "../../api/supplies/supplies";
import { useLoggedUser } from "../../context/logged-user.context";
import { apiError } from "../../test/apiError";
import { query } from "../../test/queryState";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import type { HistoricalPeriod } from "./historicalPeriod";
import { useHistoricalPeriod } from "./HistoricalPeriodContext";
import {
  COMMUNITY_ID,
  HOME,
  OWNER_ID,
  member,
  membershipDay,
  membershipHour,
  supplyBucket,
  supplyHour,
} from "./historicalAnalysis.testData";
import { usePeriodConsumptionSeries } from "./usePeriodConsumptionSeries";

vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMembershipHourlyConsumption: vi.fn(),
  useGetMembershipDailyConsumption: vi.fn(),
  useGetMembershipMonthlyConsumption: vi.fn(),
}));
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSupplyHourlyConsumption: vi.fn(),
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
/** 1 September 2026, picked as a one-day custom range: hour by hour (#378). */
const ONE_DAY: HistoricalPeriod = {
  startDate: "2026-09-01T00:00:00+02:00",
  endDate: "2026-09-02T00:00:00+02:00",
  granularity: "hourly",
  label: "1 de septiembre de 2026",
};
const BOUNDS_OF = ({ startDate, endDate }: HistoricalPeriod) => ({ startDate, endDate });

const HOOKS = {
  membershipHourly: useGetMembershipHourlyConsumption,
  membershipDaily: useGetMembershipDailyConsumption,
  membershipMonthly: useGetMembershipMonthlyConsumption,
  supplyHourly: useGetSupplyHourlyConsumption,
  supplyDaily: useGetSupplyDailyConsumption,
  supplyMonthly: useGetSupplyMonthlyConsumption,
} as const;

const NONE_ENABLED = {
  membershipHourly: false,
  membershipDaily: false,
  membershipMonthly: false,
  supplyHourly: false,
  supplyDaily: false,
  supplyMonthly: false,
};

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

  it("UI-HIS-019 asks the membership daily series of the active community by the period's bounds, and nothing else", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(JULY_AUGUST);
    render(null);

    expect(useGetMembershipDailyConsumption).toHaveBeenLastCalledWith(COMMUNITY_ID, OWNER_ID, BOUNDS_OF(JULY_AUGUST), {
      query: { enabled: true },
    });
    expect(enabledHooks()).toEqual({ ...NONE_ENABLED, membershipDaily: true });
  });

  it("UI-HIS-019 asks the membership monthly series by the period's bounds, and nothing else", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(LAST_12);
    render(null);

    expect(useGetMembershipMonthlyConsumption).toHaveBeenLastCalledWith(COMMUNITY_ID, OWNER_ID, BOUNDS_OF(LAST_12), {
      query: { enabled: true },
    });
    expect(enabledHooks()).toEqual({ ...NONE_ENABLED, membershipMonthly: true });
  });

  it("UI-HIS-019 asks the selected supply's daily series by the period's bounds, and nothing else", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(JULY_AUGUST);
    render(HOME);

    expect(useGetSupplyDailyConsumption).toHaveBeenLastCalledWith(HOME.id, BOUNDS_OF(JULY_AUGUST), { query: { enabled: true } });
    expect(enabledHooks()).toEqual({ ...NONE_ENABLED, supplyDaily: true });
  });

  it("UI-HIS-019 asks the selected supply's monthly series by the period's bounds, and nothing else", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(LAST_12);
    render(HOME);

    expect(useGetSupplyMonthlyConsumption).toHaveBeenLastCalledWith(HOME.id, BOUNDS_OF(LAST_12), { query: { enabled: true } });
    expect(enabledHooks()).toEqual({ ...NONE_ENABLED, supplyMonthly: true });
  });

  it("UI-HIS-019 AC2 -- asks the membership hourly series of the active community by the day's bounds, and nothing else", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(ONE_DAY);
    render(null);

    expect(useGetMembershipHourlyConsumption).toHaveBeenLastCalledWith(COMMUNITY_ID, OWNER_ID, BOUNDS_OF(ONE_DAY), {
      query: { enabled: true },
    });
    expect(enabledHooks()).toEqual({ ...NONE_ENABLED, membershipHourly: true });
  });

  it("UI-HIS-019 AC2 -- asks the selected supply's hourly series by the day's bounds, and nothing else", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(ONE_DAY);
    render(HOME);

    expect(useGetSupplyHourlyConsumption).toHaveBeenLastCalledWith(HOME.id, BOUNDS_OF(ONE_DAY), { query: { enabled: true } });
    expect(enabledHooks()).toEqual({ ...NONE_ENABLED, supplyHourly: true });
  });

  it("UI-HIS-019 AC2 -- hands back the hourly buckets tagged with the series they came from", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(ONE_DAY);
    const hours = [membershipHour("2026-09-01T00:00:00+02:00"), membershipHour("2026-09-01T01:00:00+02:00")];
    vi.mocked(useGetMembershipHourlyConsumption).mockReturnValue(query.success<typeof getMembershipHourlyConsumption>(hours));
    expect(render(null).result.current).toEqual({ status: "ready", series: { kind: "membershipHourly", buckets: hours } });

    const supplyHours = [supplyHour("2026-09-01T00:00:00+02:00"), supplyHour("2026-09-01T01:00:00+02:00")];
    vi.mocked(useGetSupplyHourlyConsumption).mockReturnValue(query.success<typeof getSupplyHourlyConsumption>(supplyHours));
    expect(render(HOME).result.current).toEqual({ status: "ready", series: { kind: "supplyHourly", buckets: supplyHours } });
  });

  it("UI-HIS-019 asks nothing while the period is unknown", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(undefined);
    const { result } = render(null);

    expect(enabledHooks()).toEqual(NONE_ENABLED);
    expect(result.current).toEqual({ status: "loading" });
  });

  it("UI-HIS-019 hands back the buckets tagged with the series they came from", () => {
    vi.mocked(useHistoricalPeriod).mockReturnValue(JULY_AUGUST);
    const buckets = [membershipDay("2026/07/01"), membershipDay("2026/07/02")];
    vi.mocked(useGetMembershipDailyConsumption).mockReturnValue(query.success<typeof getMembershipDailyConsumption>(buckets));
    expect(render(null).result.current).toEqual({ status: "ready", series: { kind: "membershipDaily", buckets } });

    vi.mocked(useHistoricalPeriod).mockReturnValue(LAST_12);
    const months = [supplyBucket("2025/09/01"), supplyBucket("2025/10/01")];
    vi.mocked(useGetSupplyMonthlyConsumption).mockReturnValue(query.success<typeof getSupplyMonthlyConsumption>(months));
    expect(render(HOME).result.current).toEqual({ status: "ready", series: { kind: "supplyMonthly", buckets: months } });
  });

  it("UI-HIS-019 is loading while the selected series is, and retries it after a failure", () => {
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
