import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentUserQueryKey, useChangePassword, useUpdateProfile } from "../../api/users/users";
import type { ChangePasswordBody, UpdateProfileBody } from "../../api/models";
import { type AuthFailure, classifyAuthError } from "../../errors/authErrors";
import { type Action, ungated } from "./action";

export type ChangePasswordResult = { ok: true } | { ok: false; failure: AuthFailure };

/**
 * Saving your own profile.
 *
 * Permanently ungated: PUT /users/profile takes no user id, acts on whoever is
 * calling, and the API documents it as open to any authenticated caller. There
 * is no capability to read because there is no decision to make.
 *
 * This is what the profile screen saves through, and the only way a user
 * changes their own contact details.
 *
 * Changing your own password is the same kind of operation (#196): PUT
 * /users/current/password acts on the caller, so it is ungated for the same
 * reason.
 */
export interface ProfileActions {
  actions: {
    save: Action<[UpdateProfileBody], boolean>;
    changePassword: Action<[ChangePasswordBody], ChangePasswordResult>;
  };
}

export function useProfileActions(): ProfileActions {
  const queryClient = useQueryClient();
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();

  return {
    actions: {
      save: ungated(
        "open to any authenticated caller: PUT /users/profile acts on the caller and takes no id",
        async (data: UpdateProfileBody) => {
          try {
            await updateProfileMutation.mutateAsync({ data });
            // PUT /users/profile changes the caller's own record -- email,
            // address, phone -- and the current user is the app-wide copy of
            // that record, served live from this key (#203). Capabilities and
            // the display name are not among those fields, so this refreshes
            // the data, not the gating.
            queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
            return true;
          } catch {
            return false;
          }
        },
        updateProfileMutation.isPending,
      ),
      changePassword: ungated(
        "open to any authenticated caller: PUT /users/current/password acts on the caller and takes no id",
        async (data: ChangePasswordBody): Promise<ChangePasswordResult> => {
          try {
            await changePasswordMutation.mutateAsync({ data });
            // Nothing to invalidate: a 204 revokes every token issued before
            // it, so the caller's session ends here and the screen clears it.
            return { ok: true };
          } catch (error) {
            return { ok: false, failure: classifyAuthError(error) };
          }
        },
        changePasswordMutation.isPending,
      ),
    },
  };
}
