import { useGetMembershipHourlyProfile } from "../../../api/memberships/memberships";
import type { MembershipHourlyProfileResponse } from "../../../api/models";
import { useActiveCommunity } from "../../../context/community.context";
import { useLoggedUser } from "../../../context/logged-user.context";

export interface HourlyProfile {
  profile: MembershipHourlyProfileResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * The caller's average day in the active community (#201). The endpoint takes
 * no period: it always covers the latest published month and says which one,
 * so this read waits for nothing else on the page.
 */
export function useHourlyProfile(): HourlyProfile {
  const communityId = useActiveCommunity();
  const userId = useLoggedUser()?.id;

  const query = useGetMembershipHourlyProfile(communityId ?? "", userId ?? "", {
    query: { enabled: !!communityId && !!userId },
  });

  return {
    profile: query.data,
    isLoading: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
}
