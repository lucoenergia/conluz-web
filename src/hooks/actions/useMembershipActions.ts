import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMembershipsQueryKey,
  useCreateMembership,
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
} from "../../api/memberships/memberships";
import { getGetAllCommunitiesQueryKey } from "../../api/communities/communities";
import { getGetAllSuppliesQueryKey } from "../../api/supplies/supplies";
import {
  getGetAllUsersQueryKey,
  getGetCurrentUserQueryKey,
  getGetSuppliesByUserIdQueryKey,
  getGetUserByIdQueryKey,
} from "../../api/users/users";
import type {
  CommunityResponse,
  CreateMembershipBody,
  MemberResponse,
  MembershipCapabilitiesResponse,
  RegisterMemberBody,
  RestErrorDetailCode,
  SendInvitationsResponse,
  SetMembershipInvestmentBody,
  UpdateMemberRecordBody,
  UpdateMembershipRoleBody,
} from "../../api/models";
import { getFirstApiErrorCode } from "../../errors/apiErrorCatalogue";
import { STALE_ROW_CODES } from "../../errors/membershipErrors";
import { outcomeFromResource, type CapabilityOutcome } from "../permissions";
import { grant, type MaybeAction } from "./action";

/**
 * What the caller may do to the memberships of one community.
 *
 * Takes the community rather than its id because the id alone cannot be gated:
 * `ManageAdminsDialog` manages a community the caller is not currently working
 * in, so reading the active community's capabilities would answer about the
 * wrong one. The resource carries its own answer, which is the point of the
 * capabilities model.
 *
 * Nothing here raises a toast. The two call sites word the same failure
 * differently -- "Error al añadir el miembro" on the members page, "Error al
 * asignar el administrador" in the communities dialog -- so the wording belongs
 * to the screen. An action reports false and leaves it there.
 */
export interface MembershipRowActions {
  actions: {
    changeRole: MaybeAction<[UpdateMembershipRoleBody], boolean>;
    remove: MaybeAction<[], MembershipWriteResult>;
    setInvestment: MaybeAction<[SetMembershipInvestmentBody], boolean>;
    clearInvestment: MaybeAction<[], boolean>;
    editRecord: MaybeAction<[UpdateMemberRecordBody], EditMemberRecordResult>;
    enable: MaybeAction<[], boolean>;
    disable: MaybeAction<[], boolean>;
    invite: MaybeAction<[], MembershipWriteResult<MemberResponse>>;
    resendInvitation: MaybeAction<[], MembershipWriteResult<MemberResponse>>;
    revokeInvitation: MaybeAction<[], MembershipWriteResult<MemberResponse>>;
  };
  outcomes: {
    changeRole: CapabilityOutcome;
    remove: CapabilityOutcome;
    setInvestment: CapabilityOutcome;
    clearInvestment: CapabilityOutcome;
    editRecord: CapabilityOutcome;
    enable: CapabilityOutcome;
    disable: CapabilityOutcome;
    invite: CapabilityOutcome;
    resendInvitation: CapabilityOutcome;
    revokeInvitation: CapabilityOutcome;
  };
}

/**
 * The error, not a boolean: the record form places the refusal on the field it
 * is about (`MEMBERSHIP_WITHOUT_CONTACT_EMAIL` on the email), and tells a 403
 * from a 404, so it needs more than "it failed".
 */
export type EditMemberRecordResult = { ok: true } | { error: unknown };

/**
 * The error, not a boolean, for the same reason as EditMemberRecordResult: each
 * refusal of a removal or an invitation has its own message (#275), so the
 * screen needs the code. `value` is the response, when the screen needs it.
 */
export type MembershipWriteResult<T = void> = { ok: true; value: T } | { error: unknown };

/**
 * What forMembership needs of a row: whose membership it is, and what the
 * caller may do with it. Both the roster's MembershipResponse and the
 * MemberResponse a registration answers carry it.
 */
export interface MembershipRef {
  user?: { id: string } | null;
  capabilities?: MembershipCapabilitiesResponse;
}

// The detail of one supply, not its sub-resources: the detail is what names
// the owner, and the owner's name is the member record's.
const SUPPLY_DETAIL_QUERY_URL = /^\/api\/v1\/supplies\/[^/]+$/;

