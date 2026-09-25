/**
 * Visual baselines — The sharing agreement detail page: statuses, coefficient table/cards, batch bar and menus.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import { test, expect, type Page, type TestInfo } from "@playwright/test";
import {
  DRAFT_AGREEMENT,
  FIXED_COEFFICIENTS_ALL_PENDING,
  FIXED_COEFFICIENTS_EMPTY,
  FIXED_COEFFICIENTS_INCOMPLETE,
  FIXED_COEFFICIENTS_MIXED,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_SHARING_AGREEMENTS,
  hideAppBar,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockSharingAgreementDetailRoutes,
  mockSharingAgreementsPlantRoutes,
  navigateToSharingAgreementDetail,
  NO_FILE_DRAFT_AGREEMENT,
  PUBLISHED_AGREEMENT,
  PUBLISHED_AGREEMENT_EDITED,
  seedActiveCommunity,
  stabilizePage,
  SUPERSEDED_AGREEMENT,
} from "./fixtures";

test.describe("Visual baselines", () => {
  // Community-admin fixture tests: sharing-agreement detail page.
  // Same CommunityAdminRoute cold-navigation limitation as the list page (see
  // file header) — reached by navigating through the list and clicking a
  // card's own title link, never via a cold page.goto().
  //
  // The file panel is driven entirely by `agreement.file` from the already-
  // loaded agreement response (no separate probe/fetch to learn whether a
  // file exists), so its rendered state differs per fixture below: state A
  // (no file, DRAFT — Generar/Importar primary actions), state B (file
  // present — filename/date + Descargar, plus subordinate actions in DRAFT),
  // state C (no file, sealed — explained-and-closed, no action button).

  /**
   * The current-coefficient readout has two shapes: a column header on the
   * desktop table, and a self-naming line on the mobile card, which has no
   * headers. Both DOM trees are always mounted and swapped by a CSS
   * breakpoint, so asserting the desktop header on mobile finds it hidden
   * rather than absent.
   */
  async function expectCurrentCoefficientShown(page: Page, testInfo: TestInfo) {
    const label = testInfo.project.name === "desktop" ? page.getByText("Coeficiente actual") : page.getByText(/^Actual /);
    await expect(label.first()).toBeVisible();
  }

  test("sharing agreement detail page (draft, with coefficients)", async ({ page }, testInfo) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_ALL_PENDING, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);

    // A real DRAFT is all-PENDING/OPEN, so the application/end-state columns
    // and filter chips are hidden entirely — this is what a real user sees.
    await expect(page.getByText("Estado de aplicación")).toHaveCount(0);

    // Both branches of the current-coefficient readout in one shot: two
    // supplies are already on a coefficient (one raised, one lowered by this
    // draft) and Local C is on none.
    await expectCurrentCoefficientShown(page, testInfo);

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    await expect(page).toHaveScreenshot("sharing-agreement-detail-draft.png", await mainRegion(page));
  });

  test("sharing agreement detail page (draft, no coefficient in force yet)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    // FIXED_COEFFICIENTS_INCOMPLETE deliberately carries no currentCoefficient:
    // a community's first agreement has nothing in force to compare against.
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_INCOMPLETE, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);

    // The column is not mounted at all — a column of dashes would cost width
    // on a 390px viewport to say nothing.
    await expect(page.getByText("Coeficiente actual")).toHaveCount(0);

    await expect(page.getByTestId("sharing-agreement-coefficient-set")).toHaveScreenshot("sharing-agreement-detail-draft-no-current-coefficient.png", await hideAppBar(page));
  });

  test("sharing agreement detail page (draft, anomalous coefficients — defensive fallback)", async ({ page }, testInfo) => {
    // FIXED_COEFFICIENTS_MIXED represents a state the backend guarantees a
    // real DRAFT can never reach (APPLIED requires publishing first; revert-
    // to-draft is refused once anything is applied). This test exists solely
    // to prove the frontend still renders the columns rather than silently
    // dropping unexpected data if that backend guarantee is ever violated.
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);

    // "Estado de aplicación" itself is a desktop-table-only column header —
    // on mobile it stays mounted but CSS-hidden (the card layout shows the
    // state value without a label), so it's not a reliable visible/hidden
    // signal across both viewports. The application-state filter chips are
    // shared by both layouts and only render when showStateColumns is true,
    // so "Sin aplicar" being visible proves the same thing on either viewport.
    await expect(page.getByRole("button", { name: "Sin aplicar" })).toBeVisible();

    // Asserted rather than left to the pixels: on a tall desktop fullPage shot
    // a whole extra column diffs below maxDiffPixelRatio (0.02), so this
    // baseline passed unchanged even though the column was there. The text
    // assertion is what actually holds the column present on both viewports.
    await expectCurrentCoefficientShown(page, testInfo);

    await expect(page.getByTestId("sharing-agreement-coefficient-set")).toHaveScreenshot("sharing-agreement-detail-draft-defensive.png", await hideAppBar(page));
  });

  test("sharing agreement detail page (draft, empty coefficient set)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_EMPTY, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);

    await expect(page.getByTestId("sharing-agreement-coefficient-set")).toHaveScreenshot("sharing-agreement-detail-draft-empty.png", await hideAppBar(page));
  });

  test("sharing agreement detail page (published, mixed pending/applied)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(
      page,
      PUBLISHED_AGREEMENT_EDITED.id,
      PUBLISHED_AGREEMENT_EDITED,
      FIXED_COEFFICIENTS_MIXED,
      200,
    );

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT_EDITED.name);

    // A PUBLISHED agreement is editable now (the update endpoint no longer 409s
    // outside DRAFT) — prove the item is reachable, then close the menu so the
    // screenshot below stays in the same closed-menu state as its siblings.
    await page.getByRole("button", { name: "Más opciones del acuerdo" }).click();
    await expect(page.getByRole("menuitem", { name: "Editar datos del acuerdo" })).toBeVisible();
    await page.keyboard.press("Escape");

    // The last-edit record lives in the header's disclosure, so it has to be
    // opened for the screenshot to cover it at all.
    await page.getByRole("button", { name: /^Ver \d+ datos? más$/ }).click();
    await expect(page.getByText("Última edición")).toBeVisible();
    await stabilizePage(page);

    // FIXED_COEFFICIENTS_MIXED carries currentCoefficient on every row, as the
    // backend sends it whatever the status. The column is still absent: on a
    // published agreement the row's own value IS the one in force.
    await expect(page.getByText("Coeficiente actual")).toHaveCount(0);

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    await expect(page).toHaveScreenshot("sharing-agreement-detail-published.png", await mainRegion(page));
  });

  test("sharing agreement detail page (superseded)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, SUPERSEDED_AGREEMENT.id, SUPERSEDED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 404);

    await navigateToSharingAgreementDetail(page, SUPERSEDED_AGREEMENT.name);

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    await expect(page).toHaveScreenshot("sharing-agreement-detail-superseded.png", await mainRegion(page));
  });

  test("sharing agreement detail page (draft, no file)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(
      page,
      NO_FILE_DRAFT_AGREEMENT.id,
      NO_FILE_DRAFT_AGREEMENT,
      FIXED_COEFFICIENTS_EMPTY,
      404,
    );

    await navigateToSharingAgreementDetail(page, NO_FILE_DRAFT_AGREEMENT.name);

    await expect(page.getByText("No has importado ningún fichero en este acuerdo.")).toBeVisible();
    // The blocking reason is visible text, never a tooltip — critical on the
    // ~90% mobile user base, which has no hover. The control keeps `aria-disabled`
    // rather than `disabled`, so the reason stays reachable by keyboard.
    const generateButton = page.getByRole("button", { name: "Generar y descargar TXT" });
    await expect(generateButton).toHaveAttribute("aria-disabled", "true");
    // Focusable, not `disabled` — asserted by focusing it, because Playwright's
    // toBeDisabled() honours aria-disabled and so cannot tell "gated but still
    // reachable" from "removed from the tab order".
    await generateButton.focus();
    await expect(generateButton).toBeFocused();
    // One wording for the shortfall across the surface — "exactamente 100 %" is gone.
    await expect(page.getByText("Este acuerdo todavía no tiene coeficientes.")).toBeVisible();
    await expect(page.getByText(/exactamente 100/)).toHaveCount(0);

    await expect(page.getByTestId("sharing-agreement-file-panel")).toHaveScreenshot("sharing-agreement-detail-draft-no-file.png", await hideAppBar(page));
  });

  test("sharing agreement detail page (mobile coefficient cards)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Mobile-only card layout — not rendered on the desktop viewport.");

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);

    // Both the desktop table and the mobile card list render unconditionally (CSS-only
    // display toggle) — the table comes first in DOM order, so .last() is the mobile
    // card instance. Assert it's the one actually visible, not just relying on viewport.
    await expect(page.getByText("Vivienda A").last()).toBeVisible();

    await expect(page.getByTestId("sharing-agreement-coefficient-set")).toHaveScreenshot("sharing-agreement-detail-mobile.png", await hideAppBar(page));
  });

  test("sharing agreement detail page (batch activation bar, selection active)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);

    // FIXED_COEFFICIENTS_MIXED has exactly one PENDING row (Vivienda B) among
    // several APPLIED ones — selecting it is what mounts the batch bar at all.
    await page.getByRole("checkbox", { name: "Seleccionar Vivienda B" }).click();
    await expect(page.getByText("1 seleccionado")).toBeVisible();

    await expect(page.getByRole("button", { name: "Acciones", exact: true })).toBeEnabled();

    await stabilizePage(page);
    await expect(page.getByTestId("sharing-agreement-batch-bar")).toHaveScreenshot("sharing-agreement-batch-bar-selection.png", await hideAppBar(page));
  });

  test("sharing agreement detail page (batch bar Acciones menu, single action fully available)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);

    await page.getByRole("checkbox", { name: "Seleccionar Vivienda B" }).click();
    await page.getByRole("button", { name: "Acciones", exact: true }).click();
    await expect(page.getByRole("menuitem", { name: "Registrar fecha" })).toBeVisible();

    await stabilizePage(page);
    await expect(page.getByRole("menu")).toHaveScreenshot("sharing-agreement-batch-bar-acciones-menu.png", await hideAppBar(page));
  });

  test("sharing agreement coefficient row actions menu (⋯ open)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);

    // Vivienda A (coef-1) is APPLIED/OPEN — "Corregir fecha" and "Desactivar"
    // only, no end-of-coverage action, the minimal (two-item) menu shape.
    await page.getByRole("button", { name: "Más acciones para Vivienda A" }).first().click();
    await expect(page.getByRole("menuitem", { name: "Corregir fecha" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Desactivar" })).toBeVisible();
    await stabilizePage(page);

    await expect(page.getByRole("menu")).toHaveScreenshot("sharing-agreement-row-actions-menu.png", await hideAppBar(page));
  });

  test("sharing agreement detail page (mobile batch bar doesn't cover the last card)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Fixed bottom bar is mobile-only — desktop's bar is static in-flow.");

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);

    await page.getByRole("checkbox", { name: "Seleccionar Vivienda B" }).click();
    await expect(page.getByRole("button", { name: "Acciones", exact: true })).toBeVisible();

    await page.addStyleTag({
      content: `*, *::before, *::after { animation: none !important; transition: none !important; }`,
    });
    await page.waitForFunction(() => document.fonts.ready);

    // Scroll the real page (not a fullPage stitch, which wouldn't exercise a
    // fixed element's actual on-screen overlap) to the very bottom, so the
    // last card and the fixed bar are both on screen at once — this is the
    // assertion the screenshot exists to make: the reserved spacer must
    // leave the last card's bottom edge visible above the bar, not under it.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // "Ático F" is the last row in FIXED_COEFFICIENTS_MIXED.
    const lastCard = page.getByText("Ático F").last();
    await expect(lastCard).toBeVisible();
    const cardBox = await lastCard.boundingBox();
    const barBox = await page.getByRole("button", { name: "Acciones", exact: true }).boundingBox();
    expect(cardBox).not.toBeNull();
    expect(barBox).not.toBeNull();
    // The last card's bottom edge must sit above (a smaller y than) the top
    // of the fixed bar — i.e. not underneath it.
    expect(cardBox!.y + cardBox!.height).toBeLessThanOrEqual(barBox!.y);

    await expect(page).toHaveScreenshot("sharing-agreement-batch-bar-mobile-last-card.png", await hideAppBar(page));
  });

  test("sharing agreement detail page (draft, incomplete sum — publish not offered)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(
      page,
      DRAFT_AGREEMENT.id,
      DRAFT_AGREEMENT,
      FIXED_COEFFICIENTS_INCOMPLETE,
      200,
    );

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);

    // Publishing a set that does not sum to exactly 1 is refused by the backend
    // with a 409, so the control is not rendered at all — an action that is going
    // to fail is never offered. What is missing is stated as visible text instead.
    await expect(page.getByRole("button", { name: "Poner en vigor" })).toHaveCount(0);
    // Exact: the imported-file block offers "Descargar fichero importado", which
    // a substring match would pick up.
    await expect(page.getByRole("button", { name: "Descargar fichero", exact: true })).toHaveCount(0);

    await expect(
      page.getByText("«Poner en vigor» y «Generar el fichero» aparecerán cuando los coeficientes sumen 100,0000 %."),
    ).toBeVisible();
    await expect(page.getByText(/Completa el reparto: Faltan .* para llegar al 100,0000/)).toBeVisible();

    // Authoring is what this step actually offers, promoted on the banner. The
    // split section yields its own pair while the banner is carrying them, so
    // there is exactly one "Editar a mano" on screen.
    await expect(page.getByRole("button", { name: "Editar a mano" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Importar TXT" })).toHaveCount(1);

    // The gated-control pattern itself has not gone away — it moved to the file
    // panel's generate action, which is blocked by the same incomplete sum.
    const generateButton = page.getByRole("button", { name: "Generar y descargar TXT" });
    await expect(generateButton).toHaveAttribute("aria-disabled", "true");
    // Focusable, not `disabled`. Asserted by actually focusing it: Playwright's
    // toBeEnabled() honours aria-disabled, so it cannot distinguish "gated but
    // still reachable" from "removed from the tab order" — which is the whole
    // point of gating this way.
    await generateButton.focus();
    await expect(generateButton).toBeFocused();

    // The reason is visible text under the control the instant the page renders —
    // never a tooltip, and never requiring a hover or a menu to be opened first.
    const reasonId = await generateButton.getAttribute("aria-describedby");
    expect(reasonId, "a gated control must name the element describing it").toBeTruthy();
    // Selected by attribute, not by `#id`: React's useId emits values like
    // "«rh»", which are not valid CSS identifiers, and `CSS.escape` is not
    // available in the Node-side test context.
    const reason = page.locator(`[id="${reasonId}"]`);
    await expect(reason).toBeVisible();
    await expect(reason).toHaveText(/Faltan .* para llegar al 100,0000/);
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    await expect(page).toHaveScreenshot("sharing-agreement-draft-incomplete-sum.png", await mainRegion(page));
  });
});
