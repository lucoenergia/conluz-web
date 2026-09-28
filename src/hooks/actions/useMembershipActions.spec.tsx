import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useCreateMembership,
  useDeleteMembership,
  useSetMembershipInvestment,
  useClearMembershipInvestment,
  useUpdateMembershipRole,
  getGetMembershipsQueryKey,
} from "../../api/memberships/memberships";
import { getGetAllCommunitiesQueryKey } from "../../api/communities/communities";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildMembership,
  buildMembershipCapabilities,
  buildUser,
} from "../../test/fixtures";
import { mutation } from "../../test/queryState";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { useMembershipActions } from "./useMembershipActions";

vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreateMembership: vi.fn(),
  useDeleteMembership: vi.fn(),
  useUpdateMembershipRole: vi.fn(),
  useSetMembershipInvestment: vi.fn(),
  useClearMembershipInvestment: vi.fn(),
}));

const COMMUNITY_ID = "TEST-COMMUNITY-ID";
const USER_ID = "TEST-USER-ID";

/** Every capability false by default, so a spec grants exactly what it asserts on. */
const membershipWith = (capabilities: Parameters<typeof buildMembershipCapabilities>[0]) =>
  buildMembership({
    user: buildUser({ id: USER_ID }),
    communityId: COMMUNITY_ID,
    capabilities: buildMembershipCapabilities(capabilities),
  });

const communityWith = (capabilities: Parameters<typeof buildCommunityCapabilities>[0]) =>
  buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities(capabilities) });

let mutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mutateAsync = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useCreateMembership).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useDeleteMembership).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useUpdateMembershipRole).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useSetMembershipInvestment).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useClearMembershipInvestment).mockReturnValue(mutation.idle({ mutateAsync }));
});

describe("useMembershipActions", () => {
  describe("the capability decides whether the action exists at all", () => {
    it("withholds every row action when the membership permits none", () => {
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({})),
      );

      expect(result.current.actions.changeRole).toBeUndefined();
      expect(result.current.actions.remove).toBeUndefined();
      expect(result.current.actions.setInvestment).toBeUndefined();
      expect(result.current.actions.clearInvestment).toBeUndefined();
      expect(result.current.outcomes.remove).toEqual({ state: "denied" });
    });

    it("hands back only the action the membership permits", () => {
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canDelete: true })),
      );

      expect(result.current.actions.remove).toBeDefined();
      expect(result.current.outcomes.remove).toEqual({ state: "allowed" });
      // Sharing one mutation instance must not leak a grant sideways.
      expect(result.current.actions.changeRole).toBeUndefined();
    });

    it("withholds the roster action when the community permits no membership management", () => {
      const { result } = renderHookWithProviders(() => useMembershipActions(communityWith({})));

      expect(result.current.actions.add).toBeUndefined();
      expect(result.current.outcomes.add).toEqual({ state: "denied" });
    });

    it("hands back the roster action when the community permits it", () => {
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({ canManageMemberships: true })),
      );

      expect(result.current.actions.add).toBeDefined();
    });
  });

  describe("a resource that has not arrived is pending, not a denial", () => {
    it("withholds the row actions and reports pending while the membership is undefined", () => {
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(undefined),
      );

      expect(result.current.actions.remove).toBeUndefined();
      expect(result.current.outcomes.remove).toEqual({ state: "pending" });
      expect(mutateAsync).not.toHaveBeenCalled();
    });

    it("withholds the roster action and reports pending while the community is undefined", () => {
      const { result } = renderHookWithProviders(() => useMembershipActions(undefined));

      expect(result.current.actions.add).toBeUndefined();
      expect(result.current.outcomes.add).toEqual({ state: "pending" });
      expect(mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe("a granted action calls the mutation the screen used to call directly", () => {
    it("removes a membership with the community and user the row names", async () => {
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canDelete: true })),
      );

      await expect(result.current.actions.remove?.run()).resolves.toBe(true);
      expect(mutateAsync).toHaveBeenCalledWith({ communityId: COMMUNITY_ID, userId: USER_ID });
    });

    it("changes a role with the body the screen supplies", async () => {
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canUpdateRole: true })),
      );

      await result.current.actions.changeRole?.run({ role: "COMMUNITY_ADMIN" });
      expect(mutateAsync).toHaveBeenCalledWith({
        communityId: COMMUNITY_ID,
        userId: USER_ID,
        data: { role: "COMMUNITY_ADMIN" },
      });
    });

    it("adds a membership with the community the hook was given", async () => {
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({ canManageMemberships: true })),
      );

      await result.current.actions.add?.run({ userId: USER_ID, role: "COMMUNITY_MEMBER" });
      expect(mutateAsync).toHaveBeenCalledWith({
        communityId: COMMUNITY_ID,
        data: { userId: USER_ID, role: "COMMUNITY_MEMBER" },
      });
    });

    it("reports failure rather than raising a toast, because the two screens word it differently", async () => {
      mutateAsync.mockRejectedValue(new Error("boom"));
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canDelete: true })),
      );

      await expect(result.current.actions.remove?.run()).resolves.toBe(false);
    });
  });

  describe("cache and pending state", () => {
    it("invalidates the roster and the community list, the two keys the screens read", async () => {
      const { result, queryClient } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canDelete: true })),
      );
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.actions.remove?.run();

      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: getGetMembershipsQueryKey(COMMUNITY_ID),
      });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllCommunitiesQueryKey() });
    });

    it("leaves the cache alone when the mutation fails", async () => {
      mutateAsync.mockRejectedValue(new Error("boom"));
      const { result, queryClient } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canDelete: true })),
      );
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.actions.remove?.run();

      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it("carries the mutation's pending flag inside the action", () => {
      vi.mocked(useDeleteMembership).mockReturnValue(
        mutation.pending({ communityId: COMMUNITY_ID, userId: USER_ID }, { mutateAsync }),
      );
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canDelete: true })),
      );

      expect(result.current.actions.remove?.isPending).toBe(true);
      // The flag belongs to that one mutation, not to the bundle.
      expect(result.current.actions.changeRole?.isPending).toBeUndefined();
    });
  });
});
