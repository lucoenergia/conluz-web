/**
 * Visual baselines — the member and management home views (#197, #199).
 *
 * The member view is captured in every state it defines (#199), its
 * comparison with the previous month in each of its states (#200), and its
 * twelve-month series and best hours in each of theirs (#201), each with
 * its figures asserted before the capture, so a broken fixture fails rather than
 * becoming a plausible baseline. The management view (#198) is captured with
 * plants in different stages, with no plant, and with a plant that has no
 * agreement yet. Each view is captured with the persona that has it, and the
 * switch, on both views, with the one caller who gets it: a community admin
 * who owns a supply here.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import type { Page } from "@playwright/test";
import type {
  MembershipEnergyMetricsResponse,
  MembershipHourlyProfileResponse,
  MembershipMonthlyConsumptionBucketResponse,
  MembershipPaybackResponse,
  PlantResponse,
  SharingAgreementResponse,
} from "../../src/api/models";
import { CAPTURED_MEMBERSHIP_MONTHLY_CONSUMPTION, wireShapeOf } from "../../src/test/capturedResponses";
import {
  test,
  expect,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_MEMBER_USER,
  FIXED_PLANT,
  MANAGEMENT_DRAFT_AGREEMENT,
  MANAGEMENT_PUBLISHED_AGREEMENT,
  MANAGEMENT_SECOND_PLANT,
  MANAGEMENT_SUPERSEDED_AGREEMENT,
  MEMBER_ENERGY_METRICS_NO_MONTH,
  MEMBER_MONTHLY_SERIES,
  MEMBER_ENERGY_METRICS_PARTIAL,
  MEMBER_HOURLY_PROFILE_NO_BEST_HOUR,
  MEMBER_ENERGY_METRICS_PREVIOUS_HIGHER,
  MEMBER_ENERGY_METRICS_PREVIOUS_NO_DATA,
  MEMBER_ENERGY_METRICS_PREVIOUS_PARTIAL,
  MEMBER_ENERGY_METRICS_REAL_TARIFF,
  MEMBER_HOURLY_PROFILE_EMPTY,
  MEMBER_HOURLY_PROFILE_GAPS,
  MEMBER_MONTHLY_SERIES_EMPTY,
  MEMBER_MONTHLY_SERIES_GAP_INCOMPLETE,
  MEMBER_MONTHLY_SERIES_ONE_MONTH,
  MEMBER_PAYBACK_NEW_MEMBER,
  MEMBER_PAYBACK_NO_INVESTMENT,
  MEMBER_PAYBACK_NOTHING_SHARED,
  MEMBER_PAYBACK_REAL_TARIFF,
  MEMBER_PAYBACK_RECOVERED,
  injectAuthToken,
  hideAppBar,
  mainRegion,
  mockAllApiRoutes,
  mockCommunityAdminOwnsSupply,
  mockManagementHome,
  mockMemberHome,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

/** Opens the member home as the member, serving the given state. */
async function openMemberHome(
  page: Page,
  state: {
    metrics?: MembershipEnergyMetricsResponse;
    previousMetrics?: MembershipEnergyMetricsResponse;
    payback?: MembershipPaybackResponse;
    monthly?: MembershipMonthlyConsumptionBucketResponse[];
    hourly?: MembershipHourlyProfileResponse;
  } = {},
) {
  await injectAuthToken(page);
  await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
  await mockAllApiRoutes(page, FIXED_MEMBER_USER);
  await mockMemberHome(page, FIXED_MEMBER_USER, state);

  await page.goto("/home/member");
  await expect(page.getByRole("heading", { name: "Tu energía", level: 1 })).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Vistas de inicio" })).toHaveCount(0);
}

/**
 * Opens the management home as the community admin, serving the given plants.
 * The default is the normal state: one plant with an agreement in force (and
 * an older one it superseded), and one whose first agreement is a draft.
 */
