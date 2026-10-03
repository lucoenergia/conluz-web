import type { FC } from "react";
import { Link } from "react-router";
import { Tab, Tabs } from "@mui/material";
import { HOME_VIEW_PATHS } from "./homeViewPaths";
import { useHomeViews, type HomeView } from "./useHomeViews";

const LABELS: Record<HomeView, string> = {
  member: "Tu energía",
  management: "Gestión",
};

/**
 * Moves between the two home views, for the caller who has both: a community
 * admin who owns supplies in the active community. Anyone with one view gets
 * no switch at all, rather than a tab that leads nowhere.
 *
 * Each tab is a link, so the view stays in the URL and a reload or a copied
 * link opens the same one.
 */
export const HomeViewSwitch: FC<{ current: HomeView }> = ({ current }) => {
  const { member, management } = useHomeViews();
  if (member.state !== "allowed" || management.state !== "allowed") return null;

  return (
    <Tabs value={current} aria-label="Vistas de inicio" variant="fullWidth" sx={{ mb: 3, maxWidth: 480 }}>
      {(["management", "member"] as const).map((view) => (
        <Tab key={view} value={view} label={LABELS[view]} component={Link} to={HOME_VIEW_PATHS[view]} />
      ))}
    </Tabs>
  );
};
