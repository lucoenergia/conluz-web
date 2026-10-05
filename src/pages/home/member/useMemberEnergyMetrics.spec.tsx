import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGetMembershipEnergyMetrics, type getMembershipEnergyMetrics } from "../../../api/memberships/memberships";
import { CommunityRole } from "../../../api/models";
import { useLoggedUser } from "../../../context/logged-user.context";
import { buildCurrentUser, buildMembershipEnergyMetrics } from "../../../test/fixtures";
import { query } from "../../../test/queryState";
import { renderHookWithProviders } from "../../../test/renderWithProviders";
import { useMemberEnergyMetrics } from "./useMemberEnergyMetrics";

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

function render(activeCommunityId: string | null = COMMUNITY_ID) {
  return renderHookWithProviders(() => useMemberEnergyMetrics(), { activeCommunityId }).result.current;
}

describe("useMemberEnergyMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLoggedUser).mockReturnValue(
      buildCurrentUser({ id: USER_ID, memberships: { [COMMUNITY_ID]: CommunityRole.COMMUNITY_MEMBER } }),
    );
    vi.mocked(useGetMembershipEnergyMetrics).mockReturnValue(query.loading());
  });

  it("asks the server for the latest published month of the caller's membership in the active community", () => {
    render();

    expect(useGetMembershipEnergyMetrics).toHaveBeenLastCalledWith(
      COMMUNITY_ID,
      USER_ID,
      { period: "LATEST_PUBLISHED_MONTH" },
      { query: { enabled: true } },
    );
  });

  it("makes no request without an active community", () => {
    render(null);

    expect(vi.mocked(useGetMembershipEnergyMetrics).mock.lastCall?.[3]).toEqual({ query: { enabled: false } });
  });

  it("exposes the bounds the server resolved", () => {
    vi.mocked(useGetMembershipEnergyMetrics).mockReturnValue(
      query.success<typeof getMembershipEnergyMetrics>(
        buildMembershipEnergyMetrics({
          period: { startDate: "2026-07-31T22:00:00Z", endDate: "2026-08-31T21:00:00Z" },
        }),
      ),
    );

    expect(render().referencePeriod).toEqual({
      startDate: "2026-07-31T22:00:00Z",
      endDate: "2026-08-31T21:00:00Z",
    });
  });

  it("exposes no reference period when none resolves", () => {
    vi.mocked(useGetMembershipEnergyMetrics).mockReturnValue(
      query.success<typeof getMembershipEnergyMetrics>(buildMembershipEnergyMetrics()),
    );

    expect(render().referencePeriod).toBeNull();
  });
});
