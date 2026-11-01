import "@testing-library/jest-dom";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig, type RequestRouter } from "../../test/requestRouter";
import {
  buildCommunity,
  buildCommunityAdmin,
  buildCommunityCapabilities,
  buildCurrentUser,
  buildPlatformCapabilities,
} from "../../test/fixtures";
import type {
  CommunityAdminResponse,
  CommunityCapabilitiesResponse,
  CommunityResponse,
  CurrentUserResponse,
  RestErrorDetailCode,
} from "../../api/models";
import { CapabilityRoute } from "../../components/Auth/CapabilityRoute";
import { CommunityAdminsPage } from "./CommunityAdminsPage";

/**
 * A community's admins page against routed requests (#276).
 *
 * Tier 2: the real generated hooks, actions layer and QueryClient run, and
 * only the HTTP layer is mocked, so a test sees each request the page sends
 * and the row it shows once the action's invalidation has refetched the list.
 * The routes cover the admin endpoints and nothing of the roster: a request to
 * …/memberships, or to the user list, matches no route and fails the test.
 */
const { mockCustomInstance, mockErrorDispatch } = vi.hoisted(() => ({
  mockCustomInstance: vi.fn(),
  mockErrorDispatch: vi.fn(),
}));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

// The page's failure slot is the layout's toast, which is not rendered here;
// what the page dispatches to it is what these tests read.
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

const COMMUNITY_ID = "community-1";
const COMMUNITY_NAME = "Comunidad Solar";
const COMMUNITY_URL = `/api/v1/communities/${COMMUNITY_ID}`;
const ADMINS_URL = `${COMMUNITY_URL}/admins`;
const INVITE_URL = `${ADMINS_URL}/invite`;
const resendUrl = (userId: string) => `${ADMINS_URL}/${userId}/invitation/resend`;
const revokeUrl = (userId: string) => `${ADMINS_URL}/${userId}/invitation/revoke`;
const enableUrl = (userId: string) => `${ADMINS_URL}/${userId}/enable`;
const disableUrl = (userId: string) => `${ADMINS_URL}/${userId}/disable`;

const communityWith = (capabilities: Partial<CommunityCapabilitiesResponse>) =>
  buildCommunity({ id: COMMUNITY_ID, name: COMMUNITY_NAME, capabilities: buildCommunityCapabilities(capabilities) });

/** What a platform admin holds on a community they administer, without being a member of it. */
const PLATFORM_VIEW = communityWith({ canRead: true, canUpdate: true, canManageAdmins: true });

const PLATFORM_ADMIN = buildCurrentUser({
  id: "platform-admin",
  fullName: "Paula Plataforma",
  isPlatformAdmin: true,
  platformCapabilities: buildPlatformCapabilities({ canAdministerPlatform: true }),
  memberships: {},
});

const ACTIVE_LINK = { invitedAt: "2026-10-01T10:00:00Z", invitationExpiresAt: "2026-10-08T10:00:00Z" };
const NEW_LINK = { invitedAt: "2026-10-19T10:00:00Z", invitationExpiresAt: "2026-10-26T10:00:00Z" };

const admin = (userId: string, fullName: string, overrides: Partial<CommunityAdminResponse> = {}) =>
  buildCommunityAdmin({
    user: { id: userId },
    fullName,
    personalId: `${userId.toUpperCase()}-DNI`,
    contactEmail: `${userId}@example.com`,
    phoneNumber: "600 000 000",
    ...overrides,
  });

const ROSA = admin("u-rosa", "Rosa Activa", {
  acceptedAt: "2026-02-01T09:00:00Z",
  invitedAt: "2026-01-25T09:00:00Z",
  phoneNumber: "611 222 333",
});
const PABLO = admin("u-pablo", "Pablo Pendiente", { ...ACTIVE_LINK, phoneNumber: null });
// Invited once, and the link has expired: the backend no longer sends its expiry.
const LAURA = admin("u-laura", "Laura Caducada", { invitedAt: "2026-09-01T10:00:00Z" });
const SERGIO = admin("u-sergio", "Sergio Suspendido", {
  acceptedAt: "2026-03-01T09:00:00Z",
  invitedAt: "2026-02-20T09:00:00Z",
  enabled: false,
});

