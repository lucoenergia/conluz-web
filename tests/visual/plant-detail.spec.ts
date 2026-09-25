/**
 * Visual baselines — The plant detail page and its header.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import { test, expect } from "@playwright/test";
import {
  mainRegion,
  openPlantDetail,
  stabilizePage,
} from "./fixtures";

test.describe("Visual baselines", () => {
  // -------------------------------------------------------------------------
  // Plant detail header
  // -------------------------------------------------------------------------

  test("plant detail page", async ({ page }) => {
    await openPlantDetail(page);

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    await expect(page).toHaveScreenshot("plant-detail.png", await mainRegion(page));
  });

  test("plant detail page (details expanded)", async ({ page }) => {
    await openPlantDetail(page);

    await page.getByRole("button", { name: /^Ver \d+ datos? más$/ }).click();
    await expect(page.getByText("HUAWEI")).toBeVisible();
    await stabilizePage(page);

    await expect(page.getByTestId("detail-header")).toHaveScreenshot("plant-detail-expanded.png");
  });
});
