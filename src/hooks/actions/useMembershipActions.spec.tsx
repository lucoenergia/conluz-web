import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useDeleteMembership,
  useDisableMembership,
  useEnableMembership,
  useRegisterMember,
  useResendInvitation,
  useRevokeInvitation,
  useSendInvitation,
  useSendInvitations,
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
import type { RegisterMemberBody, RestErrorDetailCode, UpdateMemberRecordBody } from "../../api/models";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildMember,
  buildMembership,
  buildMembershipCapabilities,
  buildUser,
} from "../../test/fixtures";
import { mutation } from "../../test/queryState";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { useMembershipActions } from "./useMembershipActions";

vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useDeleteMembership: vi.fn(),
  useUpdateMembershipRole: vi.fn(),
  useSetMembershipInvestment: vi.fn(),
  useClearMembershipInvestment: vi.fn(),
  useUpdateMemberRecord: vi.fn(),
  useEnableMembership: vi.fn(),
  useDisableMembership: vi.fn(),
  useRegisterMember: vi.fn(),
  useSendInvitations: vi.fn(),
  useSendInvitation: vi.fn(),
  useResendInvitation: vi.fn(),
  useRevokeInvitation: vi.fn(),
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
  vi.mocked(useDeleteMembership).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useUpdateMembershipRole).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useSetMembershipInvestment).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useClearMembershipInvestment).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useUpdateMemberRecord).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useEnableMembership).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useDisableMembership).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useRegisterMember).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useSendInvitations).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useSendInvitation).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useResendInvitation).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useRevokeInvitation).mockReturnValue(mutation.idle({ mutateAsync }));
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
  });

  describe("a granted action calls the mutation the screen used to call directly", () => {
    it("removes a membership with the community and user the row names", async () => {
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canDelete: true })),
      );

      await expect(result.current.actions.remove?.run()).resolves.toEqual({ ok: true, value: undefined });
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
      const error = new Error("boom");
      mutateAsync.mockRejectedValue(error);
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canDelete: true })),
      );

      // The error itself, so the members page can word MEMBERSHIP_OWNS_SUPPLIES (#275).
      await expect(result.current.actions.remove?.run()).resolves.toEqual({ error });
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

  describe("registering and inviting members (#275)", () => {
    const restError = (status: number, code: RestErrorDetailCode) => ({
      response: { status, data: { status, message: "refused", errors: [{ message: "refused", code }] } },
    });

    const REGISTRATION: RegisterMemberBody = {
      personalId: "12345678Z",
      fullName: "Ana García",
      memberNumber: null,
      contactEmail: "ana@example.com",
      address: null,
      phoneNumber: null,
    };

    it("withholds registration and bulk send unless the community grants each", () => {
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({ canManageMemberships: true })),
      );

      expect(result.current.actions.register).toBeUndefined();
      expect(result.current.actions.sendPendingInvitations).toBeUndefined();
      expect(result.current.outcomes.register).toEqual({ state: "denied" });
      expect(result.current.outcomes.sendPendingInvitations).toEqual({ state: "denied" });
    });

    it("hands back registration and bulk send each from its own capability", () => {
      const register = renderHookWithProviders(() =>
        useMembershipActions(communityWith({ canRegisterMembers: true })),
      ).result.current;
      const bulk = renderHookWithProviders(() =>
        useMembershipActions(communityWith({ canInviteMembers: true })),
      ).result.current;

      expect(register.actions.register).toBeDefined();
      expect(register.actions.sendPendingInvitations).toBeUndefined();
      expect(bulk.actions.sendPendingInvitations).toBeDefined();
      expect(bulk.actions.register).toBeUndefined();
    });

    it("reports both pending while the community is undefined", () => {
      const { result } = renderHookWithProviders(() => useMembershipActions(undefined));

      expect(result.current.outcomes.register).toEqual({ state: "pending" });
      expect(result.current.outcomes.sendPendingInvitations).toEqual({ state: "pending" });
    });

    it("hands back the three invitation writes from canInvite alone", () => {
      const granted = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canInvite: true })),
      ).result.current;
      const denied = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canEditRecord: true })),
      ).result.current;

      for (const action of ["invite", "resendInvitation", "revokeInvitation"] as const) {
        expect(granted.actions[action]).toBeDefined();
        expect(denied.actions[action]).toBeUndefined();
        expect(denied.outcomes[action]).toEqual({ state: "denied" });
      }
    });

    it("denies the invitation writes when canInvite is missing, as from a backend that predates it", () => {
      const capabilities = buildMembershipCapabilities({ canDelete: true });
      delete (capabilities as Partial<typeof capabilities>).canInvite;
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership({ ...membershipWith({}), capabilities }),
      );

      expect(result.current.actions.invite).toBeUndefined();
      expect(result.current.outcomes.invite).toEqual({ state: "denied" });
    });

    it("gates on the member a registration answers, not only on a roster row", () => {
      const member = buildMember({
        user: { id: USER_ID },
        capabilities: buildMembershipCapabilities({ canInvite: true }),
      });
      const { result } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(member),
      );

      expect(result.current.actions.invite).toBeDefined();
    });

    it("registers with the whole body, answers the member, and refreshes the roster and the member count", async () => {
      const member = buildMember({ fullName: "Ana García" });
      mutateAsync.mockResolvedValue(member);
      const { result, queryClient } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({ canRegisterMembers: true })),
      );
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await expect(result.current.actions.register?.run(REGISTRATION)).resolves.toEqual({ ok: true, value: member });
      expect(mutateAsync).toHaveBeenCalledWith({ communityId: COMMUNITY_ID, data: REGISTRATION });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetMembershipsQueryKey(COMMUNITY_ID) });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllCommunitiesQueryKey() });
    });

    it("sends the pending invitations of the community, answers the counts and refreshes the roster", async () => {
      mutateAsync.mockResolvedValue({ sent: 50, remaining: 70 });
      const { result, queryClient } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({ canInviteMembers: true })),
      );
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await expect(result.current.actions.sendPendingInvitations?.run()).resolves.toEqual({
        ok: true,
        value: { sent: 50, remaining: 70 },
      });
      expect(mutateAsync).toHaveBeenCalledWith({ communityId: COMMUNITY_ID });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetMembershipsQueryKey(COMMUNITY_ID) });
    });

    it.each(["invite", "resendInvitation", "revokeInvitation"] as const)(
      "%s acts on the membership the row names and refreshes the roster",
      async (action) => {
        const { result, queryClient } = renderHookWithProviders(() =>
          useMembershipActions(communityWith({})).forMembership(membershipWith({ canInvite: true })),
        );
        const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

        await expect(result.current.actions[action]?.run()).resolves.toMatchObject({ ok: true });
        expect(mutateAsync).toHaveBeenCalledWith({ communityId: COMMUNITY_ID, userId: USER_ID });
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetMembershipsQueryKey(COMMUNITY_ID) });
      },
    );

    it.each([
      ["invite", 409, "MEMBERSHIP_ALREADY_INVITED"],
      ["invite", 409, "MEMBERSHIP_ALREADY_EXISTS"],
      ["invite", 409, "MEMBERSHIP_DISABLED"],
      ["resendInvitation", 409, "MEMBERSHIP_NOT_INVITED"],
      ["resendInvitation", 409, "MEMBERSHIP_ALREADY_EXISTS"],
      ["resendInvitation", 409, "MEMBERSHIP_DISABLED"],
      ["revokeInvitation", 409, "MEMBERSHIP_ALREADY_EXISTS"],
    ] as const)("%s refused with %i %s refetches the roster, whose row is stale", async (action, status, code) => {
      const error = restError(status, code);
      mutateAsync.mockRejectedValue(error);
      const { result, queryClient } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canInvite: true })),
      );
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await expect(result.current.actions[action]?.run()).resolves.toEqual({ error });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetMembershipsQueryKey(COMMUNITY_ID) });
    });

    it.each([
      ["invite", 400, "MEMBERSHIP_WITHOUT_CONTACT_EMAIL"],
      ["invite", 503, "MEMBERSHIP_INVITATION_UNAVAILABLE"],
      ["resendInvitation", 429, "MEMBERSHIP_INVITATION_RESEND_LIMIT_REACHED"],
    ] as const)("%s refused with %i %s leaves the cache alone: the row is not stale", async (action, status, code) => {
      mutateAsync.mockRejectedValue(restError(status, code));
      const { result, queryClient } = renderHookWithProviders(() =>
        useMembershipActions(communityWith({})).forMembership(membershipWith({ canInvite: true })),
      );
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.actions[action]?.run();

      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });
});