type Admins = { current: CommunityAdminResponse[] };
type Write = "invite" | "resend" | "revoke" | "enable" | "disable";
type Writes = Partial<Record<Write, (config: RequestConfig) => unknown>>;

function serveAdminsPage(
  admins: Admins,
  writes: Writes = {},
  { community = PLATFORM_VIEW, caller = PLATFORM_ADMIN }: { community?: CommunityResponse; caller?: CurrentUserResponse } = {},
): RequestRouter {
  const write = (name: Write) => (config: RequestConfig) => {
    const handler = writes[name];
    if (!handler) throw new Error(`unexpected ${name}`);
    return handler(config);
  };
  const router = routeRequests([
    { method: "GET", url: "/api/v1/users/current", respond: () => caller },
    { method: "GET", url: "/api/v1/communities", respond: () => [community] },
    { method: "GET", url: COMMUNITY_URL, respond: () => community },
    { method: "GET", url: ADMINS_URL, respond: () => admins.current },
    { method: "POST", url: INVITE_URL, respond: write("invite") },
    { method: "POST", url: /\/admins\/[^/]+\/invitation\/resend$/, respond: write("resend") },
    { method: "POST", url: /\/admins\/[^/]+\/invitation\/revoke$/, respond: write("revoke") },
    { method: "POST", url: /\/admins\/[^/]+\/enable$/, respond: write("enable") },
    { method: "POST", url: /\/admins\/[^/]+\/disable$/, respond: write("disable") },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  return router;
}

const requestsTo = (router: RequestRouter, method: string, url: string) =>
  router.requests.filter((r) => (r.method ?? "GET").toUpperCase() === method && r.url === url);
const writesSent = (router: RequestRouter) =>
  router.requests.filter((r) => (r.method ?? "GET").toUpperCase() !== "GET");
const adminReads = (router: RequestRouter) => requestsTo(router, "GET", ADMINS_URL).length;

/** An API refusal as Axios rejects with it: status, headers and the RestError body. */
function restError(
  status: number,
  code: RestErrorDetailCode,
  { headers = {}, message = "refused" }: { headers?: Record<string, string>; message?: string } = {},
) {
  return { response: { status, headers, data: { status, message, errors: [{ message, code }] } } };
}

/** Changes one admin's row as the backend would, for the next list GET. */
const update = (admins: Admins, userId: string, change: Partial<CommunityAdminResponse>) => {
  admins.current = admins.current.map((a) => (a.user.id === userId ? { ...a, ...change } : a));
};

/** The page under its real route guard, as App.tsx mounts it; a denial lands on "/". */
const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<p>Página de inicio</p>} />
      <Route
        path="/communities/:communityId/admins"
        element={
          <CapabilityRoute require={{ scope: "communityById", capability: "canManageAdmins" }}>
            <CommunityAdminsPage />
          </CapabilityRoute>
        }
      />
    </Routes>,
    { route: `/communities/${COMMUNITY_ID}/admins`, token: "a-token", activeCommunityId: null },
  );

const user = () => userEvent.setup();

const rowOf = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;

async function menuOf(u: ReturnType<typeof userEvent.setup>, name: string) {
  await u.click(screen.getByRole("button", { name: `Más acciones para ${name}` }));
  return screen.findByRole("menu");
}

async function menuItemsOf(u: ReturnType<typeof userEvent.setup>, name: string) {
  const menu = await menuOf(u, name);
  const items = within(menu)
    .getAllByRole("menuitem")
    .map((item) => item.textContent);
  await u.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  return items;
}

const DIALOG_TITLES = {
  Reenviar: "Reenviar invitación en",
  "Revocar enlace": "Revocar enlace en",
  Suspender: "Suspender administrador en",
  Reactivar: "Reactivar administrador en",
} as const;

