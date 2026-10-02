import { useLocation } from "react-router";
import { resolvePageScope, type PageScope } from "../utils/routes";

/** The scope of the page currently rendered, derived from the route. */
export function usePageScope(): PageScope {
  const { pathname } = useLocation();
  return resolvePageScope(pathname);
}
