import "@testing-library/jest-dom";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig, type RequestRouter } from "../../test/requestRouter";
import { declaredStyles, hasOverlayEntry, pressBack, stubViewport } from "../../test/overlay";
import { overlayHistorySettled } from "../../components/ResponsiveOverlay/overlayHistory";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildMemberRecord,
  buildMembership,
  buildSupply,
  buildSupplyCapabilities,
} from "../../test/fixtures";
import type { CreateSupplyBody, SupplyResponse, UpdateSupplyBody } from "../../api/models";
import { getGetSupplyQueryKey } from "../../api/supplies/supplies";
import { SupplyPointsPage } from "./SupplyPointsPage";

/**
 * Creating and editing a supply in the shared overlay, over the supply list
 * (#372): where the forms open from, what the list shows afterwards, the
 * overlay's size, lock, unsaved-changes question and back, where focus goes
 * on close, and a refetch while the edit form is open. What each form sends
 * and where a refusal lands are SupplyFormDialog's own specs'.
 *
 * Tier 2: the real generated hooks and actions layer run, so the list's
 * refetch after a save, and the supply's refetch under an open form, are the
 * real cache's.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

type User = ReturnType<typeof userEvent.setup>;

const COMMUNITY_ID = "community-1";
const COMMUNITY_NAME = "Comunidad Solar";
const COMMUNITY_URL = `/api/v1/communities/${COMMUNITY_ID}`;
const SUPPLIES_URL = `${COMMUNITY_URL}/supplies`;
const MEMBERSHIPS_URL = `${COMMUNITY_URL}/memberships`;
const supplyUrl = (id: string) => `/api/v1/supplies/${id}`;

// The community the title names is supplyCommunityConfirmations.spec.tsx's subject.
const CREATE_TITLE = /^Crear punto de suministro en /;
const EDIT_TITLE = "Editar punto de suministro";
const NEW_BUTTON = "Nuevo Punto de Suministro";
const DISCARD_QUESTION = "Tienes cambios sin guardar. Si cierras, se perderán.";

const ADMIN_COMMUNITY = buildCommunity({
  id: COMMUNITY_ID,
  name: COMMUNITY_NAME,
  capabilities: buildCommunityCapabilities({ canRead: true, canManage: true, canManageMemberships: true }),
});
const MEMBER_COMMUNITY = buildCommunity({
  id: COMMUNITY_ID,
  name: COMMUNITY_NAME,
  capabilities: buildCommunityCapabilities({ canRead: true }),
});

const EDITABLE = buildSupplyCapabilities({ canRead: true, canEdit: true });
const atCommunity = (supply: Partial<SupplyResponse> & { id: string }) =>
  buildSupply({
    enabled: true,
    user: { id: "owner-1" },
    ownerRecord: buildMemberRecord({ fullName: "Lucía Martínez Soler" }),
    community: { id: COMMUNITY_ID, name: COMMUNITY_NAME },
    capabilities: EDITABLE,
    ...supply,
  });

const CASA = atCommunity({
  id: "supply-1",
  code: "ES0031406912345678JN0F",
  name: "Casa de Lucía",
  address: "Calle Mayor 1",
  addressRef: "REF-1",
});
const LOCAL = atCommunity({
  id: "supply-2",
  code: "ES0031406987654321QW1A",
  name: "Local de la asociación",
  address: "Plaza del Pueblo 3",
  addressRef: "REF-2",
  ownerRecord: buildMemberRecord({ fullName: "Jorge Sanz" }),
});

const ANA = buildMembership({ id: "m-ana", communityId: COMMUNITY_ID, fullName: "Ana García", personalId: "12345678Z" });
const JORGE = buildMembership({ id: "m-jorge", communityId: COMMUNITY_ID, fullName: "Jorge Sanz", personalId: "33333333P" });

const page = (items: SupplyResponse[]) => ({ items, size: 10000, totalElements: items.length, totalPages: 1, number: 0 });

interface Serve {
  community?: typeof ADMIN_COMMUNITY;
  supplies?: SupplyResponse[];
  /** Answers a supply's own read; by default, its row. */
  supply?: (id: string, call: number) => SupplyResponse | undefined;
  /** Holds the write in flight when it returns a promise that never settles. */
  write?: () => unknown;
}