/** Picks the item from the row's menu, and confirms in the dialog it opens. */
async function confirmFromMenu(u: ReturnType<typeof userEvent.setup>, name: string, item: keyof typeof DIALOG_TITLES) {
  const menu = await menuOf(u, name);
  await u.click(within(menu).getByRole("menuitem", { name: item }));
  const dialog = await screen.findByRole("dialog", { name: `${DIALOG_TITLES[item]} ${COMMUNITY_NAME}` });
  expect(within(dialog).getByText(name)).toBeInTheDocument();
  await u.click(within(dialog).getByRole("button", { name: item }));
}

/** The writes sent, as "METHOD url": every one must be an admin endpoint. */
const writeLines = (router: RequestRouter) =>
  writesSent(router).map((r) => `${(r.method ?? "GET").toUpperCase()} ${r.url}`);

beforeEach(() => {
  mockCustomInstance.mockReset();
  mockErrorDispatch.mockReset();
});

describe("the admins list", () => {
  it("UI-ADM-002 shows each admin's name, contact email, phone, DNI and state, from the admins endpoint", async () => {
    const router = serveAdminsPage({ current: [ROSA, PABLO, LAURA, SERGIO] });
    renderPage();

    expect(await screen.findByText("Rosa Activa")).toBeInTheDocument();
    const rosa = within(rowOf("Rosa Activa"));
    expect(rosa.getByText("u-rosa@example.com")).toBeInTheDocument();
    expect(rosa.getByText("611 222 333")).toBeInTheDocument();
    expect(rosa.getByText("U-ROSA-DNI")).toBeInTheDocument();
    expect(rosa.getByText("Activo")).toBeInTheDocument();

    // The members page's derived status (UI-MBR-030): a pending row shows its sub-status, with no link caption.
    expect(within(rowOf("Pablo Pendiente")).getByText("Invitación enviada")).toBeInTheDocument();
    expect(screen.queryByText(/Enlace activo hasta el|Enlace caducado o revocado/)).not.toBeInTheDocument();
    expect(within(rowOf("Laura Caducada")).getByText("Invitación caducada o revocada")).toBeInTheDocument();
    expect(within(rowOf("Sergio Suspendido")).getByText("Suspendido")).toBeInTheDocument();

    expect(adminReads(router)).toBe(1);
  });

  it("UI-ADM-007 reads nothing about the community's members and no user list", async () => {
    const router = serveAdminsPage({ current: [ROSA, PABLO] });
    renderPage();
    await screen.findByText("Rosa Activa");

    const urls = router.requests.map((r) => r.url ?? "");
    expect(urls.filter((url) => url.includes("/memberships"))).toEqual([]);
    expect(urls.filter((url) => url.startsWith("/api/v1/users") && url !== "/api/v1/users/current")).toEqual([]);
  });

  it("UI-MBR-007 shows an admin without contact email or phone by name alone", async () => {
    serveAdminsPage({ current: [admin("u-teo", "Teo Sincontacto", { contactEmail: null, phoneNumber: null })] });
    renderPage();

    await screen.findByText("Teo Sincontacto");
    // The avatar's initial, then the name, with nothing after it.
    expect(within(rowOf("Teo Sincontacto")).getAllByRole("cell")[0]).toHaveTextContent(/^TTeo Sincontacto$/);
  });
});

