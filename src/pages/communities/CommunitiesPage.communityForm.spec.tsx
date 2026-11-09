import "@testing-library/jest-dom";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig, type RequestRouter } from "../../test/requestRouter";
import { declaredStyles, hasOverlayEntry, pressBack, stubViewport } from "../../test/overlay";
import { overlayHistorySettled } from "../../components/ResponsiveOverlay/overlayHistory";
import { apiError } from "../../test/apiError";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildContactChannel,
  buildCurrentUser,
  buildPlatformCapabilities,
} from "../../test/fixtures";
import type {
  CommunityCapabilitiesResponse,
  CommunityResponse,
  ContactChannelResponse,
  CreateCommunityBody,
  CurrentUserResponse,
  UpdateCommunityBody,
} from "../../api/models";
import { getGetCommunityByIdQueryKey } from "../../api/communities/communities";
import { CommunitiesPage } from "./CommunitiesPage";

/**
 * Creating and editing a community, and seeing its contact, in the shared
 * overlay over the communities list (#374): where they open from, what the
 * list shows afterwards, the overlay's size, lock, unsaved-changes question
 * and back, where focus goes on close, and a refetch while the edit form is
 * open. What the form sends and what it says about wrong input are
 * CommunityFormDialog's own specs'.
 *
 * Tier 2: the real generated hooks and actions layer run, so the list's
 * refetch after a save, and the community's refetch under an open form, are
 * the real cache's.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

type User = ReturnType<typeof userEvent.setup>;

const CREATE_TITLE = "Crear nueva comunidad";
const EDIT_TITLE = "Editar comunidad";
const CONTACT_TITLE = "Contacto";
const NEW_BUTTON = /Nueva Comunidad/;
const DISCARD_QUESTION = "Tienes cambios sin guardar. Si cierras, se perderán.";
const NOT_CONFIGURED = "Esta comunidad aún no ha configurado su contacto.";

/** What a platform admin holds on every community, without being a member of any. */
const PLATFORM_VIEW: Partial<CommunityCapabilitiesResponse> = {
  canRead: true,
  canUpdate: true,
  canEnable: true,
  canDisable: true,
  canManageAdmins: true,
};

const SOL = buildCommunity({
  id: "c1",
  name: "Sol Común",
  code: "SOL",
  legalId: "G11111111",
  address: "Calle Sol 1",
  capabilities: buildCommunityCapabilities(PLATFORM_VIEW),
});
const VERDE = buildCommunity({
  id: "c2",
  name: "Verde Activa",
  code: "VRD",
  legalId: "G22222222",
  address: "Plaza Verde 2",
  capabilities: buildCommunityCapabilities(PLATFORM_VIEW),
});

const CONTACTS: Record<string, ContactChannelResponse[]> = {
  c1: [buildContactChannel({ type: "EMAIL", label: "Correo de Sol", value: "hola@sol.test" })],
  c2: [
    buildContactChannel({ type: "PHONE", label: "Teléfono de Verde", value: "+34 600 222 333" }),
    buildContactChannel({ type: "ADDRESS", label: "Local de Verde", value: "Plaza Verde 2" }),
  ],
};

const platformAdmin = (canCreateCommunity = true): CurrentUserResponse =>
  buildCurrentUser({
    id: "u-paula",
    isPlatformAdmin: true,
    memberships: {},
    platformCapabilities: buildPlatformCapabilities({ canAdministerPlatform: true, canCreateCommunity }),
  });

const communityUrl = (id: string) => `/api/v1/communities/${id}`;

interface Serve {
  communities?: CommunityResponse[];
  currentUser?: CurrentUserResponse;
  /** Answers a community's own read; by default, its row. */
  community?: (id: string, call: number) => CommunityResponse | undefined;
  /** Answers a community's contact; by default, its channels. */
  contact?: (id: string) => unknown;
  /** Holds the write in flight when it returns a promise that never settles. */
  write?: () => unknown;
}

