import { useQueryClient } from "@tanstack/react-query";
import { getGetAllCommunitiesQueryKey, useCreateCommunity } from "../../api/communities/communities";
import type { CommunityResponse, CreateCommunityBody } from "../../api/models";
import { usePlatformCapabilities, type CapabilityOutcome } from "../permissions";
import { grant, type MaybeAction } from "./action";
import type { CommunityWriteResult } from "./useCommunityActions";

/**
 * The creation that has no resource to hang off, because nothing exists yet to
 * carry the answer.
 *
 * Everything else in this layer reads a capability off a response. This reads
 * the caller's own platform capabilities instead -- no request, they ride on
 * GET /users/current, which the app has already loaded.
 */
export interface PlatformActions {
  actions: {
    createCommunity: MaybeAction<[CreateCommunityBody], CommunityWriteResult<CommunityResponse>>;
  };
  outcomes: {
    createCommunity: CapabilityOutcome;
  };
}

export function usePlatformActions(): PlatformActions {
  const queryClient = useQueryClient();

  const createCommunity = usePlatformCapabilities("canCreateCommunity");

  const createCommunityMutation = useCreateCommunity();

  return {
    actions: {
      createCommunity: grant(
        createCommunity,
        async (data: CreateCommunityBody): Promise<CommunityWriteResult<CommunityResponse>> => {
          try {
            const created = await createCommunityMutation.mutateAsync({ data });
            queryClient.invalidateQueries({ queryKey: getGetAllCommunitiesQueryKey() });
            return { ok: true, value: created };
          } catch (error) {
            return { error };
          }
        },
        createCommunityMutation.isPending,
      ),
    },
    outcomes: { createCommunity },
  };
}
