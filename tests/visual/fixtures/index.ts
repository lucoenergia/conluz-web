/**
 * Visual regression baseline tests — multi-role safety net
 *
 * Auth approach (no live backend required):
 *   A fake JWT string is injected into localStorage via page.addInitScript() before
 *   each page load. AuthProvider bootstraps with initialState={getFromStorage("token")}
 *   (src/utils/getFromStorage.tsx), so the app starts in an authenticated state
 *   without ever calling the login API.
 *
 * API mocking:
 *   All /api/v1/** requests are intercepted by page.route() and return fixed,
 *   deterministic JSON fixtures defined in this module. Faker-based random data is
 *   deliberately avoided — every field is a hard-coded constant so screenshots
 *   are byte-stable across runs.
 *
 * Determinism measures:
 *   - Animations/transitions are killed by an injected <style> tag after load.
 *   - document.fonts.ready is awaited before capture to prevent mid-render font flashes.
 *   - All API responses include no time-varying fields (no "createdAt", etc.).
 *   - Pages that render "today" freeze the browser clock at FIXED_NOW via
 *     freezeClock() before navigating (plant and supply detail chart filters).
 *   - prefers-reduced-motion is NOT emulated: playwright.config.ts sets no
 *     reducedMotion (it was once set where Playwright ignores it). The injected
 *     stylesheet above is the only animation suppression.
 *
 * Role fixture mapping:
 *   FIXED_MEMBER_USER          → home, supply-points, supply-detail, supply modals
 *   FIXED_COMMUNITY_ADMIN_USER → sharing-agreements list (populated/empty/filtered). /members
 *                                itself is still not Playwright-tested via direct navigation.
 *                                That was once forced: the old guard redirected on a cold
 *                                page.goto() before the community context's effect had resolved.
 *                                CapabilityRoute now waits for that answer, so a deep link
 *                                reaches the page. The sharing-agreements specs still navigate
 *                                from an unguarded page (/production) and click
 *                                through via the app's own Link — by the time that client-side
 *                                navigation happens, the community-resolution effect has already
 *                                settled, so the guard passes. /members itself is still covered by
 *                                unit tests only (ImportPartnersModal.spec.tsx, etc.).
 *   FIXED_PLATFORM_ADMIN_USER  → /platform (platform dashboard: populated + empty), /users (users page)
 *   FIXED_NO_COMMUNITY_USER    → /no-community (asserts the screen renders correctly)
 */

export * from "./capture";
export * from "./data";
export * from "./navigation";
export * from "./routes";
export * from "./session";
export * from "./test";
