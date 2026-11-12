import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildCommunity, buildCommunityCapabilities, buildPlant, buildPlantCapabilities } from "../../test/fixtures";
import type { PlantCapabilitiesResponse, PlantResponse } from "../../api/models";

// The rows of the plant list (#349), in both layouts. Only the reads are
// replaced; the actions layer runs for real, so the menus follow the
// capabilities on the payload.
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllPlants: vi.fn(),
}));
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));

import { getAllPlants, useGetAllPlants } from "../../api/plants/plants";
import { getCommunityById, useGetCommunityById } from "../../api/communities/communities";
import { PlantsPage } from "./PlantsPage";

const COMMUNITY_ID = "community-a";
const LIST_NAME = "Plantas";
const PAGES_NAME = "Páginas de plantas";
const SEARCH_NAME = "Buscar por nombre, CAU o dirección";

type Layout = "narrow" | "wide";
const LAYOUTS: Layout[] = ["narrow", "wide"];
const WIDTH: Record<Layout, number> = { narrow: 380, wide: 1024 };
const setViewport = (width: number) =>
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });

const plant = (overrides: Partial<PlantResponse> & { id: string }, capabilities: Partial<PlantCapabilitiesResponse> = {}) =>
  buildPlant({
    name: `Planta ${overrides.id}`,
    providerCode: `NE=${overrides.id}`,
    regulatoryCode: null,
    address: `Calle ${overrides.id}`,
    description: null,
    connectionDate: null,
    peakPowerKWp: 100,
    nominalPowerKW: 80,
    community: { id: COMMUNITY_ID },
    ...overrides,
    capabilities: buildPlantCapabilities({ canRead: true, ...capabilities }),
  });

/** `count` plain plants, named so their order and their pages can be told apart. */
const many = (count: number, capabilities: (index: number) => Partial<PlantCapabilitiesResponse> = () => ({})) =>
  Array.from({ length: count }, (_, index) =>
    plant({ id: `p-${String(index + 1).padStart(2, "0")}`, name: `Planta ${index + 1}` }, capabilities(index)),
  );

function setup({ plants, layout = "wide" }: { plants: PlantResponse[]; layout?: Layout }) {
  setViewport(WIDTH[layout]);
  vi.mocked(useGetCommunityById).mockReturnValue(
    query.success<typeof getCommunityById>(
      buildCommunity({
        id: COMMUNITY_ID,
        name: "Sol Común",
        capabilities: buildCommunityCapabilities({ canRead: true, canListPlants: true }),
      }),
    ),
  );
  vi.mocked(useGetAllPlants).mockReturnValue(
    query.success<typeof getAllPlants>({ items: plants, size: 10000, totalElements: plants.length, totalPages: 1, number: 0 }),
  );
  return renderWithProviders(<PlantsPage />, { activeCommunityId: COMMUNITY_ID, route: "/plants" });
}

/** The rows the layout on screen shows: list items below 1024px, body rows of the table from it. */
function rows(layout: Layout): HTMLElement[] {
  return layout === "narrow"
    ? within(screen.getByRole("list", { name: LIST_NAME })).getAllByRole("listitem")
    : within(screen.getByRole("table")).getAllByRole("row").slice(1);
}

/** The row whose title links as `name`. */
function rowOf(layout: Layout, name: string): HTMLElement {
  const row = rows(layout).find((candidate) => within(candidate).queryByRole("link", { name }));
  if (!row) throw new Error(`No row titled ${name}`);
  return row;
}

const originalWidth = window.innerWidth;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => setViewport(originalWidth));

const COMPLETE = plant({
  id: "north",
  name: "Planta Norte",
  providerCode: "NE=33685734",
  regulatoryCode: "ES0031300806333002ET1F",
  address: "Polígono Norte, Nave 3",
  description: "Cubierta del polideportivo",
  peakPowerKWp: 100,
  nominalPowerKW: 80,
  connectionDate: "2023-05-10",
});
const IN_SETUP = plant({
  id: "south",
  name: "Planta Sur",
  providerCode: "NE=99887766",
  regulatoryCode: null,
  address: "Calle del Sol 7",
  description: "Pendiente de legalizar",
  peakPowerKWp: 62.25,
  nominalPowerKW: 50.5,
  connectionDate: null,
});

