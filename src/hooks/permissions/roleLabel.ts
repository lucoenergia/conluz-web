import { CommunityRole } from "../../api/models";
import { useLoggedUser } from "../../context/logged-user.context";
import { useActiveCommunityRole } from "./useActiveCommunityRole";

/**
 * How to describe the current user to themselves -- the badge under their name
 * in the profile menu and on the profile page.
 *
 * Display, not gating. Nothing is shown or hidden on the strength of this, and
 * it is the one sanctioned reason to look at a role: a capability says what
 * somebody may do, and no combination of capabilities spells the word
 * "Administrador de comunidad".
 *
 * It lives here because the lint rule keeps role reads inside this module, so
 * the screens that render the label reach for this instead of the raw role.
 *
 * Empty when there is nothing to say -- a member with no active community --
 * and callers hide the badge entirely rather than render a blank line.
 */
export function useActiveCommunityRoleLabel(): string {
  const loggedUser = useLoggedUser();
  const communityRole = useActiveCommunityRole();

  if (loggedUser?.isPlatformAdmin === true) return "Administrador de plataforma";
  if (communityRole === CommunityRole.COMMUNITY_ADMIN) return "Administrador de comunidad";
  if (communityRole === CommunityRole.COMMUNITY_MEMBER) return "Miembro";
  return "";
}