/** The caller, the list, a community's read and contact, and the two writes, which change the list they answer from. */
function serve({
  communities: initial = [SOL, VERDE],
  currentUser = platformAdmin(),
  community,
  contact,
  write,
}: Serve = {}): RequestRouter {
  let communities = initial;
  const reads: Record<string, number> = {};
  const idOf = (config: RequestConfig) => (config.url ?? "").split("/")[4];
  const router = routeRequests([
    { method: "GET", url: "/api/v1/users/current", respond: () => currentUser },
    { method: "GET", url: "/api/v1/communities", respond: () => communities },
    {
      method: "GET",
      url: /^\/api\/v1\/communities\/[^/]+\/contact$/,
      respond: (config: RequestConfig) => contact?.(idOf(config)) ?? { channels: CONTACTS[idOf(config)] ?? [] },
    },
    {
      method: "GET",
      url: /^\/api\/v1\/communities\/[^/]+$/,
      respond: (config: RequestConfig) => {
        const id = idOf(config);
        reads[id] = (reads[id] ?? 0) + 1;
        return community?.(id, reads[id]) ?? communities.find((c) => c.id === id);
      },
    },
    {
      method: "PUT",
      url: /^\/api\/v1\/communities\/[^/]+$/,
      respond: (config: RequestConfig) => {
        if (write) return write();
        const id = idOf(config);
        const body = config.data as UpdateCommunityBody;
        communities = communities.map((c) => (c.id === id ? { ...c, name: body.name, code: body.code } : c));
        return communities.find((c) => c.id === id);
      },
    },
    {
      method: "POST",
      url: "/api/v1/communities",
      respond: (config: RequestConfig) => {
        if (write) return write();
        const body = config.data as CreateCommunityBody;
        const created = buildCommunity({
          id: "c-new",
          name: body.name,
          code: body.code,
          legalId: null,
          address: null,
          capabilities: buildCommunityCapabilities(PLATFORM_VIEW),
        });
        communities = [...communities, created];
        return created;
      },
    },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  return router;
}

/** The list on the real address bar, arrived at from "/start". */
async function renderPage() {
  window.history.replaceState(null, "", "/start");
  window.history.pushState(null, "", "/communities");
  const rendered = renderWithProviders(
    <Routes>
      <Route path="/start" element={<p>Inicio</p>} />
      <Route path="/communities" element={<CommunitiesPage />} />
    </Routes>,
    { browserHistory: true, token: "a-token" },
  );
  await screen.findAllByText("Sol Común");
  await act(() => overlayHistorySettled());
  return rendered;
}

const requestsTo = (router: RequestRouter, method: string, url: string) =>
  router.requests.filter((r) => (r.method ?? "GET").toUpperCase() === method && r.url === url);

const kebab = (name: string) => screen.getByRole("button", { name: `Más acciones para ${name}` });

async function chooseFromMenu(u: User, name: string, item: string) {
  await u.click(kebab(name));
  await u.click(within(await screen.findByRole("menu")).getByRole("menuitem", { name: item }));
}

async function openCreate(u: User) {
  await u.click(await screen.findByRole("button", { name: NEW_BUTTON }));
  const dialog = await screen.findByRole("dialog", { name: CREATE_TITLE });
  await act(() => overlayHistorySettled());
  return dialog;
}

async function openEdit(u: User, name: string) {
  await chooseFromMenu(u, name, "Editar");
  const dialog = await screen.findByRole("dialog", { name: EDIT_TITLE });
  await within(dialog).findByRole("textbox", { name: /^Nombre/ });
  await act(() => overlayHistorySettled());
  return dialog;
}

async function openContact(u: User, name: string) {
  await chooseFromMenu(u, name, "Ver contacto");
  const dialog = await screen.findByRole("dialog", { name: CONTACT_TITLE });
  await act(() => overlayHistorySettled());
  return dialog;
}

const field = (dialog: HTMLElement, label: string) =>
  within(dialog).getByRole("textbox", { name: new RegExp(`^${label}`) });

/** Pasted, not typed: what matters is that a field changed. */
async function paste(u: User, dialog: HTMLElement, label: string, value: string) {
  await u.click(field(dialog, label));
  await u.paste(value);
}

async function fillCreate(u: User, dialog: HTMLElement) {
  await paste(u, dialog, "Nombre", "Mar Clara");
  await paste(u, dialog, "Código", "MAR");
}

const dialogGone = () =>
  waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());

beforeEach(() => {
  mockCustomInstance.mockReset();
  stubViewport(900);
});

afterEach(async () => {
  // An overlay left open gives its history entry back on unmount: let that
  // back land before the next test reads the history.
  cleanup();
  await act(() => overlayHistorySettled());
  vi.unstubAllGlobals();
});

describe("UI-COM-001 the community forms open over the communities list", () => {
  it("UI-COM-001 Nueva Comunidad opens the create form, empty, and the address stays the list's", async () => {
    const u = userEvent.setup();
    serve();
    await renderPage();

    const dialog = await openCreate(u);

    expect(window.location.pathname).toBe("/communities");
    for (const label of ["Nombre", "Código", "NIF\\/CIF", "Dirección"]) expect(field(dialog, label)).toHaveValue("");
  });

  it("UI-COM-001 Editar on the second row opens the edit form with that community's values, not the first's", async () => {
    const u = userEvent.setup();
    const router = serve();
    await renderPage();

    const dialog = await openEdit(u, "Verde Activa");

    expect(window.location.pathname).toBe("/communities");
    expect(within(dialog).getByText("Verde Activa")).toBeInTheDocument();
    expect(field(dialog, "Nombre")).toHaveValue("Verde Activa");
    expect(field(dialog, "Código")).toHaveValue("VRD");
    expect(field(dialog, "NIF\\/CIF")).toHaveValue("G22222222");
    expect(field(dialog, "Dirección")).toHaveValue("Plaza Verde 2");
    expect(requestsTo(router, "GET", communityUrl("c2"))).toHaveLength(1);
    expect(requestsTo(router, "GET", communityUrl("c1"))).toHaveLength(0);
  });

  it("UI-COM-001 after an edit is saved, the list shows the saved values without a reload", async () => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    const dialog = await openEdit(u, "Verde Activa");

    await u.clear(field(dialog, "Nombre"));
    await paste(u, dialog, "Nombre", "Verde Renovada");
    await u.click(within(dialog).getByRole("button", { name: "Guardar" }));

    await dialogGone();
    expect(await screen.findByText("Verde Renovada")).toBeInTheDocument();
    expect(screen.queryByText("Verde Activa")).not.toBeInTheDocument();
    expect(screen.getByText("Sol Común")).toBeInTheDocument();
  });

  it("UI-COM-001 after a create is saved, the list shows the new community without a reload", async () => {
    const u = userEvent.setup();
    const router = serve();
    await renderPage();
    const dialog = await openCreate(u);

    await fillCreate(u, dialog);
    await u.click(within(dialog).getByRole("button", { name: "Crear comunidad" }));

    await dialogGone();
    expect(await screen.findByText("Mar Clara")).toBeInTheDocument();
    expect(requestsTo(router, "POST", "/api/v1/communities")).toHaveLength(1);
    expect(window.location.pathname).toBe("/communities");
  });

  it("UI-COM-001 offers neither form to a caller without the capabilities", async () => {
    const u = userEvent.setup();
    // The row keeps a menu, for its contact, so its missing Editar is the answer.
    const readable = buildCommunityCapabilities({ canRead: true });
    serve({
      currentUser: platformAdmin(false),
      communities: [
        { ...SOL, capabilities: readable },
        { ...VERDE, capabilities: readable },
      ],
    });
    await renderPage();

    expect(screen.queryByRole("button", { name: NEW_BUTTON })).not.toBeInTheDocument();
    await u.click(kebab("Verde Activa"));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "Ver contacto" })).toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: "Editar" })).not.toBeInTheDocument();
  });
});

