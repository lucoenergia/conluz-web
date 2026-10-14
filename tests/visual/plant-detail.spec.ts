/**
 * Visual baselines — The plant detail page and its header.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import {
  test,
  expect,
  FIXED_HUAWEI_CONFIG,
  freezeClock,
  hideAppBar,
  mainRegion,
  openPlantDetail,
  stabilizePage,
} from "./fixtures";

test.describe("Visual baselines", () => {
  // -------------------------------------------------------------------------
  // Plant detail header
  // -------------------------------------------------------------------------

  test("plant detail page", async ({ page }) => {
    // The capture includes GraphFilter's date input, which defaults to today.
    await freezeClock(page);
    await openPlantDetail(page);
    // The integrations section reads its configuration after the header lands;
    // the capture waits for it, so the page height is settled (#192).
    await expect(page.getByRole("region", { name: "Huawei" }).getByText(FIXED_HUAWEI_CONFIG.username)).toBeVisible();
    await stabilizePage(page);
    // On mobile, the theme gives a Button a 44px minimum under a coarse pointer,
    // and Chromium drops that emulation after the first full-page screenshot: the
    // Editar button shrinks from 44px to 36.5px mid-capture, after mainRegion has
    // measured main. One throwaway screenshot settles it before the measurement.
    await page.screenshot({ fullPage: true });

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    await expect(page).toHaveScreenshot("plant-detail.png", await mainRegion(page));
  });

  test("plant detail page (details expanded)", async ({ page }) => {
    await openPlantDetail(page);

    await page.getByRole("button", { name: /^Ver \d+ datos? más$/ }).click();
    // Scoped to the header: the integrations section below also says "Huawei".
    await expect(page.getByTestId("detail-header").getByText("HUAWEI", { exact: true })).toBeVisible();
    await stabilizePage(page);

    await expect(page.getByTestId("detail-header")).toHaveScreenshot("plant-detail-expanded.png", await hideAppBar(page));
  });
});