describe.each(LAYOUTS)("the plant rows, %s", (layout) => {
  it("UI-PLS-001 shows the name, the CAU, the peak and nominal power with the inverter, the connection date and the address", () => {
    setup({ plants: [COMPLETE, IN_SETUP], layout });

    const row = rowOf(layout, "Planta Norte");
    expect(within(row).getByRole("link", { name: "Planta Norte" })).toHaveAttribute("href", "/plants/north");
    expect(row).toHaveTextContent(layout === "narrow" ? "CAU ES0031300806333002ET1F" : "ES0031300806333002ET1F");
    expect(row).toHaveTextContent(/100 kWp( · )?80 kW/);
    expect(row).toHaveTextContent("Inversor Huawei");
    expect(row).toHaveTextContent(layout === "narrow" ? "Conectada el 10 may 2023" : "10 may 2023");
    expect(row).toHaveTextContent("Polígono Norte, Nave 3");
  });

  it("UI-PLS-001 names the inverter provider, not its code", () => {
    setup({ plants: [COMPLETE, IN_SETUP], layout });

    for (const name of ["Planta Norte", "Planta Sur"]) {
      expect(rowOf(layout, name)).toHaveTextContent("Inversor Huawei");
    }
    expect(screen.queryByText(/HUAWEI/)).not.toBeInTheDocument();
  });

  it("UI-PLS-001 shows «Sin CAU» and «Sin fecha de conexión» for a plant still being set up", () => {
    setup({ plants: [COMPLETE, IN_SETUP], layout });

    const row = rowOf(layout, "Planta Sur");
    expect(within(row).getByText("Sin CAU")).toBeInTheDocument();
    expect(within(row).getByText("Sin fecha de conexión")).toBeInTheDocument();
    expect(within(rowOf(layout, "Planta Norte")).queryByText(/^Sin /)).not.toBeInTheDocument();
  });

  it("UI-PLS-001 formats the peak power in kWp and the nominal power in kW, with a decimal comma", () => {
    setup({ plants: [COMPLETE, IN_SETUP], layout });

    expect(rowOf(layout, "Planta Norte")).toHaveTextContent(/(^|\D)100 kWp/);
    expect(rowOf(layout, "Planta Norte")).toHaveTextContent(/(^|\D)80 kW(?!p)/);
    expect(rowOf(layout, "Planta Sur")).toHaveTextContent("62,25 kWp");
    expect(rowOf(layout, "Planta Sur")).toHaveTextContent(/(^|\D)50,5 kW(?!p)/);
  });

  it("UI-PLS-001 shows neither the provider's station code nor the description on any row", () => {
    setup({ plants: [COMPLETE, IN_SETUP], layout });

    expect(rows(layout)).toHaveLength(2);
    for (const hidden of ["NE=33685734", "NE=99887766", "Cubierta del polideportivo", "Pendiente de legalizar"]) {
      expect(screen.queryByText(hidden, { exact: false })).not.toBeInTheDocument();
    }
  });
});

describe("the plants search", () => {
  const NORTH = plant({
    id: "north",
    name: "Planta Norte",
    providerCode: "NE=11111111",
    regulatoryCode: "ES0031300806333002AA1F",
    address: "Polígono Industrial, Nave 3",
  });
  const SOUTH = plant({
    id: "south",
    name: "Huerto Sur",
    providerCode: "NE=22222222",
    regulatoryCode: "ES0031300806444003BB1F",
    address: "Calle del Sol 7",
  });
  const SCHOOL = plant({
    id: "school",
    name: "Colegio Público",
    providerCode: "NE=33333333",
    regulatoryCode: null,
    address: "Avenida de la Vega 12",
  });
  const PLANTS = [NORTH, SOUTH, SCHOOL];

  const search = (text: string) => userEvent.type(screen.getByRole("searchbox", { name: SEARCH_NAME }), text);
  const shownNames = () => rows("wide").map((row) => within(row).getByRole("link").textContent);

  it("UI-PLS-002 names the search box for what it matches, not for supply points", () => {
    setup({ plants: PLANTS });

    expect(screen.getByRole("searchbox", { name: SEARCH_NAME })).toHaveAttribute("placeholder", SEARCH_NAME);
    expect(screen.queryByRole("searchbox", { name: /punto de suministro/i })).not.toBeInTheDocument();
  });

  it.each([
    ["part of a name", "huerto", "Huerto Sur"],
    ["part of a CAU", "806333", "Planta Norte"],
    ["a CAU in another case", "bb1f", "Huerto Sur"],
    ["part of an address", "VEGA", "Colegio Público"],
  ])("UI-PLS-002 finds the matching plant only by %s", async (_, text, name) => {
    setup({ plants: PLANTS });

    await search(text);

    expect(shownNames()).toEqual([name]);
  });

  it("UI-PLS-002 does not match the provider's station code, and says nothing matches", async () => {
    setup({ plants: PLANTS });

    await search("NE=22222222");

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("No hay plantas que coincidan")).toBeInTheDocument();
  });

  it("offers «Limpiar filtros» when nothing matches, and it clears the search", async () => {
    setup({ plants: PLANTS });

    await search("ninguna");
    await userEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(screen.getByRole("searchbox", { name: SEARCH_NAME })).toHaveValue("");
    expect(rows("wide")).toHaveLength(3);
  });
});

