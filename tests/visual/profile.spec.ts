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

  // A caller who must change their password (#196): any route sends them here,
  // and the page says why and offers no way out but the change. Entered at "/"
  // so the capture also proves the redirect.
  test("change password page, when the change is required", async ({ page }) => {
    const flaggedMember = { ...FIXED_MEMBER_USER, mustChangePassword: true };
    await injectAuthToken(page);
    await seedActiveCommunity(page, flaggedMember.id);
    await mockAllApiRoutes(page, flaggedMember);

    await page.goto("/");
    await expect(page).toHaveURL(/\/change-password$/);
    await expect(page.getByRole("alert")).toHaveText("Por seguridad, debes cambiar tu contraseña antes de continuar.");
    await expect(page.getByRole("button", { name: "Cancelar" })).toHaveCount(0);
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("change-password-page-forced.png", await mainRegion(page));
  });
});
