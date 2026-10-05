import type { HomeView } from "./useHomeViews";

/** Where each home view lives. The path, not stored state, says which view is open (#197). */
export const HOME_VIEW_PATHS: Record<HomeView, string> = {
  member: "/home/member",
  management: "/home/management",
};

/**
 * Where a caller whose view is management is sent when they did not ask for
 * it by URL: from /home, from the login, and from a member view they do not
 * have.
 *
 * "/" rather than the management view while that view is a placeholder, so
 * that linking the home exposes no placeholder to an admin. #198 points this
 * at HOME_VIEW_PATHS.management once the view has content.
 */
export const MANAGEMENT_DESTINATION = "/";
