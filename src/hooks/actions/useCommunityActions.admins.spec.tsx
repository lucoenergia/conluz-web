import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getGetCommunityAdminsQueryKey,
  useDisableCommunityAdmin,
  useEnableCommunityAdmin,
  useInviteCommunityAdmin,
  useResendCommunityAdminInvitation,
  useRevokeCommunityAdminInvitation,
} from "../../api/memberships/memberships";
import { getGetAllCommunitiesQueryKey } from "../../api/communities/communities";
import { getGetCurrentUserQueryKey } from "../../api/users/users";
import type { InviteCommunityAdminBody } from "../../api/models";
import { buildCommunity, buildCommunityAdmin, buildCommunityCapabilities } from "../../test/fixtures";
import { mutation } from "../../test/queryState";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { useCommunityActions } from "./useCommunityActions";

/**
 * The admin actions of useCommunityActions (#276): every one is the
 * community's canManageAdmins, since an admin row carries no capabilities.
 */
vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useInviteCommunityAdmin: vi.fn(),
  useResendCommunityAdminInvitation: vi.fn(),
  useRevokeCommunityAdminInvitation: vi.fn(),
  useEnableCommunityAdmin: vi.fn(),
  useDisableCommunityAdmin: vi.fn(),
}));

const COMMUNITY_ID = "TEST-COMMUNITY-ID";
const USER_ID = "TEST-ADMIN-ID";
const ADMIN = buildCommunityAdmin({ user: { id: USER_ID } });
const BODY: InviteCommunityAdminBody = {
  personalId: "TEST-PERSONAL-ID",
  fullName: "TEST-ADMIN-NAME",
  contactEmail: "admin@example.invalid",
  phoneNumber: null,
};

const communityWith = (capabilities: Parameters<typeof buildCommunityCapabilities>[0]) =>
  buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities(capabilities) });

const refusal = (code: string) => ({ response: { status: 409, data: { errors: [{ code, message: "refused" }] } } });

let mutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mutateAsync = vi.fn().mockResolvedValue(ADMIN);
  vi.mocked(useInviteCommunityAdmin).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useResendCommunityAdminInvitation).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useRevokeCommunityAdminInvitation).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useEnableCommunityAdmin).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useDisableCommunityAdmin).mockReturnValue(mutation.idle({ mutateAsync }));
});

