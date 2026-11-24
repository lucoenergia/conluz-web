/**
 * Visual baselines — Setting an agreement's application dates (#419).
 *
 * Every state's content is asserted in Vitest (ApplicationDatesPage.spec.tsx).
 * These captures cover what jsdom cannot: how each step lays out per viewport
 * -- the dates grid that stacks below md with its prefill marks and hints, the
 * preview's summary figures, tables and closing-date rows, and the action bar
 * that sticks to the bottom of a phone's screen.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import { type Page } from "@playwright/test";
import {
  test,
  expect,
  APPLICATION_DATES_AGREEMENT,
  APPLICATION_DATES_COEFFICIENTS,
  APPLICATION_DATES_OBSERVATION,
  APPLICATION_DATES_PREVIEW,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_PLANT_ID,
  FIXED_PLANT_OBSERVATION,
  FIXED_SHARING_AGREEMENTS,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockApplicationDatesRoutes,
  mockObservedSharingRoutes,
  mockSharingAgreementDetailRoutes,
  mockSharingAgreementsPlantRoutes,
  seedActiveCommunity,
  settleScroll,
  stabilizePage,
} from "./fixtures";

const AGREEMENT_ID = APPLICATION_DATES_AGREEMENT.id;
const PATH = `/plants/${FIXED_PLANT_ID}/sharing-agreements/${AGREEMENT_ID}/application-dates`;
const FROM_OBSERVED = `${PATH}?desde=reparto-observado`;

/** Opens the flow by URL as the community admin, with its reads and both date writes served. */
async function openApplicationDates(page: Page, path: string, write?: Parameters<typeof mockApplicationDatesRoutes>[3]) {
  await injectAuthToken(page);
  await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
  await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
  await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
  await mockSharingAgreementDetailRoutes(page, AGREEMENT_ID, APPLICATION_DATES_AGREEMENT, APPLICATION_DATES_COEFFICIENTS, 200);
  await mockObservedSharingRoutes(
    page,
    FIXED_PLANT_OBSERVATION,
    { [AGREEMENT_ID]: APPLICATION_DATES_OBSERVATION },
    FIXED_COMMUNITY_ADMIN_USER,
  );
  await mockApplicationDatesRoutes(page, AGREEMENT_ID, APPLICATION_DATES_PREVIEW, write);
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name: "Fijar fechas de aplicación" })).toBeVisible();
}

/**
 * On mobile, the theme gives a Button a 44px minimum under a coarse pointer,
 * and Chromium drops that emulation after the first full-page screenshot. One
 * throwaway screenshot settles it before mainRegion measures main (see
 * plant-detail.spec.ts).
 */
async function settleForCapture(page: Page) {
  await page.mouse.move(0, 0);
  await stabilizePage(page);
  await page.screenshot({ fullPage: true });
  // On a phone the action bar sticks to the bottom of the viewport. A
  // full-page capture keeps the viewport where it is, so from the top the bar
  // would be drawn over the middle of the page; from the bottom it rests at
  // the end of the content, where it belongs.
  await settleScroll(page, "bottom");
}

async function openPreview(page: Page, write?: Parameters<typeof mockApplicationDatesRoutes>[3]) {
  await openApplicationDates(page, FROM_OBSERVED, write);
  await page.getByRole("button", { name: "Ver vista previa" }).click();
  await expect(page.getByRole("heading", { name: "Resumen de cambios" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar y aplicar" })).toBeEnabled();
}

test.describe("Visual baselines", () => {
  // Admitted: the dates grid's two layouts (a table from md up, stacked rows
  // below) with empty fields, the shortcut bar and the disabled action with
  // its reason are a pixel risk jsdom cannot see.
  test("application dates opened from the agreement (empty)", async ({ page }) => {
    await openApplicationDates(page, PATH);

    await expect(page.getByRole("checkbox", { name: "Seleccionar Casa Norte" })).toBeChecked();
    await expect(page.getByRole("button", { name: "Ver vista previa" })).toBeDisabled();
    await expect(page.getByText(/^Faltan 4 fechas/)).toBeVisible();
    await settleForCapture(page);

    await expect(page).toHaveScreenshot("application-dates-empty.png", await mainRegion(page));
  });

  // Admitted: the prefill marks -- the filled "Observada" chip, the dashed
  // "Propuesta" one with its explanation, a range's hint with "Elige una
  // fecha" -- and the leaving-supplies note change how each row wraps.
  test("application dates opened from observed sharing (prefilled)", async ({ page }) => {
    await openApplicationDates(page, FROM_OBSERVED);

    await expect(page.getByText("Observada").first()).toBeVisible();
    await expect(page.getByText("Propuesta", { exact: true })).toBeVisible();
    await expect(page.getByText("Elige una fecha", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ver vista previa" })).toBeEnabled();
    await settleForCapture(page);

    await expect(page).toHaveScreenshot("application-dates-observed.png", await mainRegion(page));
  });

  // Admitted: the preview composes summary figures, a notice, a status line,
  // a responsive table and editable closing-date rows, one marked as a
  // default closure; their arrangement per viewport is the risk.
  test("application dates preview with a default closure", async ({ page }) => {
    await openPreview(page);

    await expect(page.getByText("Cierre por defecto: fecha más temprana del acuerdo")).toBeVisible();
    await expect(page.getByText(/anterior al envío del fichero/)).toBeVisible();
    await expect(page.getByText("Sale del reparto (0 %)")).toBeVisible();
    await settleForCapture(page);

    await expect(page).toHaveScreenshot("application-dates-preview.png", await mainRegion(page));
  });

  // Admitted: the result's success notice, sentence list and the two
  // destinations, stacked on a phone.
  test("application dates applied", async ({ page }) => {
    await openPreview(page);
    await page.getByRole("button", { name: "Confirmar y aplicar" }).click();

    await expect(page.getByRole("heading", { name: "Qué ha cambiado" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver al reparto observado" })).toBeVisible();
    await expect(page.getByText(/sale del reparto: su coeficiente pasa a 0 %/)).toBeVisible();
    await settleForCapture(page);

    await expect(page).toHaveScreenshot("application-dates-success.png", await mainRegion(page));
  });

  // Admitted: a refused write's error alert with its per-row list beside the
  // note that the dates are kept.
  test("application dates refused on write", async ({ page }) => {
    await openPreview(page, {
      status: 409,
      body: {
        status: 409,
        errors: [
          {
            code: "SHARING_AGREEMENT_COEFFICIENT_PERIOD_OVERLAP",
            message: "Period overlap",
            params: { coefficientId: "dates-norte", cups: "ES0031000000000001JN0F" },
          },
        ],
      },
    });
    await page.getByRole("button", { name: "Confirmar y aplicar" }).click();

    await expect(page.getByText("No se han aplicado las fechas")).toBeVisible();
    await expect(page.getByRole("button", { name: "Volver a la vista previa" })).toBeVisible();
    await settleForCapture(page);

    await expect(page).toHaveScreenshot("application-dates-error.png", await mainRegion(page));
  });
});