describe("who may see it", () => {
  it.each([
    [
      "a community admin",
      communityWith({ canRead: true, canManage: true, canManageMemberships: true }),
      buildCurrentUser({ id: "ca", memberships: { [COMMUNITY_ID]: "COMMUNITY_ADMIN" } }),
    ],
    [
      "a member",
      communityWith({ canRead: true }),
      buildCurrentUser({ id: "m", memberships: { [COMMUNITY_ID]: "COMMUNITY_MEMBER" } }),
    ],
  ])("UI-ADM-001 sends %s home without reading the admins", async (_persona, community, caller) => {
    const router = serveAdminsPage({ current: [ROSA] }, {}, { community, caller });
    renderPage();

    expect(await screen.findByText("Página de inicio")).toBeInTheDocument();
    expect(screen.queryByText("Rosa Activa")).not.toBeInTheDocument();
    expect(adminReads(router)).toBe(0);
  });

  it("UI-ADM-001 shows nothing of it on a community without canManageAdmins, as from an older backend", async () => {
    const capabilities = buildCommunityCapabilities({ canRead: true, canUpdate: true, canManageAdmins: true });
    delete (capabilities as Partial<typeof capabilities>).canManageAdmins;
    const community = buildCommunity({ id: COMMUNITY_ID, name: COMMUNITY_NAME, capabilities });
    const router = serveAdminsPage({ current: [ROSA] }, {}, { community });
    renderPage();

    expect(await screen.findByText("Página de inicio")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Invitar administrador/ })).not.toBeInTheDocument();
    expect(adminReads(router)).toBe(0);
  });
});