describe("useCommunityActions: a community's admins", () => {
  it("withholds every admin action without canManageAdmins, even with the roster", () => {
    const community = communityWith({ canManageMemberships: true, canUpdate: true });
    const { result } = renderHookWithProviders(() => {
      const actions = useCommunityActions();
      return { community: actions.forCommunity(community), admin: actions.forCommunityAdmin(community, ADMIN) };
    });

    expect(result.current.community.actions.inviteAdmin).toBeUndefined();
    expect(result.current.community.outcomes.inviteAdmin).toEqual({ state: "denied" });
    expect(Object.values(result.current.admin.actions).filter(Boolean)).toEqual([]);
  });

  it("denies them when canManageAdmins is missing, as from a backend that predates it", () => {
    const capabilities = buildCommunityCapabilities({ canManageAdmins: true });
    delete (capabilities as Partial<typeof capabilities>).canManageAdmins;
    const community = buildCommunity({ id: COMMUNITY_ID, capabilities });
    const { result } = renderHookWithProviders(() => useCommunityActions().forCommunityAdmin(community, ADMIN));

    expect(result.current.actions.disable).toBeUndefined();
    expect(result.current.outcomes.disable).toEqual({ state: "denied" });
  });

  it("hands every one over on canManageAdmins, the pair of enable and disable both", () => {
    const community = communityWith({ canManageAdmins: true });
    const { result } = renderHookWithProviders(() => {
      const actions = useCommunityActions();
      return { community: actions.forCommunity(community), admin: actions.forCommunityAdmin(community, ADMIN) };
    });

    expect(result.current.community.actions.inviteAdmin).toBeDefined();
    expect(result.current.admin.actions.resendInvitation).toBeDefined();
    expect(result.current.admin.actions.revokeInvitation).toBeDefined();
    expect(result.current.admin.actions.enable).toBeDefined();
    expect(result.current.admin.actions.disable).toBeDefined();
  });

  it("reports pending while the community or the row has not arrived", () => {
    const { result } = renderHookWithProviders(() => {
      const actions = useCommunityActions();
      return {
        noCommunity: actions.forCommunityAdmin(undefined, ADMIN),
        noRow: actions.forCommunityAdmin(communityWith({ canManageAdmins: true }), undefined),
      };
    });

    expect(result.current.noCommunity.outcomes.resendInvitation).toEqual({ state: "pending" });
    expect(result.current.noRow.actions.resendInvitation).toBeUndefined();
    expect(result.current.noRow.outcomes.resendInvitation).toEqual({ state: "pending" });
  });

  it("invites with the whole body, answers the admin, and refreshes the admins and the communities list", async () => {
    const { result, queryClient } = renderHookWithProviders(() =>
      useCommunityActions().forCommunity(communityWith({ canManageAdmins: true })),
    );
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.actions.inviteAdmin?.run(BODY)).resolves.toEqual({ ok: true, value: ADMIN });
    expect(mutateAsync).toHaveBeenCalledWith({ communityId: COMMUNITY_ID, data: BODY });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetCommunityAdminsQueryKey(COMMUNITY_ID) });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllCommunitiesQueryKey() });
  });

  it.each(["resendInvitation", "revokeInvitation", "enable", "disable"] as const)(
    "sends %s for the row's user in the community it was handed",
    async (action) => {
      const { result } = renderHookWithProviders(() =>
        useCommunityActions().forCommunityAdmin(communityWith({ canManageAdmins: true }), ADMIN),
      );

      await result.current.actions[action]?.run();
      expect(mutateAsync).toHaveBeenCalledWith({ communityId: COMMUNITY_ID, userId: USER_ID });
    },
  );

  it("refreshes the current user after a suspension, since the admin may be the caller", async () => {
    const { result, queryClient } = renderHookWithProviders(() =>
      useCommunityActions().forCommunityAdmin(communityWith({ canManageAdmins: true }), ADMIN),
    );
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.actions.disable?.run()).resolves.toBe(true);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetCommunityAdminsQueryKey(COMMUNITY_ID) });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetCurrentUserQueryKey() });
  });

  it.each([
    ["resendInvitation", "MEMBERSHIP_NOT_INVITED", true],
    ["resendInvitation", "MEMBERSHIP_DISABLED", true],
    ["resendInvitation", "MEMBERSHIP_INVITATION_RESEND_LIMIT_REACHED", false],
    ["revokeInvitation", "MEMBERSHIP_ALREADY_EXISTS", true],
  ] as const)("hands back a refused %s with %s, refetching the list only when the row is stale", async (action, code, stale) => {
    const error = refusal(code);
    mutateAsync.mockRejectedValue(error);
    const { result, queryClient } = renderHookWithProviders(() =>
      useCommunityActions().forCommunityAdmin(communityWith({ canManageAdmins: true }), ADMIN),
    );
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.actions[action]?.run()).resolves.toEqual({ error });
    if (stale) {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetCommunityAdminsQueryKey(COMMUNITY_ID) });
    } else {
      expect(invalidateQueries).not.toHaveBeenCalled();
    }
  });

  it("refetches the list when an invitation is refused because the person is already in the community", async () => {
    const error = refusal("MEMBERSHIP_ALREADY_EXISTS");
    mutateAsync.mockRejectedValue(error);
    const { result, queryClient } = renderHookWithProviders(() =>
      useCommunityActions().forCommunity(communityWith({ canManageAdmins: true })),
    );
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.actions.inviteAdmin?.run(BODY)).resolves.toEqual({ error });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetCommunityAdminsQueryKey(COMMUNITY_ID) });
  });
});
