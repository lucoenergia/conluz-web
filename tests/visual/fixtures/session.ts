import type { Page } from "@playwright/test";
import { FIXED_COMMUNITY_ID, FIXED_NOW, FIXED_TOKEN } from "./data";

// ---------------------------------------------------------------------------
// Helper: inject auth token so the app boots as authenticated
// ---------------------------------------------------------------------------

export async function injectAuthToken(page: Page) {
  await page.addInitScript((token: string) => {
    window.localStorage.setItem("token", token);
  }, FIXED_TOKEN);
}

// ---------------------------------------------------------------------------
// Helper: freeze the browser clock at FIXED_NOW. Pages that default to "today"
// (the chart date filter) otherwise render the run date and differ from their
// baseline every day. Call before page.goto(). Timers keep running, so MUI and
// React Query behave normally; only Date.now() / new Date() are pinned.
// ---------------------------------------------------------------------------

export async function freezeClock(page: Page) {
  await page.clock.setFixedTime(FIXED_NOW);
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
// Helper: freeze the clock
//
// GraphFilter defaults its date input to today, so any capture containing one
// encodes the day it was taken and fails every day after. That is production
// non-determinism no fixture can pin, and the masking policy says to make it
// deterministic rather than mask it or widen the tolerance.
//
// The instant below is the date the affected baselines were generated on, so
// freezing to it keeps them valid instead of requiring a regeneration -- and
// keeps them valid tomorrow, which is the actual point. Midday, so a timezone
// offset either way cannot roll the date over.
//
// Call this before page.goto in any spec whose capture shows a date.
// ---------------------------------------------------------------------------

export const FIXED_NOW = new Date("2026-09-25T12:00:00");

export async function freezeClock(page: Page) {
  await page.clock.setFixedTime(FIXED_NOW);
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
