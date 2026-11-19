/**
 * Visual baselines — The observed sharing view (#418): a plant's analysis and
 * one agreement's.
 *
 * Every state's content is asserted in Vitest (PlantObservedSharingPage.spec.tsx,
 * SharingAgreementObservationPage.spec.tsx). These captures cover what jsdom
 * cannot: how the composed pages lay out per viewport -- the card grid, the
 * stacked rows below the table width, the chips and their wrapping.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import { type Page } from "@playwright/test";
import {
  test,
  expect,
  FIXED_AGREEMENT_OBSERVATION,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_PLANT_ID,
  FIXED_PLANT_OBSERVATION,
  FIXED_PLANT_OBSERVATION_NOT_COMPUTABLE,
  PUBLISHED_AGREEMENT,
  ROUTE_MOUNT_TIMEOUT_MS,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockObservedSharingRoutes,
  mockPlantDetailRoutes,
  openPlantDetail,
  seedActiveCommunity,
  stabilizePage,
  waitForPageSettled,
} from "./fixtures";

const AGREEMENT_OBSERVATIONS = { [PUBLISHED_AGREEMENT.id]: FIXED_AGREEMENT_OBSERVATION };

/** Opens a page of the view by URL, with the plant and its analysis served. */
async function openObservedSharing(page: Page, path: string, observation = FIXED_PLANT_OBSERVATION) {
  await injectAuthToken(page);
  await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
  await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
  await mockPlantDetailRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
  await mockObservedSharingRoutes(page, observation, AGREEMENT_OBSERVATIONS, FIXED_COMMUNITY_ADMIN_USER);
  await page.goto(path);
}

/**
 * On mobile, the theme gives a Button a 44px minimum under a coarse pointer,
 * and Chromium drops that emulation after the first full-page screenshot. One
 * throwaway screenshot settles it before mainRegion measures main (see
 * plant-detail.spec.ts).
 */
async function settleForCapture(page: Page) {
  await stabilizePage(page);
  await page.screenshot({ fullPage: true });
}

test.describe("Visual baselines", () => {
  // The one test that reaches the view through the UI: from the plant detail.
  test("observed sharing of a plant", async ({ page }) => {
    await openPlantDetail(page);
    await mockObservedSharingRoutes(page, FIXED_PLANT_OBSERVATION, AGREEMENT_OBSERVATIONS, FIXED_COMMUNITY_ADMIN_USER);

    await page.getByRole("link", { name: "Ver comparación" }).click();
    await page.mouse.move(0, 0);
    // A mount wait for the lazy route, as in navigateToSharingAgreements.
    await expect(page.getByRole("article", { name: "Reparto vecinos bloque A" })).toBeVisible({
      timeout: ROUTE_MOUNT_TIMEOUT_MS,
    });
    await waitForPageSettled(page);
    await expect(page.getByRole("article")).toHaveCount(2);
    await expect(page.getByRole("heading", { name: "Anomalías (3)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No calculables" })).toBeVisible();
    await settleForCapture(page);

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    await expect(page).toHaveScreenshot("observed-sharing-plant.png", await mainRegion(page));
  });

  test("observed sharing of an agreement", async ({ page }) => {
    await openObservedSharing(page, `/plants/${FIXED_PLANT_ID}/sharing-agreements/observed/${PUBLISHED_AGREEMENT.id}`);

    await expect(page.getByRole("heading", { level: 1, name: "Reparto vecinos bloque A según Datadis" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Todos (5)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Salen del reparto (1)" })).toBeVisible();
    // The agreement's anomalies are open on its own page.
    await expect(page.getByText("Recibe 4,1200 % en 420 días válidos.")).toBeVisible();
    await settleForCapture(page);

    await expect(page).toHaveScreenshot("observed-sharing-agreement.png", await mainRegion(page));
  });

  test("observed sharing of a plant whose supply has no data", async ({ page }) => {
    await openObservedSharing(page, `/plants/${FIXED_PLANT_ID}/sharing-agreements/observed`, FIXED_PLANT_OBSERVATION_NOT_COMPUTABLE);

    await expect(page.getByRole("heading", { name: "No se puede calcular el reparto observado" })).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(0);
    await settleForCapture(page);

    await expect(page).toHaveScreenshot("observed-sharing-not-computable.png", await mainRegion(page));
  });
});
