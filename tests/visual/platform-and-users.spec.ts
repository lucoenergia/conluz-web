/**
 * Visual baselines — Platform-admin screens: the platform dashboard and user management.
 *
 * Fixtures, route mocks and navigation helpers live in ./fixtures.
 */

import { type Route } from "@playwright/test";
import {
  test,
  expect,
  DASHBOARD_COMMUNITIES,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_COMMUNITY_ID,
  FIXED_PLATFORM_ADMIN_USER,
  FIXED_USER_2,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

test.describe("Visual baselines", () => {
  // Platform-admin fixture tests: /platform (welcome) and /users (users management).
  // Platform capabilities come off the current user, with no community
  // selection to wait for, so a direct page.goto() has always worked here.

  // Platform dashboard — populated. A richer communities fixture (registered
  // AFTER mockAllApiRoutes so it is consulted first) exercises every KPI, the
  // attention panel (all three signals), and all four status-chip variants.
  test("platform dashboard (populated)", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
    await page.route(
      (url) => url.href.includes("/api/v1/communities") && !url.href.includes("/supplies"),
      (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(DASHBOARD_COMMUNITIES),
        }),
    );

    await page.goto("/platform");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    await expect(page).toHaveScreenshot("platform-dashboard-populated.png", await mainRegion(page));
  });

  // Platform dashboard — empty (0 communities → first-community empty state).
  test("platform dashboard (empty)", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
    await page.route(
      (url) => url.href.includes("/api/v1/communities") && !url.href.includes("/supplies"),
      (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        }),
    );

    await page.goto("/platform");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    await expect(page).toHaveScreenshot("platform-dashboard-empty.png", await mainRegion(page));
  });

  test("users page", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto("/users");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar masked (see mainRegion).
    await expect(page).toHaveScreenshot("users-page.png", await mainRegion(page));
  });

  /**
   * Not a baseline: an assertion, so it writes no PNG and nothing has to be
   * regenerated for it. The subject is reachability, which a screenshot would
   * only record indirectly.
   *
   * /integrations gates on the community's canManage. A platform admin who
   * belongs to no community holds no community capability at all, and the
   * platform flag is never a grant over a community's data -- so the guard
   * denies, sends them to "/", and the landing redirect lands them on
   * /platform. The page's own cards are gated too (IntegrationsPage.spec.tsx),
   * but this is the route refusing before any of that is reached.
   */
  test("a platform admin who is not a member cannot reach integrations", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto("/integrations");
    await stabilizePage(page);

    await expect(page).toHaveURL(/\/platform$/);
    await expect(page.getByRole("heading", { name: "Integraciones" })).toHaveCount(0);
  });

  /**
   * An assertion rather than a baseline, because a screenshot cannot carry this
   * one: removing the kebab from a row changes 12 pixels on desktop -- the
   * MoreVert icon is three ~2 px dots -- and every layout capture allows 100.
   * The mobile capture does move, because the card reflows 8 px shorter, but
   * relying on that would leave the desktop half of the rule untested.
   *
   * The row is the caller's own. canEdit, canDisable and canRevokePlatformAdmin
   * are all false for one's own account by documented design, so the backend
   * hands over nothing and the row has no menu at all -- while the row beside it
   * keeps one. UsersPage.spec.tsx owns the same rule against the component; this
   * owns it against the fixtures the baselines are taken from.
   */
  test("a platform admin's own row offers no actions, while another user's does", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto("/users");
    await stabilizePage(page);

    await expect(
      page.getByRole("button", { name: `Más acciones para ${FIXED_PLATFORM_ADMIN_USER.fullName}` }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: `Más acciones para ${FIXED_USER_2.fullName}` }),
    ).toBeVisible();
  });

  /**
   * Assertions, not baselines, for the same reason as the one above: the subject
   * is which capability each route asks for, and no screenshot records that.
   *
   * Nothing else covers it. No unit test reads the route-to-capability mapping in
   * App.tsx -- CapabilityRoute.spec passes the requirement in directly -- so these
   * are the only tests that fail if one of those three lines is changed back.
   */
  test("the platform overview asks for canAdministerPlatform, not canListUsers", async ({ page }) => {
    // A community admin holds no platform capability at all, so the overview
    // refuses them whichever of the two it asks for. What this pins is that it
    // asks: the page's own loading and error state comes from GET /communities,
    // which canListUsers says nothing about.
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto("/platform");
    await stabilizePage(page);

    await expect(page).not.toHaveURL(/\/platform$/);
    await expect(page.getByRole("heading", { name: "Administración de plataforma" })).toHaveCount(0);
  });

  test("editing a user asks that account's canEdit, not the caller's canListUsers", async ({ page }) => {
    // The route used to gate on canListUsers, which answers a different
    // question: anyone who could list users reached a live edit form for an
    // account they may not change, and found out on submit. The fixture answers
    // canEdit per caller (UserAccessPolicy.canEdit allows a platform admin, or a
    // community admin of one of the target's communities), so these two cases
    // differ only in who is asking.
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto(`/users/${FIXED_USER_2.id}/edit`);
    await stabilizePage(page);

    await expect(page.getByRole("heading", { name: "Editar usuario" })).toBeVisible();
  });

  test("and refuses a community admin who administers none of that user's communities", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto(`/users/${FIXED_USER_2.id}/edit`);
    await stabilizePage(page);

    await expect(page.getByRole("heading", { name: "Editar usuario" })).toHaveCount(0);
  });

  test("editing a community asks that community's canUpdate, not canAdministerPlatform", async ({ page }) => {
    // canUpdate is a platform-wide decision about a community the caller may
    // merely be administering, so the answer has to come from the community in
    // the URL rather than from the active one -- a platform admin has no
    // membership of it at all.
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto(`/communities/${FIXED_COMMUNITY_ID}/edit`);
    await stabilizePage(page);

    await expect(page.getByRole("heading", { name: "Editar comunidad" })).toBeVisible();
  });

  test("and refuses a community admin, who does not hold canUpdate on it", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    await page.goto(`/communities/${FIXED_COMMUNITY_ID}/edit`);
    await stabilizePage(page);

    await expect(page.getByRole("heading", { name: "Editar comunidad" })).toHaveCount(0);
  });

  // ── The four platform screens that had no capture ────────────────────────
  // /communities appeared only in layout-budgets.spec.ts, which measures its
  // header and takes no picture; the other three had assertion-only coverage
  // proving who may reach them, which says nothing about what they look like.

  test("communities list page", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
    // Registered after mockAllApiRoutes so it is consulted first: the richer
    // fixture is what gives the table more than one row.
    await page.route(
      (url) => /\/api\/v1\/communities(\?|$)/.test(url.href),
      (route: Route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(DASHBOARD_COMMUNITIES),
        }),
    );

    await page.goto("/communities");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("communities-list-page.png", await mainRegion(page));
  });

  test("edit community page", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto(`/communities/${FIXED_COMMUNITY_ID}/edit`);
    await expect(page.getByRole("main")).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("edit-community-page.png", await mainRegion(page));
  });

  test("create user page", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto("/users/new");
    await expect(page.getByRole("main")).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("create-user-page.png", await mainRegion(page));
  });

  test("edit user page", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto(`/users/${FIXED_USER_2.id}/edit`);
    await expect(page.getByRole("main")).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("edit-user-page.png", await mainRegion(page));
  });

});
