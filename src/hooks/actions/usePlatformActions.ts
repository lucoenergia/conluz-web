import { useQueryClient } from "@tanstack/react-query";
import { getGetAllCommunitiesQueryKey, useCreateCommunity } from "../../api/communities/communities";
import { getGetAllUsersQueryKey, useCreateUser } from "../../api/users/users";
import type {
  CommunityResponse,
  CreateCommunityBody,
  CreateUserBody,
  UserResponse,
} from "../../api/models";
import { usePlatformCapabilities, type CapabilityOutcome } from "../permissions";
import { grant, type MaybeAction } from "./action";

/**
 * The two creations that have no resource to hang off, because nothing exists
 * yet to carry the answer.
 *
 * Everything else in this layer reads a capability off a response. These read
 * the caller's own platform capabilities instead -- no request, they ride on
 * GET /users/current, which the app has already loaded.
 *
 * `createUser` appears here AND on useCommunityActions, under different flags.
 * That is not duplication: the platform route /users/new and a community's own
 * member creation are two surfaces the backend authorises separately, and the
 * gate belongs to the surface.
 */
export interface PlatformActions {
  actions: {
    createCommunity: MaybeAction<[CreateCommunityBody], CommunityResponse | undefined>;
    createUser: MaybeAction<[CreateUserBody], UserResponse | undefined>;
  };
  outcomes: {
    createCommunity: CapabilityOutcome;
    createUser: CapabilityOutcome;
  };
}

export function usePlatformActions(): PlatformActions {
  const queryClient = useQueryClient();

  const createCommunity = usePlatformCapabilities("canCreateCommunity");
  const createUser = usePlatformCapabilities("canCreateUsers");

  const createCommunityMutation = useCreateCommunity();
  const createUserMutation = useCreateUser();

  const runCreating = async <T>(call: () => Promise<T>, invalidate: () => void) => {
    try {
      const created = await call();
      invalidate();
      return created;
    } catch {
      return undefined;
    }
  };

  return {
    actions: {
      createCommunity: grant(
        createCommunity,
        (data: CreateCommunityBody) =>
          runCreating(() => createCommunityMutation.mutateAsync({ data }), () =>
            queryClient.invalidateQueries({ queryKey: getGetAllCommunitiesQueryKey() }),
          ),
        createCommunityMutation.isPending,
      ),
      createUser: grant(
        createUser,
        (data: CreateUserBody) =>
          runCreating(() => createUserMutation.mutateAsync({ data }), () =>
            // No params: a prefix key, so every page and search variant matches.
            queryClient.invalidateQueries({ queryKey: getGetAllUsersQueryKey() }),
          ),
        createUserMutation.isPending,
      ),
    },
    outcomes: { createCommunity, createUser },
  };
}
