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
  hideAppBar,
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
    await expect(page.getByRole("heading", { name: "Anomalías (5)" })).toBeVisible();
    await expect(page.getByText("2 Coeficiente no aplicado")).toBeVisible();
    await expect(page.getByRole("heading", { name: "No calculables" })).toBeVisible();
    await expect(page.getByText(/^Tienen coeficiente en esta planta y en otra\./)).toBeVisible();
    await expect(page.getByText("Salen del reparto: 2 · 1 con fecha distinta")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cómo leer el reparto observado" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Preparar texto de reclamación" })).toBeVisible();
    await settleForCapture(page);

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    await expect(page).toHaveScreenshot("observed-sharing-plant.png", await mainRegion(page));
  });

  test("observed sharing of an agreement", async ({ page }) => {
    await openObservedSharing(page, `/plants/${FIXED_PLANT_ID}/sharing-agreements/observed/${PUBLISHED_AGREEMENT.id}`);

    await expect(page.getByRole("heading", { level: 1, name: "Reparto vecinos bloque A según Datadis" })).toBeVisible();
    // The rows' filter: the "Estado" select on a desktop, the "Filtros" button on a phone.
    await expect(
      page.getByRole("combobox", { name: "Estado" }).or(page.getByRole("button", { name: "Filtros" })),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Salen del reparto (2)" })).toBeVisible();
    await expect(page.getByText("Pasa a 0 %")).toBeVisible();
    // The agreement's anomalies are open on its own page.
    await expect(page.getByText("β esperada 3,1500 % · β observada 4,1200 % · 420 días medibles")).toBeVisible();
    // A swap names the other supply, on its own line on a phone (#451).
    await expect(page.getByText(/^Intercambiado con Casa Este/)).toBeVisible();
    await settleForCapture(page);

    await expect(page).toHaveScreenshot("observed-sharing-agreement.png", await mainRegion(page));
  });

  // Admitted: the help is a phone sheet whose height comes from its content:
  // its four sections of terms, each meaning set below its term with its
  // first letter raised by CSS, between a fixed header and a "Cerrar" footer.
  // Every term and its meaning are asserted in Vitest
  // (ObservedSharingHelp.spec.tsx); how the sheet fills a phone is not.
  test("observed sharing help on a phone", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "From md up the help is the shared centred dialog; the sheet is the phone's.");

    await openObservedSharing(page, `/plants/${FIXED_PLANT_ID}/sharing-agreements/observed`);
    await expect(page.getByRole("article", { name: "Reparto vecinos bloque A" })).toBeVisible();
    await page.getByRole("button", { name: "Cómo leer el reparto observado" }).click();

    const dialog = page.getByRole("dialog", { name: "Cómo leer el reparto observado" });
    await expect(dialog.getByRole("heading", { name: "Términos" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cerrar" })).toBeVisible();
    await stabilizePage(page);

    await expect(dialog).toHaveScreenshot("observed-sharing-help-mobile.png", await hideAppBar(page));
  });

  // Admitted: the claim text is a phone sheet holding a long multi-line
  // read-only field between a notice and a "Copiar texto" footer (#436): how
  // the field and the button fit a 390 px sheet that covers the screen is a
  // layout risk jsdom cannot see. The text, the notice, the copy and the sheet
  // variant are asserted in Vitest (claimText.spec.ts,
  // PlantObservedSharingPage.spec.tsx).
  test("claim text on a phone", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "From md up the claim is the shared centred dialog; the sheet is the phone's.");

    await openObservedSharing(page, `/plants/${FIXED_PLANT_ID}/sharing-agreements/observed`);
    await expect(page.getByRole("article", { name: "Reparto vecinos bloque A" })).toBeVisible();
    await page.getByRole("button", { name: "Preparar texto de reclamación" }).click();

    const dialog = page.getByRole("dialog", { name: "Texto de reclamación" });
    await expect(dialog.getByRole("textbox", { name: "Texto de reclamación" })).toHaveValue(
      /^Asunto: Revisión del reparto de autoconsumo colectivo – CAU /,
    );
    await expect(dialog.getByRole("button", { name: "Copiar texto" })).toBeVisible();
    await stabilizePage(page);

    await expect(dialog).toHaveScreenshot("observed-sharing-claim-mobile.png", await hideAppBar(page));
  });

  test("observed sharing of a plant whose supply has no data", async ({ page }) => {
    await openObservedSharing(page, `/plants/${FIXED_PLANT_ID}/sharing-agreements/observed`, FIXED_PLANT_OBSERVATION_NOT_COMPUTABLE);

    await expect(page.getByRole("heading", { name: "No se puede calcular el reparto observado" })).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(0);
    await settleForCapture(page);

    await expect(page).toHaveScreenshot("observed-sharing-not-computable.png", await mainRegion(page));
  });
});
