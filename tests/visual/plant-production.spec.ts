/**
 * Visual baselines — the plant detail's two production sections (#406):
 * "Hoy, según el inversor" and "Producción por periodo".
 *
 * Admitted because what they risk is drawn, not stated: the power curve, its
 * "Ahora" mark and its "Sin datos" bands are ApexCharts annotations whose
 * placement only a picture shows, and the period chart's gap, partial and zero
 * marks sit on the bars. Every state captured here is asserted in Vitest
 * first (PlantInverterToday.spec.tsx, PlantPeriodProduction.spec.tsx); each
 * test below checks its state's content before capturing it, so a broken
 * fixture fails instead of becoming a plausible baseline.
 *
 * The full detail, mobile and desktop, is plant-detail.spec.ts's
 * "plant detail page". Fixtures, route mocks and navigation helpers live in
 * ./fixtures.
 */

import {
  test,
  expect,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_INVERTER_NOT_STARTED,
  FIXED_INVERTER_NO_DATA_TODAY,
  FIXED_INVERTER_STALE,
  FIXED_INVERTER_TODAY_WITH_GAP,
  FIXED_PLANT_DAYS_WITH_GAPS,
  NO_PLANT_PRODUCTION_DAY,
  hideAppBar,
  openPlantDetail,
  stabilizePage,
} from "./fixtures";
import type { Page } from "@playwright/test";

const today = (page: Page) => page.getByRole("region", { name: "Hoy, según el inversor" });
const period = (page: Page) => page.getByRole("region", { name: "Producción por periodo" });

test.describe("Visual baselines", () => {
  // -------------------------------------------------------------------------
  // Hoy, según el inversor
  // -------------------------------------------------------------------------

  test("today's inverter production, producing", async ({ page }) => {
    await openPlantDetail(page);
    await expect(today(page).getByRole("group", { name: "Hoy, hasta las 13:55" })).toBeVisible();
    await expect(today(page).getByText("Actualizado a las 13:55")).toBeVisible();
    await stabilizePage(page);

    await expect(today(page)).toHaveScreenshot("plant-today-producing.png", await hideAppBar(page));
  });

  test("today's inverter production, not producing yet", async ({ page }) => {
    await openPlantDetail(page, FIXED_COMMUNITY_ADMIN_USER, {}, { inverter: FIXED_INVERTER_NOT_STARTED });
    await expect(today(page).getByText("Todavía no ha empezado a producir hoy")).toBeVisible();
    await stabilizePage(page);

    await expect(today(page)).toHaveScreenshot("plant-today-not-started.png", await hideAppBar(page));
  });

  test("today's inverter production, stale", async ({ page }) => {
    await openPlantDetail(page, FIXED_COMMUNITY_ADMIN_USER, {}, { inverter: FIXED_INVERTER_STALE });
    await expect(today(page).getByText(/^Sin datos nuevos desde las 10:15, hace más de 1 hora\./)).toBeVisible();
    await stabilizePage(page);

    await expect(today(page)).toHaveScreenshot("plant-today-stale.png", await hideAppBar(page));
  });

  test("today's inverter production, no data today", async ({ page }) => {
    await openPlantDetail(page, FIXED_COMMUNITY_ADMIN_USER, {}, { inverter: FIXED_INVERTER_NO_DATA_TODAY });
    await expect(today(page).getByText("Sin datos del inversor hoy")).toBeVisible();
    await stabilizePage(page);

    await expect(today(page)).toHaveScreenshot("plant-today-no-data.png", await hideAppBar(page));
  });

  test("today's inverter production, a day with a gap", async ({ page }) => {
    await openPlantDetail(page, FIXED_COMMUNITY_ADMIN_USER, {}, { inverter: FIXED_INVERTER_TODAY_WITH_GAP });
    await expect(today(page).getByText(/^Faltan datos de 10:20 a 11:05\./)).toBeVisible();
    await stabilizePage(page);

    await expect(today(page)).toHaveScreenshot("plant-today-gap.png", await hideAppBar(page));
  });

  // -------------------------------------------------------------------------
  // Producción por periodo
  // -------------------------------------------------------------------------

  test("period production with gaps and partial days", async ({ page }) => {
    await openPlantDetail(page, FIXED_COMMUNITY_ADMIN_USER, {}, { daily: FIXED_PLANT_DAYS_WITH_GAPS });
    await expect(period(page).getByRole("heading", { name: "Datos del 7 al 13 de septiembre de 2026" })).toBeVisible();
    await expect(period(page).getByText(/^Faltan datos del 8 al 9 de septiembre de 2026\./)).toBeVisible();
    await stabilizePage(page);

    await expect(period(page)).toHaveScreenshot("plant-period-gaps.png", await hideAppBar(page));
  });

  test("period production, Año 2026 labelled by days", async ({ page }) => {
    await openPlantDetail(page, FIXED_COMMUNITY_ADMIN_USER, {}, {}, "?period=year");
    await expect(period(page).getByRole("heading", { name: "Datos del 1 de enero al 13 de septiembre de 2026" })).toBeVisible();
    await stabilizePage(page);

    await expect(period(page)).toHaveScreenshot("plant-period-year.png", await hideAppBar(page));
  });

  test("period production, nothing from the distributor yet", async ({ page }) => {
    await openPlantDetail(page, FIXED_COMMUNITY_ADMIN_USER, {}, { productionDay: NO_PLANT_PRODUCTION_DAY });
    await expect(period(page).getByText("Todavía no hay datos de la distribuidora para esta planta")).toBeVisible();
    await stabilizePage(page);

    await expect(period(page)).toHaveScreenshot("plant-period-no-data.png", await hideAppBar(page));
  });
});
