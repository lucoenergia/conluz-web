import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAllUsersQueryKey,
  getGetCurrentUserQueryKey,
  getGetUserByIdQueryKey,
  useDeleteUser,
  useDisableUser,
  useEnableUser,
  useGrantPlatformAdmin,
  useRevokePlatformAdmin,
  useUpdateUser,
} from "../../api/users/users";
import type { UpdateUserBody, UserResponse } from "../../api/models";
import { outcomeFromResource, type CapabilityOutcome } from "../permissions";
import { grant, type MaybeAction } from "./action";

/**
 * What the caller may do to one user account.
 *
 * The one resource whose capabilities are fully granular: six actions, six
 * flags, no umbrella. Nothing here is approximated.
 *
 * Note what is NOT here: the profile screen's save. `edit` is the
 * administrative PUT /users/{userId}, whose canEdit is false for an ordinary
 * member looking at their own record, so a self-edit routed through it would
 * have no save button at all. Saving your own contact details is
 * useProfileActions, on PUT /users/profile.
 */
export interface UserRowActions {
  actions: {
    edit: MaybeAction<[UpdateUserBody], boolean>;
    remove: MaybeAction<[], boolean>;
    enable: MaybeAction<[], boolean>;
    disable: MaybeAction<[], boolean>;
    grantPlatformAdmin: MaybeAction<[], boolean>;
    revokePlatformAdmin: MaybeAction<[], boolean>;
  };
  outcomes: {
    edit: CapabilityOutcome;
    remove: CapabilityOutcome;
    enable: CapabilityOutcome;
    disable: CapabilityOutcome;
    grantPlatformAdmin: CapabilityOutcome;
    revokePlatformAdmin: CapabilityOutcome;
  };
}

export interface UserActions {
  /** See useMembershipActions for why this is a plain function and not a hook. */
  forUser: (user: UserResponse | undefined) => UserRowActions;
}

export function useUserActions(): UserActions {
  const queryClient = useQueryClient();

  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const enableMutation = useEnableUser();
  const disableMutation = useDisableUser();
  const grantMutation = useGrantPlatformAdmin();
  const revokeMutation = useRevokePlatformAdmin();

  const invalidateUser = (userId: string) => {
    queryClient.invalidateQueries({ queryKey: getGetUserByIdQueryKey(userId) });
    // No params: a prefix key, so every page and search variant of the list matches.
    queryClient.invalidateQueries({ queryKey: getGetAllUsersQueryKey() });
  };

  const run = async (call: () => Promise<unknown>, userId: string) => {
    try {
      await call();
      invalidateUser(userId);
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Granting or revoking platform admin can be aimed at the signed-in account,
   * and the whole app reads its platform capabilities from the current-user
   * response. Leaving that cached would keep offering pages the router has just
   * started refusing.
   */
  const runPlatformAdminChange = async (call: () => Promise<unknown>, userId: string) => {
    const changed = await run(call, userId);
    if (changed) queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
    return changed;
  };

  return {
    forUser: (user) => {
      const userId = user?.id ?? "";
      const capabilities = user?.capabilities;

      const edit = outcomeFromResource(capabilities, "canEdit");
      const remove = outcomeFromResource(capabilities, "canDelete");
      const enable = outcomeFromResource(capabilities, "canEnable");
      const disable = outcomeFromResource(capabilities, "canDisable");
      const grantPlatformAdmin = outcomeFromResource(capabilities, "canGrantPlatformAdmin");
      const revokePlatformAdmin = outcomeFromResource(capabilities, "canRevokePlatformAdmin");

      return {
        actions: {
          edit: grant(
            edit,
            (data: UpdateUserBody) => run(() => updateMutation.mutateAsync({ userId, data }), userId),
            updateMutation.isPending,
          ),
          remove: grant(
            remove,
            async () => {
              try {
                await deleteMutation.mutateAsync({ userId });
                // Removed, not invalidated: the account is gone, so refetching
                // it would 404 right after a successful delete.
                queryClient.removeQueries({ queryKey: getGetUserByIdQueryKey(userId) });
                queryClient.invalidateQueries({ queryKey: getGetAllUsersQueryKey() });
                return true;
              } catch {
                return false;
              }
            },
            deleteMutation.isPending,
          ),
          enable: grant(
            enable,
            () => run(() => enableMutation.mutateAsync({ userId }), userId),
            enableMutation.isPending,
          ),
          disable: grant(
            disable,
            () => run(() => disableMutation.mutateAsync({ userId }), userId),
            disableMutation.isPending,
          ),
          grantPlatformAdmin: grant(
            grantPlatformAdmin,
            () => runPlatformAdminChange(() => grantMutation.mutateAsync({ userId }), userId),
            grantMutation.isPending,
          ),
          revokePlatformAdmin: grant(
            revokePlatformAdmin,
            () => runPlatformAdminChange(() => revokeMutation.mutateAsync({ userId }), userId),
            revokeMutation.isPending,
          ),
        },
        outcomes: { edit, remove, enable, disable, grantPlatformAdmin, revokePlatformAdmin },
      };
    },
  };
}