const MODES = [
  ["create", (u: User) => openCreate(u), CREATE_TITLE],
  ["edit", (u: User) => openEdit(u, "Verde Activa"), EDIT_TITLE],
] as const;

const OVERLAYS = [...MODES, ["contact", (u: User) => openContact(u, "Verde Activa"), CONTACT_TITLE]] as const;

describe("UI-OVL-001 the community overlays: a sheet below md, a form dialog from md up", () => {
  it.each(OVERLAYS)("UI-OVL-001 renders the %s overlay as a sheet at 899 px and a form dialog at 900 px", async (_, open, title) => {
    stubViewport(899);
    serve();
    await renderPage();
    expect(await open(userEvent.setup())).toHaveClass("MuiDrawer-paperAnchorBottom");
    cleanup();
    await act(() => overlayHistorySettled());

    stubViewport(900);
    serve();
    await renderPage();
    const paper = await open(userEvent.setup());
    expect(paper).toHaveClass("MuiDialog-paper");
    expect(declaredStyles(paper)).toContain("width:560px");
    expect(paper).toHaveAccessibleName(title);
  });
});

describe("UI-OVL-002 a community form holding its save stays open", () => {
  it.each([
    ["create", openCreate, CREATE_TITLE, fillCreate, "Crear comunidad", "Creando..."],
    [
      "edit",
      (u: User) => openEdit(u, "Verde Activa"),
      EDIT_TITLE,
      (u: User, d: HTMLElement) => paste(u, d, "Dirección", ", bajo"),
      "Guardar",
      "Guardando...",
    ],
  ] as const)(
    "UI-OVL-002 UI-COM-003 the %s form stays open on Escape, the backdrop, back and Cancelar while it saves",
    async (_, open, title, change, submit, pending) => {
      const u = userEvent.setup();
      const router = serve({ write: () => new Promise(() => {}) });
      await renderPage();
      const dialog = await open(u);
      await change(u, dialog);
      await u.click(within(dialog).getByRole("button", { name: submit }));
      expect(await within(dialog).findByRole("button", { name: pending })).toBeDisabled();

      fireEvent.keyDown(dialog, { key: "Escape" });
      // Structural: the backdrop has no role or name; it is MUI's own element.
      await u.click(document.querySelector(".MuiBackdrop-root") as HTMLElement);
      await pressBack();
      const cancel = within(dialog).getByRole("button", { name: "Cancelar" });
      expect(cancel).toBeDisabled();
      // A disabled button takes no pointer events, so userEvent refuses it.
      fireEvent.click(cancel);
      // Enter in a field submits the form: a second submit that must send nothing.
      fireEvent.submit(dialog.querySelector("form") ?? (dialog.closest("form") as HTMLElement));

      expect(screen.getByRole("dialog", { name: title })).toBe(dialog);
      // The form has changes: an attempt the lock let through would ask first.
      expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
      for (const textbox of within(dialog).getAllByRole("textbox")) expect(textbox).toHaveAttribute("readonly");
      // A request the second submit sent is recorded a tick later: let it land before counting.
      await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
      const writes = router.requests.filter((r) => ["POST", "PUT"].includes((r.method ?? "").toUpperCase()));
      expect(writes).toHaveLength(1);
      expect(window.location.pathname).toBe("/communities");
    },
  );
});

