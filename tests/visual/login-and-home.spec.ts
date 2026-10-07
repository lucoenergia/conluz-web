/**
 * Visual baselines — Unauthenticated login and the no-community landing screen. The home views
 * have their own captures in home-views.spec.ts.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import {
  test,
  expect,
  FIXED_NO_COMMUNITY_USER,
  injectAuthToken,
  LAYOUT_MAX_DIFF_PIXELS,
  mainRegion,
  mockAllApiRoutes,
  stabilizePage,
} from "./fixtures";

test.describe("Visual baselines", () => {
  test("login page", async ({ page }) => {
    // No token injection — unauthenticated render
    await page.goto("/login");
    await stabilizePage(page);

    // Full page on purpose: /login has no main landmark and no app bar, so the page is the content.
    await expect(page).toHaveScreenshot("login-page.png", { fullPage: true, maxDiffPixels: LAYOUT_MAX_DIFF_PIXELS });
  });

  // No-community fixture test: asserts that a user with no memberships and
  // isPlatformAdmin=false sees the /no-community screen (the correct expected behaviour).

  test("no-community page", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_NO_COMMUNITY_USER);

    // Navigate directly — NoCommunityPage has no route guard, so it always renders.
    // The landing at "/" would send this caller here as well; opening the page
    // directly captures it without depending on that step.
    await page.goto("/no-community");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    await expect(page).toHaveScreenshot("no-community-page.png", await mainRegion(page));
  });
});
