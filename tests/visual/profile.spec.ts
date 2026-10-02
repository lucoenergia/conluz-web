import {
  test,
  expect,
  FIXED_MEMBER_USER,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

/**
 * The two screens that act on the caller themselves.
 *
 * Captured as a member: both are reachable by any authenticated caller -- they
 * take no id and carry no capability -- so the least-privileged persona is the
 * one that proves it. An admin capture would differ only in the chrome, which
 * belongs to the canaries.
 */

test.describe("Visual baselines", () => {
  test("profile page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto("/profile");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("profile-page.png", await mainRegion(page));
  });

  test("change password page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto("/change-password");
    await expect(page.getByRole("main")).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("change-password-page.png", await mainRegion(page));
  });
});
