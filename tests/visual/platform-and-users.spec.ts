/**
 * Visual baselines — Platform-admin screens: the platform dashboard and user management.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import { test, expect, type Route } from "@playwright/test";
import {
  DASHBOARD_COMMUNITIES,
  FIXED_PLATFORM_ADMIN_USER,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  stabilizePage,
} from "./fixtures";

test.describe("Visual baselines", () => {
  // Platform-admin fixture tests: /platform (welcome) and /users (users management).
  // Platform capabilities come off the current user, with no community
  // selection to wait for, so a direct page.goto() has always worked here.

  // Platform dashboard — populated. A richer communities fixture (registered
  // AFTER mockAllApiRoutes so it is consulted first) exercises every KPI, the
  // attention panel (all three signals), and all four status-chip variants.
  test("platform dashboard (populated)", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
    await page.route(
      (url) => url.href.includes("/api/v1/communities") && !url.href.includes("/supplies"),
      (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(DASHBOARD_COMMUNITIES),
        }),
    );

    await page.goto("/platform");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    await expect(page).toHaveScreenshot("platform-dashboard-populated.png", await mainRegion(page));
  });

  // Platform dashboard — empty (0 communities → first-community empty state).
  test("platform dashboard (empty)", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
    await page.route(
      (url) => url.href.includes("/api/v1/communities") && !url.href.includes("/supplies"),
      (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        }),
    );

    await page.goto("/platform");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    await expect(page).toHaveScreenshot("platform-dashboard-empty.png", await mainRegion(page));
  });

  test("users page", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto("/users");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    await expect(page).toHaveScreenshot("users-page.png", await mainRegion(page));
  });

  /**
   * Not a baseline: an assertion, so it writes no PNG and nothing has to be
   * regenerated for it. The subject is reachability, which a screenshot would
   * only record indirectly.
   *
   * /integrations gates on the community's canManage. A platform admin who
   * belongs to no community holds no community capability at all, and the
   * platform flag is never a grant over a community's data -- so the guard
   * denies, sends them to "/", and the landing redirect lands them on
   * /platform. The page's own cards are gated too (IntegrationsPage.spec.tsx),
   * but this is the route refusing before any of that is reached.
   */
  test("a platform admin who is not a member cannot reach integrations", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto("/integrations");
    await stabilizePage(page);

    await expect(page).toHaveURL(/\/platform$/);
    await expect(page.getByRole("heading", { name: "Integraciones" })).toHaveCount(0);
  });
});