async function openManagementHome(
  page: Page,
  {
    plants = [FIXED_PLANT, MANAGEMENT_SECOND_PLANT],
    agreementsByPlant = {
      [FIXED_PLANT.id]: [MANAGEMENT_SUPERSEDED_AGREEMENT, MANAGEMENT_PUBLISHED_AGREEMENT],
      [MANAGEMENT_SECOND_PLANT.id]: [MANAGEMENT_DRAFT_AGREEMENT],
    },
    ownsSupply = false,
  }: { plants?: PlantResponse[]; agreementsByPlant?: Record<string, SharingAgreementResponse[]>; ownsSupply?: boolean } = {},
) {
  await injectAuthToken(page);
  await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
  await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
  await mockManagementHome(page, FIXED_COMMUNITY_ADMIN_USER, { plants, agreementsByPlant });
  if (ownsSupply) await mockCommunityAdminOwnsSupply(page);

  await page.goto("/home/management");
  await expect(page.getByRole("heading", { name: "Gestión de la comunidad", level: 1 })).toBeVisible();
  // Two enabled memberships of three, and the two supply points of the community.
  await expect(page.getByRole("region", { name: "Miembros" })).toContainText("2");
  await expect(page.getByRole("region", { name: "Puntos de suministro" })).toContainText("2");
}

const agreementsCard = (page: Page) => page.getByRole("region", { name: "Acuerdos de reparto" });
const plantRow = (page: Page, name: string) => agreementsCard(page).getByRole("listitem", { name });

const paybackCard = (page: Page) => page.getByRole("region", { name: "Recuperación de tu inversión" });
const savingsCard = (page: Page) => page.getByRole("region", { name: "Tu ahorro en agosto de 2026" });
const estimateLabel = (page: Page) => page.getByText(/Estimado con un precio de/);
const comparisonCard = (page: Page) => page.getByRole("region", { name: "Comparado con julio de 2026" });
const twelveMonthsCard = (page: Page) => page.getByRole("region", { name: "Tus últimos 12 meses" });
const bestHoursCard = (page: Page) => page.getByRole("region", { name: "Tus mejores horas" });
const chartTable = (card: ReturnType<Page["getByRole"]>) => card.getByRole("table", { name: /Datos del gráfico/ });
// Structural: ApexCharts' SVG has no role or name of its own. Waiting for it
// keeps a capture from catching the card before the chart has drawn.
const drawnCharts = (card: ReturnType<Page["getByRole"]>) => card.locator("svg.apexcharts-svg");

