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
  buildPlant,
  buildPlantCapabilities,
  buildSupply,
  buildSupplyCapabilities,
  buildSupplyReference,
} from "../../test/fixtures";
import type { CreatePlantBody, PlantResponse, UpdatePlantBody } from "../../api/models";
import { getGetPlantByIdQueryKey } from "../../api/plants/plants";
import { PlantsPage } from "./PlantsPage";

/**
 * Creating and editing a plant in the shared overlay, over the plant list
 * (#373): where the forms open from, what the list shows afterwards, the
 * overlay's size, lock, unsaved-changes question and back, where focus goes
 * on close, and a refetch while the edit form is open. What each form sends
 * and what it says about wrong input are PlantFormDialog's own specs'.
 *
 * Tier 2: the real generated hooks and actions layer run, so the list's
 * refetch after a save, and the plant's refetch under an open form, are the
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
const PLANTS_URL = `${COMMUNITY_URL}/plants`;
const SUPPLIES_URL = `${COMMUNITY_URL}/supplies`;
const plantUrl = (id: string) => `/api/v1/plants/${id}`;

// The community the title names is plantCommunityConfirmations.spec.tsx's subject.
const CREATE_TITLE = /^Crear planta en /;
const EDIT_TITLE = "Editar planta";
const NEW_BUTTON = "Nueva Planta";
const DISCARD_QUESTION = "Tienes cambios sin guardar. Si cierras, se perderán.";

const ADMIN_COMMUNITY = buildCommunity({
  id: COMMUNITY_ID,
  name: COMMUNITY_NAME,
  capabilities: buildCommunityCapabilities({ canRead: true, canListPlants: true, canCreatePlants: true }),
});
const MEMBER_COMMUNITY = buildCommunity({
  id: COMMUNITY_ID,
  name: COMMUNITY_NAME,
  capabilities: buildCommunityCapabilities({ canRead: true, canListPlants: true }),
});

const MANAGEABLE = buildPlantCapabilities({ canRead: true, canManage: true });
const atCommunity = (plant: Partial<PlantResponse> & { id: string }) =>
  buildPlant({
    community: { id: COMMUNITY_ID },
    capabilities: MANAGEABLE,
    description: null,
    connectionDate: null,
    ...plant,
  });

const NORTE = atCommunity({
  id: "plant-1",
  name: "Planta Norte",
  providerCode: "NE=1",
  regulatoryCode: "CAU-1",
  address: "Calle Sol 1",
  totalPower: 63,
  supply: buildSupplyReference({ id: "supply-1", code: "ES0001" }),
});
const SUR = atCommunity({
  id: "plant-2",
  name: "Planta Sur",
  providerCode: "NE=2",
  regulatoryCode: "CAU-2",
  address: "Avenida Mar 2",
  totalPower: 40,
  supply: buildSupplyReference({ id: "supply-2", code: "ES0002" }),
});

const supplyOf = (id: string, code: string, name: string, canCreatePlant: boolean) =>
  buildSupply({
    id,
    code,
    name,
    community: { id: COMMUNITY_ID, name: COMMUNITY_NAME },
    capabilities: buildSupplyCapabilities({ canRead: true, canCreatePlant }),
  });
const SUPPLIES = [
  supplyOf("supply-1", "ES0001", "Casa Norte", false),
  supplyOf("supply-2", "ES0002", "Casa Sur", false),
  supplyOf("supply-3", "ES0003", "Casa Este", true),
];

const page = <T,>(items: T[]) => ({ items, size: 10000, totalElements: items.length, totalPages: 1, number: 0 });

interface Serve {
  community?: typeof ADMIN_COMMUNITY;
  plants?: PlantResponse[];
  /** Answers a plant's own read; by default, its row. */
  plant?: (id: string, call: number) => PlantResponse | undefined;
  /** Holds the write in flight when it returns a promise that never settles. */
  write?: () => unknown;
}

