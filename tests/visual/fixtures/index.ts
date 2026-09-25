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
 *   - reducedMotion: "reduce" is set at the project level in playwright.config.ts.
 *
 * Role fixture mapping:
 *   FIXED_MEMBER_USER          → home, supply-points, supply-detail, supply modals
 *   FIXED_COMMUNITY_ADMIN_USER → sharing-agreements list (populated/empty/filtered). /members
 *                                itself is still not Playwright-tested via direct navigation
 *                                because CommunityAdminRoute defers community selection to a
 *                                useEffect that fires after the first render, causing a redirect
 *                                to / before the guard re-evaluates on a cold page.goto(). The
 *                                sharing-agreements specs route around the same limitation
 *                                by navigating from an unguarded page (/production) and clicking
 *                                through via the app's own Link — by the time that client-side
 *                                navigation happens, the community-resolution effect has already
 *                                settled, so the guard passes. /members itself is still covered by
 *                                unit tests only (ImportPartnersModal.spec.tsx, etc.).
 *   FIXED_PLATFORM_ADMIN_USER  → /platform (platform dashboard: populated + empty), /users (users page)
 *   FIXED_NO_COMMUNITY_USER    → /no-community (asserts the screen renders correctly)
 *
 * Partners page migration:
 *   /partners has been removed from the route table (Phase 5.1/5.2). The "partners page"
 *   test has been migrated to "users page" (/users, PlatformAdminRoute). The "import
 *   partners modal" test has been removed: ImportPartnersModal now lives in MembersPage
 *   (/members, CommunityAdminRoute). The CommunityAdminRoute timing issue described above
 *   makes reliable direct Playwright navigation to /members impossible without app-level
 *   changes. The modal itself is unit-tested in ImportPartnersModal.spec.tsx.
 */

export * from "./data";
export * from "./navigation";
export * from "./routes";
export * from "./session";
