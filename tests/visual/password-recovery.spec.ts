/**
 * Visual baselines — the password-recovery screens (#233): requesting a reset
 * link, and setting a new password from one. Both are public, so no token is
 * injected.
 *
 * Full page on purpose for every capture here: like /login, these pages have
 * no main landmark and no app bar, so the page is the content.
 */

import type { Page } from "@playwright/test";
import { test, expect, LAYOUT_MAX_DIFF_PIXELS, stabilizePage } from "./fixtures";

const RECOVER = "/api/v1/users/password/recover";
const RESET = "/api/v1/users/password/reset";

/** A fixed token: the fragment is removed from the address bar, never shown. */
const RESET_LINK = "/reset-password#visual-test-reset-token";

const FULL_PAGE = { fullPage: true, maxDiffPixels: LAYOUT_MAX_DIFF_PIXELS };

async function answer(page: Page, path: string, status: number, body?: unknown) {
  await page.route(
    (url) => url.pathname === path,
    (route) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: body === undefined ? "" : JSON.stringify(body),
      }),
  );
}

test.describe("Visual baselines — password recovery", () => {
  test("forgot-password form", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { level: 1, name: "¿Olvidaste tu contraseña?" })).toBeVisible();
    await expect(page.getByLabel("DNI/NIE/NIF")).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("forgot-password-page.png", FULL_PAGE);
  });

  test("forgot-password confirmation", async ({ page }) => {
    await answer(page, RECOVER, 202);
    await page.goto("/forgot-password");
    await page.getByLabel("DNI/NIE/NIF").fill("12345678Z");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByRole("alert")).toContainText("Si tus datos son correctos");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("forgot-password-sent.png", FULL_PAGE);
  });

  test("reset-password form", async ({ page }) => {
    await page.goto(RESET_LINK);
    await expect(page.getByLabel("Nueva contraseña", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/reset-password$/);
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("reset-password-page.png", FULL_PAGE);
  });

  test("reset-password incomplete link", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByRole("alert")).toContainText("El enlace está incompleto");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("reset-password-incomplete-link.png", FULL_PAGE);
  });

  test("reset-password invalid link", async ({ page }) => {
    await answer(page, RESET, 400, {
      status: 400,
      errors: [{ code: "USER_PASSWORD_RESET_TOKEN_INVALID", message: "Invalid token" }],
    });
    await page.goto(RESET_LINK);
    await page.getByLabel("Nueva contraseña", { exact: true }).fill("el gato duerme junto a la ventana");
    await page.getByLabel("Repite la nueva contraseña", { exact: true }).fill("el gato duerme junto a la ventana");
    await page.getByRole("button", { name: "Restablecer contraseña" }).click();
    await expect(page.getByRole("alert")).toContainText("El enlace no es válido o ha caducado");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("reset-password-invalid-link.png", FULL_PAGE);
  });
});
