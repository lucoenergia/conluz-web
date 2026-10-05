import { useGetMembershipPayback } from "../../../api/memberships/memberships";
import type { MembershipPaybackResponse } from "../../../api/models";
import { useActiveCommunity } from "../../../context/community.context";
import { useLoggedUser } from "../../../context/logged-user.context";

export interface MemberPayback {
  payback: MembershipPaybackResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}

/** How far the caller is from recovering their investment in the active community (#199). */
export function useMemberPayback(): MemberPayback {
  const communityId = useActiveCommunity();
  const userId = useLoggedUser()?.id;

  const query = useGetMembershipPayback(communityId ?? "", userId ?? "", {
    query: { enabled: !!communityId && !!userId },
  });

  return {
    payback: query.data,
    isLoading: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
}