/** The list, the supply reads, the members, and the two writes, which change the list they answer from. */
function serve({ community = ADMIN_COMMUNITY, supplies: initial = [CASA, LOCAL], supply, write }: Serve = {}): RequestRouter {
  let supplies = initial;
  const reads: Record<string, number> = {};
  const router = routeRequests([
    { method: "GET", url: COMMUNITY_URL, respond: () => community },
    { method: "GET", url: SUPPLIES_URL, respond: () => page(supplies) },
    { method: "GET", url: MEMBERSHIPS_URL, respond: () => [ANA, JORGE] },
    {
      method: "GET",
      url: /^\/api\/v1\/supplies\/[^/]+$/,
      respond: (config: RequestConfig) => {
        const id = (config.url ?? "").split("/").pop() as string;
        reads[id] = (reads[id] ?? 0) + 1;
        return supply?.(id, reads[id]) ?? supplies.find((s) => s.id === id);
      },
    },
    {
      method: "PUT",
      url: /^\/api\/v1\/supplies\/[^/]+$/,
      respond: (config: RequestConfig) => {
        if (write) return write();
        const id = (config.url ?? "").split("/").pop() as string;
        const body = config.data as UpdateSupplyBody;
        supplies = supplies.map((s) => (s.id === id ? { ...s, name: body.name ?? null, code: body.code, address: body.address } : s));
        return supplies.find((s) => s.id === id);
      },
    },
    {
      method: "POST",
      url: "/api/v1/supplies",
      respond: (config: RequestConfig) => {
        if (write) return write();
        const body = config.data as CreateSupplyBody;
        const created = atCommunity({ id: "supply-new", name: body.name ?? null, code: body.code, address: body.address });
        supplies = [...supplies, created];
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
  window.history.pushState(null, "", "/supply-points");
  const rendered = renderWithProviders(
    <Routes>
      <Route path="/start" element={<p>Inicio</p>} />
      <Route path="/supply-points" element={<SupplyPointsPage />} />
    </Routes>,
    { browserHistory: true, activeCommunityId: COMMUNITY_ID },
  );
  await screen.findAllByText("Casa de Lucía");
  await act(() => overlayHistorySettled());
  return rendered;
}

const requestsTo = (router: RequestRouter, method: string, url: string) =>
  router.requests.filter((r) => (r.method ?? "GET").toUpperCase() === method && r.url === url);

const kebab = (label: string) => screen.getByRole("button", { name: `Más acciones para ${label}` });

async function openCreate(u: User) {
  await u.click(screen.getByRole("button", { name: NEW_BUTTON }));
  const dialog = await screen.findByRole("dialog", { name: CREATE_TITLE });
  await act(() => overlayHistorySettled());
  return dialog;
}

async function openEdit(u: User, label: string) {
  await u.click(kebab(label));
  await u.click(within(await screen.findByRole("menu")).getByRole("menuitem", { name: "Editar" }));
  const dialog = await screen.findByRole("dialog", { name: EDIT_TITLE });
  await within(dialog).findByRole("textbox", { name: /^CUPS/ });
  await act(() => overlayHistorySettled());
  return dialog;
}

const field = (dialog: HTMLElement, label: string) => within(dialog).getByRole("textbox", { name: new RegExp(`^${label}`) });

/** Pasted, not typed: what matters is that a field changed. */
async function paste(u: User, dialog: HTMLElement, label: string, value: string) {
  await u.click(field(dialog, label));
  await u.paste(value);
}

async function chooseOwner(u: User, dialog: HTMLElement, option: string) {
  await u.click(within(dialog).getByRole("combobox", { name: /^Propietario/ }));
  await u.click(await screen.findByRole("option", { name: option }));
}

async function fillCreate(u: User, dialog: HTMLElement) {
  await paste(u, dialog, "Nombre", "Huerto solar");
  await chooseOwner(u, dialog, "Ana García (12345678Z)");
  await paste(u, dialog, "CUPS", "ES0031300119158001DL0F");
  await paste(u, dialog, "Dirección", "Camino Viejo 7");
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

describe("UI-SUP-019 the supply forms open over the supply list", () => {
  it("UI-SUP-019 Nuevo Punto de Suministro opens the create form, and the address stays the list's", async () => {
    const u = userEvent.setup();
    serve();
    await renderPage();

    const dialog = await openCreate(u);

    expect(window.location.pathname).toBe("/supply-points");
    expect(field(dialog, "Nombre")).toHaveValue("");
    expect(field(dialog, "CUPS")).toHaveValue("");
    // The list is still there, under the overlay.
    expect(screen.getAllByText("Casa de Lucía").length).toBeGreaterThan(0);
  });

  it("UI-SUP-019 the empty list's Crear Punto de Suministro opens the create form", async () => {
    const u = userEvent.setup();
    serve({ supplies: [] });
    window.history.replaceState(null, "", "/supply-points");
    renderWithProviders(<SupplyPointsPage />, { browserHistory: true, activeCommunityId: COMMUNITY_ID });

    await u.click(await screen.findByRole("button", { name: "Crear Punto de Suministro" }));

    expect(await screen.findByRole("dialog", { name: CREATE_TITLE })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/supply-points");
  });

  it("UI-SUP-019 Editar on a row opens the edit form with that supply's values, not another row's", async () => {
    const u = userEvent.setup();
    const router = serve();
    await renderPage();

    const dialog = await openEdit(u, "Local de la asociación");

    expect(window.location.pathname).toBe("/supply-points");
    expect(field(dialog, "Nombre")).toHaveValue("Local de la asociación");
    expect(field(dialog, "CUPS")).toHaveValue(LOCAL.code);
    expect(field(dialog, "Dirección")).toHaveValue(LOCAL.address);
    expect(field(dialog, "Referencia catastral")).toHaveValue("REF-2");
    expect(within(dialog).getByRole("textbox", { name: "Propietario" })).toHaveValue("Jorge Sanz");
    expect(requestsTo(router, "GET", supplyUrl(LOCAL.id))).toHaveLength(1);
    expect(requestsTo(router, "GET", supplyUrl(CASA.id))).toHaveLength(0);
  });

  it("UI-SUP-019 after an edit is saved, the list shows the saved values without a reload", async () => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    const dialog = await openEdit(u, "Local de la asociación");

    await u.clear(field(dialog, "Nombre"));
    await paste(u, dialog, "Nombre", "Local renovado");
    await u.click(within(dialog).getByRole("button", { name: "Guardar" }));

    await dialogGone();
    expect(await screen.findByText("Local renovado")).toBeInTheDocument();
    expect(screen.queryByText("Local de la asociación")).not.toBeInTheDocument();
    expect(screen.getByText("Casa de Lucía")).toBeInTheDocument();
  });

  it("UI-SUP-019 after a create is saved, the list shows the new supply without a reload", async () => {
    const u = userEvent.setup();
    const router = serve();
    await renderPage();
    const dialog = await openCreate(u);

    await fillCreate(u, dialog);
    await u.click(within(dialog).getByRole("button", { name: "Crear punto de suministro" }));

    await dialogGone();
    expect(await screen.findByText("Huerto solar")).toBeInTheDocument();
    expect(requestsTo(router, "POST", "/api/v1/supplies")).toHaveLength(1);
    expect(window.location.pathname).toBe("/supply-points");
  });

  it("UI-SUP-019 offers neither form to a caller without the capabilities", async () => {
    const u = userEvent.setup();
    // A row menu is still offered, for deleting, so its missing Editar is the answer.
    const removable = buildSupplyCapabilities({ canRead: true, canDelete: true });
    serve({
      community: MEMBER_COMMUNITY,
      supplies: [{ ...CASA, capabilities: removable }, { ...LOCAL, capabilities: removable }],
    });
    await renderPage();

    expect(screen.queryByRole("button", { name: NEW_BUTTON })).not.toBeInTheDocument();
    await u.click(kebab("Local de la asociación"));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "Eliminar punto de suministro" })).toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: "Editar" })).not.toBeInTheDocument();
  });
});

