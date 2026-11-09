import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { APP_PATH, extractRoutePaths } from "./appRoutes";

/**
 * Creating and editing happen in ResponsiveOverlay, over the page they belong
 * to, never on a page of their own (#368). A route whose path ends in `new` or
 * `edit` is such a page.
 *
 * The routes below predate the rule. Each names the issue that turns it into
 * an overlay, and that issue removes it from here.
 */
const CREATE_EDIT_ROUTE_ALLOWLIST = [
  "/communities/new", // temporary: #374
  "/communities/:communityId/edit", // temporary: #374
];

const isCreateOrEditPath = (path: string) => /\/(new|edit)$/.test(path);

describe("UI-OVL-008 no route for a create or edit flow", () => {
  const paths = extractRoutePaths(readFileSync(APP_PATH, "utf8"));

  // Without this, a reader that silently stops matching passes over an empty list.
  it("UI-OVL-008 reads the route tree at all", () => {
    expect(paths.length, `Found almost no routes in ${APP_PATH}; has the route shape changed?`).toBeGreaterThan(15);
    expect(paths).toContain("/login");
    expect(paths).toContain("/communities/:communityId/admins");
  });

  it("UI-OVL-008 adds no route whose path ends in new or edit", () => {
    const added = paths.filter((path) => isCreateOrEditPath(path) && !CREATE_EDIT_ROUTE_ALLOWLIST.includes(path));

    expect(
      added,
      "Create and edit flows open in ResponsiveOverlay over the page they belong to, not on a route of " +
        "their own. See docs/specs/overlays.md.",
    ).toEqual([]);
  });

  it("UI-OVL-008 keeps no allowlist entry for a route that is gone", () => {
    const stale = CREATE_EDIT_ROUTE_ALLOWLIST.filter((path) => !paths.includes(path));

    expect(stale, "These routes are no longer in App.tsx: remove them from the allowlist").toEqual([]);
  });

  it("UI-OVL-008 tells a create or edit path from a list or a detail path", () => {
    expect(
      ["/things/new", "/communities/:communityId/edit", "/news", "/members", "/production/:plantId"].map(
        isCreateOrEditPath,
      ),
    ).toEqual([true, true, false, false, false]);
  });
});
