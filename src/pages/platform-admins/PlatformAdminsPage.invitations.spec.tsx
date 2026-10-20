import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestRouter } from "../../test/requestRouter";
import { cachesHold, watchForSecrets } from "../../test/secretWatch";
import {
  buildCurrentUser,
  buildPlatformAdmin,
  buildPlatformAdminCapabilities,
  buildPlatformAdminInvitation,
  buildPlatformCapabilities,
} from "../../test/fixtures";
import type { InvitedPlatformAdminResponse, PlatformAdminResponse, RestErrorDetailCode } from "../../api/models";
import { getGetPlatformAdminsQueryKey } from "../../api/users/users";
import { CapabilityRoute } from "../../components/Auth/CapabilityRoute";
import { PlatformAdminsPage } from "./PlatformAdminsPage";

/**
 * Pending platform-admin invitations on the platform-admins page (#288):
 * their state, resending them with the new code shown once, and revoking
 * their links.
 *
 * Tier 2: the real generated hooks, actions layer and QueryClient run, and only
 * the HTTP layer is mocked, so a test sees each request the page sends, the
 * list it shows once a write has refetched it, and what the caches hold.
 */
const { mockCustomInstance, mockErrorDispatch } = vi.hoisted(() => ({
  mockCustomInstance: vi.fn(),
  mockErrorDispatch: vi.fn(),
}));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

// The page's failure slot is the layout's toast, which is not rendered here;
// what the page dispatches to it is what these tests read.
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

const CURRENT_USER_URL = "/api/v1/users/current";
const PLATFORM_ADMINS_URL = "/api/v1/platform-admins";
const resendUrl = (userId: string) => `/api/v1/platform-admins/${userId}/invitation/resend`;
const revokeLinkUrl = (userId: string) => `/api/v1/platform-admins/${userId}/invitation/revoke`;

const NEW_CODE = "B4N8R2TW";

const CALLER = buildCurrentUser({
  id: "u-paula",
  fullName: "Paula Plataforma",
  isPlatformAdmin: true,
  memberships: {},
  platformCapabilities: buildPlatformCapabilities({ canAdministerPlatform: true, canListPlatformAdmins: true }),
});

// As the backend serves them to a platform admin (lucoenergia/conluz#452):
// every row authorizes resending and revoking an invitation, and every row but
// the caller's own authorizes revoking the role -- pending rows included.
const ALL_ROW_CAPABILITIES = buildPlatformAdminCapabilities({
  canRevoke: true,
  canResendInvitation: true,
  canRevokeInvitation: true,
});

const PAULA = buildPlatformAdmin({
  user: { id: "u-paula" },
  fullName: "Paula Plataforma",
  email: "paula@example.com",
  revocable: true,
  capabilities: buildPlatformAdminCapabilities({ canResendInvitation: true, canRevokeInvitation: true }),
});
const RAMON = buildPlatformAdmin({
  user: { id: "u-ramon" },
  fullName: "Ramón Revocable",
  email: "ramon@example.com",
  revocable: true,
  capabilities: ALL_ROW_CAPABILITIES,
});
const ACTIVE_UNTIL = "2026-10-26T10:00:00Z";
const NURIA = buildPlatformAdminInvitation({
  user: { id: "u-nuria" },
  fullName: "Nuria Nueva",
  email: "nuria@example.com",
  invitation: { invitedAt: "2026-10-19T10:00:00Z", expiresAt: ACTIVE_UNTIL },
  capabilities: ALL_ROW_CAPABILITIES,
});
const LUIS = buildPlatformAdminInvitation({
  user: { id: "u-luis" },
  fullName: "Luis Lapsado",
  email: "luis@example.com",
  invitation: { invitedAt: "2026-10-01T10:00:00Z", expiresAt: null },
  capabilities: ALL_ROW_CAPABILITIES,
});

const withLink = (row: PlatformAdminResponse, expiresAt: string | null): PlatformAdminResponse => ({
  ...row,
  invitation: { invitedAt: row.invitation?.invitedAt ?? "2026-10-19T10:00:00Z", expiresAt },
});

type Admins = { current: PlatformAdminResponse[] };
type Write = (userId: string) => unknown;