/** The list, the plant reads, the supplies, and the two writes, which change the list they answer from. */
function serve({ community = ADMIN_COMMUNITY, plants: initial = [NORTE, SUR], plant, write }: Serve = {}): RequestRouter {
  let plants = initial;
  const reads: Record<string, number> = {};
  const router = routeRequests([
    { method: "GET", url: COMMUNITY_URL, respond: () => community },
    { method: "GET", url: PLANTS_URL, respond: () => page(plants) },
    { method: "GET", url: SUPPLIES_URL, respond: () => page(SUPPLIES) },
    {
      method: "GET",
      url: /^\/api\/v1\/plants\/[^/]+$/,
      respond: (config: RequestConfig) => {
        const id = (config.url ?? "").split("/").pop() as string;
        reads[id] = (reads[id] ?? 0) + 1;
        return plant?.(id, reads[id]) ?? plants.find((p) => p.id === id);
      },
    },
    {
      method: "PUT",
      url: /^\/api\/v1\/plants\/[^/]+$/,
      respond: (config: RequestConfig) => {
        if (write) return write();
        const id = (config.url ?? "").split("/").pop() as string;
        const body = config.data as UpdatePlantBody;
        plants = plants.map((p) => (p.id === id ? { ...p, name: body.name, address: body.address } : p));
        return plants.find((p) => p.id === id);
      },
    },
    {
      method: "POST",
      url: "/api/v1/plants",
      respond: (config: RequestConfig) => {
        if (write) return write();
        const body = config.data as CreatePlantBody;
        const created = atCommunity({
          id: "plant-new",
          name: body.name,
          providerCode: body.providerCode,
          address: body.address,
          totalPower: body.totalPower,
          supply: buildSupplyReference({ id: "supply-3", code: body.supplyCode }),
        });
        plants = [...plants, created];
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
  window.history.pushState(null, "", "/production");
  const rendered = renderWithProviders(
    <Routes>
      <Route path="/start" element={<p>Inicio</p>} />
      <Route path="/production" element={<PlantsPage />} />
    </Routes>,
    { browserHistory: true, activeCommunityId: COMMUNITY_ID },
  );
  await screen.findAllByText("Planta Norte");
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
  await within(dialog).findByRole("textbox", { name: /^Código de proveedor/ });
  await act(() => overlayHistorySettled());
  return dialog;
}

const field = (dialog: HTMLElement, label: string) => within(dialog).getByLabelText(new RegExp(`^${label}`));

/** Pasted, not typed: what matters is that a field changed. */
async function paste(u: User, dialog: HTMLElement, label: string, value: string) {
  await u.click(field(dialog, label));
  await u.paste(value);
}

async function fillCreate(u: User, dialog: HTMLElement) {
  await paste(u, dialog, "Código de proveedor", "NE=9");
  await paste(u, dialog, "Nombre", "Planta Este");
  await u.click(within(dialog).getByRole("combobox", { name: /^Punto de suministro/ }));
  await u.click(await screen.findByRole("option", { name: "Casa Este (ES0003)" }));
  await paste(u, dialog, "Dirección", "Camino Viejo 7");
  await paste(u, dialog, "Potencia total", "25");
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

describe("UI-PLS-004 the plant forms open over the plant list", () => {
  it("UI-PLS-004 Nueva Planta opens the create form, and the address stays the list's", async () => {
    const u = userEvent.setup();
    serve();
    await renderPage();

    const dialog = await openCreate(u);

    expect(window.location.pathname).toBe("/production");
    expect(field(dialog, "Código de proveedor")).toHaveValue("");
    expect(field(dialog, "Nombre")).toHaveValue("");
    // The list is still there, under the overlay.
    expect(screen.getAllByText("Planta Norte").length).toBeGreaterThan(0);
  });

  it("UI-PLS-004 the empty list's Crear Planta opens the create form", async () => {
    const u = userEvent.setup();
    serve({ plants: [] });
    window.history.replaceState(null, "", "/production");
    renderWithProviders(<PlantsPage />, { browserHistory: true, activeCommunityId: COMMUNITY_ID });

    await u.click(await screen.findByRole("button", { name: "Crear Planta" }));

    expect(await screen.findByRole("dialog", { name: CREATE_TITLE })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/production");
  });

  it("UI-PLS-004 Editar on a row opens the edit form with that plant's values, not another row's", async () => {
    const u = userEvent.setup();
    const router = serve();
    await renderPage();

    const dialog = await openEdit(u, "Planta Sur");

    expect(window.location.pathname).toBe("/production");
    expect(field(dialog, "Código de proveedor")).toHaveValue("NE=2");
    expect(field(dialog, "CAU")).toHaveValue("CAU-2");
    expect(field(dialog, "Nombre")).toHaveValue("Planta Sur");
    expect(field(dialog, "Dirección")).toHaveValue("Avenida Mar 2");
    expect(field(dialog, "Potencia total")).toHaveValue(40);
    expect(within(dialog).getByRole("combobox", { name: /^Punto de suministro/ })).toHaveValue("Casa Sur (ES0002)");
    expect(requestsTo(router, "GET", plantUrl(SUR.id))).toHaveLength(1);
    expect(requestsTo(router, "GET", plantUrl(NORTE.id))).toHaveLength(0);
  });

  it("UI-PLS-004 after an edit is saved, the list shows the saved values without a reload", async () => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    const dialog = await openEdit(u, "Planta Sur");

    await u.clear(field(dialog, "Nombre"));
    await paste(u, dialog, "Nombre", "Planta Sur renovada");
    await u.click(within(dialog).getByRole("button", { name: "Guardar" }));

    await dialogGone();
    expect(await screen.findByText("Planta Sur renovada")).toBeInTheDocument();
    expect(screen.queryByText("Planta Sur")).not.toBeInTheDocument();
    expect(screen.getByText("Planta Norte")).toBeInTheDocument();
  });

  it("UI-PLS-004 after a create is saved, the list shows the new plant without a reload", async () => {
    const u = userEvent.setup();
    const router = serve();
    await renderPage();
    const dialog = await openCreate(u);

    await fillCreate(u, dialog);
    await u.click(within(dialog).getByRole("button", { name: "Crear planta" }));

    await dialogGone();
    expect(await screen.findByText("Planta Este")).toBeInTheDocument();
    expect(requestsTo(router, "POST", "/api/v1/plants")).toHaveLength(1);
    expect(window.location.pathname).toBe("/production");
  });

  it("UI-PLS-004 offers neither form to a caller without the capabilities", async () => {
    const u = userEvent.setup();
    // A row menu is still offered, for its sharing agreements, so its missing Editar is the answer.
    const listable = buildPlantCapabilities({ canRead: true, canListSharingAgreements: true });
    serve({
      community: MEMBER_COMMUNITY,
      plants: [{ ...NORTE, capabilities: listable }, { ...SUR, capabilities: listable }],
    });
    await renderPage();

    expect(screen.queryByRole("button", { name: NEW_BUTTON })).not.toBeInTheDocument();
    await u.click(kebab("Planta Sur"));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "Acuerdos de reparto" })).toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("UI-PLS-004 the empty list offers no Crear Planta to a caller who may not create plants", async () => {
    serve({ community: MEMBER_COMMUNITY, plants: [] });
    window.history.replaceState(null, "", "/production");
    renderWithProviders(<PlantsPage />, { browserHistory: true, activeCommunityId: COMMUNITY_ID });

    expect(await screen.findByText("Todavía no hay ninguna planta de producción en esta comunidad.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Crear Planta" })).not.toBeInTheDocument();
  });
});

const MODES = [
  ["create", (u: User) => openCreate(u), CREATE_TITLE],
  ["edit", (u: User) => openEdit(u, "Planta Sur"), EDIT_TITLE],
] as const;

describe("UI-OVL-001 the plant forms: a sheet below md, a form dialog from md up", () => {
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
});

describe("UI-OVL-002 a plant form holding its save stays open", () => {
  it.each([
    ["create", openCreate, CREATE_TITLE, fillCreate, "Crear planta", "Creando..."],
    [
      "edit",
      (u: User) => openEdit(u, "Planta Sur"),
      EDIT_TITLE,
      (u: User, d: HTMLElement) => paste(u, d, "Dirección", ", bajo"),
      "Guardar",
      "Guardando...",
    ],
  ] as const)(
    "UI-OVL-002 UI-PLS-006 the %s form stays open on Escape, the backdrop, back and Cancelar while it saves",
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
      expect(within(dialog).getByRole("spinbutton", { name: /^Potencia total/ })).toHaveAttribute("readonly");
      // A request the second submit sent is recorded a tick later: let it land before counting.
      await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
      const writes = router.requests.filter((r) => ["POST", "PUT"].includes((r.method ?? "").toUpperCase()));
      expect(writes).toHaveLength(1);
      expect(window.location.pathname).toBe("/production");
    },
  );
});

const CLOSE_ATTEMPTS = [
  ["Cancelar", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Cancelar" }))],
  ["Escape", (_: User, dialog: HTMLElement) => fireEvent.keyDown(dialog, { key: "Escape" })],
  ["back", () => pressBack()],
] as const;

describe("UI-OVL-003 a plant form with changes asks before discarding them", () => {
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
      expect(field(dialog, "Dirección")).toHaveValue(title === EDIT_TITLE ? `${SUR.address}X` : "X");
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

describe("UI-OVL-004 back closes a plant form, not the list", () => {
  it.each(MODES)("UI-OVL-004 back closes a clean %s form and the list stays", async (_, open) => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    await open(u);

    await pressBack();

    await dialogGone();
    expect(window.location.pathname).toBe("/production");
    expect(screen.getByText("Planta Norte")).toBeInTheDocument();
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
    expect(window.location.pathname).toBe("/production");
    expect(hasOverlayEntry()).toBe(false);

    await pressBack();
    expect(window.location.pathname).toBe("/start");
    expect(await screen.findByText("Inicio")).toBeInTheDocument();
  });
});

describe("closing a plant form returns focus to what opened it", () => {
  it("UI-PLS-004 returns focus to Nueva Planta after Cancelar", async () => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    const dialog = await openCreate(u);

    await u.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await dialogGone();
    await waitFor(() => expect(screen.getByRole("button", { name: NEW_BUTTON })).toHaveFocus());
  });

  it("UI-PLS-004 returns focus to Nueva Planta after a create is saved", async () => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    const dialog = await openCreate(u);
    await fillCreate(u, dialog);

    await u.click(within(dialog).getByRole("button", { name: "Crear planta" }));

    await dialogGone();
    await waitFor(() => expect(screen.getByRole("button", { name: NEW_BUTTON })).toHaveFocus());
  });

  // The menu item that opened the form is gone by then, so focus goes to the
  // row's kebab: the second row's, not the first's.
  it.each([
    ["Cancelar", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Cancelar" }))],
    ["a save", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Guardar" }))],
  ] as const)("UI-PLS-004 returns focus to the edited row's actions after %s", async (_, close) => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    const dialog = await openEdit(u, "Planta Sur");

    await close(u, dialog);

    await dialogGone();
    await waitFor(() => expect(kebab("Planta Sur")).toHaveFocus());
    expect(kebab("Planta Norte")).not.toHaveFocus();
  });
});

describe("the edit form under a refetch", () => {
  // Answered differently the second time, as if somebody else had saved it meanwhile.
  const CHANGED_ELSEWHERE = { ...SUR, name: "Cambiada en otra sesión", address: "Avenida Nueva 9" };

  it("UI-PLS-004 keeps what is typed, and measures its changes from the values it opened with", async () => {
    const u = userEvent.setup();
    const router = serve({ plant: (id, call) => (id === SUR.id && call > 1 ? CHANGED_ELSEWHERE : undefined) });
    const { queryClient } = await renderPage();
    const dialog = await openEdit(u, "Planta Sur");
    await paste(u, dialog, "Nombre", " (bajo)");

    await act(() => queryClient.invalidateQueries({ queryKey: getGetPlantByIdQueryKey(SUR.id) }));
    await waitFor(() => expect(requestsTo(router, "GET", plantUrl(SUR.id))).toHaveLength(2));

    expect(field(dialog, "Nombre")).toHaveValue("Planta Sur (bajo)");
    expect(field(dialog, "Dirección")).toHaveValue(SUR.address);

    // Back to the values it opened with: nothing to discard, so it closes at once.
    await u.clear(field(dialog, "Nombre"));
    await paste(u, dialog, "Nombre", "Planta Sur");
    fireEvent.keyDown(dialog, { key: "Escape" });

    await dialogGone();
    expect(screen.queryByText(DISCARD_QUESTION)).not.toBeInTheDocument();
  });
});
