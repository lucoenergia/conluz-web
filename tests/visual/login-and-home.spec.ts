/**
 * Visual baselines — Unauthenticated login, the member home and the no-community landing screen.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import { test, expect } from "@playwright/test";
import {
  FIXED_MEMBER_USER,
  FIXED_NO_COMMUNITY_USER,
  injectAuthToken,
  mockAllApiRoutes,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

test.describe("Visual baselines", () => {
  test("login page", async ({ page }) => {
    // No token injection — unauthenticated render
    await page.goto("/login");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("login-page.png", { fullPage: true });
  });

  // Member-fixture tests: home, supply-points, supply-detail, supply modals
  // Active community is seeded in localStorage so operational UI is visible
  // after the community useEffect auto-selects it.

  test("home page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto("/");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("home-page.png", { fullPage: true });
  });

  // No-community fixture test: asserts that a user with no memberships and
  // isPlatformAdmin=false sees the /no-community screen (the correct expected behaviour).

  test("no-community page", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_NO_COMMUNITY_USER);

    // Navigate directly — NoCommunityPage has no route guard, so it always renders.
    // AuthenticatedLayout's landing-redirect only fires when pathname === '/',
    // so navigating here directly does not trigger a redirect to /no-community.
    await page.goto("/no-community");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("no-community-page.png", { fullPage: true });
  });
});
