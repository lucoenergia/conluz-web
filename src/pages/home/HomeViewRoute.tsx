import type { FC, ReactNode } from "react";
import { Navigate } from "react-router";
import { HOME_VIEW_PATHS, MANAGEMENT_DESTINATION } from "./homeViewPaths";
import { useHomeViews, type HomeView } from "./useHomeViews";

/** Where a caller is sent from a view they do not have. */
const INSTEAD_OF: Record<HomeView, string> = {
  member: MANAGEMENT_DESTINATION,
  management: HOME_VIEW_PATHS.member,
};

/**
 * Renders a home view only for a caller who has it, and sends anyone else to
 * the one they do have -- or, for the management view, to where
 * MANAGEMENT_DESTINATION says it is reached from.
 *
 * A denial here is not a refusal, as it is in CapabilityRoute: every member of
 * the community has one of the two views, so the other one is where they
 * belong. That holds across a community switch too -- the keyed Outlet remounts
 * this route, it resolves again against the new community, and a view the new
 * community does not grant gives way to the one it does.
 *
 * Nothing renders until the answer is known, so neither view is shown and then
 * replaced. Failing to find out is not handled here: both views rest on the
 * active community's capabilities, which the CapabilityRoute around every home
 * route reads from the same query, so a failure surfaces there, with its retry,
 * and this never mounts.
 */
export const HomeViewRoute: FC<{ view: HomeView; children: ReactNode }> = ({ view, children }) => {
  const outcome = useHomeViews()[view];
  if (outcome.state === "denied") return <Navigate replace to={INSTEAD_OF[view]} />;
  if (outcome.state !== "allowed") return null;
  return children;
};

/**
 * /home itself, where the login and the menu's Inicio lead: the member view
 * for a caller who has it, and MANAGEMENT_DESTINATION for an admin who does
 * not.
 */
export const HomeIndexRedirect: FC = () => {
  const { member } = useHomeViews();
  if (member.state === "allowed") return <Navigate replace to={HOME_VIEW_PATHS.member} />;
  if (member.state === "denied") return <Navigate replace to={MANAGEMENT_DESTINATION} />;
  return null;
};
