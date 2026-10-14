/**
 * Visual baselines — The integrations section of plant detail: the plant's
 * Huawei configuration, its form and its switch (#192).
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import type { Page } from "@playwright/test";
import {
  test,
  expect,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_HUAWEI_CONFIG,
  hideAppBar,
  openPlantDetail,
  stabilizePage,
} from "./fixtures";

const section = (page: Page) => page.getByRole("region", { name: "Integraciones" });

test.describe("Visual baselines", () => {
  test("plant integrations: not configured", async ({ page }) => {
    await openPlantDetail(page, FIXED_COMMUNITY_ADMIN_USER, { config: null });

    await expect(section(page).getByText("Esta planta aún no tiene configurada la integración con Huawei.")).toBeVisible();
    await expect(section(page).getByRole("switch")).toHaveCount(0);
    await stabilizePage(page);

    await expect(section(page)).toHaveScreenshot("plant-integrations-unconfigured.png", await hideAppBar(page));
  });

  test("plant integrations: configured and enabled", async ({ page }) => {
    await openPlantDetail(page);

    await expect(section(page).getByText(FIXED_HUAWEI_CONFIG.username)).toBeVisible();
    await expect(section(page).getByRole("switch", { name: "Integración con Huawei activa" })).toBeChecked();
    await stabilizePage(page);

    await expect(section(page)).toHaveScreenshot("plant-integrations-enabled.png", await hideAppBar(page));
  });

  test("plant integrations: configured and disabled", async ({ page }) => {
    await openPlantDetail(page, FIXED_COMMUNITY_ADMIN_USER, { config: { ...FIXED_HUAWEI_CONFIG, enabled: false } });

    await expect(section(page).getByRole("switch", { name: "Integración con Huawei activa" })).not.toBeChecked();
    await expect(
      section(page).getByText("La integración está desactivada. Actívala para empezar a sincronizar."),
    ).toBeVisible();
    await stabilizePage(page);

    await expect(section(page)).toHaveScreenshot("plant-integrations-disabled.png", await hideAppBar(page));
  });

  test("plant integrations: the create form", async ({ page }) => {
    await openPlantDetail(page, FIXED_COMMUNITY_ADMIN_USER, { config: null });

    await section(page).getByRole("button", { name: "Configurar" }).click();
    const dialog = page.getByRole("dialog", { name: "Configurar integración con Huawei" });
    await expect(dialog).toBeVisible();
    await stabilizePage(page);

    await expect(dialog).toHaveScreenshot("plant-integrations-create-form.png", await hideAppBar(page));
  });

  test("plant integrations: the edit form", async ({ page }) => {
    await openPlantDetail(page);

    await section(page).getByRole("button", { name: "Editar" }).click();
    const dialog = page.getByRole("dialog", { name: "Editar integración con Huawei" });
    await expect(dialog.getByLabel("Usuario")).toHaveValue(FIXED_HUAWEI_CONFIG.username);
    await expect(dialog.getByText("Contraseña configurada. Déjala vacía para mantenerla.")).toBeVisible();
    await stabilizePage(page);

    await expect(dialog).toHaveScreenshot("plant-integrations-edit-form.png", await hideAppBar(page));
  });

  test("plant integrations: every field refused", async ({ page }) => {
    await openPlantDetail(page, FIXED_COMMUNITY_ADMIN_USER, { config: null });

    await section(page).getByRole("button", { name: "Configurar" }).click();
    const dialog = page.getByRole("dialog", { name: "Configurar integración con Huawei" });
    await dialog.getByLabel("URL del servicio").fill("eu5.fusionsolar.huawei.com");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(dialog.getByText("Introduce el usuario.")).toBeVisible();
    await expect(dialog.getByText("Introduce la contraseña.")).toBeVisible();
    await expect(dialog.getByText("Introduce una URL válida que empiece por http:// o https://.")).toBeVisible();
    await stabilizePage(page);

    await expect(dialog).toHaveScreenshot("plant-integrations-field-errors.png", await hideAppBar(page));
  });

  test("plant integrations: an enable refused as incomplete", async ({ page }) => {
    await openPlantDetail(page, FIXED_COMMUNITY_ADMIN_USER, {
      config: { ...FIXED_HUAWEI_CONFIG, enabled: false, passwordSet: false },
      enable: "incomplete",
    });

    await section(page).getByRole("switch", { name: "Integración con Huawei activa" }).click();
    await page.getByRole("button", { name: "Activar" }).click();
    await expect(section(page).getByText("Faltan datos para activar la integración: contraseña.")).toBeVisible();
    await expect(section(page).getByRole("switch", { name: "Integración con Huawei activa" })).not.toBeChecked();
    await stabilizePage(page);

    await expect(section(page)).toHaveScreenshot("plant-integrations-incomplete.png", await hideAppBar(page));
  });
});
