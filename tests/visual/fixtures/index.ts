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
 * Role fixture mapping. Each screen is captured with the personas that can
 * actually reach it, and with no others — there is no hybrid persona here, and
 * adding one would capture a caller the backend cannot produce.
 *   FIXED_MEMBER_USER          → the member home view, profile, change-password,
 *                                supply-points, supply-detail, production list and plant detail
 *   FIXED_COMMUNITY_ADMIN_USER → supply-points and production as an admin, the supply and plant
 *                                forms, members, integrations, the whole
 *                                sharing-agreement surface, and the management home view --
 *                                with the switch to the member view only under
 *                                mockCommunityAdminOwnsSupply, since owning a supply here is
 *                                what grants it
 *   FIXED_PLATFORM_ADMIN_USER  → /platform (populated + empty), /users, /users/new,
 *                                /users/:id/edit, /communities, /communities/:id/edit
 *   FIXED_NO_COMMUNITY_USER    → /no-community (asserts the screen renders correctly)
 *
 * The sharing-agreement specs still navigate by clicking from /production rather
 * than by a cold page.goto. That is now a convenience, not a requirement:
 * CapabilityRoute waits for the capability answer, so a deep link lands.
 */

export * from "./capture";
export * from "./data";
export * from "./navigation";
export * from "./routes";
export * from "./session";
export * from "./test";