export interface MembershipActions {
  actions: {
    add: MaybeAction<[CreateMembershipBody], boolean>;
    register: MaybeAction<[RegisterMemberBody], MembershipWriteResult<MemberResponse>>;
    sendPendingInvitations: MaybeAction<[], MembershipWriteResult<SendInvitationsResponse>>;
  };
  outcomes: { add: CapabilityOutcome; register: CapabilityOutcome; sendPendingInvitations: CapabilityOutcome };
  /**
   * The per-row gate.
   *
   * A plain function, not a hook: the capability is already on the row, so there
   * is nothing to fetch, and a hook could not be called once per row of a table
   * anyway. The mutations above are instantiated once and shared, so `isPending`
   * is true while any row is mutating -- which is what the pages already do with
   * their single useDeleteMembership.
   */
  forMembership: (membership: MembershipRef | undefined) => MembershipRowActions;
}

export function useMembershipActions(community: CommunityResponse | undefined): MembershipActions {
  const queryClient = useQueryClient();
  const communityId = community?.id ?? "";

  const createMutation = useCreateMembership();
  const deleteMutation = useDeleteMembership();
  const updateRoleMutation = useUpdateMembershipRole();
  const setInvestmentMutation = useSetMembershipInvestment();
  const clearInvestmentMutation = useClearMembershipInvestment();
  const updateRecordMutation = useUpdateMemberRecord();
  const enableMutation = useEnableMembership();
  const disableMutation = useDisableMembership();
  const registerMutation = useRegisterMember();
  const sendInvitationsMutation = useSendInvitations();
  const inviteMutation = useSendInvitation();
  const resendMutation = useResendInvitation();
  const revokeMutation = useRevokeInvitation();

  // All three, because a membership change moves a user between communities'
  // member counts as well as this community's roster -- and because the user
  // moved may be the caller. Nothing stops a community admin re-roling or
  // removing their OWN membership: the endpoints gate on
  // canManageMemberships(communityId) and have no self rail, unlike the
  // platform-admin flag. `memberships` on the current user is what the
  // community selector offers, what the role label reads and what
  // CommunityProvider resolves the active community from, so without the third
  // key the caller keeps being offered a community they have just left (#203).
  const invalidateAfterWrite = () => {
    queryClient.invalidateQueries({ queryKey: getGetMembershipsQueryKey(communityId) });
    queryClient.invalidateQueries({ queryKey: getGetAllCommunitiesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
  };

  // A member record is what every community-scoped response reads a member's
  // name and contact details from (lucoenergia/conluz#396), so besides the
  // roster it refreshes every read here that shows the member: the community's
  // supplies and each supply's detail (their owner), the member's own supplies
  // and the member as a user (the supply list names them), and the user list
  // the community admins dialog offers.
  const invalidateMemberReads = (userId: string) => {
    queryClient.invalidateQueries({ queryKey: getGetAllSuppliesQueryKey(communityId) });
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && SUPPLY_DETAIL_QUERY_URL.test(key);
      },
    });
    queryClient.invalidateQueries({ queryKey: getGetSuppliesByUserIdQueryKey(userId) });
    queryClient.invalidateQueries({ queryKey: getGetUserByIdQueryKey(userId) });
    queryClient.invalidateQueries({ queryKey: getGetAllUsersQueryKey() });
  };

  const run = async (call: () => Promise<unknown>) => {
    try {
      await call();
      invalidateAfterWrite();
      return true;
    } catch {
      return false;
    }
  };

  const invalidateRoster = () =>
    queryClient.invalidateQueries({ queryKey: getGetMembershipsQueryKey(communityId) });

  /**
   * A write whose refusal the screen words itself. `afterSuccess` is the
   * invalidation the write calls for; a refusal in `staleRowCodes` refetches
   * the roster as well, since it says the row changed under the screen.
   */
  const write = async <T>(
    call: () => Promise<T>,
    afterSuccess: () => void,
    staleRowCodes: readonly RestErrorDetailCode[] = [],
  ): Promise<MembershipWriteResult<T>> => {
    try {
      const value = await call();
      afterSuccess();
      return { ok: true, value };
    } catch (error) {
      const code = getFirstApiErrorCode(error);
      if (code && staleRowCodes.includes(code)) invalidateRoster();
      return { error };
    }
  };

  const addOutcome = outcomeFromResource(community?.capabilities, "canManageMemberships");
  const registerOutcome = outcomeFromResource(community?.capabilities, "canRegisterMembers");
  const sendPendingOutcome = outcomeFromResource(community?.capabilities, "canInviteMembers");

  return {
    actions: {
      add: grant(
        addOutcome,
        (data: CreateMembershipBody) => run(() => createMutation.mutateAsync({ communityId, data })),
        createMutation.isPending,
      ),
      // A registration adds a member, so the community's member count moves
      // with the roster. It cannot be the caller's: they are a member already.
      register: grant(
        registerOutcome,
        (data: RegisterMemberBody) =>
          write(
            () => registerMutation.mutateAsync({ communityId, data }),
            () => {
              invalidateRoster();
              queryClient.invalidateQueries({ queryKey: getGetAllCommunitiesQueryKey() });
            },
          ),
        registerMutation.isPending,
      ),
      sendPendingInvitations: grant(
        sendPendingOutcome,
        () => write(() => sendInvitationsMutation.mutateAsync({ communityId }), invalidateRoster),
        sendInvitationsMutation.isPending,
      ),
    },
    outcomes: { add: addOutcome, register: registerOutcome, sendPendingInvitations: sendPendingOutcome },

    forMembership: (membership) => {
      const userId = membership?.user?.id ?? "";
      const capabilities = membership?.capabilities;

      const changeRole = outcomeFromResource(capabilities, "canUpdateRole");
      const remove = outcomeFromResource(capabilities, "canDelete");
      const investment = outcomeFromResource(capabilities, "canManageInvestment");
      // A backend that predates these capabilities leaves them out, and a
      // missing capability is a denial: the actions stay hidden until it sends them.
      const editRecord = outcomeFromResource(capabilities, "canEditRecord");
      const enable = outcomeFromResource(capabilities, "canEnable");
      const disable = outcomeFromResource(capabilities, "canDisable");
      // One capability covers the three invitation writes; whether one applies
      // right now is the row's state, which the screen reads.
      const invitation = outcomeFromResource(capabilities, "canInvite");

      return {
        actions: {
          changeRole: grant(
            changeRole,
            (data: UpdateMembershipRoleBody) =>
              run(() => updateRoleMutation.mutateAsync({ communityId, userId, data })),
            updateRoleMutation.isPending,
          ),
          remove: grant(
            remove,
            () => write(() => deleteMutation.mutateAsync({ communityId, userId }), invalidateAfterWrite),
            deleteMutation.isPending,
          ),
          setInvestment: grant(
            investment,
            (data: SetMembershipInvestmentBody) =>
              run(() => setInvestmentMutation.mutateAsync({ communityId, userId, data })),
            setInvestmentMutation.isPending,
          ),
          clearInvestment: grant(
            investment,
            () => run(() => clearInvestmentMutation.mutateAsync({ communityId, userId })),
            clearInvestmentMutation.isPending,
          ),
          editRecord: grant(
            editRecord,
            async (data: UpdateMemberRecordBody): Promise<EditMemberRecordResult> => {
              try {
                await updateRecordMutation.mutateAsync({ communityId, userId, data });
                invalidateAfterWrite();
                invalidateMemberReads(userId);
                return { ok: true };
              } catch (error) {
                return { error };
              }
            },
            updateRecordMutation.isPending,
          ),
          enable: grant(
            enable,
            () => run(() => enableMutation.mutateAsync({ communityId, userId })),
            enableMutation.isPending,
          ),
          disable: grant(
            disable,
            () => run(() => disableMutation.mutateAsync({ communityId, userId })),
            disableMutation.isPending,
          ),
          invite: grant(
            invitation,
            () =>
              write(
                () => inviteMutation.mutateAsync({ communityId, userId }),
                invalidateRoster,
                STALE_ROW_CODES.invite,
              ),
            inviteMutation.isPending,
          ),
          resendInvitation: grant(
            invitation,
            () =>
              write(
                () => resendMutation.mutateAsync({ communityId, userId }),
                invalidateRoster,
                STALE_ROW_CODES.resend,
              ),
            resendMutation.isPending,
          ),
          revokeInvitation: grant(
            invitation,
            () =>
              write(
                () => revokeMutation.mutateAsync({ communityId, userId }),
                invalidateRoster,
                STALE_ROW_CODES.revoke,
              ),
            revokeMutation.isPending,
          ),
        },
        outcomes: {
          changeRole,
          remove,
          setInvestment: investment,
          clearInvestment: investment,
          editRecord,
          enable,
          disable,
          invite: invitation,
          resendInvitation: invitation,
          revokeInvitation: invitation,
        },
      };
    },
  };
}
