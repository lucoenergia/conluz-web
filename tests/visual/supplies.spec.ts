/**
 * Visual baselines — Supply points: list, detail, coefficient history section and the supply modals.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import {
  test,
  expect,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_MEMBER_USER,
  FIXED_SUPPLY_COEFFICIENT_HISTORY,
  FIXED_SUPPLY_ID,
  freezeClock,
  hideAppBar,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockSupplyPartitionCoefficientRoutes,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

test.describe("Visual baselines", () => {
  // Member-fixture tests: home, supply-points, supply-detail, supply modals
  // Active community is seeded in localStorage so operational UI is visible
  // after the community useEffect auto-selects it.

  test("supplies list page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto("/supply-points");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    // Interim mask: the kWh figure is Math.random() in SupplyPointsPage, production non-determinism no
    // fixture can pin. Remove it with the change request "Supply cards show members an invented consumption
    // figure". The tile keeps its size for 1- and 2-digit values, so the mask hides all of the variation.
    await expect(page).toHaveScreenshot("supplies-list.png", await mainRegion(page, [page.getByText(/^\d+ kWh$/)]));
  });

  test("supply detail page", async ({ page }) => {
    // The capture includes GraphFilter's date input, which defaults to today.
    await freezeClock(page);
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto(`/supply-points/${FIXED_SUPPLY_ID}`);
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    await expect(page).toHaveScreenshot("supply-detail.png", await mainRegion(page));
  });

  // The coefficient history section is reachable by the owner as well as by an
  // admin: /supply-points/:id carries no community guard and the endpoint
  // authorises the supply owner. These three cover both roles and the empty
  // state, on a supply that genuinely takes part in two plants.

  test("supply detail coefficient history (admin, two plants)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSupplyPartitionCoefficientRoutes(page, FIXED_SUPPLY_COEFFICIENT_HISTORY, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto(`/supply-points/${FIXED_SUPPLY_ID}`);
    await expect(page.getByRole("heading", { name: "Histórico de coeficientes" })).toBeVisible();
    await stabilizePage(page);

    await expect(page.getByTestId("supply-coefficient-history")).toHaveScreenshot("supply-detail-coefficient-history-admin.png", await hideAppBar(page));

    // No plantId filter here, so both plants group; the draft's pending period
    // is withheld even though an admin receives it.
    await expect(page.getByRole("heading", { name: "Planta Solar Norte" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Planta Solar Sur" })).toBeVisible();
    await expect(page.getByText("Reparto ampliación bloque B")).toHaveCount(0);
    // An admin of this community can follow a link to the agreement.
    await expect(page.getByRole("link", { name: "Reparto vecinos bloque A" })).toBeVisible();
  });

  test("supply detail coefficient history (owner, no agreement links)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);
    await mockSupplyPartitionCoefficientRoutes(page, FIXED_SUPPLY_COEFFICIENT_HISTORY, FIXED_MEMBER_USER);

    await page.goto(`/supply-points/${FIXED_SUPPLY_ID}`);
    await expect(page.getByRole("heading", { name: "Histórico de coeficientes" })).toBeVisible();
    await stabilizePage(page);

    await expect(page.getByTestId("supply-coefficient-history")).toHaveScreenshot("supply-detail-coefficient-history-owner.png", await hideAppBar(page));

    // Same periods, but the agreement route requires the plant's
    // canListSharingAgreements, so an owner is shown names rather than links
    // that would redirect them.
    await expect(page.getByText("Reparto vecinos bloque A")).toBeVisible();
    await expect(page.getByRole("link", { name: "Reparto vecinos bloque A" })).toHaveCount(0);
  });

  test("supply detail coefficient history (empty)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);
    await mockSupplyPartitionCoefficientRoutes(page, []);

    await page.goto(`/supply-points/${FIXED_SUPPLY_ID}`);
    await expect(page.getByText("Sin periodos aplicados")).toBeVisible();
    await stabilizePage(page);

    await expect(page.getByTestId("supply-coefficient-history")).toHaveScreenshot("supply-detail-coefficient-history-empty.png", await hideAppBar(page));
  });

  // Creating and importing supplies are the community's canManage, and the
  // three modal captures below reach controls only an admin is given. They open
  // as an admin for that reason, not because the modals differ by role -- the
  // panels themselves are identical.
  test("import supplies modal open", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto("/supply-points");
    await stabilizePage(page);

    // Scroll the "Importar CSV" button into view (may be off-screen on mobile) then click
    const importBtn = page.getByRole("button", { name: /importar csv/i });
    await importBtn.scrollIntoViewIfNeeded();
    await importBtn.click();

    // Wait for the modal title to appear (MUI Modal doesn't use role="dialog")
    await expect(page.getByRole("heading", { name: /^Importar puntos de suministro a / })).toBeVisible();
    await stabilizePage(page);

    await expect(page.getByTestId("modal-panel")).toHaveScreenshot("import-supplies-modal.png", await hideAppBar(page));
  });

  test("disable confirmation modal open", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto("/supply-points");
    await stabilizePage(page);

    // Open the three-dot menu on the enabled supply card (ES0021000000000000AA)
    const enabledCard = page
      .locator(".MuiCard-root")
      .filter({ hasText: "ES0021000000000000AA" });
    await enabledCard.getByRole("button").click();

    // Click "Deshabilitar" in the dropdown — opens DisableConfirmationModal
    await page.getByRole("menuitem", { name: /Deshabilitar/i }).click();

    await page.waitForSelector("text=Deshabilitar punto de suministro");
    await stabilizePage(page);

    await expect(page.getByTestId("modal-panel")).toHaveScreenshot("disable-confirmation-modal.png", await hideAppBar(page));
  });

  test("disable success modal open", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto("/supply-points");
    await stabilizePage(page);

    // Open the dropdown and trigger the disable confirmation modal
    const enabledCard = page
      .locator(".MuiCard-root")
      .filter({ hasText: "ES0021000000000000AA" });
    await enabledCard.getByRole("button").click();
    await page.getByRole("menuitem", { name: /Deshabilitar/i }).click();
    await page.waitForSelector("text=Deshabilitar punto de suministro");

    // Confirm — fires POST /api/v1/supplies/{id}/disable (mocked → 200)
    // then opens DisableSuccessModal
    await page.getByRole("button", { name: /^Deshabilitar$/i }).click();

    await page.waitForSelector("text=ha sido deshabilitado");
    await stabilizePage(page);

    await expect(page.getByTestId("modal-panel")).toHaveScreenshot("disable-success-modal.png", await hideAppBar(page));
  });

  // The same list as a community admin. The member capture above shows the
  // read-only shape; this one is where create, import and the row menus live,
  // and nothing captured that layout before -- only its modals.
  test("supplies list page (community admin)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto("/supply-points");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    // Interim mask: the kWh figure is Math.random() in SupplyPointsPage, as on
    // the member capture above.
    await expect(page).toHaveScreenshot(
      "supplies-list-admin.png",
      await mainRegion(page, [page.getByText(/^\d+ kWh$/)]),
    );
  });

  test("create supply page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto("/supply-points/new");
    await expect(page.getByRole("main")).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("create-supply-page.png", await mainRegion(page));
  });

  test("edit supply page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto(`/supply-points/${FIXED_SUPPLY_ID}/edit`);
    await expect(page.getByRole("main")).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("edit-supply-page.png", await mainRegion(page));
  });

});
