import { expect, type Page } from "@playwright/test";
import { FIXED_COMMUNITY_ID, FIXED_NOW, FIXED_TOKEN } from "./data";

/**
 * How long a lazily-loaded route may take to mount.
 *
 * Measured on an idle 20-core machine over 69 navigations in one full run:
 * median 909 ms, slowest 980 ms. Under 16 busy cores the whole suite inflates
 * by roughly a third. This is sized an order of magnitude above the measured
 * worst case, because it is not an assertion about the product -- it is a
 * budget for a Vite dev server transforming a module subtree while another
 * worker hammers it, and the cost of sizing it tight is a red run that blames
 * the page for the machine. It stays well under the 30 s test timeout so an
 * genuinely stuck route still fails as itself rather than as a bare timeout.
 */
export const ROUTE_MOUNT_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Helper: inject auth token so the app boots as authenticated
// ---------------------------------------------------------------------------

export async function injectAuthToken(page: Page) {
  await page.addInitScript((token: string) => {
    window.localStorage.setItem("token", token);
  }, FIXED_TOKEN);
}

// ---------------------------------------------------------------------------
// Helper: freeze the browser clock at FIXED_NOW.
//
// GraphFilter defaults its date input to today, so any capture containing one
// encodes the day it was taken and fails every day after. That is production
// non-determinism no fixture can pin, and the masking policy says to make it
// deterministic rather than mask it or widen the tolerance.
//
// FIXED_NOW is the date the affected baselines were generated on, so freezing
// to it keeps them valid instead of requiring a regeneration -- and keeps them
// valid tomorrow, which is the actual point. It lives in ./data beside the
// other fixed fixtures, and is midday so a timezone offset either way cannot
// roll the date over.
//
// Call this before page.goto in any spec whose capture shows a date. Timers
// keep running, so MUI and React Query behave normally; only Date.now() and
// new Date() are pinned.
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
// Helper: inject CSS to kill all animations, then wait for fonts + network
// ---------------------------------------------------------------------------

/**
 * Waits until the lazily-loaded route has actually mounted.
 *
 * Every page in App.tsx is React.lazy, and each layout renders a RouteFallback
 * while its chunk arrives. Between `goto` and that chunk being transformed
 * there is no request in flight, so `networkidle` fires with the content area
 * still showing the fallback -- which is why waiting on it alone is not a "the
 * app has rendered" signal, as navigateToSharingAgreements has said for a
 * while. Eleven navigations relied on exactly that, and the way it failed was
 * a capture helper waiting out the whole 30 s test timeout on getByRole("main")
 * and reporting a bare timeout, which reads as a broken page rather than a
 * route that had not arrived yet.
 *
 * The fallback is found by what it is rather than by a test id: it is the only
 * role="status" in the app containing a progressbar. The other three -- the
 * two visually-hidden live regions and the success Alert -- carry text, and
 * can legitimately still be on screen when a capture is taken.
 *
 * It first waits for the app to have rendered at all: right after `goto`, React
 * may not have committed anything yet, and an empty #root has no fallback
 * either, so counting fallbacks alone would answer "mounted" before the route
 * had even started loading. It cannot see a page whose CapabilityRoute is still
 * pending, which renders nothing rather than the fallback; `page.goto` waits for
 * that too (waitForPageSettled in ./test.ts).
 */
export async function waitForRouteMounted(page: Page, timeout = ROUTE_MOUNT_TIMEOUT_MS) {
  await expect(page.locator("#root > *").first()).toBeAttached({ timeout });
  const routeFallback = page.getByRole("status").filter({ has: page.getByRole("progressbar") });
  await expect(routeFallback).toHaveCount(0, { timeout });
}

/**
 * Scrolls the window to the top or the bottom and waits until it stays there.
 *
 * A preceding click (e.g. a filter chip) can trigger the browser's native focus
 * scroll-into-view asynchronously, and under CPU contention it can land after a
 * single reset. So this re-asserts the position on every animation frame and
 * returns once it has held for STABLE_FRAMES frames in a row -- counted in
 * frames rather than milliseconds, because a loaded machine delays frames and
 * late scrolls alike, where a fixed wait only guesses at how much.
 */
export async function settleScroll(page: Page, to: "top" | "bottom") {
  const STABLE_FRAMES = 5;
  await page.waitForFunction(
    async ({ to, stableFrames }) => {
      const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
      const target = () => (to === "top" ? 0 : document.documentElement.scrollHeight - window.innerHeight);
      let held = 0;
      // Bounded, so a page that never stops scrolling fails as itself rather
      // than as the test timeout; waitForFunction retries a false answer.
      for (let frame = 0; frame < 60 && held < stableFrames; frame++) {
        const y = Math.max(0, target());
        if (Math.abs(window.scrollY - y) > 1 || window.scrollX !== 0) {
          window.scrollTo(0, y);
          held = 0;
        } else {
          held += 1;
        }
        await nextFrame();
      }
      return held >= stableFrames;
    },
    { to, stableFrames: STABLE_FRAMES },
  );
}

export async function stabilizePage(page: Page) {
  // First, because everything below assumes the page has content: the
  // animation-killing stylesheet is pointless against a spinner, and the
  // scroll resets settle a layout that has not been painted yet.
  await waitForRouteMounted(page);

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
  await settleScroll(page, "top");
}
