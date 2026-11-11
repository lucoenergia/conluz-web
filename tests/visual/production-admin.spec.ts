import {
  test,
  expect,
  COMMUNITY_ADMIN_SUPPLY_CAPABILITIES,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_PLANT,
  FIXED_SUPPLY,
  FIXED_SUPPLY_2,
  hideAppBar,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockPlantDetailRoutes,
  PAGED_PLANTS,
  PAGED_SUPPLIES,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

/**
 * Production as a community admin: the list layout, and the two plant forms
 * that open over it.
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

    await page.goto("/plants");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // The subject is the empty list: a fixture that starts serving plants
    // fails here rather than becoming a plausible baseline.
    await expect(page.getByText("No se encontraron plantas")).toBeVisible();
    await expect(page.getByRole("button", { name: "Crear Planta" })).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("production-list-admin.png", await mainRegion(page));
  });

  // The plant forms open over the list (#373). Admitted: the fields, the
  // supply picker, the date field and the footer composed in a sheet or a
  // dialog are a pixel risk; what each form offers, sends and locks is
  // asserted in PlantFormDialog.create/.edit.spec.tsx and
  // PlantsPage.plantForm.spec.tsx.
  test("create plant overlay", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockPlantDetailRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto("/plants");
    await page.getByRole("button", { name: "Nueva Planta" }).click();
    const dialog = page.getByRole("dialog", { name: /^Crear planta en / });
    // The action has been handed out: a capture of a form that cannot submit would look plausible.
    await expect(dialog.getByRole("button", { name: "Crear planta" })).toBeEnabled();
    await expect(dialog.getByLabel(/^Código de proveedor/)).toBeEditable();
    await stabilizePage(page);

    await expect(dialog).toHaveScreenshot("plant-form-create-overlay.png", await hideAppBar(page));
  });

  test("edit plant overlay", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockPlantDetailRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    // Registered last, so they win: the list holds the plant whose row opens
    // the form, and the community's supplies include the one the plant
    // produces onto, as the backend's always do, so the selector can show it.
    await page.route(
      (url) => /\/api\/v1\/communities\/[^/]+\/plants$/.test(url.pathname),
      (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PAGED_PLANTS) }),
    );
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

    await page.goto("/plants");
    await page.getByRole("button", { name: `Más acciones para ${FIXED_PLANT.name}` }).click();
    await page.getByRole("menuitem", { name: "Editar" }).click();
    const dialog = page.getByRole("dialog", { name: "Editar planta" });
    // Seeded from the plant: a capture of empty fields would look plausible.
    await expect(dialog.getByLabel(/^Nombre/)).toHaveValue(FIXED_PLANT.name);
    await expect(dialog.getByRole("combobox", { name: "Punto de suministro" })).toHaveValue(
      `${FIXED_PLANT.supply.name} (${FIXED_PLANT.supply.code})`,
    );
    await stabilizePage(page);

    await expect(dialog).toHaveScreenshot("plant-form-edit-overlay.png", await hideAppBar(page));
  });
});
