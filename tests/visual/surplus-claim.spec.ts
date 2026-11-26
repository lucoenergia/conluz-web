/**
 * Visual baselines — A plant's surplus claim (#455).
 *
 * Every rule of the page is asserted in Vitest (PlantSurplusClaimPage.spec.tsx).
 * Admitted: one capture of the composed page, where a pixel change is the
 * risk jsdom cannot see -- the top summary's figures, notes, warning line and
 * download row laid out per viewport, the warning notices with their lists,
 * the neutral "Estimado" chip among the days (a table from sm up, rows below),
 * and an open day's grid of hours with the one above nominal power in the
 * warning style.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import {
  test,
  expect,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_PLANT_ID,
  FIXED_SURPLUS_CLAIM,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockPlantDetailRoutes,
  mockSurplusClaimRoutes,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

test.describe("Visual baselines", () => {
  test("surplus claim of a plant, with warnings and a day open", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockPlantDetailRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSurplusClaimRoutes(page, FIXED_SURPLUS_CLAIM, FIXED_COMMUNITY_ADMIN_USER);
    await page.goto(`/plants/${FIXED_PLANT_ID}/surplus-claim`);

    await expect(page.getByRole("heading", { name: "Resumen de octubre de 2026" })).toBeVisible();
    await expect(page.getByText(/^Este mes tiene 5 avisos ·/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Descargar fichero" })).toBeEnabled();
    const warnings = page.getByRole("region", { name: "Avisos de octubre de 2026" });
    await expect(warnings.getByRole("note")).toHaveCount(5);
    await expect(warnings.getByText("Casa de Amparo · ES0031406912345678JN0F · 4,2000 %")).toBeVisible();

    await page.getByRole("button", { name: /^jue 22\/10\/2026/ }).click();
    await expect(page.getByRole("list", { name: "Horas del jue 22/10/2026" }).getByRole("listitem")).toHaveCount(24);
    await expect(
      page.getByText("12–13 h: 118,4 kWh, más que la potencia nominal de la planta (100 kW). Puede haber datos duplicados."),
    ).toBeVisible();
    await page.mouse.move(0, 0);

    // On mobile, the theme gives a Button a 44px minimum under a coarse
    // pointer, and Chromium drops that emulation after the first full-page
    // screenshot: one throwaway screenshot settles it (see plant-detail.spec.ts).
    await stabilizePage(page);
    await page.screenshot({ fullPage: true });

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("plant-surplus-claim.png", await mainRegion(page));
  });
});