function servePage(admins: Admins, { resend, revokeLink }: { resend?: Write; revokeLink?: Write } = {}): RequestRouter {
  const userIdOf = (url: string | undefined) => url?.split("/")[4] ?? "";
  const router = routeRequests([
    { method: "GET", url: CURRENT_USER_URL, respond: () => CALLER },
    { method: "GET", url: PLATFORM_ADMINS_URL, respond: () => admins.current },
    {
      method: "POST",
      url: /^\/api\/v1\/platform-admins\/[^/]+\/invitation\/resend$/,
      respond: (config) => {
        if (!resend) throw new Error("unexpected resend");
        return resend(userIdOf(config.url));
      },
    },
    {
      method: "POST",
      url: /^\/api\/v1\/platform-admins\/[^/]+\/invitation\/revoke$/,
      respond: (config) => {
        if (!revokeLink) throw new Error("unexpected link revoke");
        return revokeLink(userIdOf(config.url));
      },
    },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  return router;
}

const listReads = (router: RequestRouter) => router.requests.filter((r) => r.url === PLATFORM_ADMINS_URL).length;
const writeLines = (router: RequestRouter) =>
  router.requests
    .filter((r) => (r.method ?? "GET").toUpperCase() !== "GET")
    .map((r) => `${(r.method ?? "GET").toUpperCase()} ${r.url}`);

/** An API refusal as Axios rejects with it: status, headers and the RestError body. */
function restError(status: number, code?: RestErrorDetailCode, headers: Record<string, string> = {}) {
  const errors = code ? [{ message: "refused", code }] : [];
  return { response: { status, headers, data: { status, message: "refused", errors } } };
}

/**
 * The page under its real route guard, with the real address bar, so a test
 * can tell nothing reached the URL. StrictMode at the root when asked, where
 * it double-runs effects as main.tsx has it.
 */
const renderPage = ({ strict = false }: { strict?: boolean } = {}) => {
  window.history.replaceState(null, "", "/platform-admins");
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<p>Página de inicio</p>} />
      <Route
        path="/platform-admins"
        element={
          <CapabilityRoute require={{ scope: "platform", capability: "canListPlatformAdmins" }}>
            <PlatformAdminsPage />
          </CapabilityRoute>
        }
      />
    </Routes>,
    { browserHistory: true, token: "a-token", activeCommunityId: null, reactStrictMode: strict },
  );
};

// In the table, not the dialog, which names the person too. `hidden`: an open
// modal hides the page behind it from the accessibility tree.
const rowOf = (name: string) =>
  within(screen.getByRole("table", { hidden: true })).getByText(name).closest("tr") as HTMLElement;
const actionsButton = (name: string) => screen.queryByRole("button", { name: `Más acciones para ${name}` });

async function openMenuOf(u: ReturnType<typeof userEvent.setup>, name: string) {
  await u.click(screen.getByRole("button", { name: `Más acciones para ${name}` }));
  return screen.findByRole("menu");
}

const menuItems = (menu: HTMLElement) => within(menu).getAllByRole("menuitem").map((item) => item.textContent);

/** Picks the item from the row's menu and confirms in the dialog it opens. */
async function confirmFromMenu(u: ReturnType<typeof userEvent.setup>, name: string, item: string, dialogTitle: string) {
  const menu = await openMenuOf(u, name);
  await u.click(within(menu).getByRole("menuitem", { name: item }));
  const dialog = await screen.findByRole("dialog", { name: dialogTitle });
  expect(within(dialog).getByText(name)).toBeInTheDocument();
  await u.click(within(dialog).getByRole("button", { name: item === "Reenviar" ? "Reenviar" : "Revocar enlace" }));
}

const codeDialog = () => screen.findByRole("dialog", { name: "Código de confirmación" });

const originalWidth = window.innerWidth;
const setViewportWidth = (width: number) =>
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });

let secrets: ReturnType<typeof watchForSecrets>;

beforeEach(() => {
  mockCustomInstance.mockReset();
  mockErrorDispatch.mockReset();
  secrets = watchForSecrets();
});

afterEach(() => {
  setViewportWidth(originalWidth);
  vi.restoreAllMocks();
});

