/**
 * Visual baselines — The historical analysis page (#361).
 *
 * The page's behaviour is asserted in Vitest (HistoricalAnalysisPage.*.spec.tsx)
 * and its overflow in layout-budgets.spec.ts. These captures guard what
 * neither sees: colour tokens, the order and presence of blocks, the charts'
 * legend, caption and state marks. The page is the member's own, so it is
 * captured as a member.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import type { Locator, Page, TestInfo } from "@playwright/test";
import {
  test,
  expect,
  FIXED_MEMBER_USER,
  FIXED_PLANT_OWN_SUPPLY,
  MEMBER_ENERGY_METRICS,
  MEMBER_ENERGY_METRICS_LAST_12,
  MEMBER_ENERGY_METRICS_NO_MONTH,
  MEMBER_ENERGY_METRICS_SNAPPED,
  MEMBER_MONTHLY_SERIES_GAP_INCOMPLETE,
  MEMBER_MONTHLY_SERIES_SNAPPED,
  PLANT_SUPPLY_DAILY_SERIES,
  PLANT_SUPPLY_ENERGY_METRICS,
  freezeClock,
  hideAppBar,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockHistoricalMembership,
  mockOwnSupplyHistory,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

/** The energy chart's caption on each project: it says where the separate bar sits (UI-HIS-017). */
const ENERGY_CAPTION = {
  desktop: "La barra apilada es tu consumo. La barra morada, a su lado, es energía asignada que no usaste: no forma parte de tu consumo.",
  mobile: "La barra gruesa es tu consumo. La fina morada, debajo, es energía asignada que no usaste: no forma parte de tu consumo.",
} as const;

const isMobile = (testInfo: TestInfo) => testInfo.project.name === "mobile";

/** A member in the fixed community, with the shared mocks; a test adds its own routes after this, so they win. */
async function openAsMember(page: Page) {
  // The page reads no clock (its anchor is the server's), but a frozen one keeps that true of every capture.
  await freezeClock(page);
  await injectAuthToken(page);
  await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
  await mockAllApiRoutes(page, FIXED_MEMBER_USER);
}

/**
 * Both evolution charts have drawn: on desktop, ApexCharts' SVG, which has no
 * role or name of its own; below sm, the rows of both charts (UI-HIS-025).
 */
async function expectChartsDrawn(evolution: Locator, testInfo: TestInfo, rows: number) {
  if (isMobile(testInfo)) {
    await expect(evolution.getByRole("list", { name: /^Tu energía por / }).getByRole("button")).toHaveCount(rows);
    await expect(evolution.getByRole("list", { name: /^Tu ahorro estimado por / }).getByRole("listitem")).toHaveCount(rows);
    await expect(evolution.locator("svg.apexcharts-svg")).toHaveCount(0);
    return;
  }
  await expect(evolution.locator("svg.apexcharts-svg")).toHaveCount(2);
}

/**
 * The innermost element containing every given locator. Structural on purpose:
 * the blocks these captures picture are layout boxes with no role or name, and
 * src/ is not changed to give them one.
 */
function innermostContaining(page: Page, ...parts: Locator[]): Locator {
  return parts.reduce((candidates, part) => candidates.filter({ has: part }), page.locator("div")).last();
}

