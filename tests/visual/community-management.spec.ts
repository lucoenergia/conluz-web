import type { Page } from "@playwright/test";
import {
  test,
  expect,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_DATADIS_CONFIG,
  FIXED_MEMBERSHIPS,
  FIXED_ROSTER_INVITATION_STATES,
  hideAppBar,
  injectAuthToken,
  mainRegion,
  mockAllApiRoutes,
  mockCommunityManagementRoutes,
  mockDatadisConfigRoutes,
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
    await expect(page.getByText("Suspendido")).toBeVisible();
    await stabilizePage(page);

    // Layout subject: the main region, with the app bar hidden (see mainRegion).
    await expect(page).toHaveScreenshot("members-page.png", await mainRegion(page));
  });

  // A new multi-field dialog with a read-only field (#272): what can break is
  // its layout -- the helper texts and labels at 390 px -- not its behaviour,
  // which MembersPage's specs assert.
  test("member record dialog", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockCommunityManagementRoutes(page);

    const member = FIXED_MEMBERSHIPS[1].user;
    await page.goto("/members");
    await page.getByRole("button", { name: `Más acciones para ${member?.fullName}` }).click();
    await page.getByRole("menuitem", { name: "Editar ficha" }).click();
    const dialog = page.getByRole("dialog");
    // Seeded from the row: a capture of empty fields would look plausible.
    await expect(dialog.getByLabel(/Nombre completo/)).toHaveValue(member?.fullName ?? "");
    await expect(dialog.getByLabel("DNI/NIE")).toHaveValue(member?.personalId ?? "");
    await stabilizePage(page);

    await expect(dialog).toHaveScreenshot("member-record-dialog.png", await hideAppBar(page));
  });

  // Every status chip and invitation caption at once (#275): a third chip
  // colour, and a caption under the chip in a table cell and as an extra
  // field in the narrow list, where wrapping and alignment are what can break.
  // Which state shows which text and which actions is asserted in Vitest.
  test("members page invitation states", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockCommunityManagementRoutes(page, { memberships: FIXED_ROSTER_INVITATION_STATES });

    await page.goto("/members");
    // Each state's text, before the capture: a roster that failed to load, or
    // a fixture that lost a state, would otherwise make a plausible baseline.
    const main = page.getByRole("main");
    await expect(main.getByText("Nadia Nueva Fernández")).toBeVisible();
    // Nadia, and Pablo, who was suspended before anyone invited him.
    await expect(main.getByText("Sin invitar")).toHaveCount(2);
    await expect(main.getByText("Enlace activo hasta el 8 oct 2026")).toBeVisible();
    await expect(main.getByText("Enlace caducado o revocado")).toBeVisible();
    await expect(main.getByText("Pendiente", { exact: true })).toHaveCount(3);
    await expect(main.getByText("Suspendido", { exact: true })).toHaveCount(2);
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("members-page-invitation-states.png", await mainRegion(page));
  });

  // The registration form (#275): the record form's fields under an editable
  // DNI and a notice, where the layout at 390 px is what can break. Its
  // validation and requests are asserted in Vitest.
  test("member register dialog", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockCommunityManagementRoutes(page);

    await page.goto("/members");
    await page.getByRole("button", { name: "Registrar miembro" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /^Registrar miembro en/ })).toBeVisible();
    await expect(dialog.getByLabel(/^DNI\/NIE\/NIF/)).toBeEditable();
    await expect(dialog.getByLabel(/^Teléfono/)).toBeVisible();
    await stabilizePage(page);

    await expect(dialog).toHaveScreenshot("member-register-dialog.png", await hideAppBar(page));
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

  /**
   * The Datadis switch and what the card says about it (UI-INT-012 to
   * UI-INT-014, #256). Component subject: the card's region.
   */
  test.describe("Datadis switch", () => {
    const DISABLED = "La integración está desactivada. Actívala para empezar a sincronizar.";
    const switchOf = (card: ReturnType<Page["getByRole"]>) =>
      card.getByRole("switch", { name: "Integración con Datadis activa" });

    async function openDatadis(page: Page, options: Parameters<typeof mockDatadisConfigRoutes>[2] = {}) {
      await injectAuthToken(page);
      await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
      await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
      await mockCommunityManagementRoutes(page);
      await mockDatadisConfigRoutes(page, FIXED_COMMUNITY_ADMIN_USER, options);
      await page.goto("/integrations");
      const card = page.getByRole("region", { name: "Datadis" });
      // Guardar is offered only once the read has answered, 200 or 404.
      await expect(card.getByRole("button", { name: "Guardar" })).toBeEnabled();
      return card;
    }

    test("enabled", async ({ page }) => {
      const card = await openDatadis(page);
      await expect(switchOf(card)).toBeChecked();
      await expect(card.getByText(DISABLED)).toHaveCount(0);
      await stabilizePage(page);

      await expect(card).toHaveScreenshot("integrations-datadis-enabled.png", await hideAppBar(page));
    });

    test("disabled", async ({ page }) => {
      const card = await openDatadis(page, { config: { ...FIXED_DATADIS_CONFIG, enabled: false } });
      await expect(switchOf(card)).not.toBeChecked();
      await expect(card.getByText(DISABLED)).toBeVisible();
      await expect(card.getByRole("textbox", { name: "Usuario" })).toHaveValue(FIXED_DATADIS_CONFIG.username ?? "");
      await stabilizePage(page);

      await expect(card).toHaveScreenshot("integrations-datadis-disabled.png", await hideAppBar(page));
    });

    test("enable refused as incomplete", async ({ page }) => {
      const card = await openDatadis(page, {
        config: { ...FIXED_DATADIS_CONFIG, enabled: false, passwordSet: false },
        enable: "incomplete",
      });
      await switchOf(card).click();
      // modal-panel is BasicModal's interim test id, pending a real role="dialog".
      await page.getByTestId("modal-panel").getByRole("button", { name: "Activar" }).click();
      await expect(card.getByRole("alert")).toHaveText(/Faltan datos para activar la integración: contraseña\./);
      await expect(page.getByTestId("modal-panel")).toHaveCount(0);
      await expect(switchOf(card)).not.toBeChecked();
      // Move focus off the switch, so its focus ring is not part of the picture.
      await page.getByRole("heading", { level: 1 }).click();
      await stabilizePage(page);

      await expect(card).toHaveScreenshot("integrations-datadis-incomplete.png", await hideAppBar(page));
    });

    test("not configured", async ({ page }) => {
      const card = await openDatadis(page, { config: null });
      await expect(switchOf(card)).toHaveCount(0);
      await expect(card.getByText(DISABLED)).toHaveCount(0);
      await expect(card.getByRole("textbox", { name: "Usuario" })).toHaveValue("");
      await stabilizePage(page);

      await expect(card).toHaveScreenshot("integrations-datadis-unconfigured.png", await hideAppBar(page));
    });
  });
});