describe("pending invitations in the list", () => {
  it("UI-PAD-011 AC10 shows a pending row's name, email, the pending state and its link, never the account's state", async () => {
    servePage({ current: [PAULA, RAMON, NURIA, LUIS] });
    renderPage();

    await screen.findByText("Nuria Nueva");
    const nuria = rowOf("Nuria Nueva");
    expect(within(nuria).getByText("nuria@example.com")).toBeInTheDocument();
    expect(within(nuria).getByText("Pendiente")).toBeInTheDocument();
    expect(within(nuria).getByText("Enlace activo hasta el 26 oct 2026")).toBeInTheDocument();
    // `enabled` is null on a pending row: neither account state may be read into it.
    expect(within(nuria).queryByText("Habilitado")).not.toBeInTheDocument();
    expect(within(nuria).queryByText("Deshabilitado")).not.toBeInTheDocument();

    const luis = rowOf("Luis Lapsado");
    expect(within(luis).getByText("Pendiente")).toBeInTheDocument();
    expect(within(luis).getByText("Enlace caducado o revocado")).toBeInTheDocument();

    // A holder's row is as before.
    expect(within(rowOf("Ramón Revocable")).getByText("Habilitado")).toBeInTheDocument();
    expect(within(rowOf("Ramón Revocable")).queryByText("Pendiente")).not.toBeInTheDocument();
  });

  it("UI-PAD-011 shows the link's state as a line of the narrow list", async () => {
    setViewportWidth(390);
    servePage({ current: [PAULA, NURIA] });
    renderPage();

    const list = await screen.findByRole("list", { name: "Administradores de plataforma" });
    const nuria = within(list).getByText("Nuria Nueva").closest("li") as HTMLElement;
    expect(within(nuria).getByText("Pendiente")).toBeInTheDocument();
    expect(within(nuria).getByText("Invitación")).toBeInTheDocument();
    expect(within(nuria).getByText("Enlace activo hasta el 26 oct 2026")).toBeInTheDocument();
    expect(within(nuria).queryByText("Habilitado")).not.toBeInTheDocument();
  });

  it("UI-PAD-014 counts holders of the role, with the pending invitations apart", async () => {
    servePage({ current: [PAULA, RAMON, NURIA, LUIS] });
    renderPage();
    await screen.findByText("Nuria Nueva");

    const facts = (label: string) => screen.getByText(label).parentElement?.textContent;
    expect(facts("Total")).toContain("2");
    expect(facts("Habilitados")).toContain("2");
    expect(facts("Pendientes")).toContain("2");
    expect(screen.getByText("2 administradores")).toBeInTheDocument();
  });

  it("UI-PAD-014 shows no pending counter when nobody is pending", async () => {
    servePage({ current: [PAULA, RAMON] });
    renderPage();
    await screen.findByText("Ramón Revocable");

    expect(screen.queryByText("Pendientes")).not.toBeInTheDocument();
  });
});

describe("what each row offers", () => {
  it("UI-PAD-012 AC10 offers resend and link revoke on a pending row with a live link, never the role's revoke", async () => {
    const u = userEvent.setup();
    servePage({ current: [PAULA, NURIA] });
    renderPage();
    await screen.findByText("Nuria Nueva");

    expect(menuItems(await openMenuOf(u, "Nuria Nueva"))).toEqual(["Reenviar", "Revocar enlace"]);
  });

  it("UI-PAD-012 offers only the resend once the link has expired or been revoked", async () => {
    const u = userEvent.setup();
    servePage({ current: [PAULA, LUIS] });
    renderPage();
    await screen.findByText("Luis Lapsado");

    expect(menuItems(await openMenuOf(u, "Luis Lapsado"))).toEqual(["Reenviar"]);
  });

  it("UI-PAD-003 AC10 offers a holder only the role's revoke, though the row authorizes the invitation writes too", async () => {
    const u = userEvent.setup();
    servePage({ current: [PAULA, RAMON] });
    renderPage();
    await screen.findByText("Ramón Revocable");

    expect(menuItems(await openMenuOf(u, "Ramón Revocable"))).toEqual(["Revocar rol"]);
    // The caller's own row authorizes the invitation writes and no revoke: nothing applies, so no menu.
    expect(actionsButton("Paula Plataforma")).not.toBeInTheDocument();
  });

  it("UI-PAD-012 AC8 offers no invitation write on a row without their capabilities", async () => {
    const withoutInvitationWrites = { ...NURIA, capabilities: buildPlatformAdminCapabilities({ canRevoke: true }) };
    servePage({ current: [PAULA, withoutInvitationWrites] });
    renderPage();
    await screen.findByText("Nuria Nueva");

    expect(actionsButton("Nuria Nueva")).not.toBeInTheDocument();
  });
});

