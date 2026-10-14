/**
 * The not-found page (#234): what any path no route matches renders. It is
 * public, so no token is injected.
 *
 * Full page on purpose for the capture: like the password-recovery pages, it
 * has no main landmark and no app bar, so the page is the content.
 */

import type { Request } from "@playwright/test";
import { test, expect, LAYOUT_MAX_DIFF_PIXELS, stabilizePage } from "./fixtures";

const UNKNOWN_PATH = "/esto-no-existe";

const FULL_PAGE = { fullPage: true, maxDiffPixels: LAYOUT_MAX_DIFF_PIXELS };

test.describe("the not-found page", () => {
  test("UI-ROUTE-002 sends no credentialed request without a session", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "What the page sends does not depend on the viewport.");

    const requests: Request[] = [];
    page.on("request", (request) => requests.push(request));

    await page.goto(UNKNOWN_PATH);
    await expect(page.getByRole("heading", { level: 1, name: "Esta página no existe" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ir al inicio" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    // The session is a Bearer header (src/context/auth.context.tsx); there is no cookie.
    const credentialed = requests.filter((request) => request.headers()["authorization"] !== undefined);
    const apiCalls = requests.filter((request) => new URL(request.url()).pathname.startsWith("/api/"));
    expect(credentialed.map((request) => request.url())).toEqual([]);
    expect(apiCalls.map((request) => request.url())).toEqual([]);
  });

  test("UI-ROUTE-001 shows the link without scrolling at 375 px wide", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The test sets its own 375 px viewport.");

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(UNKNOWN_PATH);
    await expect(page.getByRole("heading", { level: 1, name: "Esta página no existe" })).toBeVisible();
    await stabilizePage(page);

    const link = page.getByRole("link", { name: "Ir al inicio" });
    await expect(link).toHaveAttribute("href", "/");
    await expect(link).toBeInViewport({ ratio: 1 });
  });

  test("not-found page", async ({ page }) => {
    await page.goto(UNKNOWN_PATH);
    await expect(page.getByRole("heading", { level: 1, name: "Esta página no existe" })).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("not-found-page.png", FULL_PAGE);
  });
});
