/**
 * Visual baselines — Dialogs and drawers opened from the sharing agreement list and detail pages.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import { test, expect } from "@playwright/test";
import {
  DRAFT_AGREEMENT,
  FIXED_COEFFICIENTS_ALL_PENDING,
  FIXED_COEFFICIENTS_MIXED,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_PLANT,
  FIXED_PLANT_ID,
  FIXED_SHARING_AGREEMENTS,
  FIXED_SUPPLY_COEFFICIENT_HISTORY,
  injectAuthToken,
  mockAllApiRoutes,
  mockSharingAgreementDetailRoutes,
  mockSharingAgreementFileUploadRejection,
  mockSharingAgreementGenerateFile,
  mockSharingAgreementsPlantRoutes,
  mockSupplyPartitionCoefficientRoutes,
  navigateToSharingAgreementDetail,
  navigateToSharingAgreements,
  NO_FILE_DRAFT_AGREEMENT,
  PUBLISHED_AGREEMENT,
  seedActiveCommunity,
  stabilizePage,
  SUPERSEDED_AGREEMENT,
} from "./fixtures";

test.describe("Visual baselines", () => {
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
});
