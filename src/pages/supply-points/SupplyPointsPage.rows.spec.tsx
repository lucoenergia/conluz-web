import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildMemberRecord,
  buildSupply,
  buildSupplyCapabilities,
  buildUser,
} from "../../test/fixtures";
import type { SupplyCapabilitiesResponse, SupplyResponse } from "../../api/models";

// The rows of the supply list (#348), in both layouts and from both reads.
// Only the reads are replaced; the actions layer runs for real, so the menus
// follow the capabilities on the payload.
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllSupplies: vi.fn(),
}));
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
  useGetUserById: vi.fn(),
}));
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));

import { getAllSupplies, useGetAllSupplies } from "../../api/supplies/supplies";
import { getSuppliesByUserId, getUserById, useGetSuppliesByUserId, useGetUserById } from "../../api/users/users";
import { getCommunityById, useGetCommunityById } from "../../api/communities/communities";
import { SupplyPointsPage } from "./SupplyPointsPage";

const COMMUNITY_ID = "community-a";
const PERSON_ID = "person-1";
const LIST_NAME = "Puntos de suministro";

type Layout = "narrow" | "wide";
type Branch = "community" | "person";
type CanManage = "allowed" | "denied" | "pending" | "error";

const WIDTH: Record<Layout, number> = { narrow: 380, wide: 1024 };
const setViewport = (width: number) =>
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });

const supply = (overrides: Partial<SupplyResponse> & { id: string }, capabilities: Partial<SupplyCapabilitiesResponse> = {}) =>
  buildSupply({
    code: `ES00210000000000${overrides.id.slice(-2)}AA`,
    community: { id: COMMUNITY_ID, name: "Sol Común" },
    ...overrides,
    capabilities: buildSupplyCapabilities({ canRead: true, ...capabilities }),
  });

/** `count` plain supplies, named so their order and their pages can be told apart. */
const many = (count: number, capabilities: (index: number) => Partial<SupplyCapabilitiesResponse> = () => ({})) =>
  Array.from({ length: count }, (_, index) =>
    supply({ id: `s-${String(index + 1).padStart(2, "0")}`, name: `Suministro ${index + 1}` }, capabilities(index)),
  );

function setup({
  supplies,
  canManage = "denied",
  branch = "community",
  layout = "wide",
}: {
  supplies: SupplyResponse[];
  canManage?: CanManage;
  branch?: Branch;
  layout?: Layout;
}) {
  setViewport(WIDTH[layout]);

  const community = query.success<typeof getCommunityById>(
    buildCommunity({
      id: COMMUNITY_ID,
      capabilities: buildCommunityCapabilities({
        canRead: true,
        canListSupplies: true,
        canManage: canManage === "allowed",
      }),
    }),
  );
  vi.mocked(useGetCommunityById).mockReturnValue(
    canManage === "pending" ? query.loading() : canManage === "error" ? query.error(new AxiosError("Network Error")) : community,
  );

  if (branch === "community") {
    vi.mocked(useGetAllSupplies).mockReturnValue(
      query.success<typeof getAllSupplies>({
        items: supplies,
        size: 10000,
        totalElements: supplies.length,
        totalPages: 1,
        number: 0,
      }),
    );
  } else {
    vi.mocked(useGetAllSupplies).mockReturnValue(query.disabled<Awaited<ReturnType<typeof getAllSupplies>>>());
    vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.success<typeof getSuppliesByUserId>(supplies));
    vi.mocked(useGetUserById).mockReturnValue(
      query.success<typeof getUserById>(buildUser({ id: PERSON_ID, fullName: "Ana López" })),
    );
  }

  return renderWithProviders(<SupplyPointsPage />, {
    activeCommunityId: COMMUNITY_ID,
    route: branch === "person" ? `/supply-points?personId=${PERSON_ID}` : "/supply-points",
  });
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
  vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.disabled<Awaited<ReturnType<typeof getSuppliesByUserId>>>());
  vi.mocked(useGetUserById).mockReturnValue(query.disabled<Awaited<ReturnType<typeof getUserById>>>());
});