const CLOSE_ATTEMPTS = [
  ["Cancelar", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Cancelar" }))],
  ["Escape", (_: User, dialog: HTMLElement) => fireEvent.keyDown(dialog, { key: "Escape" })],
  ["back", () => pressBack()],
] as const;

describe("UI-OVL-003 a community form with changes asks before discarding them", () => {
  describe.each(MODES)("the %s form", (_, open, title) => {
    it.each(CLOSE_ATTEMPTS)("UI-OVL-003 with changes, %s asks first and keeps the form", async (_, attempt) => {
      const u = userEvent.setup();
      serve();
      await renderPage();
      const dialog = await open(u);
      await paste(u, dialog, "Dirección", "X");

      await attempt(u, dialog);

      expect(within(dialog).getByRole("alert")).toHaveTextContent(DISCARD_QUESTION);
      expect(screen.getByRole("dialog", { name: title })).toBe(dialog);
      expect(field(dialog, "Dirección")).toHaveValue(title === EDIT_TITLE ? "Plaza Verde 2X" : "X");
    });

    it.each(CLOSE_ATTEMPTS)("UI-OVL-003 without changes, %s closes directly", async (_, attempt) => {
      const u = userEvent.setup();
      serve();
      await renderPage();
      const dialog = await open(u);

      await attempt(u, dialog);

      await dialogGone();
      expect(screen.queryByText(DISCARD_QUESTION)).not.toBeInTheDocument();
    });
  });
});

describe("UI-OVL-004 back closes a community overlay, not the list", () => {
  it.each(OVERLAYS)("UI-OVL-004 back closes a clean %s overlay and the list stays", async (_, open) => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    await open(u);

    await pressBack();

    await dialogGone();
    expect(window.location.pathname).toBe("/communities");
    expect(screen.getByText("Sol Común")).toBeInTheDocument();
    expect(hasOverlayEntry()).toBe(false);
  });

  it.each(MODES)("UI-OVL-004 after Cancelar on the %s form, one back leaves the list, with no dead step", async (_, open) => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    const dialog = await open(u);

    await u.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    await dialogGone();
    await act(() => overlayHistorySettled());
    expect(window.location.pathname).toBe("/communities");
    expect(hasOverlayEntry()).toBe(false);

    await pressBack();
    expect(window.location.pathname).toBe("/start");
    expect(await screen.findByText("Inicio")).toBeInTheDocument();
  });
});

