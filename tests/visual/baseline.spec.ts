import { test, expect, type Page, type Route, type TestInfo } from "@playwright/test";
import {
  DASHBOARD_COMMUNITIES,
  FIXED_COEFFICIENTS_ALL_PENDING,
  FIXED_COEFFICIENTS_EMPTY,
  FIXED_COEFFICIENTS_INCOMPLETE,
  FIXED_COEFFICIENTS_MIXED,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_MEMBER_USER,
  FIXED_NO_COMMUNITY_USER,
  FIXED_PLANT,
  FIXED_PLANT_ID,
  FIXED_PLATFORM_ADMIN_USER,
  FIXED_SHARING_AGREEMENTS,
  FIXED_SUPPLY,
  FIXED_SUPPLY_COEFFICIENT_HISTORY,
  FIXED_SUPPLY_ID,
  injectAuthToken,
  mockAllApiRoutes,
  mockPlantDetailRoutes,
  mockSharingAgreementDetailRoutes,
  mockSharingAgreementFileUploadRejection,
  mockSharingAgreementGenerateFile,
  mockSharingAgreementsPlantRoutes,
  mockSupplyPartitionCoefficientRoutes,
  NO_FILE_DRAFT_AGREEMENT,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Visual baselines", () => {
  test("login page", async ({ page }) => {
    // No token injection — unauthenticated render
    await page.goto("/login");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("login-page.png", { fullPage: true });
  });

  // Member-fixture tests: home, supply-points, supply-detail, supply modals
  // Active community is seeded in localStorage so operational UI is visible
  // after the community useEffect auto-selects it.

  test("home page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto("/");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("home-page.png", { fullPage: true });
  });

  test("supplies list page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto("/supply-points");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("supplies-list.png", { fullPage: true });
  });

  test("supply detail page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto(`/supply-points/${FIXED_SUPPLY_ID}`);
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("supply-detail.png", { fullPage: true });
  });

  // The coefficient history section is reachable by the owner as well as by an
  // admin: /supply-points/:id carries no community guard and the endpoint
  // authorises the supply owner. These three cover both roles and the empty
  // state, on a supply that genuinely takes part in two plants.

  test("supply detail coefficient history (admin, two plants)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSupplyPartitionCoefficientRoutes(page, FIXED_SUPPLY_COEFFICIENT_HISTORY);

    await page.goto(`/supply-points/${FIXED_SUPPLY_ID}`);
    await expect(page.getByRole("heading", { name: "Histórico de coeficientes" })).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("supply-detail-coefficient-history-admin.png", { fullPage: true });

    // No plantId filter here, so both plants group; the draft's pending period
    // is withheld even though an admin receives it.
    await expect(page.getByRole("heading", { name: "Planta Solar Norte" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Planta Solar Sur" })).toBeVisible();
    await expect(page.getByText("Reparto ampliación bloque B")).toHaveCount(0);
    // An admin of this community can follow a link to the agreement.
    await expect(page.getByRole("link", { name: "Reparto vecinos bloque A" })).toBeVisible();
  });

  test("supply detail coefficient history (owner, no agreement links)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);
    await mockSupplyPartitionCoefficientRoutes(page, FIXED_SUPPLY_COEFFICIENT_HISTORY);

    await page.goto(`/supply-points/${FIXED_SUPPLY_ID}`);
    await expect(page.getByRole("heading", { name: "Histórico de coeficientes" })).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("supply-detail-coefficient-history-owner.png", { fullPage: true });

    // Same periods, but the agreement route is CommunityAdminRoute-guarded, so
    // an owner is shown names rather than links that would redirect them.
    await expect(page.getByText("Reparto vecinos bloque A")).toBeVisible();
    await expect(page.getByRole("link", { name: "Reparto vecinos bloque A" })).toHaveCount(0);
  });

  test("supply detail coefficient history (empty)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);
    await mockSupplyPartitionCoefficientRoutes(page, []);

    await page.goto(`/supply-points/${FIXED_SUPPLY_ID}`);
    await expect(page.getByText("Sin periodos aplicados")).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("supply-detail-coefficient-history-empty.png", { fullPage: true });
  });

  test("import supplies modal open", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto("/supply-points");
    await stabilizePage(page);

    // Scroll the "Importar CSV" button into view (may be off-screen on mobile) then click
    const importBtn = page.getByRole("button", { name: /importar csv/i });
    await importBtn.scrollIntoViewIfNeeded();
    await importBtn.click();

    // Wait for the modal title text to appear (MUI Modal doesn't use role="dialog")
    await page.waitForSelector("text=Importar Puntos de Suministro desde CSV");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("import-supplies-modal.png", { fullPage: true });
  });

  test("disable confirmation modal open", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto("/supply-points");
    await stabilizePage(page);

    // Open the three-dot menu on the enabled supply card (ES0021000000000000AA)
    const enabledCard = page
      .locator(".MuiCard-root")
      .filter({ hasText: "ES0021000000000000AA" });
    await enabledCard.getByRole("button").click();

    // Click "Deshabilitar" in the dropdown — opens DisableConfirmationModal
    await page.getByRole("menuitem", { name: /Deshabilitar/i }).click();

    await page.waitForSelector("text=Deshabilitar punto de suministro");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("disable-confirmation-modal.png", {
      fullPage: true,
    });
  });

  test("disable success modal open", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto("/supply-points");
    await stabilizePage(page);

    // Open the dropdown and trigger the disable confirmation modal
    const enabledCard = page
      .locator(".MuiCard-root")
      .filter({ hasText: "ES0021000000000000AA" });
    await enabledCard.getByRole("button").click();
    await page.getByRole("menuitem", { name: /Deshabilitar/i }).click();
    await page.waitForSelector("text=Deshabilitar punto de suministro");

    // Confirm — fires POST /api/v1/supplies/{id}/disable (mocked → 200)
    // then opens DisableSuccessModal
    await page.getByRole("button", { name: /^Deshabilitar$/i }).click();

    await page.waitForSelector("text=ha sido deshabilitado");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("disable-success-modal.png", {
      fullPage: true,
    });
  });

  // Platform-admin fixture tests: /platform (welcome) and /users (users management).
  // PlatformAdminRoute reads isPlatformAdmin directly from loggedUser (no async
  // community selection needed), so direct page.goto() works reliably.

  // Platform dashboard — populated. A richer communities fixture (registered
  // AFTER mockAllApiRoutes so it is consulted first) exercises every KPI, the
  // attention panel (all three signals), and all four status-chip variants.
  test("platform dashboard (populated)", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
    await page.route(
      (url) => url.href.includes("/api/v1/communities") && !url.href.includes("/supplies"),
      (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(DASHBOARD_COMMUNITIES),
        }),
    );

    await page.goto("/platform");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("platform-dashboard-populated.png", { fullPage: true });
  });

  // Platform dashboard — empty (0 communities → first-community empty state).
  test("platform dashboard (empty)", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
    await page.route(
      (url) => url.href.includes("/api/v1/communities") && !url.href.includes("/supplies"),
      (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        }),
    );

    await page.goto("/platform");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("platform-dashboard-empty.png", { fullPage: true });
  });

  test("users page", async ({ page }) => {
    // Migrated from "partners page" — /partners was removed in Phase 5.1/5.2.
    // The users management screen (/users) is the platform-admin equivalent.
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto("/users");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("users-page.png", { fullPage: true });
  });

  // No-community fixture test: asserts that a user with no memberships and
  // isPlatformAdmin=false sees the /no-community screen (the correct expected behaviour).

  test("no-community page", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_NO_COMMUNITY_USER);

    // Navigate directly — NoCommunityPage has no route guard, so it always renders.
    // AuthenticatedLayout's landing-redirect only fires when pathname === '/',
    // so navigating here directly does not trigger a redirect to /no-community.
    await page.goto("/no-community");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("no-community-page.png", { fullPage: true });
  });

  // Community-admin fixture tests: sharing-agreements list.
  // CommunityAdminRoute redirects on a cold page.goto() before the community
  // context's useEffect resolves (see file header), so these tests reach the
  // guarded route the same way a real user would — navigating from the
  // unguarded /production list and clicking through the plant card's kebab
  // menu — rather than deep-linking directly.

  async function navigateToSharingAgreements(page: Page) {
    await page.goto("/production");

    // Waited for BEFORE stabilizing, not after. `stabilizePage` settles on
    // `networkidle`, which is not a "the app has rendered" signal: every page is
    // React.lazy, and while the dev server transforms a route's module subtree
    // there is no request in flight, so networkidle fires with #root still empty
    // behind the Suspense fallback. Stabilizing then would inject the
    // animation-killing stylesheet into a document that has not painted the
    // content yet, and the click below would hunt for an element that does not
    // exist — reported as a bare 30s timeout rather than "no plant card".
    // (The warm-up project removes the cold-transform cost; this makes the
    // helper honest about what it is waiting for either way.)
    const plantCard = page.locator(".MuiCard-root").filter({ hasText: FIXED_PLANT.name });
    await expect(plantCard).toBeVisible();

    await stabilizePage(page);

    // Named, not a bare getByRole("button"): the card grows controls over time,
    // and an unnamed role query would start matching whichever one came first.
    await plantCard.getByRole("button", { name: `Más acciones para ${FIXED_PLANT.name}` }).click();
    await page.getByRole("menuitem", { name: /Acuerdos de Reparto/i }).click();

    await expect(page.getByText(/CAU:/)).toBeVisible();
    await stabilizePage(page);
  }

  test("sharing agreements list page (populated)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);

    await navigateToSharingAgreements(page);

    await expect(page).toHaveScreenshot("sharing-agreements-list.png", { fullPage: true });
  });

  test("sharing agreements list page (empty)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, []);

    await navigateToSharingAgreements(page);

    await expect(page).toHaveScreenshot("sharing-agreements-list-empty.png", { fullPage: true });
  });

  test("sharing agreements list page (status filter active)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);

    await navigateToSharingAgreements(page);

    await page.getByRole("button", { name: "Borrador" }).click();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreements-list-filtered.png", { fullPage: true });
  });

  test("sharing agreement create dialog (capacity prefilled from plant totalPower)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);

    await navigateToSharingAgreements(page);
    await page.getByRole("button", { name: "Nuevo acuerdo de reparto" }).click();

    await expect(page.getByLabel("Capacidad de generación de la planta", { exact: false })).toHaveValue("120,5");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-create-dialog.png", { fullPage: true });
  });

  test("sharing agreement create dialog (empty-name validation error)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);

    await navigateToSharingAgreements(page);
    await page.getByRole("button", { name: "Nuevo acuerdo de reparto" }).click();
    await page.getByRole("button", { name: "Crear borrador" }).click();

    await expect(page.getByText("El nombre es obligatorio")).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-create-dialog-validation-error.png", { fullPage: true });
  });

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

  async function navigateToSharingAgreementDetail(page: Page, agreementName: string) {
    await navigateToSharingAgreements(page);

    const agreementCard = page.locator(".MuiCard-root").filter({ hasText: agreementName });
    await agreementCard.getByRole("link", { name: agreementName }).click();

    // The file panel's title always renders on load regardless of file/coefficient
    // state, so it's a reliable "detail page finished loading" signal across every
    // fixture — unlike the coefficient sum, which is absent when coefficients is empty.
    // One wording in every status now: the panel no longer switches to
    // "Fichero enviado a la distribuidora" once the agreement is published.
    await expect(page.getByRole("heading", { name: "Fichero para la distribuidora" })).toBeVisible();
    await stabilizePage(page);
  }

  const DRAFT_AGREEMENT = FIXED_SHARING_AGREEMENTS[1];
  const PUBLISHED_AGREEMENT = FIXED_SHARING_AGREEMENTS[0];
  const SUPERSEDED_AGREEMENT = FIXED_SHARING_AGREEMENTS[2];

  /**
   * PUBLISHED_AGREEMENT is shared by ~20 baselines below (batch bar, dialogs,
   * editor states, ...) that have nothing to do with editing. Only the
   * dedicated "published" detail-page baseline should exercise the
   * last-edited tile, so it gets its own derived fixture instead of adding
   * updatedAt/updatedBy to the shared one, which would needlessly reshoot
   * every other PUBLISHED_AGREEMENT screenshot.
   */
  const PUBLISHED_AGREEMENT_EDITED = {
    ...PUBLISHED_AGREEMENT,
    updatedAt: "2026-08-01T09:00:00Z",
    updatedBy: FIXED_COMMUNITY_ADMIN_USER.id,
  };

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

    await expect(page).toHaveScreenshot("sharing-agreement-detail-draft.png", { fullPage: true });
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

    await expect(page).toHaveScreenshot("sharing-agreement-detail-draft-no-current-coefficient.png", {
      fullPage: true,
    });
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

    await expect(page).toHaveScreenshot("sharing-agreement-detail-draft-defensive.png", { fullPage: true });
  });

  test("sharing agreement detail page (draft, empty coefficient set)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_EMPTY, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);

    await expect(page).toHaveScreenshot("sharing-agreement-detail-draft-empty.png", { fullPage: true });
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

    await expect(page).toHaveScreenshot("sharing-agreement-detail-published.png", { fullPage: true });
  });

  test("sharing agreement detail page (superseded)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, SUPERSEDED_AGREEMENT.id, SUPERSEDED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 404);

    await navigateToSharingAgreementDetail(page, SUPERSEDED_AGREEMENT.name);

    await expect(page).toHaveScreenshot("sharing-agreement-detail-superseded.png", { fullPage: true });
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

    await expect(page).toHaveScreenshot("sharing-agreement-detail-draft-no-file.png", { fullPage: true });
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

    await expect(page).toHaveScreenshot("sharing-agreement-detail-mobile.png", { fullPage: true });
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
    await expect(page).toHaveScreenshot("sharing-agreement-batch-bar-selection.png", { fullPage: true });
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
    await expect(page).toHaveScreenshot("sharing-agreement-batch-bar-acciones-menu.png", { fullPage: true });
  });

  test("sharing agreement batch registration dialog (Registrar fecha, opened from Acciones)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);

    await page.getByRole("checkbox", { name: "Seleccionar Vivienda B" }).click();
    await page.getByRole("button", { name: "Acciones", exact: true }).click();
    await page.getByRole("menuitem", { name: "Registrar fecha" }).click();

    await expect(page.getByRole("heading", { name: "Registrar fecha de aplicación" })).toBeVisible();
    const confirmButton = page.getByRole("button", { name: "Registrar fecha" });
    await expect(confirmButton).toBeDisabled();
    await expect(page.getByText("Selecciona una fecha")).toBeVisible();

    await stabilizePage(page);
    await expect(page).toHaveScreenshot("sharing-agreement-batch-registration-dialog.png", { fullPage: true });
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

    await expect(page).toHaveScreenshot("sharing-agreement-row-actions-menu.png", { fullPage: true });
  });

  test("coefficient history drawer (draft)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_ALL_PENDING, 200);
    await mockSupplyPartitionCoefficientRoutes(page, FIXED_SUPPLY_COEFFICIENT_HISTORY);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);

    // A DRAFT row had no kebab at all before this; now it carries exactly one
    // entry, and no lifecycle action.
    await page.getByRole("button", { name: "Más acciones para Vivienda A" }).first().click();
    await expect(page.getByRole("menuitem", { name: "Ver histórico" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Registrar fecha" })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Ver histórico" }).click();

    // Assertions are scoped to the panel: several agreement names legitimately
    // appear both inside it and in the page behind it.
    const drawer = page.getByTestId("coefficient-history-drawer");
    await expect(drawer.getByRole("heading", { name: "Histórico de coeficientes" })).toBeVisible();
    // Scoped to the agreement's plant, so the supply's other plant is absent,
    // and the draft's own pending period never appears on a timeline.
    await expect(drawer.getByRole("heading", { name: "Planta Solar Norte" })).toBeVisible();
    await expect(drawer.getByRole("heading", { name: "Planta Solar Sur" })).toHaveCount(0);
    await expect(drawer.getByText("Reparto ampliación bloque B")).toHaveCount(0);
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("coefficient-history-drawer-draft.png", { fullPage: true });
    // The screenshot tolerance can absorb a whole panel, so the periods are
    // asserted as text as well as pixels, on both viewports.
    await expect(drawer.getByText("25,0000 %")).toBeVisible();
    await expect(drawer.getByText("Desde 1 ene 2023")).toBeVisible();
    await expect(drawer.getByText("1 mar 2022 → 1 ene 2023")).toBeVisible();
  });

  test("coefficient history drawer (superseded)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, SUPERSEDED_AGREEMENT.id, SUPERSEDED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 404);
    await mockSupplyPartitionCoefficientRoutes(page, FIXED_SUPPLY_COEFFICIENT_HISTORY);

    await navigateToSharingAgreementDetail(page, SUPERSEDED_AGREEMENT.name);

    await page.getByRole("button", { name: "Más acciones para Vivienda A" }).first().click();
    await page.getByRole("menuitem", { name: "Ver histórico" }).click();

    const drawer = page.getByTestId("coefficient-history-drawer");
    await expect(drawer.getByRole("heading", { name: "Histórico de coeficientes" })).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("coefficient-history-drawer-superseded.png", { fullPage: true });
    // The oldest period belongs to the agreement being viewed, so it is marked
    // and deliberately not linked back to the page the admin is already on.
    await expect(drawer.getByText("Este acuerdo")).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Reparto original 2022" })).toHaveCount(0);
    // The later period, on another agreement, keeps its link.
    await expect(drawer.getByRole("link", { name: "Reparto vecinos bloque A" })).toBeVisible();
    await expect(drawer.getByText("En vigor")).toBeVisible();
  });

  test("sharing agreement coefficient recalculation dialog (Corregir fecha)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);
    await page.getByRole("button", { name: "Más acciones para Vivienda A" }).first().click();
    await page.getByRole("menuitem", { name: "Corregir fecha" }).click();

    await expect(page.getByRole("heading", { name: "Corregir fecha de aplicación" })).toBeVisible();
    await expect(page.getByText(/producción ya atribuida a este suministro/)).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-coefficient-recalculation-dialog.png", { fullPage: true });
  });

  test("sharing agreement coefficient close dialog (Cerrar (baja))", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);
    // Local C (coef-3) is the OPEN_ORPHAN row — the only one offering "Cerrar (baja)".
    await page.getByRole("button", { name: "Más acciones para Local C" }).first().click();
    await page.getByRole("menuitem", { name: "Cerrar (baja)" }).click();

    await expect(page.getByRole("heading", { name: "Cerrar coeficiente" })).toBeVisible();
    await expect(page.getByText(/dejará de recibir atribución de producción/)).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-coefficient-close-dialog.png", { fullPage: true });
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

    await expect(page).toHaveScreenshot("sharing-agreement-batch-bar-mobile-last-card.png");
  });

  test("sharing agreement edit dialog (seeded with existing values)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Más opciones del acuerdo" }).click();
    await page.getByRole("menuitem", { name: "Editar datos del acuerdo" }).click();

    await expect(page.getByLabel("Nombre", { exact: false })).toHaveValue(DRAFT_AGREEMENT.name);
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-edit-dialog.png", { fullPage: true });
  });

  test("sharing agreement delete confirmation", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Más opciones del acuerdo" }).click();
    await page.getByRole("menuitem", { name: "Eliminar" }).click();

    await expect(page.getByRole("heading", { name: "Eliminar acuerdo de reparto" })).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-delete-confirmation.png", { fullPage: true });
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

    await expect(page).toHaveScreenshot("sharing-agreement-draft-incomplete-sum.png", { fullPage: true });
  });

  test("sharing agreement publish confirmation", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(
      page,
      DRAFT_AGREEMENT.id,
      DRAFT_AGREEMENT,
      FIXED_COEFFICIENTS_ALL_PENDING,
      200,
    );

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Poner en vigor" }).click();

    await expect(page.getByRole("heading", { name: "Poner en vigor" })).toBeVisible();
    await expect(page.getByText(/Poner en vigor no aplica nada por sí mismo/)).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-publish-confirmation.png", { fullPage: true });
  });

  test("sharing agreement revert-to-draft confirmation", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(
      page,
      PUBLISHED_AGREEMENT.id,
      PUBLISHED_AGREEMENT,
      FIXED_COEFFICIENTS_ALL_PENDING,
      200,
    );

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);
    // Reverting is a labelled control on the lifecycle rail now. The published
    // agreement's kebab is gone entirely: editing and deleting are draft-only.
    await page.getByRole("button", { name: "Volver a borrador" }).click();

    await expect(page.getByRole("heading", { name: "Volver a borrador" })).toBeVisible();
    await expect(
      page.getByText(/dejará de estar en vigor y sus coeficientes volverán a ser editables/),
    ).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-revert-confirmation.png", { fullPage: true });
  });

  test("sharing agreement upload dialog (idle)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Importar TXT" }).click();

    await expect(page.getByText(`${FIXED_PLANT.regulatoryCode}_AAAA.txt`)).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-upload-dialog-idle.png", { fullPage: true });
  });

  test("sharing agreement upload dialog (rejected lines)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, DRAFT_AGREEMENT.id, DRAFT_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);
    await mockSharingAgreementFileUploadRejection(page, FIXED_PLANT_ID, DRAFT_AGREEMENT.id);

    await navigateToSharingAgreementDetail(page, DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Importar TXT" }).click();

    await page.setInputFiles('input[type="file"]', {
      name: `${FIXED_PLANT.regulatoryCode}_2026.txt`,
      mimeType: "text/plain",
      buffer: Buffer.from("ES0031300000000001AA;0,500000\n"),
    });
    await page.getByRole("button", { name: "Subir fichero" }).last().click();

    await expect(page.getByText("Errores del fichero")).toBeVisible();
    await expect(page.getByText("Errores por línea")).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-upload-dialog-rejected.png", { fullPage: true });
  });

  test("sharing agreement generate dialog (year pre-filled)", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(
      page,
      NO_FILE_DRAFT_AGREEMENT.id,
      NO_FILE_DRAFT_AGREEMENT,
      FIXED_COEFFICIENTS_ALL_PENDING,
      404,
    );
    await mockSharingAgreementGenerateFile(page, FIXED_PLANT_ID, NO_FILE_DRAFT_AGREEMENT.id);

    await navigateToSharingAgreementDetail(page, NO_FILE_DRAFT_AGREEMENT.name);
    await page.getByRole("button", { name: "Generar y descargar TXT" }).click();

    await expect(page.getByRole("heading", { name: "Generar fichero" })).toBeVisible();
    await expect(page.getByLabel("Año")).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("sharing-agreement-generate-dialog.png", { fullPage: true });
  });

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

    await expect(page).toHaveScreenshot("sharing-agreement-editor-add-supply-picker.png", { fullPage: true });
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

    await expect(page).toHaveScreenshot("sharing-agreement-editor-mid-edit.png", { fullPage: true });
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

    await expect(page).toHaveScreenshot("sharing-agreement-editor-empty-value-error.png", { fullPage: true });
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

    await expect(page).toHaveScreenshot("sharing-agreement-editor-toggled-to-kw.png", { fullPage: true });
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

    await expect(page).toHaveScreenshot("sharing-agreement-editor-kw-current-coefficient.png", {
      fullPage: true,
    });
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

    await expect(page).toHaveScreenshot("sharing-agreement-editor-kw-rounding-caveat.png", { fullPage: true });
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

    await expect(page).toHaveScreenshot("sharing-agreement-editor-row-modified-revert.png", { fullPage: true });
  });

  // -------------------------------------------------------------------------
  // Plant detail header
  // -------------------------------------------------------------------------

  async function openPlantDetail(page: Page) {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockPlantDetailRoutes(page);

    await page.goto(`/production/${FIXED_PLANT_ID}`);
    await expect(page.getByRole("heading", { level: 1, name: FIXED_PLANT.name })).toBeVisible();
    await stabilizePage(page);
  }

  test("plant detail page", async ({ page }) => {
    await openPlantDetail(page);

    await expect(page).toHaveScreenshot("plant-detail.png", { fullPage: true });
  });

  test("plant detail page (details expanded)", async ({ page }) => {
    await openPlantDetail(page);

    await page.getByRole("button", { name: /^Ver \d+ datos? más$/ }).click();
    await expect(page.getByText("HUAWEI")).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("plant-detail-expanded.png", { fullPage: true });
  });

  /**
   * AC1. The redesign exists because the old header pushed the page's content
   * off a phone's first viewport, so the budget is the acceptance criterion
   * itself rather than a stylistic preference — measured, not eyeballed.
   */
  test("AC1: the collapsed headers fit a 390px viewport", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The 120px budget is specified against a 390px viewport.");

    await openPlantDetail(page);

    const plantHeader = await page.getByTestId("detail-header").boundingBox();
    testInfo.annotations.push({ type: "plant header height", description: `${plantHeader?.height}px` });
    console.log(`AC1 plant header height: ${plantHeader?.height}px`);
    expect(plantHeader?.height).toBeLessThanOrEqual(120);
  });

  /**
   * The agreement header is measured too, but against a regression guard rather
   * than AC1's figure. AC1 states its 120px budget for a PLANT, and this header
   * carries two things a plant's does not: a status badge and a link to the
   * plant it belongs to. At 390px the fixture's name ("Reparto vecinos bloque
   * A") also takes two lines on its own. The bound below exists to catch the
   * header growing further, and is deliberately not dressed up as the AC.
   */
  test("the collapsed agreement header stays within its measured budget at 390px", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The budget is measured against a 390px viewport.");

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);

    const agreementHeader = await page.getByTestId("detail-header").boundingBox();
    testInfo.annotations.push({ type: "agreement header height", description: `${agreementHeader?.height}px` });
    console.log(`Agreement header height: ${agreementHeader?.height}px`);
    expect(agreementHeader?.height).toBeLessThanOrEqual(150);
  });

  // -------------------------------------------------------------------------
  // List headers
  // -------------------------------------------------------------------------

  /**
   * Every list page the suite can actually reach with its existing fixtures.
   *
   * Three of the eight are absent, for two different reasons:
   *
   *   - Partners and partner supply points, because App.tsx routes neither.
   *     There is no `path="partners"`, and nothing in the app links to one.
   *     They were migrated all the same (the issue lists them), but no browser
   *     test can open a page the router does not serve.
   *
   *   - /members, for the reason the file header already gives for its guard:
   *     it redirects on a cold goto before community selection resolves. It
   *     also has no memberships fixture — the broad communities mock would
   *     answer that call with a list of communities. Its header is the same
   *     three-counter shape as /users, which IS measured below, and the page
   *     itself stays covered by MembersPage.spec.tsx.
   */
  const LIST_PAGES: { name: string; open: (page: Page) => Promise<void> }[] = [
    {
      name: "/production",
      open: async (page) => {
        await injectAuthToken(page);
        await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
        await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
        await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
        await page.goto("/production");
        await stabilizePage(page);
      },
    },
    {
      name: "/supply-points",
      open: async (page) => {
        await injectAuthToken(page);
        await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
        await mockAllApiRoutes(page, FIXED_MEMBER_USER);
        await page.goto("/supply-points");
        await stabilizePage(page);
      },
    },
    {
      name: "/users",
      open: async (page) => {
        await injectAuthToken(page);
        await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
        await page.goto("/users");
        await stabilizePage(page);
      },
    },
    {
      name: "/communities",
      open: async (page) => {
        await injectAuthToken(page);
        await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
        await page.goto("/communities");
        await stabilizePage(page);
      },
    },
    {
      name: "sharing agreements list",
      open: async (page) => {
        await injectAuthToken(page);
        await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
        await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
        await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
        await navigateToSharingAgreements(page);
      },
    },
  ];

  /**
   * AC1 and AC2, measured rather than eyeballed.
   *
   * Two separate promises, and a counter strip can keep one while breaking the
   * other. "One row" alone is satisfied by three cells that each clip their
   * label to "Inac…", which is the layout doing the reader no favours; so the
   * labels are checked for actual clipping too, by asking each one whether it
   * overflows its own box.
   *
   * Heights are recorded for every page, not just the one AC2 bounds, so the
   * next person changing this header can see what it costs everywhere.
   */
  for (const listPage of LIST_PAGES) {
    test(`AC1: the ${listPage.name} header keeps its counters on one unclipped row at 390px`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "AC1 is specified against a 390px viewport.");

      await listPage.open(page);

      const header = page.getByTestId("list-header");
      await expect(header).toBeVisible();

      const box = await header.boundingBox();
      testInfo.annotations.push({
        type: "list header height",
        description: `${listPage.name}: ${box?.height}px`,
      });
      console.log(`List header height — ${listPage.name}: ${box?.height}px`);

      // The strip's captions are exactly the counter labels: the title is an
      // h1 and the subtitle is body2, so nothing else in the header is one.
      const labels = header.locator(".MuiTypography-caption");
      const labelCount = await labels.count();
      expect(labelCount).toBeGreaterThanOrEqual(2);

      const tops = await labels.evaluateAll((nodes) =>
        nodes.map((node) => Math.round(node.getBoundingClientRect().top)),
      );
      expect(new Set(tops).size, `counters on ${listPage.name} span ${new Set(tops).size} rows`).toBe(1);

      const clipped = await labels.evaluateAll((nodes) =>
        nodes.filter((node) => node.scrollWidth > node.clientWidth).map((node) => node.textContent),
      );
      expect(clipped, `clipped counter labels on ${listPage.name}`).toEqual([]);
    });
  }

  /**
   * AC2. The plants list is the page the budget is stated against: two
   * counters, the shortest header of the eight, and the one whose old version
   * spent three rows on a single column of stats.
   */
  test("AC2: the /production list header is at most 140px at 390px", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The 140px budget is specified against a 390px viewport.");

    await LIST_PAGES[0].open(page);

    const box = await page.getByTestId("list-header").boundingBox();
    testInfo.annotations.push({ type: "production list header height", description: `${box?.height}px` });
    console.log(`AC2 /production list header height: ${box?.height}px`);
    expect(box?.height).toBeLessThanOrEqual(140);
  });

  // Note: "import partners modal" is intentionally omitted. See file header.
});