afterEach(() => setViewport(originalWidth));

const LAYOUTS: Layout[] = ["narrow", "wide"];
const BRANCHES: Branch[] = ["community", "person"];

describe.each(LAYOUTS)("the supply rows, %s", (layout) => {
  describe.each(BRANCHES)("from the %s read", (branch) => {
    const NAMED = supply({ id: "s-01", name: "Casa", address: "Calle Mayor 1" });
    const UNNAMED = supply({ id: "s-02", name: null, address: "Plaza del Pueblo 3" });

    it("UI-SUP-011 shows no consumption figure and no connection time on any row", () => {
      setup({ supplies: [NAMED, UNNAMED], branch, layout });

      expect(rows(layout)).toHaveLength(2);
      expect(screen.queryByText(/kWh/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Última conexión|Último consumo|Hace \d/)).not.toBeInTheDocument();
    });

    it("UI-SUP-011 titles a named supply by its name, with its CUPS and its address under it", () => {
      setup({ supplies: [NAMED, UNNAMED], branch, layout });

      const row = rowOf(layout, "Casa");
      expect(within(row).getByRole("link", { name: "Casa" })).toHaveAttribute("href", "/supply-points/s-01");
      expect(within(row).getByText("ES0021000000000001AA")).toBeInTheDocument();
      expect(within(row).getByText("Calle Mayor 1")).toBeInTheDocument();
    });

    it("UI-SUP-011 titles a supply without a name by its address, and shows the address once", () => {
      setup({ supplies: [NAMED, UNNAMED], branch, layout });

      const row = rowOf(layout, "Plaza del Pueblo 3");
      expect(within(row).getAllByText("Plaza del Pueblo 3")).toHaveLength(1);
      expect(within(row).getByText("ES0021000000000002AA")).toBeInTheDocument();
    });

    describe("UI-SUP-011 with canManage granted", () => {
      const OWNED = supply({
        id: "s-03",
        name: "Garaje",
        ownerRecord: buildMemberRecord({ fullName: "Ana López", memberNumber: 12 }),
      });
      const NUMBERLESS = supply({
        id: "s-04",
        name: "Huerto",
        ownerRecord: buildMemberRecord({ fullName: "Luis Gil", memberNumber: null }),
      });
      const OWNERLESS = supply({ id: "s-05", name: "Local", ownerRecord: null });

      it("UI-SUP-011 names each row's owner, with the member number when there is one, or says it has none", () => {
        setup({ supplies: [OWNED, NUMBERLESS, OWNERLESS], canManage: "allowed", branch, layout });

        expect(rowOf(layout, "Garaje")).toHaveTextContent("Ana López · Nº 12");
        expect(rowOf(layout, "Huerto")).toHaveTextContent("Luis Gil");
        expect(rowOf(layout, "Huerto")).not.toHaveTextContent("Nº");
        expect(rowOf(layout, "Local")).toHaveTextContent("Sin titular");
        if (layout === "wide") expect(screen.getByRole("columnheader", { name: "Titular" })).toBeInTheDocument();
        else expect(rowOf(layout, "Garaje")).toHaveTextContent("Titular: Ana López · Nº 12");
      });

      it.each(["denied", "error"] as const)(
        "UI-SUP-011 shows no owner when canManage is %s",
        (canManage) => {
          setup({ supplies: [OWNED, NUMBERLESS, OWNERLESS], canManage, branch, layout });

          expect(rows(layout)).toHaveLength(3);
          expect(screen.queryByText(/Titular/)).not.toBeInTheDocument();
          expect(screen.queryByText(/Ana López · Nº|Luis Gil|Sin titular/)).not.toBeInTheDocument();
          expect(screen.queryByRole("columnheader", { name: "Titular" })).not.toBeInTheDocument();
        },
      );
    });

    it("UI-SUP-011 keeps the list loading, with no rows, while canManage is pending", () => {
      setup({ supplies: [NAMED, UNNAMED], canManage: "pending", branch, layout });

      expect(screen.queryByRole("link", { name: "Casa" })).not.toBeInTheDocument();
      if (layout === "narrow") {
        expect(screen.getByRole("list", { name: LIST_NAME })).toHaveAttribute("aria-busy", "true");
      } else {
        const groups = within(screen.getByRole("table")).getAllByRole("rowgroup");
        expect(groups.some((group) => group.getAttribute("aria-busy") === "true")).toBe(true);
      }
    });
  });

  it("UI-SUP-011 shows the CUPS once in a narrow row whose label is the CUPS", () => {
    setup({ supplies: [supply({ id: "s-01", name: null, address: "" }), supply({ id: "s-02", name: "Casa" })], layout });

    const row = rowOf(layout, "ES0021000000000001AA");
    // The wide layout has a CUPS column of its own, so the code is there besides the title.
    expect(within(row).getAllByText("ES0021000000000001AA")).toHaveLength(layout === "narrow" ? 1 : 2);
    expect(row).not.toHaveTextContent(/Titular/);
  });

  it("UI-SUP-012 marks only the supplies a plant produces onto, each with its own plant's name", () => {
    setup({
      supplies: [
        supply({ id: "s-01", name: "Cubierta del polideportivo", plant: { id: "plant-n", name: "Planta Norte" } }),
        supply({ id: "s-02", name: "Casa" }),
        supply({ id: "s-03", name: "Cubierta del colegio", plant: { id: "plant-s", name: "Planta Sur" } }),
        supply({ id: "s-04", name: "Garaje" }),
      ],
      layout,
    });

    expect(rowOf(layout, "Cubierta del polideportivo")).toHaveTextContent("Punto de la planta Planta Norte");
    expect(rowOf(layout, "Cubierta del polideportivo")).not.toHaveTextContent("Planta Sur");
    expect(rowOf(layout, "Cubierta del colegio")).toHaveTextContent("Punto de la planta Planta Sur");
    expect(rowOf(layout, "Casa")).not.toHaveTextContent(/Punto de la planta/);
    expect(rowOf(layout, "Garaje")).not.toHaveTextContent(/Punto de la planta/);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("UI-SUP-013 shows «Dado de baja» on the disabled supply only", () => {
    setup({
      supplies: [supply({ id: "s-01", name: "Casa", enabled: true }), supply({ id: "s-02", name: "Garaje", enabled: false })],
      layout,
    });

    expect(rowOf(layout, "Garaje")).toHaveTextContent("Dado de baja");
    expect(rowOf(layout, "Casa")).not.toHaveTextContent(/Dado de baja|Activo/);
  });

  it("UI-SUP-001 offers Eliminar punto de suministro on the row menu, last, for a supply that reports canDelete", async () => {
    setup({ supplies: [supply({ id: "s-01", name: "Casa" }, { canEdit: true, canDelete: true }), supply({ id: "s-02", name: "Garaje" })], layout });

    expect(screen.queryByRole("button", { name: "Más acciones para Garaje" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Más acciones para Casa" }));

    const items = within(screen.getByRole("menu")).getAllByRole("menuitem");
    expect(items.at(-1)).toHaveAccessibleName("Eliminar punto de suministro");
  });
});

describe("the row menu", () => {
  // edit, enable and disable share the supply's canEdit (useSupplyActions), so
  // the narrowest grant that offers a status change is canEdit alone.
  it("UI-SUP-001 gives a row a kebab when the supply offers only a status change, and offers it", async () => {
    setup({
      supplies: [
        supply({ id: "s-01", name: "Casa", enabled: true }, { canEdit: true }),
        supply({ id: "s-02", name: "Garaje", enabled: false }, { canEdit: true }),
      ],
    });

    await userEvent.click(screen.getByRole("button", { name: "Más acciones para Casa" }));
    expect(screen.getByRole("menuitem", { name: "Deshabilitar" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Eliminar punto de suministro" })).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");

    await userEvent.click(screen.getByRole("button", { name: "Más acciones para Garaje" }));
    expect(screen.getByRole("menuitem", { name: "Activar" })).toBeInTheDocument();
  });

  it("decides the chevron over the whole list, so a page without actions shows none either", async () => {
    // 26 rows: only the first, on page 1, has actions.
    setup({ supplies: many(26, (index) => (index === 0 ? { canEdit: true } : {})), layout: "narrow" });
    const list = () => screen.getByRole("list", { name: LIST_NAME });

    expect(within(list()).queryByTestId("ChevronRightRoundedIcon")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

    expect(within(list()).getByRole("link", { name: "Suministro 26" })).toBeInTheDocument();
    expect(within(list()).queryByTestId("ChevronRightRoundedIcon")).not.toBeInTheDocument();
  });

  it("shows the chevron on every row when no row in the list has actions", () => {
    setup({ supplies: many(2), layout: "narrow" });

    expect(within(screen.getByRole("list", { name: LIST_NAME })).getAllByTestId("ChevronRightRoundedIcon")).toHaveLength(2);
  });
});

describe("the list's states", () => {
  it("UI-LST-004 reports a failed read with «Reintentar», which reads again, and no empty state", async () => {
    vi.mocked(useGetCommunityById).mockReturnValue(
      query.success<typeof getCommunityById>(
        buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities({ canRead: true, canListSupplies: true }) }),
      ),
    );
    const failed = query.error<Awaited<ReturnType<typeof getAllSupplies>>>(new AxiosError("Network Error"));
    vi.mocked(useGetAllSupplies).mockReturnValue(failed);
    renderWithProviders(<SupplyPointsPage />, { activeCommunityId: COMMUNITY_ID });

    expect(screen.getByText("No se pudieron cargar los puntos de suministro.")).toBeInTheDocument();
    expect(screen.queryByText(/No se encontraron puntos de suministro|Todavía no hay/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(failed.refetch).toHaveBeenCalled();
  });

  it("UI-LST-005 shows no pagination for 25 supplies", () => {
    setup({ supplies: many(25) });

    expect(rows("wide")).toHaveLength(25);
    expect(screen.queryByRole("navigation", { name: "Páginas de puntos de suministro" })).not.toBeInTheDocument();
  });

  it("UI-LST-005 pages 26 supplies by 25", () => {
    setup({ supplies: many(26) });

    expect(rows("wide")).toHaveLength(25);
    expect(screen.getByRole("navigation", { name: "Páginas de puntos de suministro" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Suministro 26" })).not.toBeInTheDocument();
  });

  it("offers «Limpiar filtros» when nothing matches the search and the filter, and it clears both", async () => {
    setup({
      supplies: [supply({ id: "s-01", name: "Casa", enabled: true }), supply({ id: "s-02", name: "Garaje", enabled: false })],
    });

    await userEvent.click(screen.getByRole("button", { name: "Dados de baja" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar punto de suministro..." }), "casa");

    expect(screen.getByText("No hay puntos de suministro que coincidan")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(screen.getByRole("searchbox", { name: "Buscar punto de suministro..." })).toHaveValue("");
    expect(rows("wide")).toHaveLength(2);
  });

  it("UI-SUP-013 names the filter and the header counter «Dados de baja»", () => {
    setup({
      supplies: [supply({ id: "s-01", name: "Casa", enabled: true }), supply({ id: "s-02", name: "Garaje", enabled: false })],
    });

    const chip = screen.getByRole("button", { name: "Dados de baja" });
    expect(screen.getByRole("button", { name: "Todos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activos" })).toBeInTheDocument();
    const counters = screen.getAllByText("Dados de baja").filter((element) => !chip.contains(element));
    expect(counters).toHaveLength(1);
    expect(screen.queryByText(/^Inactivo/)).not.toBeInTheDocument();
  });
});
