import { expect } from "vitest";
import { screen, within } from "@testing-library/react";

/**
 * The page's breadcrumb (UI-LAY-003): a "breadcrumbs" navigation landmark
 * whose steps are exactly "Inicio", linking to "/", then the page itself, the
 * last step being the page's own label (drawn as a chip, not a link).
 */
export function expectPageBreadcrumb(pageLabel: string): void {
  const trail = screen.getByRole("navigation", { name: "breadcrumbs" });
  expect(within(trail).getAllByRole("listitem").map((step) => step.textContent)).toEqual(["Inicio", pageLabel]);
  const links = within(trail).getAllByRole("link");
  expect(links).toHaveLength(1);
  expect(links[0]).toHaveAccessibleName("Inicio");
  expect(links[0]).toHaveAttribute("href", "/");
}
