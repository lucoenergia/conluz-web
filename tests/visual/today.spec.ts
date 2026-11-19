/**
 * Visual baselines — the "Datos de hoy" page's energy-flow hero (#432).
 *
 * Admission: the hero is drawn geometry. Its conduit's thickness, the white
 * chevrons from 7 px, the arrowhead, the dashed line in the inactive colour
 * and the greyed plant node are pixels that no DOM assertion sees once they
 * are laid out and scaled. Their behaviour is asserted first in Vitest
 * (EnergyFlowHero.spec.tsx, TodayPage.spec.tsx: UI-TDY-004, UI-TDY-006);
 * these captures guard only the drawing. The rest of the page (figures,
 * sentence, notes, states) is behaviour, asserted there and not pictured here.
 *
 * The page is the member's own, so it is captured as a member.
 */

import type { Page } from "@playwright/test";
import type { SupplyProductionTodayResponse } from "../../src/api/models";
import {
  test,
  expect,
  FIXED_ENERGY_TODAY_FLOWING,
  FIXED_ENERGY_TODAY_IDLE,
  FIXED_ENERGY_TODAY_NOT_AVAILABLE,
  FIXED_MEMBER_USER,
  freezeClock,
  hideAppBar,
  injectAuthToken,
  mockAllApiRoutes,
  mockSupplyEnergyToday,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

/** A member in the fixed community, on /today, with today's data answered by `production`. */
async function openToday(page: Page, production: SupplyProductionTodayResponse) {
  // The curve's "Ahora" mark reads the clock.
  await freezeClock(page);
  await injectAuthToken(page);
  await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
  await mockAllApiRoutes(page, FIXED_MEMBER_USER);
  await mockSupplyEnergyToday(page, production);
  await page.goto("/today");
}

const hero = (page: Page) => page.getByTestId("energy-flow-hero");

test.describe("Visual baselines", () => {
  // Risk: the solid conduit's thickness for 1.9 kW, its chevrons and arrowhead, the gold plant node and the value pill.
  test("today's energy-flow hero, flowing", async ({ page }) => {
    await openToday(page, FIXED_ENERGY_TODAY_FLOWING);
    await expect(page.getByText("Ahora te llegan 1,9 kW de la planta de la comunidad.")).toBeVisible();
    await expect(hero(page).getByText("te llegan ahora")).toBeVisible();
    await stabilizePage(page);
    await expect(hero(page)).toHaveScreenshot("today-hero-flowing.png", await hideAppBar(page));
  });

  // Risk: the thin dashed conduit and arrowhead in the inactive colour when nothing flows.
  test("today's energy-flow hero, dashed", async ({ page }) => {
    await openToday(page, FIXED_ENERGY_TODAY_IDLE);
    await expect(page.getByText(/^La planta no está produciendo ahora\./)).toBeVisible();
    await stabilizePage(page);
    await expect(hero(page)).toHaveScreenshot("today-hero-dashed.png", await hideAppBar(page));
  });

  // Risk: the greyed plant node, with the dashed conduit, when the plant sends no data.
  test("today's energy-flow hero, unavailable", async ({ page }) => {
    await openToday(page, FIXED_ENERGY_TODAY_NOT_AVAILABLE);
    await expect(page.getByRole("heading", { name: "Tu planta aún no envía datos de hoy" })).toBeVisible();
    await stabilizePage(page);
    await expect(hero(page)).toHaveScreenshot("today-hero-unavailable.png", await hideAppBar(page));
  });
});
