import type { HomeView } from "./useHomeViews";

/** Where each home view lives. The path, not stored state, says which view is open (#197). */
export const HOME_VIEW_PATHS: Record<HomeView, string> = {
  member: "/home/member",
  management: "/home/management",
};
