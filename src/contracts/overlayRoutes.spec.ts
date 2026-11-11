import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { APP_PATH, extractRoutePaths } from "./appRoutes";

/**
 * Creating and editing happen in ResponsiveOverlay, over the page they belong
 * to, never on a page of their own (#368). A route whose path ends in `new` or
 * `edit` is such a page.
 *
 * Every route that predated the rule has become an overlay (the last two in
 * #374), so the list is empty. An entry goes on its own line with a comment:
 * a permanent one says why it is not an overlay flow, a temporary one names
 * the issue that removes it. An entry with neither is not added.
 */
const CREATE_EDIT_ROUTE_ALLOWLIST: string[] = [];

const isCreateOrEditPath = (path: string) => /\/(new|edit)$/.test(path);

/** The routes the rule refuses: a create or edit path the allowlist does not name. */
const refusedPaths = (paths: string[]) =>
  paths.filter((path) => isCreateOrEditPath(path) && !CREATE_EDIT_ROUTE_ALLOWLIST.includes(path));

describe("UI-OVL-008 no route for a create or edit flow", () => {
  const paths = extractRoutePaths(readFileSync(APP_PATH, "utf8"));

  // Without this, a reader that silently stops matching passes over an empty list.
  it("UI-OVL-008 reads the route tree at all", () => {
    expect(paths.length, `Found almost no routes in ${APP_PATH}; has the route shape changed?`).toBeGreaterThan(15);
    expect(paths).toContain("/login");
    expect(paths).toContain("/communities/:communityId/admins");
  });

  it("UI-OVL-008 adds no route whose path ends in new or edit", () => {
    const added = refusedPaths(paths);

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
      ["/things/new", "/things/:thingId/edit", "/news", "/members", "/plants/:plantId"].map(
        isCreateOrEditPath,
      ),
    ).toEqual([true, true, false, false, false]);
  });

  // With nothing left on the allowlist, the check must still refuse a new
  // route rather than pass because there is nothing to compare against.
  it("UI-OVL-008 still refuses a create or edit route added to the tree, with an empty allowlist", () => {
    expect(CREATE_EDIT_ROUTE_ALLOWLIST).toEqual([]);
    expect(refusedPaths([...paths, "/things/new", "/things/:thingId/edit"])).toEqual([
      "/things/new",
      "/things/:thingId/edit",
    ]);
  });
});
