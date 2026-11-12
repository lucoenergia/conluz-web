/**
 * Visual baselines — The community energy page (#403).
 *
 * The page's behaviour is asserted in Vitest (CommunityAnalysisPage.*.spec.tsx
 * and the specs beside each section). These captures guard what neither sees:
 * colour tokens -- the gold production marks apart from the green, the share
 * bars on their track --, the order and presence of blocks, the chart's
 * legend, caption and state marks, and the neutral style of each notice. Every
 * member sees the same page, so it is captured as a member.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import type { Locator, Page, TestInfo } from "@playwright/test";
import {
  test,
  expect,
  COMMUNITY_DAILY_SERIES,
  COMMUNITY_DAILY_SERIES_GAPS,
  COMMUNITY_ENERGY_METRICS,
  COMMUNITY_ENERGY_METRICS_INCOMPLETE,
  COMMUNITY_ENERGY_METRICS_NO_MONTH,
  COMMUNITY_ENERGY_METRICS_NO_PLANTS,
  FIXED_MEMBER_USER,
  freezeClock,
  hideAppBar,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockCommunityEnergy,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

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
 * The evolution chart has drawn: on desktop, ApexCharts' SVG, which has no
 * role or name of its own; below sm, its rows (UI-HIS-025).
 */
async function expectChartDrawn(evolution: Locator, testInfo: TestInfo, rows: number) {
  if (isMobile(testInfo)) {
    await expect(evolution.getByRole("list", { name: /^Energía de la comunidad por / }).getByRole("button")).toHaveCount(rows);
    await expect(evolution.locator("svg.apexcharts-svg")).toHaveCount(0);
    return;
  }
  await expect(evolution.locator("svg.apexcharts-svg")).toHaveCount(1);
}

test.describe("Visual baselines", () => {
  // Risk: the composed page -- the header, the journey with its gold production swatch apart from the green and violet split,
  // the figures, the stacked chart with its legend and caption, and the plants' gold share bars on their track.
  // On mobile, the chart as rows (UI-HIS-025).
  test("UI-CAN-009 the latest published month, complete data", async ({ page }, testInfo) => {
    await openAsMember(page);
    await mockCommunityEnergy(page, { anchor: COMMUNITY_ENERGY_METRICS, period: COMMUNITY_ENERGY_METRICS, daily: COMMUNITY_DAILY_SERIES });
    await page.goto("/community-analysis");

    await expect(page.getByRole("heading", { name: "Datos de agosto de 2026" })).toBeVisible();
    await expect(page.getByText("Sol Común · 3 plantas · Potencia pico 112,5 kWp · Potencia nominal 90 kW")).toBeVisible();
    await expect(page.getByRole("list", { name: "Adónde fue la energía" }).getByRole("listitem")).toHaveCount(2);
    await expect(page.getByRole("region", { name: "En cifras" }).getByText("Potencia nominal")).toBeVisible();
    const evolution = page.getByRole("region", { name: "La energía de la comunidad día a día" });
    await expect(evolution.getByRole("group", { name: "Energía de los puntos de la comunidad" })).toBeVisible();
    await expectChartDrawn(evolution, testInfo, 31);
    await expect(page.getByRole("list", { name: "Plantas de la comunidad" }).getByRole("listitem")).toHaveCount(3);
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("community-analysis-latest-month.png", await mainRegion(page));
  });

  // Risk: nothing published reads as a neutral note, never in alert colours.
  test("UI-CAN-002 nothing published", async ({ page }) => {
    await openAsMember(page);
    await mockCommunityEnergy(page, {
      anchor: COMMUNITY_ENERGY_METRICS_NO_MONTH,
      period: COMMUNITY_ENERGY_METRICS_NO_MONTH,
      daily: [],
    });
    await page.goto("/community-analysis");

    const notice = page.getByRole("note").filter({ hasText: "Todavía no hay datos publicados" });
    await expect(notice).toBeVisible();
    await expect(page.getByRole("button", { name: /^Periodo/ })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: /^Periodo/ })).toHaveCount(0);
    await stabilizePage(page);

    await expect(notice).toHaveScreenshot("community-analysis-no-published-month.png", await hideAppBar(page));
  });

  // Risk: the coverage notice and the unpriced-energy line read as neutral notes, and the journey beside them keeps its colours.
  test("UI-CAN-004 incomplete coverage", async ({ page }) => {
    await openAsMember(page);
    await mockCommunityEnergy(page, {
      anchor: COMMUNITY_ENERGY_METRICS,
      period: COMMUNITY_ENERGY_METRICS_INCOMPLETE,
      daily: COMMUNITY_DAILY_SERIES,
    });
    await page.goto("/community-analysis");

    await expect(page.getByRole("note").filter({ hasText: /^12 de 14 puntos de suministro tienen datos de este periodo/ })).toBeVisible();
    const figures = page.getByRole("region", { name: "En cifras" });
    await expect(figures.getByRole("note").filter({ hasText: /^1,5 kWh de energía que se fue a la red no tienen precio de mercado/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "El recorrido de la energía de la comunidad" })).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("community-analysis-incomplete-coverage.png", await mainRegion(page));
  });

  // Risk: the gap and partial marks and both notices of the evolution card; on mobile, the rows' gap marks.
  test("UI-CAN-007 a period with gaps and partial days", async ({ page }, testInfo) => {
    await openAsMember(page);
    await mockCommunityEnergy(page, { anchor: COMMUNITY_ENERGY_METRICS, period: COMMUNITY_ENERGY_METRICS, daily: COMMUNITY_DAILY_SERIES_GAPS });
    await page.goto("/community-analysis");

    const evolution = page.getByRole("region", { name: "La energía de la comunidad día a día" });
    await expect(evolution.getByRole("note").filter({ hasText: /^Faltan datos del 12 al 14 de agosto de 2026/ })).toBeVisible();
    await expect(
      evolution.getByRole("note").filter({ hasText: /solo hay datos de 12 de los 14 puntos de suministro de la comunidad/ }),
    ).toBeVisible();
    await expect(evolution.getByRole("list", { name: "Marcas de estado" })).toBeVisible();
    await expectChartDrawn(evolution, testInfo, 31);
    await stabilizePage(page);

    await expect(evolution).toHaveScreenshot("community-analysis-gaps-evolution.png", await hideAppBar(page));
  });

  // Risk: a community without plants reads as a neutral empty state in the plants section, not as an error.
  test("UI-CAN-008 a community without plants", async ({ page }) => {
    await openAsMember(page);
    await mockCommunityEnergy(page, {
      anchor: COMMUNITY_ENERGY_METRICS_NO_PLANTS,
      period: COMMUNITY_ENERGY_METRICS_NO_PLANTS,
      daily: COMMUNITY_DAILY_SERIES,
    });
    await page.goto("/community-analysis");

    await expect(page.getByText("Sol Común · sin plantas todavía")).toBeVisible();
    const plants = page.getByRole("region", { name: "Plantas" });
    await expect(plants.getByRole("note").filter({ hasText: "Esta comunidad todavía no tiene plantas" })).toBeVisible();
    await stabilizePage(page);

    await expect(plants).toHaveScreenshot("community-analysis-no-plants.png", await hideAppBar(page));
  });
});
