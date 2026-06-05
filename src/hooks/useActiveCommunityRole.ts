import { useLoggedUser } from "../context/logged-user.context";
import { useActiveCommunity } from "../context/community.context";
import type { CommunityRole } from "../api/models";

export function useActiveCommunityRole(): CommunityRole | null {
  const loggedUser = useLoggedUser();
  const activeCommunityId = useActiveCommunity();

  if (!activeCommunityId || !loggedUser?.memberships) {
    return null;
  }
  return (loggedUser.memberships[activeCommunityId] as CommunityRole) ?? null;
}

export function useIsPlatformAdmin(): boolean {
  const loggedUser = useLoggedUser();
  return loggedUser?.isPlatformAdmin === true;
}
