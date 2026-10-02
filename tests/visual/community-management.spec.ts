import {
  test,
  expect,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_DATADIS_CONFIG,
  FIXED_MEMBERSHIPS,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockCommunityManagementRoutes,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

/**
 * The two screens behind the community-admin menu section.
 *
 * Captured as a community admin because nobody else can reach either: the
 * routes require canManageMemberships and canManage, and a platform admin
 * holds neither by virtue of the flag. There is no second persona to capture.
 *
 * /members had no capture at all. The guard it once had redirected on a cold
 * page.goto before the community context resolved, which is why the suite
 * avoided it; CapabilityRoute waits for the answer now, so a deep link lands.
 */

test.describe("Visual baselines", () => {
  test("members page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockCommunityManagementRoutes(page);

    await page.goto("/members");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Asserted before the capture, because a baseline of an empty roster would
    // look plausible and get regenerated -- enshrining a broken fixture rather
    // than failing. The rows have to be there for the picture to mean anything.
    await expect(page.getByText(FIXED_MEMBERSHIPS[1].user?.fullName ?? "")).toBeVisible();
    await expect(page.getByText("Inactivo")).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("members-page.png", await mainRegion(page));
  });

  test("integrations page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockCommunityManagementRoutes(page);

    await page.goto("/integrations");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // As above: a card stuck on its loading state would capture cleanly and
    // tell nobody anything. The username field carries the fetched value, so it
    // is what proves the config arrived rather than the card merely rendering.
    // Three providers each have a "Usuario" field, so this is scoped to the
    // Datadis card by its own heading.
    await expect(
      page.getByRole("textbox", { name: "Usuario" }).first(),
    ).toHaveValue(FIXED_DATADIS_CONFIG.username ?? "");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("integrations-page.png", await mainRegion(page));
  });
});
