import type { Page } from "@playwright/test";
import { FIXED_COMMUNITY_ID, FIXED_TOKEN } from "./data";

// ---------------------------------------------------------------------------
// Helper: inject auth token so the app boots as authenticated
// ---------------------------------------------------------------------------

export async function injectAuthToken(page: Page) {
  await page.addInitScript((token: string) => {
    window.localStorage.setItem("token", token);
  }, FIXED_TOKEN);
}

// ---------------------------------------------------------------------------
// Helper: seed active community in localStorage so the community context
// resolves immediately for tests that navigate to community-scoped screens.
// Called in addition to injectAuthToken for member and community-admin fixtures.
// ---------------------------------------------------------------------------

export async function seedActiveCommunity(page: Page, userId: string) {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      window.localStorage.setItem(key, value);
    },
    { key: `activeCommunity:${userId}`, value: FIXED_COMMUNITY_ID }
  );
}

// ---------------------------------------------------------------------------
// Helper: inject CSS to kill all animations, then wait for fonts + network
// ---------------------------------------------------------------------------

export async function stabilizePage(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition: none !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });

  // Wait for web fonts to finish loading so text is rendered in the correct font
  await page.waitForFunction(() => document.fonts.ready);

  // Give React Query one tick to settle any pending state updates
  await page.waitForLoadState("networkidle");

  // Reset scroll to the top. A page scrolled away from (0, 0) at capture time
  // can bake a stale offset into position: fixed elements (e.g. the AppBar)
  // in a fullPage screenshot, even though the element renders correctly on screen.
  // A preceding click (e.g. a filter chip) can trigger the browser's native
  // focus scroll-into-view asynchronously; under CPU contention that can land
  // after a single reset, so re-assert once more after giving it time to fire,
  // then let the compositor settle before the screenshot is taken.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}
