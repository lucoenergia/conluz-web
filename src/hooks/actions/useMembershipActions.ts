import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMembershipsQueryKey,
  useCreateMembership,
  useDeleteMembership,
  useSetMembershipInvestment,
  useClearMembershipInvestment,
  useUpdateMembershipRole,
} from "../../api/memberships/memberships";
import { getGetAllCommunitiesQueryKey } from "../../api/communities/communities";
import { getGetCurrentUserQueryKey } from "../../api/users/users";
import type {
  CommunityResponse,
  CreateMembershipBody,
  MembershipResponse,
  SetMembershipInvestmentBody,
  UpdateMembershipRoleBody,
} from "../../api/models";
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
    remove: MaybeAction<[], boolean>;
    setInvestment: MaybeAction<[SetMembershipInvestmentBody], boolean>;
    clearInvestment: MaybeAction<[], boolean>;
  };
  outcomes: {
    changeRole: CapabilityOutcome;
    remove: CapabilityOutcome;
    setInvestment: CapabilityOutcome;
    clearInvestment: CapabilityOutcome;
  };
}

export interface MembershipActions {
  actions: { add: MaybeAction<[CreateMembershipBody], boolean> };
  outcomes: { add: CapabilityOutcome };
  /**
   * The per-row gate.
   *
   * A plain function, not a hook: the capability is already on the row, so there
   * is nothing to fetch, and a hook could not be called once per row of a table
   * anyway. The mutations above are instantiated once and shared, so `isPending`
   * is true while any row is mutating -- which is what the pages already do with
   * their single useDeleteMembership.
   */
  forMembership: (membership: MembershipResponse | undefined) => MembershipRowActions;
}

export function useMembershipActions(community: CommunityResponse | undefined): MembershipActions {
  const queryClient = useQueryClient();
  const communityId = community?.id ?? "";

  const createMutation = useCreateMembership();
  const deleteMutation = useDeleteMembership();
  const updateRoleMutation = useUpdateMembershipRole();
  const setInvestmentMutation = useSetMembershipInvestment();
  const clearInvestmentMutation = useClearMembershipInvestment();

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

  const run = async (call: () => Promise<unknown>) => {
    try {
      await call();
      invalidateAfterWrite();
      return true;
    } catch {
      return false;
    }
  };

  const addOutcome = outcomeFromResource(community?.capabilities, "canManageMemberships");

  return {
    actions: {
      add: grant(
        addOutcome,
        (data: CreateMembershipBody) => run(() => createMutation.mutateAsync({ communityId, data })),
        createMutation.isPending,
      ),
    },
    outcomes: { add: addOutcome },

    forMembership: (membership) => {
      const userId = membership?.user?.id ?? "";
      const capabilities = membership?.capabilities;

      const changeRole = outcomeFromResource(capabilities, "canUpdateRole");
      const remove = outcomeFromResource(capabilities, "canDelete");
      const investment = outcomeFromResource(capabilities, "canManageInvestment");

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
            () => run(() => deleteMutation.mutateAsync({ communityId, userId })),
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
        },
        outcomes: { changeRole, remove, setInvestment: investment, clearInvestment: investment },
      };
    },
  };
}