describe("inviting an admin", () => {
  const fill = async (u: ReturnType<typeof userEvent.setup>, values: Record<string, string>) => {
    for (const [label, value] of Object.entries(values)) {
      await u.type(screen.getByRole("textbox", { name: new RegExp(`^${label}`) }), value);
    }
  };
  const openForm = async (u: ReturnType<typeof userEvent.setup>) => {
    await u.click(await screen.findByRole("button", { name: /Invitar administrador/ }));
    return screen.findByRole("dialog", { name: `Invitar administrador a ${COMMUNITY_NAME}` });
  };
  const FORM = {
    "DNI/NIE/NIF": "12.345.678-z",
    "Nombre completo": "Nora Nueva",
    "Email de contacto": "nora@example.com",
    Teléfono: "622 333 444",
  };

  it("UI-ADM-003 sends the whole invitation, and the list then shows the new admin with the invitation sent", async () => {
    const u = user();
    const admins: Admins = { current: [ROSA] };
    const router = serveAdminsPage(admins, {
      invite: (config) => {
        const body = config.data as { personalId: string; fullName: string; contactEmail: string };
        const invited = admin("u-nora", body.fullName, { ...NEW_LINK, personalId: "12345678Z" });
        admins.current = [...admins.current, invited];
        return invited;
      },
    });
    renderPage();
    await openForm(u);
    await fill(u, FORM);
    await u.click(screen.getByRole("button", { name: "Invitar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(requestsTo(router, "POST", INVITE_URL)[0].data).toEqual({
      personalId: "12.345.678-z",
      fullName: "Nora Nueva",
      contactEmail: "nora@example.com",
      phoneNumber: "622 333 444",
    });
    await screen.findByText("Nora Nueva");
    expect(within(rowOf("Nora Nueva")).getByText("Invitación enviada")).toBeInTheDocument();
    expect(writeLines(router)).toEqual([`POST ${INVITE_URL}`]);
  });

  it("#310 AC4 keeps the form open while the invitation is in flight, then closes it as before", async () => {
    const u = user();
    const admins: Admins = { current: [ROSA] };
    let settle!: () => void;
    serveAdminsPage(admins, {
      invite: (config) =>
        new Promise((resolve) => {
          settle = () => {
            const body = config.data as { fullName: string };
            const invited = admin("u-nora", body.fullName, { ...NEW_LINK, personalId: "12345678Z" });
            admins.current = [...admins.current, invited];
            resolve(invited);
          };
        }),
    });
    renderPage();
    const form = await openForm(u);
    await fill(u, FORM);
    await u.click(within(form).getByRole("button", { name: "Invitar" }));
    await within(form).findByRole("button", { name: "Enviando..." });

    fireEvent.keyDown(form, { key: "Escape" });
    // The backdrop has no role or name: MUI's Dialog container takes the click.
    await u.click(document.querySelector(".MuiDialog-container")!);
    const cancel = within(form).getByRole("button", { name: "Cancelar" });
    expect(cancel).toBeDisabled();
    // A disabled button takes no pointer events, so userEvent refuses it.
    fireEvent.click(cancel);
    expect(screen.getByRole("dialog", { name: `Invitar administrador a ${COMMUNITY_NAME}` })).toBeInTheDocument();

    settle();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Nora Nueva")).toBeInTheDocument();
  });

  it("#310 releases the form once a write that never answers times out", async () => {
    const u = user();
    let timeOut!: () => void;
    serveAdminsPage({ current: [ROSA] }, {
      invite: () =>
        new Promise((_, reject) => {
          // What axios rejects with when the request's limit runs out: no response.
          timeOut = () => reject(new AxiosError("timeout of 30000ms exceeded", "ECONNABORTED"));
        }),
    });
    renderPage();
    const form = await openForm(u);
    await fill(u, FORM);
    await u.click(within(form).getByRole("button", { name: "Invitar" }));
    expect(await within(form).findByRole("button", { name: "Cancelar" })).toBeDisabled();

    timeOut();

    expect(await within(form).findByRole("alert")).toBeInTheDocument();
    expect(within(form).getByRole("button", { name: "Cancelar" })).toBeEnabled();
    expect(within(form).getByRole("textbox", { name: /^Nombre completo/ })).toHaveValue("Nora Nueva");
    fireEvent.keyDown(form, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("UI-ADM-003 sends a blank phone as none", async () => {
    const u = user();
    const router = serveAdminsPage({ current: [ROSA] }, { invite: () => admin("u-nora", "Nora Nueva", NEW_LINK) });
    renderPage();
    await openForm(u);
    await fill(u, { "DNI/NIE/NIF": "12345678Z", "Nombre completo": "Nora Nueva", "Email de contacto": "nora@example.com" });
    await u.click(screen.getByRole("button", { name: "Invitar" }));

    await waitFor(() => expect(requestsTo(router, "POST", INVITE_URL)).toHaveLength(1));
    expect(requestsTo(router, "POST", INVITE_URL)[0].data).toMatchObject({ phoneNumber: null });
  });

  it.each([
    ["DNI/NIE/NIF", "Escribe el DNI/NIE/NIF"],
    ["Nombre completo", "Escribe el nombre completo"],
    ["Email de contacto", "Escribe el email de contacto"],
  ])("UI-ADM-003 requires the %s and sends nothing without it", async (missing, message) => {
    const u = user();
    const router = serveAdminsPage({ current: [ROSA] });
    renderPage();
    await openForm(u);
    await fill(u, Object.fromEntries(Object.entries(FORM).filter(([label]) => label !== missing)));
    await u.click(screen.getByRole("button", { name: "Invitar" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: new RegExp(`^${missing}`) })).toHaveAttribute("aria-invalid", "true");
    expect(writesSent(router)).toEqual([]);
  });

  it("UI-ADM-004 says the person is already in the community, keeps what was typed and refreshes the list", async () => {
    const u = user();
    const router = serveAdminsPage(
      { current: [ROSA] },
      { invite: () => { throw restError(409, "MEMBERSHIP_ALREADY_EXISTS"); } },
    );
    renderPage();
    const dialog = await openForm(u);
    await fill(u, FORM);
    const readsBefore = adminReads(router);
    await u.click(screen.getByRole("button", { name: "Invitar" }));

    expect(await within(dialog).findByText("Ya forma parte de esta comunidad.")).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: /^Nombre completo/ })).toHaveValue("Nora Nueva");
    await waitFor(() => expect(adminReads(router)).toBeGreaterThan(readsBefore));
  });

  it("UI-ERR-001 shows the catalogue's text for MEMBERSHIP_ALREADY_EXISTS, not the server's message", async () => {
    const u = user();
    serveAdminsPage(
      { current: [ROSA] },
      { invite: () => { throw restError(409, "MEMBERSHIP_ALREADY_EXISTS", { message: "TEST-SERVER-MESSAGE" }); } },
    );
    renderPage();
    const dialog = await openForm(u);
    await fill(u, FORM);
    await u.click(screen.getByRole("button", { name: "Invitar" }));

    expect(await within(dialog).findByText("Ya forma parte de esta comunidad.")).toBeInTheDocument();
    expect(screen.queryByText("TEST-SERVER-MESSAGE")).not.toBeInTheDocument();
  });

  it("UI-ADM-004 says invitations cannot be sent right now, and keeps what was typed", async () => {
    const u = user();
    serveAdminsPage({ current: [ROSA] }, { invite: () => { throw restError(503, "MEMBERSHIP_INVITATION_UNAVAILABLE"); } });
    renderPage();
    const dialog = await openForm(u);
    await fill(u, FORM);
    await u.click(screen.getByRole("button", { name: "Invitar" }));

    expect(
      await within(dialog).findByText("Ahora mismo no se pueden enviar invitaciones. Inténtalo más tarde."),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: /^Email de contacto/ })).toHaveValue("nora@example.com");
  });

  it("UI-ADM-004 shows an invalid DNI/NIE/NIF on its field, and the other fields keep their values", async () => {
    const u = user();
    serveAdminsPage({ current: [ROSA] }, { invite: () => { throw restError(400, "USER_PERSONAL_ID_INVALID"); } });
    renderPage();
    const dialog = await openForm(u);
    await fill(u, FORM);
    await u.click(screen.getByRole("button", { name: "Invitar" }));

    const personalId = await within(dialog).findByRole("textbox", { name: /^DNI\/NIE\/NIF/ });
    await waitFor(() => expect(personalId).toHaveAttribute("aria-invalid", "true"));
    expect(personalId).toHaveAccessibleDescription("El DNI/NIE/NIF no es válido. Revisa los números y la letra.");
    expect(personalId).toHaveValue("12.345.678-z");
    expect(within(dialog).getByRole("textbox", { name: /^Nombre completo/ })).toHaveValue("Nora Nueva");
    expect(within(dialog).getByRole("textbox", { name: /^Email de contacto/ })).toHaveValue("nora@example.com");
    expect(within(dialog).getByRole("textbox", { name: /^Teléfono/ })).toHaveValue("622 333 444");
    // On the field only, not repeated for the whole form.
    expect(within(dialog).getAllByText("El DNI/NIE/NIF no es válido. Revisa los números y la letra.")).toHaveLength(1);
  });
});

