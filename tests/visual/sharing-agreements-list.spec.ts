/**
 * Visual baselines — A plant's sharing agreements list.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import { test, expect } from "@playwright/test";
import {
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_SHARING_AGREEMENTS,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockSharingAgreementsPlantRoutes,
  navigateToSharingAgreements,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

test.describe("Visual baselines", () => {
  // Community-admin fixture tests: sharing-agreements list.
  // CommunityAdminRoute redirects on a cold page.goto() before the community
  // context's useEffect resolves (see file header), so these tests reach the
  // guarded route the same way a real user would — navigating from the
  // unguarded /production list and clicking through the plant card's kebab
  // menu — rather than deep-linking directly.

  test("sharing agreements list page (populated)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);

    await navigateToSharingAgreements(page);

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    await expect(page).toHaveScreenshot("sharing-agreements-list.png", await mainRegion(page));
  });

  test("sharing agreements list page (empty)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, []);

    await navigateToSharingAgreements(page);

    await expect(page).toHaveScreenshot("sharing-agreements-list-empty.png", { fullPage: true });
  });

  test("sharing agreements list page (status filter active)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);

    await navigateToSharingAgreements(page);

    await page.getByRole("button", { name: "Borrador" }).click();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreements-list-filtered.png", { fullPage: true });
  });
});
