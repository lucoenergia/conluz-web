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
  mockAllApiRoutes,
  stabilizePage,
} from "./fixtures";

test.describe("Visual baselines", () => {
  // Platform-admin fixture tests: /platform (welcome) and /users (users management).
  // PlatformAdminRoute reads isPlatformAdmin directly from loggedUser (no async
  // community selection needed), so direct page.goto() works reliably.

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

    await expect(page).toHaveScreenshot("platform-dashboard-populated.png", { fullPage: true });
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

    await expect(page).toHaveScreenshot("platform-dashboard-empty.png", { fullPage: true });
  });

  test("users page", async ({ page }) => {
    // Migrated from "partners page" — /partners was removed in Phase 5.1/5.2.
    // The users management screen (/users) is the platform-admin equivalent.
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto("/users");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("users-page.png", { fullPage: true });
  });
});