describe("the row actions", () => {
  it("UI-ADM-005 offers each row only the actions its state allows", async () => {
    const u = user();
    const suspendedWithLink = admin("u-silvia", "Silvia Suspendida", { ...ACTIVE_LINK, enabled: false });
    serveAdminsPage({ current: [ROSA, PABLO, LAURA, SERGIO, suspendedWithLink] });
    renderPage();
    await screen.findByText("Rosa Activa");

    expect(await menuItemsOf(u, "Rosa Activa")).toEqual(["Suspender"]);
    expect(await menuItemsOf(u, "Pablo Pendiente")).toEqual(["Reenviar", "Revocar enlace", "Suspender"]);
    expect(await menuItemsOf(u, "Laura Caducada")).toEqual(["Reenviar", "Suspender"]);
    expect(await menuItemsOf(u, "Sergio Suspendido")).toEqual(["Reactivar"]);
    expect(await menuItemsOf(u, "Silvia Suspendida")).toEqual(["Revocar enlace", "Reactivar"]);
  });

  it("UI-ADM-005 resends the invitation, and the list is read again", async () => {
    const u = user();
    const admins: Admins = { current: [PABLO] };
    const router = serveAdminsPage(admins, {
      resend: () => {
        update(admins, "u-pablo", NEW_LINK);
        return admins.current[0];
      },
    });
    renderPage();
    await screen.findByText("Pablo Pendiente");
    await confirmFromMenu(u, "Pablo Pendiente", "Reenviar");

    // A new link reads the same as the old one ("Invitación enviada"), so the
    // refetch is what shows the row was refreshed.
    await waitFor(() => expect(adminReads(router)).toBe(2));
    expect(within(rowOf("Pablo Pendiente")).getByText("Invitación enviada")).toBeInTheDocument();
    expect(writeLines(router)).toEqual([`POST ${resendUrl("u-pablo")}`]);
  });

  it("UI-ADM-005 revokes the link, and the row shows it lapsed", async () => {
    const u = user();
    const admins: Admins = { current: [PABLO] };
    const router = serveAdminsPage(admins, {
      revoke: () => {
        update(admins, "u-pablo", { invitationExpiresAt: null });
        return admins.current[0];
      },
    });
    renderPage();
    await screen.findByText("Pablo Pendiente");
    await confirmFromMenu(u, "Pablo Pendiente", "Revocar enlace");

    expect(await within(rowOf("Pablo Pendiente")).findByText("Invitación caducada o revocada")).toBeInTheDocument();
    expect(writeLines(router)).toEqual([`POST ${revokeUrl("u-pablo")}`]);
  });

  it("UI-ADM-005 suspends an admin, and the row shows Suspendido", async () => {
    const u = user();
    const admins: Admins = { current: [ROSA] };
    const router = serveAdminsPage(admins, {
      disable: () => {
        update(admins, "u-rosa", { enabled: false });
      },
    });
    renderPage();
    await screen.findByText("Rosa Activa");
    await confirmFromMenu(u, "Rosa Activa", "Suspender");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    expect(await within(rowOf("Rosa Activa")).findByText("Suspendido")).toBeInTheDocument();
    expect(writeLines(router)).toEqual([`POST ${disableUrl("u-rosa")}`]);
  });

  it("UI-ADM-005 reactivates an admin, and the row shows Activo", async () => {
    const u = user();
    const admins: Admins = { current: [SERGIO] };
    const router = serveAdminsPage(admins, {
      enable: () => {
        update(admins, "u-sergio", { enabled: true });
      },
    });
    renderPage();
    await screen.findByText("Sergio Suspendido");
    await confirmFromMenu(u, "Sergio Suspendido", "Reactivar");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    expect(await within(rowOf("Sergio Suspendido")).findByText("Activo")).toBeInTheDocument();
    expect(writeLines(router)).toEqual([`POST ${enableUrl("u-sergio")}`]);
  });

  it("UI-ADM-005 sends nothing when the confirmation is dismissed", async () => {
    const u = user();
    const router = serveAdminsPage({ current: [ROSA] });
    renderPage();
    await screen.findByText("Rosa Activa");
    const menu = await menuOf(u, "Rosa Activa");
    await u.click(within(menu).getByRole("menuitem", { name: "Suspender" }));
    await u.click(await screen.findByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(writesSent(router)).toEqual([]);
  });
});

describe("refused row actions", () => {
  it("UI-ADM-006 says when another resend is possible, from the Retry-After header", async () => {
    const u = user();
    serveAdminsPage(
      { current: [PABLO] },
      {
        resend: () => {
          throw restError(429, "MEMBERSHIP_INVITATION_RESEND_LIMIT_REACHED", { headers: { "retry-after": "7200" } });
        },
      },
    );
    renderPage();
    await screen.findByText("Pablo Pendiente");
    await confirmFromMenu(u, "Pablo Pendiente", "Reenviar");

    await waitFor(() =>
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Has alcanzado el límite de reenvíos para esta persona. Podrás volver a reenviar la invitación dentro de 2 horas.",
      ),
    );
  });

  it.each<[RestErrorDetailCode, Partial<CommunityAdminResponse>, string]>([
    [
      "MEMBERSHIP_NOT_INVITED",
      { invitedAt: null, invitationExpiresAt: null },
      "Esta persona todavía no tiene ninguna invitación que reenviar. Hemos actualizado la lista.",
    ],
    [
      "MEMBERSHIP_DISABLED",
      { enabled: false },
      "Esta persona está suspendida, así que no se le puede invitar. Hemos actualizado la lista.",
    ],
    [
      "MEMBERSHIP_ALREADY_EXISTS",
      { acceptedAt: "2026-10-18T09:00:00Z" },
      "Esta persona ya ha aceptado la invitación. Hemos actualizado la lista.",
    ],
  ])("UI-ADM-006 words a resend refused with %s for the invitee, and refetches the list", async (code, change, message) => {
    const u = user();
    const admins: Admins = { current: [PABLO] };
    const router = serveAdminsPage(admins, {
      resend: () => {
        // Changed in another session since the list was read.
        update(admins, "u-pablo", change);
        throw restError(409, code);
      },
    });
    renderPage();
    await screen.findByText("Pablo Pendiente");
    const readsBefore = adminReads(router);
    await confirmFromMenu(u, "Pablo Pendiente", "Reenviar");

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(message));
    await waitFor(() => expect(adminReads(router)).toBeGreaterThan(readsBefore));
  });

  it("UI-ADM-006 refetches the list when the link to revoke was accepted meanwhile, and the row then shows Activo", async () => {
    const u = user();
    const admins: Admins = { current: [PABLO] };
    serveAdminsPage(admins, {
      revoke: () => {
        update(admins, "u-pablo", { acceptedAt: "2026-10-18T09:00:00Z" });
        throw restError(409, "MEMBERSHIP_ALREADY_EXISTS");
      },
    });
    renderPage();
    await screen.findByText("Pablo Pendiente");
    await confirmFromMenu(u, "Pablo Pendiente", "Revocar enlace");

    await waitFor(() =>
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Esta persona ya ha aceptado la invitación. Hemos actualizado la lista.",
      ),
    );
    expect(await within(rowOf("Pablo Pendiente")).findByText("Activo")).toBeInTheDocument();
  });

  it("UI-ADM-006 says who can add a missing contact email, rather than pointing to a record edit this page lacks", async () => {
    const u = user();
    serveAdminsPage(
      { current: [PABLO] },
      { resend: () => { throw restError(400, "MEMBERSHIP_WITHOUT_CONTACT_EMAIL"); } },
    );
    renderPage();
    await screen.findByText("Pablo Pendiente");
    await confirmFromMenu(u, "Pablo Pendiente", "Reenviar");

    await waitFor(() =>
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Esta persona no tiene email de contacto. Un administrador de la comunidad puede añadirlo desde su ficha.",
      ),
    );
  });

  it("UI-ADM-006 says a suspension failed, and keeps the dialog open", async () => {
    const u = user();
    serveAdminsPage({ current: [ROSA] }, {
        disable: () => {
          throw { response: { status: 500 } };
        },
      });
    renderPage();
    await screen.findByText("Rosa Activa");
    await confirmFromMenu(u, "Rosa Activa", "Suspender");

    await waitFor(() =>
      expect(mockErrorDispatch).toHaveBeenCalledWith("No se ha podido suspender al administrador. Inténtalo de nuevo."),
    );
    expect(screen.getByRole("dialog", { name: `Suspender administrador en ${COMMUNITY_NAME}` })).toBeInTheDocument();
  });
});

describe("a failed read (#347)", () => {
  it("UI-LST-004 shows what failed and a retry that reads the admins again, not the empty state", async () => {
    // The first read fails; the retry is answered.
    let failNext = true;
    const admins: Admins = {
      get current() {
        if (failNext) {
          failNext = false;
          throw { response: { status: 500, headers: {}, data: { status: 500, message: "boom", errors: [] } } };
        }
        return [ROSA, PABLO];
      },
    };
    const router = serveAdminsPage(admins);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar los administradores.");
    expect(screen.queryByText("Esta comunidad no tiene administradores")).not.toBeInTheDocument();
    expect(adminReads(router)).toBe(1);

    await user().click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Rosa Activa")).toBeInTheDocument();
    expect(adminReads(router)).toBe(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
