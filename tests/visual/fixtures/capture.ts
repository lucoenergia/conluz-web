import { fileURLToPath } from "node:url";
import { expect, type Locator, type Page, type PageAssertionsToHaveScreenshotOptions } from "@playwright/test";

/**
 * The app bar is hidden, not masked, in every capture whose subject is not the
 * chrome. Only the chrome canaries (chrome-canary.spec.ts) show it.
 *
 * Masking it (PR 2) left two leaks, measured by making the bar taller: 45
 * baselines still moved.
 * - A mask covers the bar's own box, so a taller bar grows the mask over the
 *   content under it.
 * - An element screenshot scrolls its target to the top of the viewport, where
 *   the fixed bar is painted over it, and plain region captures did not mask it.
 *
 * `visibility: hidden` (hide-app-bar.css, passed as the screenshot
 * `stylePath`) removes the bar from the pixels while keeping its layout box. The app bar is position: fixed,
 * and main reserves its space with its own <Toolbar /> spacer, so nothing
 * underneath moves, and the bar's size or content no longer reaches any capture.
 *
 * `stylePath` applies CSS, not a locator, so the selector is `header`: the
 * element that carries the banner landmark. The helper asserts that the page has
 * exactly one banner and exactly one <header>, so a second <header> added
 * later fails here instead of being hidden silently.
 */
const HIDE_APP_BAR = fileURLToPath(new URL("./hide-app-bar.css", import.meta.url));

async function hiddenAppBarStyle(page: Page): Promise<string> {
  // includeHidden: an open modal, menu or drawer sets aria-hidden on the rest
  // of the page, which removes the banner from the default role query.
  await expect(page.getByRole("banner", { includeHidden: true })).toHaveCount(1);
  await expect(page.locator("header")).toHaveCount(1);
  return HIDE_APP_BAR;
}

/**
 * Differing pixels a baseline tolerates, by what the capture covers. There is
 * no global value (playwright.config.ts sets none): every capture takes its
 * threshold from here, or states its own (the chrome canaries).
 *
 * Absolute, not a ratio. A regression has an absolute size: a changed short
 * label measured 175 px, the header wordmark 316 px. A ratio scales with the
 * capture instead. The old global 2% allowed 253 px on the two-item Acciones
 * menu (198×64), more than a relabelled item, and 57,920 px on the published
 * agreement detail page (1164×2488), enough for a whole table column. Noise
 * between two identical clean runs of the suite is 0 px (tolerance 0, the
 * suite's per-pixel colour threshold of 0.2), so a threshold only has to sit
 * below the smallest regression worth catching.
 *
 * - COMPONENT: dialogs, menus, drawer, panels, sections, bars, header. The
 *   smallest capture is the Acciones menu; a single relabelled item (~175 px)
 *   must fail.
 * - LAYOUT: main-region and full-page layout captures (the largest is 1164×2488).
 *   The concern is the same fixed-size regression (a label, a missing control,
 *   an extra column) at any page height, so the value does not grow with the
 *   capture.
 * Both are 100: 43% below the smallest measured signal, with 100 px left for
 * rendering differences between environments (checked by CI). Choosing a value
 * for a new capture, and how to measure it: CLAUDE.md, "Screenshot thresholds".
 */
export const COMPONENT_MAX_DIFF_PIXELS = 100;
export const LAYOUT_MAX_DIFF_PIXELS = 100;

/**
 * Screenshot options for a region (component) capture: the app bar is hidden.
 *   await expect(page.getByRole("menu")).toHaveScreenshot("x.png", await hideAppBar(page));
 */
export async function hideAppBar(page: Page): Promise<PageAssertionsToHaveScreenshotOptions> {
  return { stylePath: await hiddenAppBarStyle(page), maxDiffPixels: COMPONENT_MAX_DIFF_PIXELS };
}

/**
 * Screenshot options that capture the page's main region, for baselines whose
 * subject is a page layout.
 *
 * - The region is found by role (getByRole("main")), not by class or test id.
 * - The app bar, which overlaps the top of main (its <Toolbar /> spacer), is
 *   hidden (see above): header changes belong to the chrome canary, not to
 *   every page baseline.
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
  masks: Locator[] = [],
): Promise<PageAssertionsToHaveScreenshotOptions> {
  const clip = await page.getByRole("main").evaluate((main) => {
    const rect = main.getBoundingClientRect();
    return { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height };
  });
  return {
    fullPage: true,
    clip,
    stylePath: await hiddenAppBarStyle(page),
    maxDiffPixels: LAYOUT_MAX_DIFF_PIXELS,
    ...(masks.length > 0 ? { mask: masks } : {}),
  };
}
