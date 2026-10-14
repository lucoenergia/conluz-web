import type { Page } from "@playwright/test";
import {
  test,
  expect,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_DATADIS_CONFIG,
  FIXED_MEMBERSHIPS,
  hideAppBar,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockCommunityManagementRoutes,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

/**
 * The two screens behind the community-admin menu section.
 *
 * Captured as a community admin because nobody else can reach either: the
 * routes require canManageMemberships and canManage, and a platform admin
 * holds neither by virtue of the flag. There is no second persona to capture.
 *
 * /members had no capture at all. The guard it once had redirected on a cold
 * page.goto before the community context resolved, which is why the suite
 * avoided it; CapabilityRoute waits for the answer now, so a deep link lands.
 */

test.describe("Visual baselines", () => {
  test("members page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockCommunityManagementRoutes(page);

    await page.goto("/members");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Asserted before the capture, because a baseline of an empty roster would
    // look plausible and get regenerated -- enshrining a broken fixture rather
    // than failing. The rows have to be there for the picture to mean anything.
    await expect(page.getByText(FIXED_MEMBERSHIPS[1].user?.fullName ?? "")).toBeVisible();
    await expect(page.getByText("Inactivo")).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("members-page.png", await mainRegion(page));
  });

  test("integrations page", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockCommunityManagementRoutes(page);

    await page.goto("/integrations");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // As above: a card stuck on its loading state would capture cleanly and
    // tell nobody anything. The username field carries the fetched value, so it
    // is what proves the config arrived rather than the card merely rendering.
    // Three providers each have a "Usuario" field, so this is scoped to the
    // Datadis card by its own heading.
    await expect(
      page.getByRole("textbox", { name: "Usuario" }).first(),
    ).toHaveValue(FIXED_DATADIS_CONFIG.username ?? "");
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("integrations-page.png", await mainRegion(page));
  });

  /**
   * The Datadis card on its own, in the three states the form rules define
   * (UI-INT-001 to UI-INT-004, #245). Component subject: the card's region, so a
   * change elsewhere on the page does not fail these.
   */
  test.describe("Datadis card", () => {
    async function openIntegrations(page: Page, passwordSet: boolean) {
      await injectAuthToken(page);
      await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
      await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
      await mockCommunityManagementRoutes(page);
      // Registered last, so it wins over the fixture's stored password.
      await page.route(
        (url) => url.href.includes("/config/datadis"),
        (route) =>
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ...FIXED_DATADIS_CONFIG, passwordSet }),
          }),
      );
      await page.goto("/integrations");
      const card = page.getByRole("region", { name: "Datadis" });
      // The fetched username proves the config arrived, not a card still loading.
      await expect(card.getByRole("textbox", { name: "Usuario" })).toHaveValue(FIXED_DATADIS_CONFIG.username ?? "");
      return card;
    }

    test("with a password stored", async ({ page }) => {
      const card = await openIntegrations(page, true);
      await expect(card.getByText("Contraseña configurada. Déjala vacía para mantenerla.")).toBeVisible();
      await stabilizePage(page);

      await expect(card).toHaveScreenshot("integrations-datadis-password-set.png", await hideAppBar(page));
    });

    test("with no password stored", async ({ page }) => {
      const card = await openIntegrations(page, false);
      await expect(card.getByText("Contraseña configurada. Déjala vacía para mantenerla.")).toHaveCount(0);
      await expect(card.getByText("Introduce la contraseña.")).toHaveCount(0);
      await stabilizePage(page);

      await expect(card).toHaveScreenshot("integrations-datadis-password-unset.png", await hideAppBar(page));
    });

    test("with every field refused", async ({ page }) => {
      const card = await openIntegrations(page, false);
      await card.getByRole("textbox", { name: "Usuario" }).fill("");
      await card.getByRole("textbox", { name: "URL del servicio" }).fill("datadis.es");
      await card.getByRole("button", { name: "Guardar" }).click();
      await expect(card.getByText("Introduce el usuario.")).toBeVisible();
      await expect(card.getByText("Introduce la contraseña.")).toBeVisible();
      await expect(card.getByText("Introduce una URL válida que empiece por http:// o https://.")).toBeVisible();
      // Blocked before the confirmation: nothing to confirm, nothing sent.
      // modal-panel is BasicModal's interim test id, pending a real role="dialog".
      await expect(page.getByTestId("modal-panel")).toHaveCount(0);
      // The save button keeps focus after the click; move it off so its focus
      // ring is not part of the picture.
      await page.getByRole("heading", { level: 1 }).click();
      await stabilizePage(page);

      await expect(card).toHaveScreenshot("integrations-datadis-field-errors.png", await hideAppBar(page));
    });
  });
});
