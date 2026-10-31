import type { Page } from "@playwright/test";
import type { ImportMembersResponse } from "../../src/api/models";
import {
  test,
  expect,
  COMPONENT_MAX_DIFF_PIXELS,
  FIXED_COMMUNITY_CONTACT,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_DATADIS_CONFIG,
  FIXED_INVITATION_BATCH_RESULT,
  FIXED_MEMBERSHIPS,
  FIXED_ROSTER_INVITATION_BATCH,
  FIXED_ROSTER_INVITATION_SELECTION,
  FIXED_ROSTER_INVITATION_STATES,
  FIXED_ROSTER_LAST_ACTIVE_ADMIN,
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
    await expect(page.getByText(FIXED_MEMBERSHIPS[1].fullName)).toBeVisible();
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

    const member = FIXED_MEMBERSHIPS[1];
    await page.goto("/members");
    await page.getByRole("button", { name: `Más acciones para ${member.fullName}` }).click();
    await page.getByRole("menuitem", { name: "Editar ficha" }).click();
    const dialog = page.getByRole("dialog");
    // Seeded from the row: a capture of empty fields would look plausible.
    await expect(dialog.getByLabel(/Nombre completo/)).toHaveValue(member.fullName);
    await expect(dialog.getByLabel("DNI/NIE")).toHaveValue(member.personalId);
    await stabilizePage(page);

    await expect(dialog).toHaveScreenshot("member-record-dialog.png", await hideAppBar(page));
  });

  // Every status chip at once (#275, #331): the derived status of each state,
  // with its own chip tone, where wrapping and alignment are what can break.
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
    // The derived status of each (UI-MBR-030). Pablo, suspended before anyone
    // invited him, is Suspendido, not Sin invitar.
    await expect(main.getByText("Sin invitar", { exact: true })).toHaveCount(1);
    await expect(main.getByText("Invitación enviada", { exact: true })).toHaveCount(1);
    await expect(main.getByText("Invitación caducada o revocada", { exact: true })).toHaveCount(1);
    await expect(main.getByText("Suspendido", { exact: true })).toHaveCount(2);
    // A pending row shows its sub-status, and no link caption is left.
    await expect(main.getByText("Pendiente", { exact: true })).toHaveCount(0);
    await expect(main.getByText(/Enlace activo hasta el|Enlace caducado o revocado/)).toHaveCount(0);
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("members-page-invitation-states.png", await mainRegion(page));
  });

  // Selecting whom to invite or resend (#328): the leading checkbox column in
  // the table, and the checkbox slot that keeps the cards aligned at 390 px,
  // beside rows that cannot be selected and the one that says why, with the
  // selection bar above. Which rows can be selected, and the bar's texts, are
  // asserted in Vitest (MemberInvitationSelection.spec.tsx).
  test("members page selection", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockCommunityManagementRoutes(page, { memberships: FIXED_ROSTER_INVITATION_SELECTION });

    await page.goto("/members");
    const main = page.getByRole("main");
    await main.getByRole("checkbox", { name: "Seleccionar Nadia Nueva Fernández" }).check();
    // The selection and the rows that cannot be selected, before the capture:
    // a roster without them would make a plausible baseline.
    await expect(main.getByRole("button", { name: "Enviar invitación (1)" })).toBeVisible();
    for (const name of ["Nadia Nueva Fernández", "Lucas Enlace Martín", "Elena Caducada Ruiz"]) {
      await expect(main.getByRole("checkbox", { name: `Seleccionar ${name}` })).toBeVisible();
    }
    await expect(main.getByRole("checkbox", { name: "Seleccionar Óscar Sincorreo Vidal" })).toHaveCount(0);
    await expect(main.getByText("Sin email de contacto", { exact: true })).toBeVisible();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot("members-page-selection.png", await mainRegion(page));
  });

  test.describe("members invitation send", () => {
    // The send's confirmation and result (#328), with their own layout: two
    // groups of names, the first cut at five with the rest counted, and a
    // result whose refusal lines wrap at 390 px. What each says, and when, is
    // asserted in Vitest (MemberInvitationSelection.spec.tsx).
    async function openSend(page: Page) {
      await injectAuthToken(page);
      await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
      await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
      await mockCommunityManagementRoutes(page, { memberships: FIXED_ROSTER_INVITATION_BATCH });
      await page.route(
        (url) => /\/api\/v1\/communities\/[^/]+\/memberships\/invite$/.test(url.href),
        (route) =>
          route.request().method() === "POST"
            ? route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify(FIXED_INVITATION_BATCH_RESULT),
              })
            : route.continue(),
      );

      await page.goto("/members");
      const main = page.getByRole("main");
      await main.getByRole("checkbox", { name: "Seleccionar todo" }).check();
      await main.getByRole("button", { name: "Enviar invitación (9)" }).click();
      const dialog = page.getByRole("dialog", { name: /^Enviar invitación en/ });
      await expect(dialog).toBeVisible();
      return dialog;
    }

    test("confirmation", async ({ page }) => {
      const dialog = await openSend(page);
      await expect(dialog.getByRole("list", { name: "Primera invitación" }).getByRole("listitem")).toHaveCount(6);
      await expect(dialog.getByText("y 2 más")).toBeVisible();
      await expect(dialog.getByRole("list", { name: "Reenvío" }).getByRole("listitem")).toHaveCount(2);
      await stabilizePage(page);

      await expect(dialog).toHaveScreenshot("members-invitation-confirmation.png", await hideAppBar(page));
    });

    test("result with refusals", async ({ page }) => {
      const dialog = await openSend(page);
      await dialog.getByRole("button", { name: "Enviar invitación (9)" }).click();
      await expect(
        dialog.getByRole("list", { name: "Personas a las que no se ha enviado" }).getByRole("listitem"),
      ).toHaveCount(5);
      await stabilizePage(page);

      await expect(dialog).toHaveScreenshot("members-invitation-result.png", await hideAppBar(page));
    });
  });

  // The last active admin's row menu (#309): "Eliminar" disabled with its
  // reason as a second line, wrapping inside the menu at 390 px, which is what
  // can break. That the item is disabled and why, and when, is asserted in
  // Vitest (MemberLastActiveAdmin.spec.tsx).
  test("members last active admin menu", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockCommunityManagementRoutes(page, { memberships: FIXED_ROSTER_LAST_ACTIVE_ADMIN });

    const admin = FIXED_ROSTER_LAST_ACTIVE_ADMIN[0];
    await page.goto("/members");
    await page.getByRole("button", { name: `Más acciones para ${admin.fullName}` }).click();
    const menu = page.getByRole("menu");
    // The disabled item and its reason, before the capture: a menu without
    // them would make a plausible baseline.
    const remove = menu.getByRole("menuitem", { name: /Eliminar/ });
    await expect(remove).toHaveAttribute("aria-disabled", "true");
    await expect(
      remove.getByText("Es el último administrador activo de la comunidad. Primero haz administrador a otro miembro activo."),
    ).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Cambiar rol" })).toBeVisible();
    await stabilizePage(page);

    // Component subject: the menu, with the app bar hidden (see hideAppBar).
    await expect(menu).toHaveScreenshot("members-last-admin-menu.png", await hideAppBar(page));
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

  test.describe("member import dialog", () => {
    // The import answered as the backend would, registered last so it wins
    // over the fixtures. What the dialog shows for each answer is asserted in
    // Vitest (MemberImport.spec.tsx); these capture only the layout.
    async function openImport(page: Page, answer?: { status: number; body: unknown }) {
      await injectAuthToken(page);
      await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
      await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
      await mockCommunityManagementRoutes(page);
      if (answer) {
        await page.route(
          (url) => /\/api\/v1\/communities\/[^/]+\/memberships\/import$/.test(url.href),
          (route) =>
            route.request().method() === "POST"
              ? route.fulfill({ status: answer.status, contentType: "application/json", body: JSON.stringify(answer.body) })
              : route.continue(),
        );
      }

      await page.goto("/members");
      await page.getByRole("button", { name: "Importar miembros" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: /^Importar miembros en/ })).toBeVisible();
      return dialog;
    }

    async function importFile(dialog: ReturnType<Page["getByRole"]>) {
      await dialog.getByLabel("Seleccionar archivo CSV").setInputFiles({
        name: "miembros.csv",
        mimeType: "text/csv",
        buffer: Buffer.from("personalId;fullName\r\n"),
      });
      await dialog.getByRole("button", { name: "Importar", exact: true }).click();
    }

    // The column guide: six stacked entries with a monospace header, a
    // requirement label and an example each, at 390 px, which is where wrapping
    // and spacing can break. The list itself, not the dialog: its content
    // scrolls, and at phone width the notes above would fill the capture. The
    // notes are in the refusal's capture.
    test("guide", async ({ page }) => {
      const dialog = await openImport(page);
      const columns = dialog.getByRole("list", { name: "Columnas del archivo" });
      await expect(columns.getByRole("listitem")).toHaveCount(6);
      await stabilizePage(page);

      await expect(columns).toHaveScreenshot("member-import-dialog.png", await hideAppBar(page));
    });

    // A result with failed rows: long reasons built from several broken rules,
    // in a scrolling list, where wrapping is what can break.
    test("result with failed rows", async ({ page }) => {
      const result: ImportMembersResponse = {
        registered: 2,
        failed: 3,
        rows: [
          { line: 2, outcome: "REGISTERED", code: null, message: null, errors: [] },
          { line: 3, outcome: "REGISTERED", code: null, message: null, errors: [] },
          {
            line: 4,
            outcome: "FAILED",
            code: "MEMBERSHIP_IMPORT_ROW_INVALID",
            message: "invalid",
            errors: [
              { column: "fullName", constraint: "REQUIRED", params: {} },
              { column: "memberNumber", constraint: "NOT_AN_INTEGER", params: {} },
              { column: "contactEmail", constraint: "EMAIL", params: {} },
            ],
          },
          { line: 5, outcome: "FAILED", code: "MEMBERSHIP_ALREADY_EXISTS", message: "exists", errors: [] },
          {
            line: 6,
            outcome: "FAILED",
            code: "USER_PERSONAL_ID_INVALID",
            message: "invalid",
            errors: [{ column: "personalId", constraint: "INVALID_PERSONAL_ID", params: {} }],
          },
        ],
      };
      const dialog = await openImport(page, { status: 200, body: result });
      await importFile(dialog);
      await expect(dialog.getByRole("list", { name: "Filas no registradas" }).getByRole("listitem")).toHaveCount(3);
      await stabilizePage(page);

      await expect(dialog).toHaveScreenshot("member-import-result-failed-rows.png", await hideAppBar(page));
    });

    // A whole-file refusal listing headers: an error alert above the guide,
    // where a long header list can wrap.
    test("whole-file refusal", async ({ page }) => {
      const dialog = await openImport(page, {
        status: 400,
        body: {
          status: 400,
          message: "refused",
          errors: [
            { message: "refused", code: "MEMBERSHIP_IMPORT_UNKNOWN_HEADERS", params: { headers: "email,role,password" } },
          ],
        },
      });
      await importFile(dialog);
      await expect(dialog.getByText(/Estas columnas no se reconocen: «email», «role», «password»/)).toBeVisible();
      await stabilizePage(page);

      await expect(dialog).toHaveScreenshot("member-import-refused.png", await hideAppBar(page));
    });
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
      await expect(page.getByRole("dialog")).toHaveCount(0);
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
      await page
        .getByRole("dialog", { name: "Activar integración con Datadis" })
        .getByRole("button", { name: "Activar" })
        .click();
      await expect(card.getByRole("alert")).toHaveText(/Faltan datos para activar la integración: contraseña\./);
      await expect(page.getByRole("dialog")).toHaveCount(0);
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

  // The contact channel editor's bottom sheet (#296), mobile only: below md it
  // is a sheet anchored to the bottom, tall enough to reach under the fixed app
  // bar, which once painted over its title and its Cerrar. jsdom cannot see
  // stacking, so this is a pixel risk. Unlike every other component capture,
  // the app bar is NOT hidden: the subject is the sheet's own box, so the bar
  // appears in it only if it is painted over the sheet again, which is the
  // regression this catches. Its behaviour is asserted in
  // ContactChannelEditor.spec.tsx and CommunityContactPage.edit.spec.tsx.
  test("contact channel edit sheet", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "From md up the editor is a centred dialog, not a bottom sheet.");
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);

    const channel = FIXED_COMMUNITY_CONTACT.channels[1];
    await page.goto("/community/contact");
    await page.getByRole("button", { name: `Editar ${channel.label}` }).click();
    const sheet = page.getByRole("dialog");
    // Seeded from the channel: a capture of empty fields would look plausible.
    await expect(sheet.getByRole("heading", { name: "Editar canal" })).toBeVisible();
    await expect(sheet.getByRole("textbox", { name: "Nombre del canal" })).toHaveValue(channel.label);
    await expect(sheet.getByRole("textbox", { name: "Notas (opcional)" })).toHaveValue(channel.notes ?? "");
    await stabilizePage(page);

    await expect(sheet).toHaveScreenshot("contact-channel-edit-sheet.png", { maxDiffPixels: COMPONENT_MAX_DIFF_PIXELS });
  });
});
