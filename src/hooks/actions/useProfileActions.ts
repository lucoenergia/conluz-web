import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentUserQueryKey, useUpdateProfile } from "../../api/users/users";
import type { UpdateProfileBody } from "../../api/models";
import { type Action, ungated } from "./action";

/**
 * Saving your own profile.
 *
 * Permanently ungated: PUT /users/profile takes no user id, acts on whoever is
 * calling, and the API documents it as open to any authenticated caller. There
 * is no capability to read because there is no decision to make.
 *
 * This is what the profile screen saves through. The alternative, the
 * administrative PUT /users/{userId}, answers canEdit false for an ordinary
 * member looking at their own record, so a profile page built on it has no
 * save button for the people who use it most.
 */
export interface ProfileActions {
  actions: { save: Action<[UpdateProfileBody], boolean> };
}

export function useProfileActions(): ProfileActions {
  const queryClient = useQueryClient();
  const updateProfileMutation = useUpdateProfile();

  return {
    actions: {
      save: ungated(
        "open to any authenticated caller: PUT /users/profile acts on the caller and takes no id",
        async (data: UpdateProfileBody) => {
          try {
            await updateProfileMutation.mutateAsync({ data });
            // The header, the menu and every platform gate read this response.
            queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
            return true;
          } catch {
            return false;
          }
        },
        updateProfileMutation.isPending,
      ),
    },
  };
}
