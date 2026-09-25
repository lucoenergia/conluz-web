/**
 * Visual baselines — the shared page chrome: app bar and side menu.
 *
 * The layout baselines capture the main region with the app bar masked, and
 * component baselines capture only their component, so none of them sees the
 * chrome any more. These canaries are the only baselines whose subject is the
 * chrome itself: a change to the header or the menu should fail here, once
 * per viewport, rather than in every page baseline.
 *
 * The page is /production as a community admin: an authenticated page the
 * fixtures already serve, and the role whose menu carries the most sections.
 */

import { test, expect, type Page } from "@playwright/test";
import {
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_PLANT,
  FIXED_SHARING_AGREEMENTS,
  injectAuthToken,
  mockAllApiRoutes,
  mockSharingAgreementsPlantRoutes,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

async function openProductionAsCommunityAdmin(page: Page) {
  await injectAuthToken(page);
  await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
  await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
  await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);

  await page.goto("/production");
  // Rendered content first, then stabilize: networkidle alone can fire while
  // the lazy route is still behind its Suspense fallback.
  await expect(page.locator(".MuiCard-root").filter({ hasText: FIXED_PLANT.name })).toBeVisible();
  await stabilizePage(page);
}

test.describe("Visual baselines", () => {
  test("chrome canary: app bar and side menu", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The side menu is permanent only on desktop; mobile has its own canaries.");

    await openProductionAsCommunityAdmin(page);
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();

    // Full page on purpose: the subject is the chrome around the content, the one area no other baseline covers.
    await expect(page).toHaveScreenshot("chrome-canary-desktop.png", { fullPage: true });
  });

  test("chrome canary: app bar, side menu closed", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The closed side menu is a mobile-only state.");

    await openProductionAsCommunityAdmin(page);
    await expect(page.getByRole("button", { name: "menu" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeHidden();

    // Full page on purpose: the subject is the app bar over the page, the one area no other baseline covers.
    await expect(page).toHaveScreenshot("chrome-canary-mobile-menu-closed.png", { fullPage: true });
  });

  test("chrome canary: side menu open", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "At 390px the side menu is a temporary drawer, closed by default.");

    await openProductionAsCommunityAdmin(page);
    await page.getByRole("button", { name: "menu" }).click();
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
    await stabilizePage(page);

    // Viewport, not full page: the open drawer and the app bar are fixed overlays, and a
    // full-page stitch would not show them as a phone does.
    await expect(page).toHaveScreenshot("chrome-canary-mobile-menu-open.png");
  });
});
