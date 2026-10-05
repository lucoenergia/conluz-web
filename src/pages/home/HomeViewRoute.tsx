import type { FC, ReactNode } from "react";
import { Navigate } from "react-router";
import { HOME_VIEW_PATHS } from "./homeViewPaths";
import { useHomeViews, type HomeView } from "./useHomeViews";

const OTHER_VIEW: Record<HomeView, HomeView> = { member: "management", management: "member" };

/**
 * Renders a home view only for a caller who has it, and sends anyone else to
 * the one they do have.
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
  if (outcome.state === "denied") return <Navigate replace to={HOME_VIEW_PATHS[OTHER_VIEW[view]]} />;
  if (outcome.state !== "allowed") return null;
  return children;
};

/** /home itself: the view the caller lands on, management for an admin. */
export const HomeIndexRedirect: FC = () => {
  const { management } = useHomeViews();
  if (management.state === "allowed") return <Navigate replace to={HOME_VIEW_PATHS.management} />;
  if (management.state === "denied") return <Navigate replace to={HOME_VIEW_PATHS.member} />;
  return null;
};
