import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGetMembershipEnergyMetrics } from "../../../api/memberships/memberships";
import { CommunityRole } from "../../../api/models";
import { useLoggedUser } from "../../../context/logged-user.context";
import { buildCurrentUser } from "../../../test/fixtures";
import { query } from "../../../test/queryState";
import { renderHookWithProviders } from "../../../test/renderWithProviders";
import { usePreviousMonthEnergyMetrics } from "./usePreviousMonthEnergyMetrics";

vi.mock(import("../../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMembershipEnergyMetrics: vi.fn(),
}));
vi.mock(import("../../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: vi.fn(),
}));

const USER_ID = "member-user";
const COMMUNITY_ID = "member-community";

/** August 2026, as the fixtures write it. */
const AUGUST = { startDate: "2026-07-31T22:00:00Z", endDate: "2026-08-31T21:00:00Z" };

function render(activeCommunityId: string | null = COMMUNITY_ID) {
  return renderHookWithProviders(() => usePreviousMonthEnergyMetrics(AUGUST), { activeCommunityId }).result.current;
}

describe("usePreviousMonthEnergyMetrics (#200)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // A device clock in another year and month: the request must not move with it.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2031-02-15T10:00:00Z"));
    vi.mocked(useLoggedUser).mockReturnValue(
      buildCurrentUser({ id: USER_ID, memberships: { [COMMUNITY_ID]: CommunityRole.COMMUNITY_MEMBER } }),
    );
    vi.mocked(useGetMembershipEnergyMetrics).mockReturnValue(query.loading());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks for July 2026 with explicit bounds, for the caller's membership in the active community", () => {
    render();

    expect(useGetMembershipEnergyMetrics).toHaveBeenLastCalledWith(
      COMMUNITY_ID,
      USER_ID,
      { startDate: "2026-07-01T00:00:00+02:00", endDate: "2026-07-31T23:00:00+02:00" },
      { query: { enabled: true } },
    );
  });

  it("never asks the server to resolve a period itself", () => {
    render();

    expect(vi.mocked(useGetMembershipEnergyMetrics).mock.lastCall?.[2]).not.toHaveProperty("period");
  });

  it("exposes the bounds it requested", () => {
    expect(render().previousPeriod).toEqual({
      startDate: "2026-07-01T00:00:00+02:00",
      endDate: "2026-07-31T23:00:00+02:00",
    });
  });

  it("makes no request without an active community", () => {
    render(null);

    expect(vi.mocked(useGetMembershipEnergyMetrics).mock.lastCall?.[3]).toEqual({ query: { enabled: false } });
  });

  it("retries its own request", () => {
    const failed = query.error(new Error("previous month failed"));
    vi.mocked(useGetMembershipEnergyMetrics).mockReturnValue(failed);

    const result = render();
    result.retry();

    expect(result.isError).toBe(true);
    expect(failed.refetch).toHaveBeenCalledOnce();
  });
});
