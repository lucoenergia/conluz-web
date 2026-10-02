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
    },
  };
}
