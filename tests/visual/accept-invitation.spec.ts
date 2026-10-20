/**
 * Visual baselines — accepting an invitation from the emailed link (#274).
 * The screen is public: the set-password, login, incomplete-link and
 * invalid-link states are reached with no session, the accept button and the
 * password-change state with one.
 *
 * Full page on purpose for every capture here: like /login, the screen has no
 * main landmark and no app bar, so the page is the content.
 *
 * Each state's behaviour is asserted in src/pages/auth/AcceptInvitation.spec.tsx;
 * what these add is how each one looks.
 */

import type { Page } from "@playwright/test";
import {
  test,
  expect,
  FIXED_MEMBER_USER,
  injectAuthToken,
  LAYOUT_MAX_DIFF_PIXELS,
  mockAllApiRoutes,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

const INSPECT = "/api/v1/invitations/inspect";
const ACCEPT_AS_CURRENT_USER = "/api/v1/users/current/invitations/accept";

/** A fixed token: the fragment is removed from the address bar, never shown. */
const INVITATION_LINK = "/accept-invitation#visual-test-invitation-token";

const FULL_PAGE = { fullPage: true, maxDiffPixels: LAYOUT_MAX_DIFF_PIXELS };

const COMMUNITY_HEADING = "Únete a Sol de Lavapiés";

function inspection(loginRequired: boolean) {
  return {
    kind: "COMMUNITY",
    community: { id: "community-invited", name: "Sol de Lavapiés" },
    loginRequired,
    confirmationCodeRequired: false,
  };
}

/** Registered after mockAllApiRoutes when both are used: the later route wins. */
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

async function signIn(page: Page, user: object & { id: string }) {
  await injectAuthToken(page);
  await seedActiveCommunity(page, user.id);
  await mockAllApiRoutes(page, user);
}

test.describe("Visual baselines — accept invitation", () => {
  test("set-password form", async ({ page }) => {
    await answer(page, INSPECT, 200, inspection(false));
    await page.goto(INVITATION_LINK);
    await expect(page.getByRole("heading", { level: 1, name: COMMUNITY_HEADING })).toBeVisible();
    await expect(page.getByLabel("Nueva contraseña", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/accept-invitation$/);
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("accept-invitation-set-password.png", FULL_PAGE);
  });

  test("login form", async ({ page }) => {
    await answer(page, INSPECT, 200, inspection(true));
    await page.goto(INVITATION_LINK);
    await expect(page.getByRole("heading", { level: 1, name: COMMUNITY_HEADING })).toBeVisible();
    await expect(page.getByLabel("DNI/NIF", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar y aceptar" })).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("accept-invitation-login.png", FULL_PAGE);
  });

  test("accept button, signed in", async ({ page }) => {
    await signIn(page, FIXED_MEMBER_USER);
    await answer(page, INSPECT, 200, inspection(true));
    await page.goto(INVITATION_LINK);
    await expect(page.getByRole("heading", { level: 1, name: COMMUNITY_HEADING })).toBeVisible();
    await expect(page.getByText(FIXED_MEMBER_USER.fullName)).toBeVisible();
    await expect(page.getByRole("button", { name: "Aceptar invitación" })).toBeEnabled();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("accept-invitation-accept-button.png", FULL_PAGE);
  });

  test("incomplete link", async ({ page }) => {
    await page.goto("/accept-invitation");
    await expect(page.getByRole("alert")).toContainText("El enlace está incompleto");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("accept-invitation-incomplete-link.png", FULL_PAGE);
  });

  test("invalid link", async ({ page }) => {
    await answer(page, INSPECT, 400, {
      status: 400,
      errors: [{ code: "MEMBERSHIP_INVITATION_TOKEN_INVALID", message: "Invalid token" }],
    });
    await page.goto(INVITATION_LINK);
    await expect(page.getByRole("alert")).toContainText("Este enlace no es válido o ha caducado");
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("accept-invitation-invalid-link.png", FULL_PAGE);
  });

  test("password change required", async ({ page }) => {
    const mustChange = { ...FIXED_MEMBER_USER, mustChangePassword: true };
    await signIn(page, mustChange);
    await answer(page, INSPECT, 200, inspection(true));
    await answer(page, ACCEPT_AS_CURRENT_USER, 403, {
      status: 403,
      errors: [{ code: "USER_PASSWORD_CHANGE_REQUIRED", message: "Password change required" }],
    });
    await page.goto(INVITATION_LINK);
    await page.getByRole("button", { name: "Aceptar invitación" }).click();
    await expect(page.getByRole("alert")).toContainText("tienes que cambiar tu contraseña");
    await expect(page.getByRole("link", { name: "Cambiar contraseña" })).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("accept-invitation-password-change-required.png", FULL_PAGE);
  });
});