test.describe("Visual baselines", () => {
  test("member home view, priced with the estimate", async ({ page }) => {
    await openMemberHome(page);
    await expect(page.getByText("Datos de agosto de 2026")).toBeVisible();
    await expect(page.getByText("de 268 kWh asignados")).toBeVisible();
    await expect(page.getByText("de 412 kWh consumidos")).toBeVisible();
    await expect(savingsCard(page)).toContainText("18,15");
    await expect(estimateLabel(page)).toHaveCount(2);
    await expect(page.getByRole("region", { name: "Qué puedes hacer" })).toContainText("Aprovechaste el 45");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-member-normal.png", await mainRegion(page));
  });

  test("member home view, priced with the contracted tariff", async ({ page }) => {
    await openMemberHome(page, { metrics: MEMBER_ENERGY_METRICS_REAL_TARIFF, payback: MEMBER_PAYBACK_REAL_TARIFF });
    await expect(savingsCard(page)).toContainText("21,42");
    await expect(estimateLabel(page)).toHaveCount(0);
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-member-real-tariff.png", await mainRegion(page));
  });

  test("member home view, no investment recorded", async ({ page }) => {
    await openMemberHome(page, { payback: MEMBER_PAYBACK_NO_INVESTMENT });
    await expect(paybackCard(page)).toContainText("No consta ninguna inversión tuya registrada");
    await expect(page.getByText("de 268 kWh asignados")).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-member-no-investment.png", await mainRegion(page));
  });

  test("member home view, investment already recovered", async ({ page }) => {
    await openMemberHome(page, { payback: MEMBER_PAYBACK_RECOVERED });
    await expect(paybackCard(page)).toContainText("Ya has recuperado tu inversión");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-member-recovered.png", await mainRegion(page));
  });

  test("member home view, community that has never shared energy", async ({ page }) => {
    await openMemberHome(page, {
      metrics: MEMBER_ENERGY_METRICS_NO_MONTH,
      payback: MEMBER_PAYBACK_NOTHING_SHARED,
      hourly: MEMBER_HOURLY_PROFILE_EMPTY,
    });
    await expect(page.getByText("Todavía no hay datos de tu energía")).toBeVisible();
    await expect(paybackCard(page)).toContainText("todavía no ha empezado a compartir energía");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-member-nothing-shared.png", await mainRegion(page));
  });

  test("member home view, new member with no month yet", async ({ page }) => {
    await openMemberHome(page, {
      metrics: MEMBER_ENERGY_METRICS_NO_MONTH,
      payback: MEMBER_PAYBACK_NEW_MEMBER,
      hourly: MEMBER_HOURLY_PROFILE_EMPTY,
    });
    await expect(page.getByText("Todavía no hay datos de tu energía")).toBeVisible();
    await expect(paybackCard(page)).toContainText("Has recuperado el 0");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-member-new-member.png", await mainRegion(page));
  });

  test("member home view, month with partial coverage", async ({ page }) => {
    await openMemberHome(page, { metrics: MEMBER_ENERGY_METRICS_PARTIAL });
    await expect(page.getByRole("note")).toContainText("Este mes está incompleto");
    await expect(page.getByRole("region", { name: "Qué puedes hacer" })).toHaveCount(0);
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-member-partial-coverage.png", await mainRegion(page));
  });

  test("member home view, comparison with a rise", async ({ page }) => {
    await openMemberHome(page);
    await expect(comparisonCard(page)).toContainText("6,45 € más");
    await expect(comparisonCard(page)).toContainText("14 puntos porcentuales más");
    await expect(comparisonCard(page)).toContainText("9 puntos porcentuales más");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-member-comparison-rise.png", await mainRegion(page));
  });

  test("member home view, comparison with a fall", async ({ page }) => {
    await openMemberHome(page, { previousMetrics: MEMBER_ENERGY_METRICS_PREVIOUS_HIGHER });
    await expect(comparisonCard(page)).toContainText("5,85 € menos");
    await expect(comparisonCard(page)).toContainText("10 puntos porcentuales menos");
    await expect(comparisonCard(page)).toContainText("8 puntos porcentuales menos");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-member-comparison-fall.png", await mainRegion(page));
  });

  test("member home view, comparison not available yet", async ({ page }) => {
    await openMemberHome(page, { previousMetrics: MEMBER_ENERGY_METRICS_PREVIOUS_NO_DATA });
    await expect(page.getByRole("note")).toContainText("Todavía no se puede comparar con el mes anterior");
    await expect(comparisonCard(page)).toHaveCount(0);
    await expect(savingsCard(page)).toContainText("18,15");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-member-comparison-unavailable.png", await mainRegion(page));
  });

  test("member home view, comparison affected by coverage", async ({ page }) => {
    await openMemberHome(page, { previousMetrics: MEMBER_ENERGY_METRICS_PREVIOUS_PARTIAL });
    await expect(comparisonCard(page)).toContainText("La comparación está afectada: faltan datos de julio de 2026");
    await expect(comparisonCard(page)).toContainText("9,15 € más");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-member-comparison-affected-by-coverage.png", await mainRegion(page));
  });

  // #219: these fixtures once wrote the date as "2026-08-01" while the API
  // writes "2026/08/01", so every capture showed labels the real page never did.
  test("the twelve-month fixtures carry every field, and the date and time, as the API returns them", () => {
    const [captured] = CAPTURED_MEMBERSHIP_MONTHLY_CONSUMPTION;
    const series = [
      MEMBER_MONTHLY_SERIES,
      MEMBER_MONTHLY_SERIES_GAP_INCOMPLETE,
      MEMBER_MONTHLY_SERIES_ONE_MONTH,
      MEMBER_MONTHLY_SERIES_EMPTY,
    ];
    for (const bucket of series.flat()) {
      expect(Object.keys(bucket).sort()).toEqual(Object.keys(captured).sort());
      expect(bucket.date).toMatch(wireShapeOf(captured.date));
      expect(bucket.time).toMatch(wireShapeOf(captured.time));
    }
  });

  test("member home view, twelve months with data", async ({ page }) => {
    await openMemberHome(page);
    await expect(twelveMonthsCard(page)).toContainText("De septiembre de 2025 a agosto de 2026: 12 de 12 meses con datos.");
    await expect(chartTable(twelveMonthsCard(page))).toContainText("18,15 €");
    await expect(drawnCharts(twelveMonthsCard(page))).toHaveCount(2);
    await stabilizePage(page);

    // Component subject: the twelve-month block alone, with the app bar hidden.
    await expect(twelveMonthsCard(page)).toHaveScreenshot("home-member-twelve-months-data.png", await hideAppBar(page));
  });

  test("member home view, twelve months with a gap, a measured zero and an incomplete month", async ({ page }) => {
    await openMemberHome(page, { monthly: MEMBER_MONTHLY_SERIES_GAP_INCOMPLETE });
    await expect(twelveMonthsCard(page)).toContainText("11 de 12 meses con datos.");
    await expect(chartTable(twelveMonthsCard(page)).getByRole("row", { name: /diciembre de 2025/ })).toContainText("Sin datos");
    await expect(chartTable(twelveMonthsCard(page)).getByRole("row", { name: /noviembre de 2025/ })).toContainText("0,00 €");
    await expect(chartTable(twelveMonthsCard(page)).getByRole("row", { name: /febrero de 2026/ })).toContainText(
      "Incompleto: 1 de 2 suministros",
    );
    await expect(drawnCharts(twelveMonthsCard(page))).toHaveCount(2);
    await stabilizePage(page);

    // Component subject: the twelve-month block alone, with the app bar hidden.
    const options = await hideAppBar(page);
    await expect(twelveMonthsCard(page)).toHaveScreenshot("home-member-twelve-months-gap-incomplete.png", options);
  });

  test("member home view, twelve months with only the reference month", async ({ page }) => {
    await openMemberHome(page, { monthly: MEMBER_MONTHLY_SERIES_ONE_MONTH });
    await expect(twelveMonthsCard(page)).toContainText("1 de 12 meses con datos.");
    await expect(drawnCharts(twelveMonthsCard(page))).toHaveCount(2);
    await stabilizePage(page);

    // Component subject: the twelve-month block alone, with the app bar hidden.
    await expect(twelveMonthsCard(page)).toHaveScreenshot("home-member-twelve-months-one-month.png", await hideAppBar(page));
  });

  test("member home view, twelve months with nothing stored", async ({ page }) => {
    await openMemberHome(page, { monthly: MEMBER_MONTHLY_SERIES_EMPTY });
    const notice = page.getByRole("note").filter({ hasText: "Todavía no hay meses que mostrar" });
    await expect(notice).toBeVisible();
    await expect(twelveMonthsCard(page)).toHaveCount(0);
    await stabilizePage(page);

    // Component subject: the block's neutral notice, with the app bar hidden.
    await expect(notice).toHaveScreenshot("home-member-twelve-months-empty.png", await hideAppBar(page));
  });

  test("member home view, best hours with data", async ({ page }) => {
    await openMemberHome(page);
    await expect(bestHoursCard(page)).toContainText("Media de cada hora en agosto de 2026, el último mes que ha publicado la distribuidora.");
    await expect(chartTable(bestHoursCard(page)).getByRole("row", { name: /^12 h/ })).toContainText("0,58 kWh (media de 62 registros)");
    await expect(drawnCharts(bestHoursCard(page))).toHaveCount(1);
    await stabilizePage(page);

    // Component subject: the best-hours block alone, with the app bar hidden.
    await expect(bestHoursCard(page)).toHaveScreenshot("home-member-best-hours-data.png", await hideAppBar(page));
  });

  test("member home view, best hours with hours without samples", async ({ page }) => {
    await openMemberHome(page, { hourly: MEMBER_HOURLY_PROFILE_GAPS });
    await expect(chartTable(bestHoursCard(page)).getByRole("row", { name: /^3 h/ })).toContainText("Sin registrosSin registros");
    await expect(chartTable(bestHoursCard(page)).getByRole("row", { name: /^20 h/ })).toContainText(
      "0,55 kWh (media de 62 registros)Sin registros",
    );
    await expect(drawnCharts(bestHoursCard(page))).toHaveCount(1);
    await stabilizePage(page);

    // Component subject: the best-hours block alone, with the app bar hidden.
    await expect(bestHoursCard(page)).toHaveScreenshot("home-member-best-hours-gaps.png", await hideAppBar(page));
  });

  test("member home view, best hours when no hour is among the best", async ({ page }) => {
    await openMemberHome(page, { hourly: MEMBER_HOURLY_PROFILE_NO_BEST_HOUR });
    await expect(bestHoursCard(page).getByText("Mejores horas: ninguna este mes")).toBeVisible();
    await expect(drawnCharts(bestHoursCard(page))).toHaveCount(1);
    await stabilizePage(page);

    // Component subject: the best-hours block alone, with the app bar hidden.
    await expect(bestHoursCard(page)).toHaveScreenshot("home-member-best-hours-none.png", await hideAppBar(page));
  });

  test("member home view, best hours with no month yet", async ({ page }) => {
    await openMemberHome(page, { hourly: MEMBER_HOURLY_PROFILE_EMPTY });
    const notice = page.getByRole("note").filter({ hasText: "Todavía no hay horas que mostrar" });
    await expect(notice).toBeVisible();
    await expect(bestHoursCard(page)).toHaveCount(0);
    await stabilizePage(page);

    // Component subject: the block's neutral notice, with the app bar hidden.
    await expect(notice).toHaveScreenshot("home-member-best-hours-empty.png", await hideAppBar(page));
  });

  // The one caller who sees the member view with the switch: a community
  // admin who owns a supply here. Served the normal state, as the admin's own
  // membership.
  test("member home view with the switch (admin owning a supply)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockCommunityAdminOwnsSupply(page);

    await page.goto("/home/member");
    await expect(page.getByRole("heading", { name: "Tu energía", level: 1 })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Tu energía", selected: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Gestión" })).toBeVisible();
    await expect(page.getByText("de 268 kWh asignados")).toBeVisible();
    await expect(paybackCard(page)).toContainText("212,40");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-member-with-switch.png", await mainRegion(page));
  });

  test("management home view (admin owning no supplies)", async ({ page }) => {
    await openManagementHome(page);
    await expect(page.getByRole("tablist", { name: "Vistas de inicio" })).toHaveCount(0);
    await expect(plantRow(page, "Planta Solar Norte")).toContainText("Vigente");
    await expect(plantRow(page, "Planta Solar Norte")).toContainText("Reparto vecinos bloque A");
    await expect(plantRow(page, "Planta Solar Norte")).not.toContainText("Reparto original 2022");
    await expect(plantRow(page, "Cubierta del polideportivo")).toContainText("está en preparación");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-management-normal.png", await mainRegion(page));
  });

  test("management home view, community with no plant", async ({ page }) => {
    await openManagementHome(page, { plants: [], agreementsByPlant: {} });
    await expect(agreementsCard(page).getByRole("note")).toContainText("La comunidad todavía no tiene plantas");
    await expect(page.getByRole("alert")).toHaveCount(0);
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-management-no-plant.png", await mainRegion(page));
  });

  test("management home view, plant without an agreement yet", async ({ page }) => {
    await openManagementHome(page, { plants: [FIXED_PLANT], agreementsByPlant: {} });
    await expect(plantRow(page, "Planta Solar Norte").getByRole("note")).toContainText(
      "Todavía no tiene acuerdo de reparto.",
    );
    await expect(page.getByRole("alert")).toHaveCount(0);
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-management-plant-without-agreement.png", await mainRegion(page));
  });

  test("management home view with the switch (admin owning a supply)", async ({ page }) => {
    await openManagementHome(page, { ownsSupply: true });
    await expect(page.getByRole("tab", { name: "Tu energía" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Gestión", selected: true })).toBeVisible();
    await expect(plantRow(page, "Planta Solar Norte")).toContainText("Vigente");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-management-with-switch.png", await mainRegion(page));
  });
});