const MODES = [
  ["create", (u: User) => openCreate(u), CREATE_TITLE],
  ["edit", (u: User) => openEdit(u, "Local de la asociación"), EDIT_TITLE],
] as const;

describe("UI-OVL-001 the supply forms: a sheet below md, a form dialog from md up", () => {
  it.each(MODES)("UI-OVL-001 renders the %s form as a sheet at 899 px and a form dialog at 900 px", async (_, open, title) => {
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

  it("UI-SUP-016 the owner picker opens and chooses inside the sheet at 390 px", async () => {
    stubViewport(390);
    const u = userEvent.setup();
    serve();
    await renderPage();
    const sheet = await openCreate(u);
    expect(sheet).toHaveClass("MuiDrawer-paperAnchorBottom");

    await chooseOwner(u, sheet, "Jorge Sanz (33333333P)");

    expect(within(sheet).getByRole("combobox", { name: /^Propietario/ })).toHaveValue("Jorge Sanz (33333333P)");
    expect(screen.getByRole("dialog", { name: CREATE_TITLE })).toBe(sheet);
  });
});

describe("UI-OVL-002 a supply form holding its save stays open", () => {
  it.each([
    ["create", openCreate, CREATE_TITLE, fillCreate, "Crear punto de suministro", "Creando..."],
    [
      "edit",
      (u: User) => openEdit(u, "Local de la asociación"),
      EDIT_TITLE,
      (u: User, d: HTMLElement) => paste(u, d, "Dirección", ", bajo"),
      "Guardar",
      "Guardando...",
    ],
  ] as const)(
    "UI-OVL-002 UI-SUP-021 the %s form stays open on Escape, the backdrop, back and Cancelar while it saves",
    async (_, open, title, change, submit, pending) => {
      const u = userEvent.setup();
      serve({ write: () => new Promise(() => {}) });
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

      expect(screen.getByRole("dialog", { name: title })).toBe(dialog);
      // The form has changes: an attempt the lock let through would ask first.
      expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
      for (const textbox of within(dialog).getAllByRole("textbox")) expect(textbox).toHaveAttribute("readonly");
      expect(window.location.pathname).toBe("/supply-points");
    },
  );
});

const CLOSE_ATTEMPTS = [
  ["Cancelar", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Cancelar" }))],
  ["Escape", (_: User, dialog: HTMLElement) => fireEvent.keyDown(dialog, { key: "Escape" })],
  ["back", () => pressBack()],
] as const;

describe("UI-OVL-003 a supply form with changes asks before discarding them", () => {
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
      expect(field(dialog, "Dirección")).toHaveValue(title === EDIT_TITLE ? `${LOCAL.address}X` : "X");
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

describe("UI-OVL-004 back closes a supply form, not the list", () => {
  it.each(MODES)("UI-OVL-004 back closes a clean %s form and the list stays", async (_, open) => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    await open(u);

    await pressBack();

    await dialogGone();
    expect(window.location.pathname).toBe("/supply-points");
    expect(screen.getByText("Casa de Lucía")).toBeInTheDocument();
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
    expect(window.location.pathname).toBe("/supply-points");
    expect(hasOverlayEntry()).toBe(false);

    await pressBack();
    expect(window.location.pathname).toBe("/start");
    expect(await screen.findByText("Inicio")).toBeInTheDocument();
  });
});

describe("closing a supply form returns focus to what opened it", () => {
  it("UI-SUP-019 returns focus to Nuevo Punto de Suministro after Cancelar", async () => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    const dialog = await openCreate(u);

    await u.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await dialogGone();
    await waitFor(() => expect(screen.getByRole("button", { name: NEW_BUTTON })).toHaveFocus());
  });

  it("UI-SUP-019 returns focus to Nuevo Punto de Suministro after a create is saved", async () => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    const dialog = await openCreate(u);
    await fillCreate(u, dialog);

    await u.click(within(dialog).getByRole("button", { name: "Crear punto de suministro" }));

    await dialogGone();
    await waitFor(() => expect(screen.getByRole("button", { name: NEW_BUTTON })).toHaveFocus());
  });

  // The menu item that opened the form is gone by then, so focus goes to the
  // row's kebab: the second row's, not the first's.
  it.each([
    ["Cancelar", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Cancelar" }))],
    ["a save", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Guardar" }))],
  ] as const)("UI-SUP-019 returns focus to the edited row's actions after %s", async (_, close) => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    const dialog = await openEdit(u, "Local de la asociación");

    await close(u, dialog);

    await dialogGone();
    await waitFor(() => expect(kebab("Local de la asociación")).toHaveFocus());
    expect(kebab("Casa de Lucía")).not.toHaveFocus();
  });
});

describe("the edit form under a refetch", () => {
  // Answered differently the second time, as if somebody else had saved it meanwhile.
  const CHANGED_ELSEWHERE = { ...LOCAL, name: "Cambiado en otra sesión", address: "Avenida Nueva 9" };

  it("UI-SUP-019 keeps what is typed, and measures its changes from the values it opened with", async () => {
    const u = userEvent.setup();
    const router = serve({ supply: (id, call) => (id === LOCAL.id && call > 1 ? CHANGED_ELSEWHERE : undefined) });
    const { queryClient } = await renderPage();
    const dialog = await openEdit(u, "Local de la asociación");
    await paste(u, dialog, "Nombre", " (bajo)");

    await act(() => queryClient.invalidateQueries({ queryKey: getGetSupplyQueryKey(LOCAL.id) }));
    await waitFor(() => expect(requestsTo(router, "GET", supplyUrl(LOCAL.id))).toHaveLength(2));

    expect(field(dialog, "Nombre")).toHaveValue("Local de la asociación (bajo)");
    expect(field(dialog, "Dirección")).toHaveValue(LOCAL.address);

    // Back to the values it opened with: nothing to discard, so it closes at once.
    await u.clear(field(dialog, "Nombre"));
    await paste(u, dialog, "Nombre", "Local de la asociación");
    fireEvent.keyDown(dialog, { key: "Escape" });

    await dialogGone();
    expect(screen.queryByText(DISCARD_QUESTION)).not.toBeInTheDocument();
  });
});
