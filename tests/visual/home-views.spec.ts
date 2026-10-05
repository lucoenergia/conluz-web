/**
 * Visual baselines — the member and management home views (#197).
 *
 * Both carry placeholder content and are reached only by a direct URL. They are
 * captured now so the issues that fill them have a diff to review rather than a
 * new baseline. Each is captured with the persona that has it, and the switch
 * with the one caller who gets it: a community admin who owns a supply here.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import {
  test,
  expect,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_MEMBER_USER,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockCommunityAdminOwnsSupply,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

test.describe("Visual baselines", () => {
  test("member home view", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto("/home/member");
    await expect(page.getByRole("heading", { name: "Tu energía", level: 1 })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Vistas de inicio" })).toHaveCount(0);
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-view-member.png", await mainRegion(page));
  });

  test("management home view (admin owning no supplies)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto("/home/management");
    await expect(page.getByRole("heading", { name: "Gestión de la comunidad", level: 1 })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Vistas de inicio" })).toHaveCount(0);
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-view-management.png", await mainRegion(page));
  });

  test("management home view with the switch (admin owning a supply)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockCommunityAdminOwnsSupply(page);

    await page.goto("/home/management");
    await expect(page.getByRole("heading", { name: "Gestión de la comunidad", level: 1 })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Tu energía" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Gestión", selected: true })).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-view-management-with-switch.png", await mainRegion(page));
  });
});
