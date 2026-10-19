import {
  test,
  expect,
  COMMUNITY_ADMIN_SUPPLY_CAPABILITIES,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_PLANT,
  FIXED_PLANT_ID,
  FIXED_SUPPLY,
  FIXED_SUPPLY_2,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockPlantDetailRoutes,
  PAGED_SUPPLIES,
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
  test("production list page, empty (community admin)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockPlantDetailRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto("/production");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // The subject is the empty list: a fixture that starts serving plants
    // fails here rather than becoming a plausible baseline.
    await expect(page.getByText("No se encontraron plantas")).toBeVisible();
    await expect(page.getByRole("button", { name: "Crear Planta" })).toBeVisible();
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

    // Registered last, so it wins: the community's supplies include the one
    // the plant produces onto, as the backend's always do, so the form's
    // selector can show it.
    const plantSupply = { ...FIXED_SUPPLY, ...FIXED_PLANT.supply };
    await page.route(
      (url) => /\/api\/v1\/communities\/[^/]+\/supplies$/.test(url.pathname),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...PAGED_SUPPLIES,
            items: [plantSupply, FIXED_SUPPLY_2].map((supply) => ({
              ...supply,
              capabilities: COMMUNITY_ADMIN_SUPPLY_CAPABILITIES,
            })),
          }),
        }),
    );

    await page.goto(`/production/${FIXED_PLANT_ID}/edit`);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Punto de suministro" })).toHaveValue(
      `${FIXED_PLANT.supply.name} (${FIXED_PLANT.supply.code})`,
    );
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("edit-plant-page.png", await mainRegion(page));
  });
});
