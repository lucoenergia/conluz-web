/**
 * Visual baselines — Supply points: list, detail, coefficient history section and the supply modals.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import { test, expect } from "@playwright/test";
import {
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_MEMBER_USER,
  FIXED_SUPPLY_COEFFICIENT_HISTORY,
  FIXED_SUPPLY_ID,
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
    // The kWh figure is Math.random() in SupplyPointsPage (placeholder data), so it is masked;
    // its tile keeps the same size for 1- and 2-digit values, so the mask hides all of it.
    await expect(page).toHaveScreenshot("supplies-list.png", await mainRegion(page, [page.getByText(/^\d+ kWh$/)]));
  });

  test("supply detail page", async ({ page }) => {
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
    await mockSupplyPartitionCoefficientRoutes(page, FIXED_SUPPLY_COEFFICIENT_HISTORY);

    await page.goto(`/supply-points/${FIXED_SUPPLY_ID}`);
    await expect(page.getByRole("heading", { name: "Histórico de coeficientes" })).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("supply-detail-coefficient-history-admin.png", { fullPage: true });

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
    await mockSupplyPartitionCoefficientRoutes(page, FIXED_SUPPLY_COEFFICIENT_HISTORY);

    await page.goto(`/supply-points/${FIXED_SUPPLY_ID}`);
    await expect(page.getByRole("heading", { name: "Histórico de coeficientes" })).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("supply-detail-coefficient-history-owner.png", { fullPage: true });

    // Same periods, but the agreement route is CommunityAdminRoute-guarded, so
    // an owner is shown names rather than links that would redirect them.
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

    await expect(page).toHaveScreenshot("supply-detail-coefficient-history-empty.png", { fullPage: true });
  });

  test("import supplies modal open", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto("/supply-points");
    await stabilizePage(page);

    // Scroll the "Importar CSV" button into view (may be off-screen on mobile) then click
    const importBtn = page.getByRole("button", { name: /importar csv/i });
    await importBtn.scrollIntoViewIfNeeded();
    await importBtn.click();

    // Wait for the modal title text to appear (MUI Modal doesn't use role="dialog")
    await page.waitForSelector("text=Importar Puntos de Suministro desde CSV");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("import-supplies-modal.png", { fullPage: true });
  });

  test("disable confirmation modal open", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

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

    await expect(page).toHaveScreenshot("disable-confirmation-modal.png", {
      fullPage: true,
    });
  });

  test("disable success modal open", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

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

    await expect(page).toHaveScreenshot("disable-success-modal.png", {
      fullPage: true,
    });
  });

  // Note: "import partners modal" is intentionally omitted. See tests/visual/fixtures/index.ts.
});
