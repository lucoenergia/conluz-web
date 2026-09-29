/**
 * Visual baselines — the production area as a plain member of the community.
 *
 * Every other plant and sharing-agreement baseline authenticates as a community
 * admin, so nothing captured what a member sees: no create button, no card
 * kebab, and the linked supply as plain text. The fixtures serve each plant the
 * capabilities of whoever is logged in (asPlantCaller in ./fixtures/routes.ts),
 * so these captures differ from the admin ones only in who is asking.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import { test, expect } from "@playwright/test";
import {
  FIXED_MEMBER_USER,
  FIXED_SHARING_AGREEMENTS,
  freezeClock,
  hideAppBar,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockSharingAgreementsPlantRoutes,
  openPlantDetail,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

test.describe("Visual baselines", () => {
  test("production list as a member", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS, FIXED_MEMBER_USER);

    await page.goto("/production");
    await expect(page.getByRole("heading", { level: 1, name: "Producción" })).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("production-list-member.png", await mainRegion(page));
  });

  test("plant detail as a member", async ({ page }) => {
    // The capture includes GraphFilter's date input, which defaults to today.
    await freezeClock(page);
    await openPlantDetail(page, FIXED_MEMBER_USER);

    await expect(page).toHaveScreenshot("plant-detail-member.png", await mainRegion(page));
  });

  test("plant detail as a member, details expanded", async ({ page }) => {
    await freezeClock(page);
    await openPlantDetail(page, FIXED_MEMBER_USER);

    await page.getByRole("button", { name: /^Ver \d+ dato/ }).click();
    await stabilizePage(page);

    // Component subject: the header alone, which is where the linked supply
    // stops being a link.
    await expect(page.getByTestId("detail-header")).toHaveScreenshot(
      "plant-detail-member-expanded.png",
      await hideAppBar(page),
    );
  });
});
