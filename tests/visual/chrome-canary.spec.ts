/**
 * Visual baselines — the shared page chrome: app bar and side menu.
 *
 * The layout baselines capture the main region with the app bar masked, and
 * component baselines capture only their component, so none of them sees the
 * chrome any more. These canaries are the only baselines whose subject is the
 * chrome itself: a change to the header or the menu should fail here, once
 * per viewport, rather than in every page baseline.
 *
 * The page is /production as a community admin: an authenticated page the
 * fixtures already serve, and the role whose menu carries the most sections.
 */

import { type Page } from "@playwright/test";
import {
  test,
  expect,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_PLANT,
  FIXED_SHARING_AGREEMENTS,
  injectAuthToken,
  mockAllApiRoutes,
  mockSharingAgreementsPlantRoutes,
  seedActiveCommunity,
  stabilizePage,
  threshold,
} from "./fixtures";

/**
 * Differing pixels a canary tolerates. Absolute, not a ratio: a chrome
 * regression has an absolute size, and a ratio of a full-page capture hid it.
 * Under the old global 2%, a side-menu label edit changed each menu canary by
 * 175 px and passed.
 *
 * Signals measured at tolerance 0 after the app bar was hidden everywhere else:
 * - side-menu label "Operativo" → "Operaciones": 175 px (desktop, mobile menu open);
 * - header wordmark "ConLuz" → "ConLuz Energía": 316 px (desktop only; the
 *   wordmark is hidden on mobile);
 * - app bar padding py 1 → 2: 2,594 / 3,625 / 4,105 px (all three).
 * Noise between two identical clean runs: 0 px.
 *
 * 100 sits 43% below the smallest signal and leaves 100 px for rendering
 * differences between environments, which is unmeasured locally (CI decides).
 */
const CANARY_MAX_DIFF_PIXELS = threshold(100);

async function openProductionAsCommunityAdmin(page: Page) {
  await injectAuthToken(page);
  await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
  await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
  await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);

  await page.goto("/production");
  // Rendered content first, then stabilize: networkidle alone can fire while
  // the lazy route is still behind its Suspense fallback.
  await expect(page.locator(".MuiCard-root").filter({ hasText: FIXED_PLANT.name })).toBeVisible();
  await stabilizePage(page);
}

test.describe("Visual baselines", () => {
  test("chrome canary: app bar and side menu", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The side menu is permanent only on desktop; mobile has its own canaries.");

    await openProductionAsCommunityAdmin(page);
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();

    // Full page on purpose: the subject is the chrome around the content, the one area no other baseline covers.
    await expect(page).toHaveScreenshot("chrome-canary-desktop.png", { fullPage: true, maxDiffPixels: CANARY_MAX_DIFF_PIXELS });
  });

  test("chrome canary: app bar, side menu closed", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The closed side menu is a mobile-only state.");

    await openProductionAsCommunityAdmin(page);
    await expect(page.getByRole("button", { name: "menu" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeHidden();

    // Full page on purpose: the subject is the app bar over the page, the one area no other baseline covers.
    await expect(page).toHaveScreenshot("chrome-canary-mobile-menu-closed.png", { fullPage: true, maxDiffPixels: CANARY_MAX_DIFF_PIXELS });
  });

  /**
   * /contact is the one route under DynamicLayout, which picks its chrome from
   * whether there is a signed-in user. Nothing fetched that user outside
   * AuthenticatedLayout until #203 made it a provider-level query, so this
   * route rendered the public layout for everybody, signed in or not. It now
   * renders the authenticated chrome for a signed-in caller -- which is what
   * DynamicLayout is for, and a visible change with no baseline behind it.
   *
   * The role assertions are the ones that state the change; the capture is so
   * that the next change to it is visible.
   */
  test("chrome canary: /contact signed in gets the authenticated chrome", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "One viewport is enough to say which chrome the route picks; the chrome itself is captured above.");

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: "Contacto" })).toBeVisible();
    await stabilizePage(page);

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();

    // Full page on purpose: the subject is which chrome wraps the page, so the chrome has to be in frame.
    await expect(page).toHaveScreenshot("chrome-canary-contact-signed-in-desktop.png", { fullPage: true, maxDiffPixels: CANARY_MAX_DIFF_PIXELS });
  });

  test("chrome canary: side menu open", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "At 390px the side menu is a temporary drawer, closed by default.");

    await openProductionAsCommunityAdmin(page);
    await page.getByRole("button", { name: "menu" }).click();
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
    await stabilizePage(page);

    // Viewport, not full page: the open drawer and the app bar are fixed overlays, and a
    // full-page stitch would not show them as a phone does.
    await expect(page).toHaveScreenshot("chrome-canary-mobile-menu-open.png", { maxDiffPixels: CANARY_MAX_DIFF_PIXELS });
  });
});
