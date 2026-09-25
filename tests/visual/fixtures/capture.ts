import type { Locator, Page, PageAssertionsToHaveScreenshotOptions } from "@playwright/test";

/**
 * Screenshot options that capture the page's main region, for baselines whose
 * subject is a page layout.
 *
 * - The region is found by role (getByRole("main")), not by class or test id.
 * - The fixed app bar overlaps the top of main (its <Toolbar /> spacer), so it
 *   is masked: header changes belong to the chrome canary, not to every page
 *   baseline.
 * - It is a clipped full-page capture, not an element screenshot. An element
 *   screenshot scrolls the element into view first, and on mobile that scroll
 *   collapses the detail header, so main's height changed between the two
 *   consecutive shots Playwright needs (2407 px, then 2320 px) and the capture
 *   never stabilised. A clipped full-page capture takes the page as
 *   stabilizePage() left it, at scroll (0, 0), which is how the old full-page
 *   baselines were taken.
 *
 * The name stays a string literal at the call site, which the duplicate-name
 * guard in warmup.setup.ts requires:
 *   await expect(page).toHaveScreenshot("x.png", await mainRegion(page));
 */
export async function mainRegion(
  page: Page,
  extraMasks: Locator[] = [],
): Promise<PageAssertionsToHaveScreenshotOptions> {
  const clip = await page.getByRole("main").evaluate((main) => {
    const rect = main.getBoundingClientRect();
    return { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height };
  });
  return { fullPage: true, clip, mask: [page.getByRole("banner"), ...extraMasks] };
}
