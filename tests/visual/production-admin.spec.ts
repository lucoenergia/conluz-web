import {
  test,
  expect,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_PLANT_ID,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockPlantDetailRoutes,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

/**
 * Production as a community admin: the list layout, and the two forms behind
 * the capability guards added for this issue.
 *
 * production-member.spec.ts covers the same list for a member, which is where
 * the absence of create and of the card menus is proven. The admin list had no
 * mainRegion capture at all -- only the full-page chrome canaries passed
 * through it.
 */

test.describe("Visual baselines", () => {
  test("production list page (community admin)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockPlantDetailRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto("/production");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("production-list-admin.png", await mainRegion(page));
  });

  test("create plant page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto("/production/new");
    await expect(page.getByRole("main")).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("create-plant-page.png", await mainRegion(page));
  });

  test("edit plant page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockPlantDetailRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto(`/production/${FIXED_PLANT_ID}/edit`);
    await expect(page.getByRole("main")).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("edit-plant-page.png", await mainRegion(page));
  });
});
