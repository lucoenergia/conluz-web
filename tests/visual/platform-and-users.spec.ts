/**
 * Visual baselines — Platform-admin screens: the platform dashboard, the communities and the
 * platform admins.
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
  hideAppBar,
  FIXED_PLATFORM_ADMIN_USER,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockCommunityAdminsRoutes,
  mockPlatformAdminsRoutes,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

test.describe("Visual baselines", () => {
  // Platform-admin fixture tests: /platform (welcome), the communities and /platform-admins.
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

  // A community's admins (#276): the status chips with their invitation
  // captions, and a missing phone, side by side in one table -- the
  // composition is what a pixel change can break. Each state's behaviour is
  // asserted in Vitest.
  test("community admins page", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
    await mockCommunityAdminsRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto(`/communities/${FIXED_COMMUNITY_ID}/admins`);
    // Each state's text, before the capture: a list that failed to load, or a
    // fixture that lost a state, would otherwise make a plausible baseline.
    const main = page.getByRole("main");
    await expect(main.getByText("Rosa Activa Gómez")).toBeVisible();
    await expect(main.getByText("Activo", { exact: true })).toBeVisible();
    await expect(main.getByText("Pendiente", { exact: true })).toHaveCount(2);
    await expect(main.getByText("Suspendido", { exact: true })).toBeVisible();
    await expect(main.getByText("Enlace activo hasta el 8 oct 2026")).toBeVisible();
    await expect(main.getByText("Enlace caducado o revocado")).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("community-admins-page.png", await mainRegion(page));
  });

  // The admin invitation form (#276): an editable DNI and three of the record's
  // fields, two of them required, under a notice -- a field set of its own,
  // whose layout at 390 px is what can break. Its validation and requests are
  // asserted in Vitest.
  test("community admin invite dialog", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
    await mockCommunityAdminsRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto(`/communities/${FIXED_COMMUNITY_ID}/admins`);
    await expect(page.getByRole("main").getByText("Rosa Activa Gómez")).toBeVisible();
    await page.getByRole("button", { name: "Invitar administrador" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /^Invitar administrador a/ })).toBeVisible();
    await expect(dialog.getByLabel(/^DNI\/NIE\/NIF/)).toBeEditable();
    await expect(dialog.getByLabel(/^Teléfono/)).toBeVisible();
    await stabilizePage(page);

    await expect(dialog).toHaveScreenshot("community-admin-invite-dialog.png", await hideAppBar(page));
  });

  // The platform admins (#285): the caller's own row without a kebab, an
  // enabled and a disabled chip, and an admin with no email, side by side in
  // one table, with two pending invitations and their link captions (#288) --
  // the composition is what a pixel change can break. Each row's behaviour,
  // revoke and the invitation writes included, is asserted in Vitest.
  test("platform admins page", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
    await mockPlatformAdminsRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto("/platform-admins");
    // Each treatment's text, before the capture: a list that failed to load,
    // or a fixture that lost a row, would otherwise make a plausible baseline.
    const main = page.getByRole("main");
    await expect(main.getByText("Javier Ruiz Pardo")).toBeVisible();
    await expect(main.getByText("Tomás Herrera Gil")).toBeVisible();
    await expect(main.getByText("Habilitado", { exact: true })).toHaveCount(3);
    await expect(main.getByText("Deshabilitado", { exact: true })).toBeVisible();
    await expect(main.getByText("Pendiente", { exact: true })).toHaveCount(2);
    await expect(main.getByText("Enlace activo hasta el 8 jul 2026")).toBeVisible();
    await expect(main.getByText("Enlace caducado o revocado")).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("platform-admins-page.png", await mainRegion(page));
  });

  // The platform-admin invitation's form (#288): the community admin form's
  // fields without the phone, and an explanation of the code. Its behaviour is
  // asserted in PlatformAdminsPage.invitations.spec.tsx.
  test("platform admin invite dialog", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
    await mockPlatformAdminsRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto("/platform-admins");
    await expect(page.getByRole("main").getByText("Javier Ruiz Pardo")).toBeVisible();
    await page.getByRole("button", { name: "Invitar administrador de plataforma" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Invitar administrador de plataforma" })).toBeVisible();
    await expect(dialog.getByLabel(/^DNI\/NIE\/NIF/)).toBeEditable();
    await expect(dialog.getByRole("textbox", { name: "Email", exact: true })).toBeVisible();
    await stabilizePage(page);

    await expect(dialog).toHaveScreenshot("platform-admin-invite-dialog.png", await hideAppBar(page));
  });

  // The confirmation code, shown once after an invitation (#288): a grouped,
  // monospace code with its copy button and the warnings -- a treatment no
  // other dialog has. What it holds and when it closes is asserted in Vitest.
  test("platform admin confirmation code dialog", async ({ page }) => {
    await injectAuthToken(page);
    await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
    await mockPlatformAdminsRoutes(page, FIXED_PLATFORM_ADMIN_USER);

    await page.goto("/platform-admins");
    await expect(page.getByRole("main").getByText("Javier Ruiz Pardo")).toBeVisible();
    await page.getByRole("button", { name: "Invitar administrador de plataforma" }).click();
    const form = page.getByRole("dialog");
    await form.getByLabel(/^DNI\/NIE\/NIF/).fill("12345678Z");
    await form.getByLabel(/^Nombre completo/).fill("Marta Gil Sanz");
    await form.getByRole("textbox", { name: "Email", exact: true }).fill("marta.gil@conluz.test");
    await form.getByRole("button", { name: "Invitar" }).click();
    const dialog = page.getByRole("dialog", { name: "Código de confirmación" });
    await expect(dialog.getByText("K7Q2-M9XZ")).toBeVisible();
    await expect(dialog.getByText("Marta Gil Sanz")).toBeVisible();
    await stabilizePage(page);

    await expect(dialog).toHaveScreenshot("platform-admin-code-dialog.png", await hideAppBar(page));
  });

});
