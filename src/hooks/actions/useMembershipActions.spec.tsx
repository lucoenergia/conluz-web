import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useCreateMembership,
  useDeleteMembership,
  useDisableMembership,
  useEnableMembership,
  useSetMembershipInvestment,
  useClearMembershipInvestment,
  useUpdateMemberRecord,
  useUpdateMembershipRole,
  getGetMembershipsQueryKey,
} from "../../api/memberships/memberships";
import { getGetAllCommunitiesQueryKey } from "../../api/communities/communities";
import { getGetAllSuppliesQueryKey } from "../../api/supplies/supplies";
import {
  getGetAllUsersQueryKey,
  getGetSuppliesByUserIdQueryKey,
  getGetUserByIdQueryKey,
} from "../../api/users/users";
import type { UpdateMemberRecordBody } from "../../api/models";
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
  useUpdateMemberRecord: vi.fn(),
  useEnableMembership: vi.fn(),
  useDisableMembership: vi.fn(),
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
  vi.mocked(useUpdateMemberRecord).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useEnableMembership).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useDisableMembership).mockReturnValue(mutation.idle({ mutateAsync }));
});

const RECORD: UpdateMemberRecordBody = {
  fullName: "Ana García",
  memberNumber: 7,
  contactEmail: null,
  address: "Calle Mayor 1",
  phoneNumber: null,
};

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
      expect(result.current.actions.editRecord).toBeUndefined();
      expect(result.current.actions.enable).toBeUndefined();
      expect(result.current.actions.disable).toBeUndefined();
      expect(result.current.outcomes.remove).toEqual({ state: "denied" });
    });

    it.each(["canEditRecord", "canEnable", "canDisable"] as const)(
      "denies every new action when %s is missing, as from a backend that predates it",
      (missing) => {
        const capabilities = buildMembershipCapabilities({ canEditRecord: true, canEnable: true, canDisable: true });
        delete (capabilities as Partial<typeof capabilities>)[missing];
        const membership = { ...membershipWith({}), capabilities };
        const { result } = renderHookWithProviders(() =>
          useMembershipActions(communityWith({})).forMembership(membership),
        );

        const action = { canEditRecord: "editRecord", canEnable: "enable", canDisable: "disable" } as const;
        expect(result.current.actions[action[missing]]).toBeUndefined();
        expect(result.current.outcomes[action[missing]]).toEqual({ state: "denied" });
      },
    );

    it("hands back each new action from its own capability alone", () => {
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canEditRecord: true })),
      );

      expect(result.current.actions.editRecord).toBeDefined();
      expect(result.current.actions.enable).toBeUndefined();
      expect(result.current.actions.disable).toBeUndefined();
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
      expect(result.current.outcomes.editRecord).toEqual({ state: "pending" });
      expect(result.current.outcomes.enable).toEqual({ state: "pending" });
      expect(result.current.outcomes.disable).toEqual({ state: "pending" });
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

    it("replaces the member record with the whole body the screen supplies", async () => {
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canEditRecord: true })),
      );

      await expect(result.current.actions.editRecord?.run(RECORD)).resolves.toEqual({ ok: true });
      expect(mutateAsync).toHaveBeenCalledWith({ communityId: COMMUNITY_ID, userId: USER_ID, data: RECORD });
    });

    it("hands the record form the error, so it can place it", async () => {
      const error = new Error("boom");
      mutateAsync.mockRejectedValue(error);
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canEditRecord: true })),
      );

      await expect(result.current.actions.editRecord?.run(RECORD)).resolves.toEqual({ error });
    });

    it.each([
      ["disable", "canDisable"],
      ["enable", "canEnable"],
    ] as const)("%ss the membership the row names", async (action, capability) => {
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ [capability]: true })),
      );

      await expect(result.current.actions[action]?.run()).resolves.toBe(true);
      expect(mutateAsync).toHaveBeenCalledWith({ communityId: COMMUNITY_ID, userId: USER_ID });
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

    it("refreshes every read that shows the member after a record edit", async () => {
      const { result, queryClient } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canEditRecord: true })),
      );
      // A supply's detail names its owner; its sub-resources do not.
      queryClient.setQueryData(["/api/v1/supplies/TEST-SUPPLY-ID"], {});
      queryClient.setQueryData(["/api/v1/supplies/TEST-SUPPLY-ID/coefficients"], {});
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.actions.editRecord?.run(RECORD);

      for (const queryKey of [
        getGetMembershipsQueryKey(COMMUNITY_ID),
        getGetAllSuppliesQueryKey(COMMUNITY_ID),
        getGetSuppliesByUserIdQueryKey(USER_ID),
        getGetUserByIdQueryKey(USER_ID),
        getGetAllUsersQueryKey(),
      ]) {
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
      }
      expect(queryClient.getQueryState(["/api/v1/supplies/TEST-SUPPLY-ID"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["/api/v1/supplies/TEST-SUPPLY-ID/coefficients"])?.isInvalidated).toBe(false);
    });

    it("leaves the cache alone when a record edit fails", async () => {
      mutateAsync.mockRejectedValue(new Error("boom"));
      const { result, queryClient } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canEditRecord: true })),
      );
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.actions.editRecord?.run(RECORD);

      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it("refreshes the roster after a suspension", async () => {
      const { result, queryClient } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canDisable: true })),
      );
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.actions.disable?.run();

      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetMembershipsQueryKey(COMMUNITY_ID) });
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