describe("closing a community overlay returns focus to what opened it", () => {
  it.each([
    ["Cancelar", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Cancelar" }))],
    [
      "a create is saved",
      async (u: User, dialog: HTMLElement) => {
        await fillCreate(u, dialog);
        await u.click(within(dialog).getByRole("button", { name: "Crear comunidad" }));
      },
    ],
  ] as const)("UI-COM-001 returns focus to Nueva Comunidad after %s", async (_, close) => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    const dialog = await openCreate(u);

    await close(u, dialog);

    await dialogGone();
    await waitFor(() => expect(screen.getByRole("button", { name: NEW_BUTTON })).toHaveFocus());
  });

  // The menu item that opened the form is gone by then, so focus goes to the
  // row's kebab: the second row's, not the first's.
  it.each([
    ["Cancelar", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Cancelar" }))],
    ["a save", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Guardar" }))],
  ] as const)("UI-COM-001 returns focus to the edited row's actions after %s", async (_, close) => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    const dialog = await openEdit(u, "Verde Activa");

    await close(u, dialog);

    await dialogGone();
    await waitFor(() => expect(kebab("Verde Activa")).toHaveFocus());
    expect(kebab("Sol Común")).not.toHaveFocus();
  });
});

describe("the edit form under a refetch", () => {
  // Answered differently the second time, as if somebody else had saved it meanwhile.
  const CHANGED_ELSEWHERE = { ...VERDE, name: "Cambiada en otra sesión", address: "Avenida Nueva 9" };

  it("UI-COM-001 keeps what is typed, and measures its changes from the values it opened with", async () => {
    const u = userEvent.setup();
    const router = serve({ community: (id, call) => (id === VERDE.id && call > 1 ? CHANGED_ELSEWHERE : undefined) });
    const { queryClient } = await renderPage();
    const dialog = await openEdit(u, "Verde Activa");
    await paste(u, dialog, "Nombre", " (bajo)");

    await act(() => queryClient.invalidateQueries({ queryKey: getGetCommunityByIdQueryKey(VERDE.id) }));
    await waitFor(() => expect(requestsTo(router, "GET", communityUrl(VERDE.id))).toHaveLength(2));

    expect(field(dialog, "Nombre")).toHaveValue("Verde Activa (bajo)");
    expect(field(dialog, "Dirección")).toHaveValue(VERDE.address);

    // Back to the values it opened with: nothing to discard, so it closes at once.
    await u.clear(field(dialog, "Nombre"));
    await paste(u, dialog, "Nombre", "Verde Activa");
    fireEvent.keyDown(dialog, { key: "Escape" });

    await dialogGone();
    expect(screen.queryByText(DISCARD_QUESTION)).not.toBeInTheDocument();
  });
});

describe("UI-CTU-004 a community's contact, from its row", () => {
  it("UI-CTU-004 Ver contacto on the second row shows that community's channels, not the first's, read-only", async () => {
    const u = userEvent.setup();
    const router = serve();
    await renderPage();

    const dialog = await openContact(u, "Verde Activa");

    expect(within(dialog).getByText("Comunidad · Verde Activa")).toBeInTheDocument();
    expect(await within(dialog).findByText("Teléfono de Verde")).toBeInTheDocument();
    expect(within(dialog).getByText("Local de Verde")).toBeInTheDocument();
    expect(within(dialog).queryByText("Correo de Sol")).not.toBeInTheDocument();
    expect(requestsTo(router, "GET", `${communityUrl("c2")}/contact`)).toHaveLength(1);
    expect(requestsTo(router, "GET", `${communityUrl("c1")}/contact`)).toHaveLength(0);
    expect(window.location.pathname).toBe("/communities");
    // Nothing to type and nothing to press but its own close.
    expect(within(dialog).queryAllByRole("textbox")).toEqual([]);
    expect(within(dialog).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Cerrar"]);
  });

  it("UI-CTU-004 says a community with no channels has not configured its contact", async () => {
    const u = userEvent.setup();
    serve({ contact: () => ({ channels: [] }) });
    await renderPage();

    const dialog = await openContact(u, "Verde Activa");

    expect(await within(dialog).findByText(NOT_CONFIGURED)).toBeInTheDocument();
  });

  it("UI-CTU-004 says a failed read failed, and reads it again on Reintentar", async () => {
    const u = userEvent.setup();
    let calls = 0;
    const router = serve({
      contact: () => {
        calls += 1;
        if (calls === 1) throw apiError(500);
        return { channels: CONTACTS.c2 };
      },
    });
    await renderPage();
    const dialog = await openContact(u, "Verde Activa");

    expect(await within(dialog).findByText("No se pudo cargar el contacto de la comunidad.")).toBeInTheDocument();
    await u.click(within(dialog).getByRole("button", { name: "Reintentar" }));

    expect(await within(dialog).findByText("Teléfono de Verde")).toBeInTheDocument();
    expect(requestsTo(router, "GET", `${communityUrl("c2")}/contact`)).toHaveLength(2);
  });

  it("UI-CTU-004 shows the community not-found state for a 404", async () => {
    const u = userEvent.setup();
    serve({
      contact: () => {
        throw apiError(404);
      },
    });
    await renderPage();

    const dialog = await openContact(u, "Verde Activa");

    expect(await within(dialog).findByText("Comunidad no encontrada")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  it.each([
    ["Escape", (dialog: HTMLElement) => fireEvent.keyDown(dialog, { key: "Escape" })],
    ["back", () => pressBack()],
  ] as const)("UI-CTU-004 %s closes it, and focus returns to that row's actions", async (_, close) => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    const dialog = await openContact(u, "Verde Activa");
    await within(dialog).findByText("Teléfono de Verde");

    await close(dialog);

    await dialogGone();
    expect(window.location.pathname).toBe("/communities");
    await waitFor(() => expect(kebab("Verde Activa")).toHaveFocus());
    expect(kebab("Sol Común")).not.toHaveFocus();
  });

  it("UI-CTU-004 is offered only on a row the caller may read", async () => {
    const u = userEvent.setup();
    serve({
      communities: [
        { ...SOL, capabilities: buildCommunityCapabilities({ canRead: true }) },
        { ...VERDE, capabilities: buildCommunityCapabilities({ canUpdate: true }) },
      ],
    });
    await renderPage();

    await u.click(kebab("Sol Común"));
    expect(await screen.findByRole("menuitem", { name: "Ver contacto" })).toBeInTheDocument();
    await u.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());

    await u.click(kebab("Verde Activa"));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "Editar" })).toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: "Ver contacto" })).not.toBeInTheDocument();
  });
});
