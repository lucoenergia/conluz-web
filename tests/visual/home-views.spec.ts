/**
 * Visual baselines — the member and management home views (#197, #199).
 *
 * The member view is captured in every state it defines (#199), each with its
 * figures asserted before the capture, so a broken fixture fails rather than
 * becoming a plausible baseline. The management view still carries its
 * placeholder (#198) and is reached only by a direct URL. Each view is captured
 * with the persona that has it, and the switch with the one caller who gets it:
 * a community admin who owns a supply here.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import type { Page } from "@playwright/test";
import type { MembershipEnergyMetricsResponse, MembershipPaybackResponse } from "../../src/api/models";
import {
  test,
  expect,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_MEMBER_USER,
  MEMBER_ENERGY_METRICS_NO_MONTH,
  MEMBER_ENERGY_METRICS_PARTIAL,
  MEMBER_ENERGY_METRICS_REAL_TARIFF,
  MEMBER_PAYBACK_NEW_MEMBER,
  MEMBER_PAYBACK_NO_INVESTMENT,
  MEMBER_PAYBACK_NOTHING_SHARED,
  MEMBER_PAYBACK_REAL_TARIFF,
  MEMBER_PAYBACK_RECOVERED,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockCommunityAdminOwnsSupply,
  mockMemberHome,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

/** Opens the member home as the member, serving the given state. */
async function openMemberHome(
  page: Page,
  state: { metrics?: MembershipEnergyMetricsResponse; payback?: MembershipPaybackResponse } = {},
) {
  await injectAuthToken(page);
  await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
  await mockAllApiRoutes(page, FIXED_MEMBER_USER);
  await mockMemberHome(page, FIXED_MEMBER_USER, state);

  await page.goto("/home/member");
  await expect(page.getByRole("heading", { name: "Tu energía", level: 1 })).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Vistas de inicio" })).toHaveCount(0);
}

const paybackCard = (page: Page) => page.getByRole("region", { name: "Recuperación de tu inversión" });
const savingsCard = (page: Page) => page.getByRole("region", { name: "Tu ahorro en agosto de 2026" });
const estimateLabel = (page: Page) => page.getByText(/Estimado con un precio de/);

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
    await openMemberHome(page, { metrics: MEMBER_ENERGY_METRICS_NO_MONTH, payback: MEMBER_PAYBACK_NOTHING_SHARED });
    await expect(page.getByText("Todavía no hay datos de tu energía")).toBeVisible();
    await expect(paybackCard(page)).toContainText("todavía no ha empezado a compartir energía");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-member-nothing-shared.png", await mainRegion(page));
  });

  test("member home view, new member with no month yet", async ({ page }) => {
    await openMemberHome(page, { metrics: MEMBER_ENERGY_METRICS_NO_MONTH, payback: MEMBER_PAYBACK_NEW_MEMBER });
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

  test("management home view (admin owning no supplies)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto("/home/management");
    await expect(page.getByRole("heading", { name: "Gestión de la comunidad", level: 1 })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Vistas de inicio" })).toHaveCount(0);
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-view-management.png", await mainRegion(page));
  });

  test("management home view with the switch (admin owning a supply)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockCommunityAdminOwnsSupply(page);

    await page.goto("/home/management");
    await expect(page.getByRole("heading", { name: "Gestión de la comunidad", level: 1 })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Tu energía" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Gestión", selected: true })).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("home-view-management-with-switch.png", await mainRegion(page));
  });
});