describe("resending an invitation", () => {
  it.each([
    ["", false],
    [" under StrictMode", true],
  ])(
    "UI-PAD-010 AC3 shows the new code once, refreshes the row's link, and the code is gone once closed%s",
    async (_, strict) => {
      const u = userEvent.setup();
      const admins = { current: [PAULA, LUIS] };
      const router = servePage(admins, {
        resend: () => {
          admins.current = [PAULA, withLink(LUIS, ACTIVE_UNTIL)];
          return { platformAdmin: withLink(LUIS, ACTIVE_UNTIL), confirmationCode: NEW_CODE } satisfies InvitedPlatformAdminResponse;
        },
      });
      const { queryClient } = renderPage({ strict });
      await screen.findByText("Luis Lapsado");

      await confirmFromMenu(u, "Luis Lapsado", "Reenviar", "Reenviar invitación");

      const dialog = await codeDialog();
      expect(within(dialog).getByText("B4N8-R2TW")).toBeInTheDocument();
      expect(within(dialog).getByText("Dáselo por teléfono o en persona, nunca por email.")).toBeInTheDocument();
      expect(within(dialog).getByText(/No se volverá a mostrar/)).toBeInTheDocument();
      expect(
        within(dialog).getByText("Si reenvías la invitación, se generará uno nuevo y este dejará de funcionar."),
      ).toBeInTheDocument();
      expect(writeLines(router)).toEqual([`POST ${resendUrl("u-luis")}`]);
      expect(await within(rowOf("Luis Lapsado")).findByText("Enlace activo hasta el 26 oct 2026")).toBeInTheDocument();

      await u.click(within(dialog).getByRole("button", { name: "Hecho" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

      // Nowhere on screen, never written, logged or put in the URL, and in no cache.
      expect(screen.queryByText("B4N8-R2TW")).not.toBeInTheDocument();
      expect(document.body.textContent).not.toContain(NEW_CODE);
      expect(secrets.leaksOf(NEW_CODE)).toEqual([]);
      await waitFor(() => expect(cachesHold(queryClient, NEW_CODE)).toBe(false));
      // The row the list shows came from its own read, not from the response.
      expect(queryClient.getQueryData(getGetPlatformAdminsQueryKey())).toEqual(admins.current);
      expect(secrets.consoleOutput()).not.toContain("luis@example.com");
    },
  );

  it("UI-PAD-010 keeps the code on screen on a backdrop click or Escape, and closes only with Hecho", async () => {
    const u = userEvent.setup();
    servePage({ current: [PAULA, LUIS] }, { resend: () => ({ platformAdmin: LUIS, confirmationCode: NEW_CODE }) });
    renderPage();
    await screen.findByText("Luis Lapsado");
    await confirmFromMenu(u, "Luis Lapsado", "Reenviar", "Reenviar invitación");
    const dialog = await codeDialog();

    await u.keyboard("{Escape}");
    // Structural: the backdrop has neither a role nor a name. MUI closes a
    // dialog on a click on its container, outside the paper.
    const container = document.querySelector(".MuiDialog-container") as HTMLElement;
    await u.click(container);

    expect(screen.getByRole("dialog", { name: "Código de confirmación" })).toBeInTheDocument();
    expect(within(dialog).getByText("B4N8-R2TW")).toBeInTheDocument();

    await u.click(within(dialog).getByRole("button", { name: "Hecho" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByText("B4N8-R2TW")).not.toBeInTheDocument();
  });

  it("UI-PAD-010 keeps the code on screen when the refetch that follows takes the row away", async () => {
    const u = userEvent.setup();
    const admins = { current: [PAULA, LUIS] };
    servePage(admins, {
      resend: () => {
        // Accepted in between: the row is a holder now, and resending no longer applies.
        admins.current = [PAULA, buildPlatformAdmin({ ...LUIS, enabled: true, revocable: true, invitation: null })];
        return { platformAdmin: LUIS, confirmationCode: NEW_CODE };
      },
    });
    renderPage();
    await screen.findByText("Luis Lapsado");
    await confirmFromMenu(u, "Luis Lapsado", "Reenviar", "Reenviar invitación");

    const dialog = await codeDialog();
    await waitFor(() => expect(within(rowOf("Luis Lapsado")).getByText("Habilitado")).toBeInTheDocument());
    expect(within(dialog).getByText("B4N8-R2TW")).toBeInTheDocument();
  });

  it("UI-PAD-013 AC3 says when another resend becomes possible, from Retry-After", async () => {
    const u = userEvent.setup();
    const router = servePage(
      { current: [PAULA, NURIA] },
      {
        resend: () => {
          throw restError(429, "PLATFORM_ADMIN_INVITATION_RESEND_LIMIT_REACHED", { "retry-after": "7200" });
        },
      },
    );
    renderPage();
    await screen.findByText("Nuria Nueva");
    const readsBefore = listReads(router);

    await confirmFromMenu(u, "Nuria Nueva", "Reenviar", "Reenviar invitación");

    await waitFor(() =>
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Has alcanzado el límite de reenvíos para este administrador. Podrás volver a reenviar la invitación dentro de 2 horas.",
      ),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(listReads(router)).toBe(readsBefore);
  });

  it.each<[string, () => unknown, string]>([
    [
      "PLATFORM_ADMIN_NOT_INVITED",
      () => restError(409, "PLATFORM_ADMIN_NOT_INVITED"),
      "Esta persona ya no tiene una invitación pendiente. Hemos actualizado la lista.",
    ],
    ["a 404", () => restError(404), "Esta cuenta ya no existe. Hemos actualizado la lista."],
  ])("UI-PAD-013 says a stale row was refreshed on %s, and refetches the list", async (_, refusal, message) => {
    const u = userEvent.setup();
    const router = servePage(
      { current: [PAULA, NURIA] },
      {
        resend: () => {
          throw refusal();
        },
      },
    );
    renderPage();
    await screen.findByText("Nuria Nueva");
    const readsBefore = listReads(router);

    await confirmFromMenu(u, "Nuria Nueva", "Reenviar", "Reenviar invitación");

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(message));
    await waitFor(() => expect(listReads(router)).toBe(readsBefore + 1));
  });

  it("UI-PAD-013 says invitations cannot be sent right now on a 503", async () => {
    const u = userEvent.setup();
    servePage(
      { current: [PAULA, NURIA] },
      {
        resend: () => {
          throw restError(503, "PLATFORM_ADMIN_INVITATION_UNAVAILABLE");
        },
      },
    );
    renderPage();
    await screen.findByText("Nuria Nueva");

    await confirmFromMenu(u, "Nuria Nueva", "Reenviar", "Reenviar invitación");

    await waitFor(() =>
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Ahora mismo no se pueden enviar invitaciones. Inténtalo más tarde.",
      ),
    );
  });

  it("UI-PAD-012 sends nothing when the confirmation is cancelled", async () => {
    const u = userEvent.setup();
    const router = servePage({ current: [PAULA, NURIA] });
    renderPage();
    await screen.findByText("Nuria Nueva");

    const menu = await openMenuOf(u, "Nuria Nueva");
    await u.click(within(menu).getByRole("menuitem", { name: "Reenviar" }));
    const dialog = await screen.findByRole("dialog", { name: "Reenviar invitación" });
    await u.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(writeLines(router)).toEqual([]);
  });
});

describe("revoking an invitation's link", () => {
  it("UI-PAD-012 AC4 leaves the row with no active link and still offering the resend", async () => {
    const u = userEvent.setup();
    const admins = { current: [PAULA, NURIA] };
    const router = servePage(admins, {
      revokeLink: () => {
        admins.current = [PAULA, withLink(NURIA, null)];
        return withLink(NURIA, null);
      },
    });
    renderPage();
    await screen.findByText("Nuria Nueva");

    await confirmFromMenu(u, "Nuria Nueva", "Revocar enlace", "Revocar enlace");

    expect(await within(rowOf("Nuria Nueva")).findByText("Enlace caducado o revocado")).toBeInTheDocument();
    expect(writeLines(router)).toEqual([`POST ${revokeLinkUrl("u-nuria")}`]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(menuItems(await openMenuOf(u, "Nuria Nueva"))).toEqual(["Reenviar"]);
  });

  it("UI-PAD-013 says a stale row was refreshed when the invitation is gone, and refetches the list", async () => {
    const u = userEvent.setup();
    const router = servePage(
      { current: [PAULA, NURIA] },
      {
        revokeLink: () => {
          throw restError(409, "PLATFORM_ADMIN_NOT_INVITED");
        },
      },
    );
    renderPage();
    await screen.findByText("Nuria Nueva");
    const readsBefore = listReads(router);

    await confirmFromMenu(u, "Nuria Nueva", "Revocar enlace", "Revocar enlace");

    await waitFor(() =>
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Esta persona ya no tiene una invitación pendiente. Hemos actualizado la lista.",
      ),
    );
    await waitFor(() => expect(listReads(router)).toBe(readsBefore + 1));
  });
});
