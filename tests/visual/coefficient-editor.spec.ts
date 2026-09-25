/**
 * Visual baselines — The sharing agreement coefficient editor.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import { test, expect } from "@playwright/test";
import {
  DRAFT_AGREEMENT,
  FIXED_COEFFICIENTS_EMPTY,
  FIXED_COEFFICIENTS_MIXED,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_SHARING_AGREEMENTS,
  FIXED_SUPPLY,
  hideAppBar,
  injectAuthToken,
  mockAllApiRoutes,
  mockSharingAgreementDetailRoutes,
  mockSharingAgreementsPlantRoutes,
  navigateToSharingAgreementDetail,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

test.describe("Visual baselines", () => {
  test("sharing agreement coefficient editor (empty draft, add-supply picker open)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_EMPTY, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Editar a mano" }).click();
    await page.getByRole("button", { name: "Añadir suministro" }).click();

    await expect(page.getByText(FIXED_SUPPLY.name)).toBeVisible();
    await stabilizePage(page);

    await expect(page.getByTestId("modal-panel")).toHaveScreenshot("sharing-agreement-editor-add-supply-picker.png", await hideAppBar(page));
  });

  test("sharing agreement coefficient editor (mid-edit, sum below 100%)", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Removing a row targets the desktop table instance specifically — both the table and card render in the DOM regardless of viewport (CSS-only toggle), so exercising this on mobile would need a second, separately-scoped interaction just to avoid strict-mode ambiguity, for no additional coverage.",
    );

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Editar a mano" }).click();

    // FIXED_COEFFICIENTS_MIXED sums to exactly 100%; removing Vivienda A's
    // 30% coefficient brings the live sum to 70%, below the full-sum copy.
    await page.getByRole("button", { name: /Quitar Vivienda A/ }).first().click();

    // Plain string, not regex: the percent formatter's U+00A0 before "%" is
    // normalized against a regular space by getByText's string matcher, but
    // not by its regex matcher.
    await expect(page.getByText("Suma de los coeficientes: 70,0000 %")).toBeVisible();
    await stabilizePage(page);

    await expect(page.getByTestId("sharing-agreement-coefficient-set")).toHaveScreenshot("sharing-agreement-editor-mid-edit.png", await hideAppBar(page));
  });

  test("sharing agreement coefficient editor (row empty-value error)", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Targets the desktop table's input specifically to avoid strict-mode ambiguity with the always-present, CSS-hidden mobile card instance.",
    );

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Editar a mano" }).click();

    // Editor opens in kW mode by default.
    await page.getByPlaceholder("0,00").first().fill("");

    await expect(page.getByText("Obligatorio").first()).toBeVisible();
    await stabilizePage(page);

    await expect(page.getByTestId("sharing-agreement-coefficient-set")).toHaveScreenshot("sharing-agreement-editor-empty-value-error.png", await hideAppBar(page));
  });

  test("sharing agreement coefficient editor (toggled to kW, values converted and kept)", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Same duplicate-DOM-instance rationale as the other interactive editor specs above.",
    );

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Editar a mano" }).click();
    await expect(page.getByRole("button", { name: "kW" })).toHaveAttribute("aria-pressed", "true");

    // The editor works in percent now, so the round trip under test is kW -> %
    // -> kW. Vivienda A's 0.3 coefficient is 13,50 kW of the 45 kW installed.
    await page.getByRole("button", { name: "%" }).click();
    await expect(page.locator("tr", { hasText: "Vivienda A" }).getByRole("textbox")).toHaveValue("30,0000");

    await page.getByRole("button", { name: "kW" }).click();
    // Converted, not cleared, and not rounding-drifted: toggling only ever
    // re-derives the text from the canonical value, never the other way round.
    await expect(page.locator("tr", { hasText: "Vivienda A" }).getByRole("textbox")).toHaveValue("13,50");

    await page.getByRole("button", { name: "%" }).click();
    await stabilizePage(page);

    await expect(page.getByTestId("sharing-agreement-coefficient-set")).toHaveScreenshot("sharing-agreement-editor-toggled-to-kw.png", await hideAppBar(page));
  });

  test("sharing agreement coefficient editor (current coefficient while editing in kW)", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Same duplicate-DOM-instance rationale as the other interactive editor specs above.",
    );

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Editar a mano" }).click();
    // The editor opens in kW; the sibling "toggled to kW" spec ends in percent,
    // so this is the only baseline that shows the column with a kW input beside
    // it. The difference is a percentage either way — it is computed from the
    // canonical 0-1 coefficient, which the kW text is only a view of.
    await expect(page.getByRole("button", { name: "kW" })).toHaveAttribute("aria-pressed", "true");

    const vivendaA = page.locator("tr", { hasText: "Vivienda A" });
    await expect(vivendaA.getByRole("textbox")).toHaveValue("13,50");
    // 13,50 kW of 45 kW installed is 0.3, against a current 0.25.
    await expect(vivendaA).toContainText("+5,0000");

    await stabilizePage(page);

    await expect(page.getByTestId("sharing-agreement-coefficient-set")).toHaveScreenshot("sharing-agreement-editor-kw-current-coefficient.png", await hideAppBar(page));
  });

  test("sharing agreement coefficient editor (kW rounds to installed but coefficient sum isn't exact)", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Same duplicate-DOM-instance rationale as the other interactive editor specs above.",
    );

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    // Three rows of 0.333333 sum to 999,999 units (short by one) but each
    // row's kW, rounded to 2dp on a 45 kW plant, still totals to 45,00 kW.
    const roundingCaveatAgreement = { ...DRAFT_AGREEMENT, installedPowerKw: 45 };
    const roundingCaveatCoefficients = [
      { coefficientId: "1", supply: { id: "supply-1", name: "Vivienda A", code: "ES0031300000000001AA" }, coefficient: 0.333333 },
      { coefficientId: "2", supply: { id: "supply-2", name: "Vivienda B", code: "ES0031300000000002BB" }, coefficient: 0.333333 },
      { coefficientId: "3", supply: { id: "supply-3", name: "Local C", code: "ES0031300000000003CC" }, coefficient: 0.333333 },
    ];
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, roundingCaveatAgreement, roundingCaveatCoefficients, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Editar a mano" }).click();

    await expect(page.getByText("Suma de los coeficientes: 99,9999 %")).toBeVisible();
    // Plain strings, not regex — same NBSP-normalization rationale as the
    // percentage assertion above: getByText's string matcher normalizes the
    // formatter's U+00A0 against a regular space; its regex matcher does not.
    await expect(page.getByText("(con redondeo a céntimos)", { exact: false })).toBeVisible();
    await expect(page.getByText("faltan 0,0001 % por ajustar en modo porcentaje.", { exact: false })).toBeVisible();
    await stabilizePage(page);

    await expect(page.getByTestId("sharing-agreement-coefficient-set")).toHaveScreenshot("sharing-agreement-editor-kw-rounding-caveat.png", await hideAppBar(page));
  });

  // Runs on BOTH viewports, unlike the interactive editor specs above. Those
  // skip mobile because the card list adds no coverage for what they capture;
  // here it does — SharingAgreementCoefficientCard renders the revert control
  // with its own markup, which the desktop table shot cannot show.
  //
  // The table and the card list are two renderings of the same row state (a
  // CSS-only breakpoint, so both are always in the DOM), which is what lets one
  // spec serve both viewports. The locator filters to the VISIBLE instance
  // rather than taking .first(): fill() requires an actionable element, so on
  // mobile it has to drive the card's input, not the display:none table's.
  test("sharing agreement coefficient editor (modified row offering its revert control)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Editar a mano" }).click();

    // Nothing is offered until a row actually differs from its start value.
    await expect(page.getByRole("button", { name: /Restaurar valor inicial/ })).toHaveCount(0);

    // Vivienda A: 0.3 of the 45 kW installed. First visible input = the first
    // row of whichever renderer this viewport shows.
    const viviendaAInput = page.locator('input[placeholder="0,00"]:visible').first();
    await expect(viviendaAInput).toHaveValue("13,50");
    await viviendaAInput.fill("13,00");

    // Asserted explicitly, not left to the screenshot: a ~30x30 px icon button
    // is well inside the 0.02 maxDiffPixelRatio on a full-page capture, so the
    // image alone would not prove the control rendered.
    //
    // Exactly one, on each viewport. Both renderers are always in the DOM, but
    // the hidden one is display:none and so outside the accessibility tree that
    // getByRole queries — which makes this assert the right renderer for the
    // viewport: the table's button on desktop, the card's on mobile.
    await expect(page.getByRole("button", { name: "Restaurar valor inicial de Vivienda A" })).toHaveCount(1);
    // ...and on the edited row only.
    await expect(page.getByRole("button", { name: /Restaurar valor inicial/ })).toHaveCount(1);
    await expect(page.getByText("Suma de los coeficientes: 98,8889 %")).toBeVisible();
    await stabilizePage(page);

    await expect(page.getByTestId("sharing-agreement-coefficient-set")).toHaveScreenshot("sharing-agreement-editor-row-modified-revert.png", await hideAppBar(page));
  });
});