describe("the row actions", () => {
  const MENU = "Más acciones para Planta Norte";
  const menuItems = () => screen.getAllByRole("menuitem").map((item) => item.textContent);

  it("offers Ver, Editar, Acuerdos de reparto and, last, Eliminar to a caller who may manage the plant", async () => {
    setup({ plants: [plant({ id: "north", name: "Planta Norte" }, { canManage: true, canListSharingAgreements: true })] });

    await userEvent.click(screen.getByRole("button", { name: MENU }));

    expect(menuItems()).toEqual(["Ver", "Editar", "Acuerdos de reparto", "Eliminar"]);
  });

  it("offers Ver and Acuerdos de reparto to a caller who may only list the agreements", async () => {
    setup({ plants: [plant({ id: "north", name: "Planta Norte" }, { canListSharingAgreements: true })] });

    await userEvent.click(screen.getByRole("button", { name: MENU }));

    expect(menuItems()).toEqual(["Ver", "Acuerdos de reparto"]);
  });

  it("offers no kebab, and a chevron, to a caller with neither", () => {
    setup({ plants: [plant({ id: "north", name: "Planta Norte" }), plant({ id: "south", name: "Planta Sur" })], layout: "narrow" });

    expect(screen.queryByRole("button", { name: /^Más acciones/ })).not.toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: LIST_NAME })).getAllByTestId("ChevronRightRoundedIcon")).toHaveLength(2);
  });

  it("decides the chevron over the whole list, so a page without actions shows none either", async () => {
    // 26 rows: only the first, on page 1, has actions.
    setup({ plants: many(26, (index) => (index === 0 ? { canManage: true } : {})), layout: "narrow" });
    const list = () => screen.getByRole("list", { name: LIST_NAME });

    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

    expect(within(list()).getByRole("link", { name: "Planta 26" })).toBeInTheDocument();
    expect(within(list()).queryByTestId("ChevronRightRoundedIcon")).not.toBeInTheDocument();
  });

  it("UI-PLS-003 names the plant in the deletion dialog, never by its station code", async () => {
    setup({
      plants: [
        plant({ id: "north", name: "Planta Norte", providerCode: "NE=33685734" }, { canManage: true }),
        plant({ id: "south", name: "Planta Sur", providerCode: "NE=99887766" }, { canManage: true }),
      ],
    });

    await userEvent.click(screen.getByRole("button", { name: MENU }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Eliminar" }));

    const dialog = screen.getByRole("dialog", { name: /^Eliminar planta de / });
    expect(within(dialog).getByText("Planta Norte")).toBeInTheDocument();
    expect(within(dialog).queryByText("Planta Sur")).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/NE=/)).not.toBeInTheDocument();
  });
});

describe("the list's states", () => {
  it("UI-LST-004 reports a failed read with «Reintentar», which reads again, and no empty state", async () => {
    vi.mocked(useGetCommunityById).mockReturnValue(
      query.success<typeof getCommunityById>(
        buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities({ canRead: true, canListPlants: true }) }),
      ),
    );
    const failed = query.error<Awaited<ReturnType<typeof getAllPlants>>>(new AxiosError("Network Error"));
    vi.mocked(useGetAllPlants).mockReturnValue(failed);
    renderWithProviders(<PlantsPage />, { activeCommunityId: COMMUNITY_ID });

    expect(screen.getByText("No se pudieron cargar las plantas.")).toBeInTheDocument();
    expect(screen.queryByText(/No se encontraron plantas|Todavía no hay/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(failed.refetch).toHaveBeenCalled();
  });

  it("UI-LST-005 shows no pagination for 25 plants", () => {
    setup({ plants: many(25) });

    expect(rows("wide")).toHaveLength(25);
    expect(screen.queryByRole("navigation", { name: PAGES_NAME })).not.toBeInTheDocument();
  });

  it("UI-LST-005 pages 26 plants by 25", () => {
    setup({ plants: many(26) });

    expect(rows("wide")).toHaveLength(25);
    expect(screen.getByRole("navigation", { name: PAGES_NAME })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Planta 26" })).not.toBeInTheDocument();
  });

  it("goes back to the first page on a new search", async () => {
    setup({ plants: many(26) });

    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    await userEvent.type(screen.getByRole("searchbox", { name: SEARCH_NAME }), "Planta");

    expect(screen.getByRole("link", { name: "Planta 1" })).toBeInTheDocument();
  });
});