test.describe("Visual baselines", () => {
  // Risk: the composed page -- the period card, the totals, both charts with the grouped, paired legend and caption, the table.
  // On mobile, the charts as rows (UI-HIS-025).
  test("UI-HIS-017 'Todos mis puntos', latest published month, complete data", async ({ page }, testInfo) => {
    await openAsMember(page);
    await mockHistoricalMembership(page, FIXED_MEMBER_USER, { anchor: MEMBER_ENERGY_METRICS, period: MEMBER_ENERGY_METRICS });
    await page.goto("/historical-analysis");

    await expect(page.getByRole("heading", { name: "Datos de agosto de 2026" })).toBeVisible();
    await expect(page.getByRole("region", { name: "De la energía que te tocó" }).getByText("Usaste el 45 %")).toBeVisible();
    await expect(page.getByRole("list", { name: "Totales del periodo" }).getByRole("listitem")).toHaveCount(4);
    const evolution = page.getByRole("region", { name: "Tu energía día a día" });
    await expect(evolution.getByRole("group", { name: "Tu consumo" })).toBeVisible();
    await expect(evolution.getByRole("group", { name: "Asignada que no usaste" })).toBeVisible();
    await expect(evolution.getByText(ENERGY_CAPTION[isMobile(testInfo) ? "mobile" : "desktop"])).toBeVisible();
    await expectChartsDrawn(evolution, testInfo, 31);
    await expect(page.getByRole("region", { name: "Tus datos" })).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("historical-analysis-latest-month.png", await mainRegion(page));
  });

  // Risk: the gap and partial marks, both notices and the monthly axis labels of the evolution card; on mobile, the row labels.
  test("UI-HIS-015 'Últimos 12 meses' with a gap month and a partial month", async ({ page }, testInfo) => {
    await openAsMember(page);
    await mockHistoricalMembership(page, FIXED_MEMBER_USER, {
      anchor: MEMBER_ENERGY_METRICS,
      period: MEMBER_ENERGY_METRICS_LAST_12,
      monthly: MEMBER_MONTHLY_SERIES_GAP_INCOMPLETE,
    });
    await page.goto("/historical-analysis?period=last12");

    const evolution = page.getByRole("region", { name: "Tu energía mes a mes" });
    await expect(evolution.getByRole("note").filter({ hasText: /^Faltan datos .*diciembre de 2025/ })).toBeVisible();
    await expect(evolution.getByRole("note").filter({ hasText: /^En febrero de 2026 solo hay datos de 1 de tus 2 puntos/ })).toBeVisible();
    await expect(evolution.getByRole("list", { name: "Marcas de estado" })).toBeVisible();
    await expectChartsDrawn(evolution, testInfo, 12);
    await stabilizePage(page);

    await expect(evolution).toHaveScreenshot("historical-analysis-last-12-evolution.png", await hideAppBar(page));
  });

  // Risk: the not-applicable card in neutral type, the plant notice, and the "Punto de planta" tag on the selector.
  test("UI-HIS-013 a plant's own supply", async ({ page }, testInfo) => {
    await openAsMember(page);
    await mockOwnSupplyHistory(page, FIXED_MEMBER_USER, FIXED_PLANT_OWN_SUPPLY, {
      metrics: PLANT_SUPPLY_ENERGY_METRICS,
      daily: PLANT_SUPPLY_DAILY_SERIES,
    });
    await page.goto(`/historical-analysis?supplyId=${FIXED_PLANT_OWN_SUPPLY.id}`);

    const card = page.getByRole("region", { name: "De la energía que te tocó" });
    const plantNote = page.getByRole("note").filter({ hasText: /es el punto de suministro de la planta Planta Solar Norte/ });
    const totals = page.getByRole("list", { name: "Totales del periodo" });
    await expect(card.getByText("No aplica al punto de la planta")).toBeVisible();
    await expect(plantNote).toBeVisible();
    await expect(totals.getByRole("listitem")).toHaveCount(4);
    // The desktop selector is a select; below sm it is a button that opens a sheet.
    const trigger = page.getByRole(testInfo.project.name === "mobile" ? "button" : "combobox", { name: /^Punto de suministro/ });
    await expect(trigger.getByText("Punto de planta")).toBeVisible();
    await expectChartsDrawn(page.getByRole("region", { name: "Tu energía día a día" }), testInfo, 31);
    await stabilizePage(page);

    // Soft, so the selector below is still compared when the figures differ.
    await expect.soft(innermostContaining(page, plantNote, card, totals)).toHaveScreenshot(
      "historical-analysis-plant-supply-figures.png",
      await hideAppBar(page),
    );
    await expect(
      innermostContaining(page, trigger, page.getByText("Solo aparecen tus puntos activos en esta comunidad.")),
    ).toHaveScreenshot("historical-analysis-plant-supply-selector.png", await hideAppBar(page));
  });

  // Risk: nothing published reads as a neutral note, never in alert colours.
  test("UI-HIS-005 no published month", async ({ page }) => {
    await openAsMember(page);
    await mockHistoricalMembership(page, FIXED_MEMBER_USER, {
      anchor: MEMBER_ENERGY_METRICS_NO_MONTH,
      period: MEMBER_ENERGY_METRICS_NO_MONTH,
    });
    await page.goto("/historical-analysis");

    const notice = page.getByRole("note").filter({ hasText: "Todavía no hay datos publicados" });
    await expect(notice).toBeVisible();
    await expect(page.getByRole("button", { name: /^Periodo/ })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: /^Periodo/ })).toHaveCount(0);
    await stabilizePage(page);

    await expect(notice).toHaveScreenshot("historical-analysis-no-published-month.png", await hideAppBar(page));
  });

  // Risk: the header's snapped text, beside the monthly title and granularity chip.
  test("UI-HIS-006 a custom range snapped to whole months", async ({ page }, testInfo) => {
    await openAsMember(page);
    await mockHistoricalMembership(page, FIXED_MEMBER_USER, {
      anchor: MEMBER_ENERGY_METRICS,
      period: MEMBER_ENERGY_METRICS_SNAPPED,
      monthly: MEMBER_MONTHLY_SERIES_SNAPPED,
    });
    await page.goto("/historical-analysis?period=custom&from=2026-03-15&to=2026-08-20");

    const heading = page.getByRole("heading", { name: "Datos de marzo a agosto de 2026" });
    const snapped = page.getByText(
      "Elegiste del 15 de marzo al 20 de agosto de 2026. Como son más de 62 días, lo mostramos por meses completos: de marzo de 2026 a agosto de 2026 (6 meses).",
    );
    await expect(heading).toBeVisible();
    await expect(snapped).toBeVisible();
    await expectChartsDrawn(page.getByRole("region", { name: "Tu energía mes a mes" }), testInfo, 6);
    await stabilizePage(page);

    await expect(innermostContaining(page, heading, snapped)).toHaveScreenshot(
      "historical-analysis-snapped-range-header.png",
      await hideAppBar(page),
    );
  });
});
