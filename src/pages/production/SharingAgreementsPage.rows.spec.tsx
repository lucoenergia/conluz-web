import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import {
  buildPlant,
  buildPlantCapabilities,
  buildSharingAgreement,
  buildSharingAgreementCapabilities,
} from "../../test/fixtures";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse } from "../../api/models";
import { expectNeutralStatusChip } from "../../components/SharingAgreementStatusChip/expectNeutralStatusChip";
import { declaredStyle } from "../../test/declaredStyle";

// The rows of a plant's sharing agreement list (#350), in both layouts. Only
// the reads are replaced; the actions layer runs for real, so the kebab
// follows the capabilities on the payload.
vi.mock(import("../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSharingAgreements: vi.fn(),
}));
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetPlantById: vi.fn(),
}));

import { getSharingAgreements, useGetSharingAgreements } from "../../api/sharing-agreements/sharing-agreements";
import { getPlantById, useGetPlantById } from "../../api/plants/plants";
import { SharingAgreementsPage } from "./SharingAgreementsPage";

const { DRAFT, PUBLISHED, SUPERSEDED } = SharingAgreementResponseStatus;
const COMMUNITY_ID = "community-a";
const PLANT_ID = "plant-1";
const LIST_NAME = "Acuerdos de reparto";
const PAGES_NAME = "Páginas de acuerdos de reparto";
const SEARCH_NAME = "Buscar por nombre o notas...";
/** The search is debounced; a filtered list arrives after it settles. */
const DEBOUNCE_WAIT = { timeout: 2000 };

type Layout = "narrow" | "wide";
const LAYOUTS: Layout[] = ["narrow", "wide"];
const WIDTH: Record<Layout, number> = { narrow: 380, wide: 1024 };
const setViewport = (width: number) =>
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });

const MANAGEABLE = buildSharingAgreementCapabilities({ canRead: true, canManage: true });
const READ_ONLY = buildSharingAgreementCapabilities({ canRead: true });

const agreement = (overrides: Partial<SharingAgreementResponse> & { id: string }) =>
  buildSharingAgreement({
    plantId: PLANT_ID,
    name: `Acuerdo ${overrides.id}`,
    status: PUBLISHED,
    nominalPowerKW: 100,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: null,
    notes: null,
    file: null,
    capabilities: READ_ONLY,
    ...overrides,
  });

/** `count` plain agreements, named so their order and their pages can be told apart. */
const many = (count: number, overrides: (index: number) => Partial<SharingAgreementResponse> = () => ({})) =>
  Array.from({ length: count }, (_, index) =>
    agreement({ id: `a-${String(index + 1).padStart(2, "0")}`, name: `Acuerdo ${index + 1}`, ...overrides(index) }),
  );

function mockReads(agreements: SharingAgreementResponse[]) {
  vi.mocked(useGetPlantById).mockReturnValue(
    query.success<typeof getPlantById>(
      buildPlant({
        id: PLANT_ID,
        name: "Planta Solar Norte",
        community: { id: COMMUNITY_ID },
        capabilities: buildPlantCapabilities({ canRead: true, canListSharingAgreements: true }),
      }),
    ),
  );
  vi.mocked(useGetSharingAgreements).mockReturnValue(query.success<typeof getSharingAgreements>(agreements));
}

function render() {
  return renderWithProviders(
    <Routes>
      <Route path="/plants/:plantId/sharing-agreements" element={<SharingAgreementsPage />} />
    </Routes>,
    { route: `/plants/${PLANT_ID}/sharing-agreements`, activeCommunityId: COMMUNITY_ID },
  );
}

function setup({ agreements, layout = "wide" }: { agreements: SharingAgreementResponse[]; layout?: Layout }) {
  setViewport(WIDTH[layout]);
  mockReads(agreements);
  return render();
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

const titles = (layout: Layout) => rows(layout).map((row) => within(row).getAllByRole("link")[0].textContent);

const originalWidth = window.innerWidth;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => setViewport(originalWidth));

const EDITED_WITH_FILE = agreement({
  id: "edited",
  name: "Reparto ampliación",
  status: DRAFT,
  nominalPowerKW: 120.5,
  createdAt: "2024-06-15T10:00:00Z",
  updatedAt: "2024-09-20T10:00:00Z",
  notes: "Pendiente de revisión antes de publicarse.",
  file: { id: "file-1", filename: "ES1234567890123456AB1F_2025.txt", uploadedAt: "2025-01-10T08:00:00Z" },
});
const NEVER_EDITED_WITHOUT_FILE = agreement({
  id: "original",
  name: "Reparto original",
  status: SUPERSEDED,
  nominalPowerKW: 80,
  // 23:30 UTC is already the next day in Madrid, the zone the backend derives it from.
  createdAt: "2023-03-05T23:30:00Z",
  updatedAt: null,
  notes: null,
  file: null,
});

describe.each(LAYOUTS)("the sharing agreement rows, %s", (layout) => {
  it("UI-AGR-015 an edited agreement shows its last edit date, a never-edited one its creation date", () => {
    setup({ agreements: [EDITED_WITH_FILE, NEVER_EDITED_WITHOUT_FILE], layout });

    const edited = rowOf(layout, "Reparto ampliación");
    expect(edited).toHaveTextContent("Editado el 20 sept 2024");
    expect(edited).not.toHaveTextContent("Creado el");

    const original = rowOf(layout, "Reparto original");
    expect(original).toHaveTextContent("Creado el 6 mar 2023");
    expect(original).not.toHaveTextContent("Editado el");
  });

  it("UI-AGR-015 shows the evidence file with its upload date, or «Sin fichero»", () => {
    setup({ agreements: [EDITED_WITH_FILE, NEVER_EDITED_WITHOUT_FILE], layout });

    expect(rowOf(layout, "Reparto ampliación")).toHaveTextContent(
      "Fichero: ES1234567890123456AB1F_2025.txt · subido el 10 ene 2025",
    );
    expect(rowOf(layout, "Reparto ampliación")).not.toHaveTextContent("Sin fichero");
    expect(rowOf(layout, "Reparto original")).toHaveTextContent("Sin fichero");
  });

  it("UI-AGR-015 shows the status and the nominal power", () => {
    setup({ agreements: [EDITED_WITH_FILE, NEVER_EDITED_WITHOUT_FILE], layout });

    expect(rowOf(layout, "Reparto ampliación")).toHaveTextContent("Borrador");
    expect(rowOf(layout, "Reparto ampliación")).toHaveTextContent("120,5 kW");
    expect(rowOf(layout, "Reparto original")).toHaveTextContent("Histórico");
    expect(rowOf(layout, "Reparto original")).toHaveTextContent("80 kW");
  });

  it("UI-AGR-015 shows the notes on one line, only when the agreement has some", () => {
    setup({ agreements: [EDITED_WITH_FILE, NEVER_EDITED_WITHOUT_FILE], layout });

    const notes = within(rowOf(layout, "Reparto ampliación")).getByText("Pendiente de revisión antes de publicarse.");
    // Read from emotion's rules: computed styles cannot see MUI's CSS layer here (see declaredStyle).
    expect(declaredStyle(notes)).toMatchObject({ "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis" });
    // Without notes, the row shows nothing in their place, not even a placeholder.
    expect(rowOf(layout, "Reparto original")).not.toHaveTextContent("Pendiente de revisión");
    expect(rowOf(layout, "Reparto original")).not.toHaveTextContent(/notas/i);
  });

  it("UI-AGR-015 keeps the API's order, even when it is not the order of the dates", () => {
    const newest = agreement({ id: "b", name: "Segundo", createdAt: "2023-01-01T10:00:00Z" });
    const oldest = agreement({ id: "a", name: "Primero", createdAt: "2025-01-01T10:00:00Z" });
    const middle = agreement({ id: "c", name: "Tercero", createdAt: "2024-01-01T10:00:00Z", updatedAt: "2026-01-01T10:00:00Z" });
    setup({ agreements: [newest, oldest, middle], layout });

    expect(titles(layout)).toEqual(["Segundo", "Primero", "Tercero"]);
  });

  it("UI-AGR-015 shows neither a supply count nor a coefficient sum on any row", () => {
    setup({ agreements: [EDITED_WITH_FILE, NEVER_EDITED_WITHOUT_FILE], layout });

    for (const row of rows(layout)) {
      expect(row).not.toHaveTextContent(/suministro|coeficiente|%/i);
    }
  });

  it("UI-AGR-016 no status chip carries a warning or error palette", () => {
    setup({
      agreements: [
        agreement({ id: "d", name: "Borrador", status: DRAFT }),
        agreement({ id: "p", name: "Vigente", status: PUBLISHED }),
        agreement({ id: "s", name: "Histórico", status: SUPERSEDED }),
      ],
      layout,
    });

    for (const [name, label] of [
      ["Borrador", "Borrador"],
      ["Vigente", "Vigente"],
      ["Histórico", "Histórico"],
    ]) {
      // The row's title is a link with the same text; the chip is the other one.
      const chipLabel = within(rowOf(layout, name))
        .getAllByText(label)
        .find((element) => element.closest(".MuiChip-root"));
      expect(chipLabel, `${label} chip`).toBeDefined();
      if (chipLabel) expectNeutralStatusChip(chipLabel);
    }
  });

  it("a PUBLISHED agreement whose caller may manage it has no kebab, and no menu can open for it", () => {
    setup({ agreements: [agreement({ id: "p", name: "Vigente gestionable", status: PUBLISHED, capabilities: MANAGEABLE })], layout });

    expect(screen.queryByRole("button", { name: /^Más acciones/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("a DRAFT the caller may delete has a kebab that offers only Eliminar", async () => {
    setup({
      agreements: [
        agreement({ id: "d", name: "Borrador gestionable", status: DRAFT, capabilities: MANAGEABLE }),
        agreement({ id: "p", name: "Vigente gestionable", status: PUBLISHED, capabilities: MANAGEABLE }),
      ],
      layout,
    });

    expect(screen.getAllByRole("button", { name: /^Más acciones/ })).toHaveLength(1);
    await userEvent.click(within(rowOf(layout, "Borrador gestionable")).getByRole("button", { name: "Más acciones para Borrador gestionable" }));

    const menu = screen.getByRole("menu");
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Eliminar"]);
  });

  it("a DRAFT the caller may not manage has no kebab", () => {
    setup({ agreements: [agreement({ id: "d", name: "Borrador ajeno", status: DRAFT, capabilities: READ_ONLY })], layout });

    expect(screen.queryByRole("button", { name: /^Más acciones/ })).not.toBeInTheDocument();
  });
});

describe("the sharing agreement row actions", () => {
  it("UI-LST-003 keeps an empty actions cell on a published row while a draft beside it has a kebab", () => {
    setup({
      agreements: [
        agreement({ id: "d", name: "Borrador gestionable", status: DRAFT, capabilities: MANAGEABLE }),
        agreement({ id: "p", name: "Vigente gestionable", status: PUBLISHED, capabilities: MANAGEABLE }),
      ],
    });

    const published = within(rowOf("wide", "Vigente gestionable")).getAllByRole("cell");
    const draft = within(rowOf("wide", "Borrador gestionable")).getAllByRole("cell");
    expect(published).toHaveLength(draft.length);
    expect(published.at(-1)).toBeEmptyDOMElement();
    expect(within(draft.at(-1) as HTMLElement).getByRole("button", { name: /^Más acciones/ })).toBeInTheDocument();
  });

  it("shows a chevron on the narrow rows when none can be deleted", () => {
    setup({
      agreements: [
        agreement({ id: "p", name: "Vigente", status: PUBLISHED, capabilities: MANAGEABLE }),
        agreement({ id: "d", name: "Borrador ajeno", status: DRAFT, capabilities: READ_ONLY }),
      ],
      layout: "narrow",
    });

    expect(within(screen.getByRole("list", { name: LIST_NAME })).getAllByTestId("ChevronRightRoundedIcon")).toHaveLength(2);
  });

  it("decides the chevron over the whole list, so a page without a deletable row shows none either", async () => {
    // 26 rows: only the first, on page 1, can be deleted.
    setup({
      agreements: many(26, (index) => (index === 0 ? { status: DRAFT, capabilities: MANAGEABLE } : {})),
      layout: "narrow",
    });
    const list = () => screen.getByRole("list", { name: LIST_NAME });

    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

    expect(within(list()).getByRole("link", { name: "Acuerdo 26" })).toBeInTheDocument();
    expect(within(list()).queryByTestId("ChevronRightRoundedIcon")).not.toBeInTheDocument();
  });
});

describe("the sharing agreement list's states", () => {
  it("UI-LST-004 reports a failed read with «Reintentar», which reads again, and no empty state", async () => {
    mockReads([]);
    const failed = query.error<Awaited<ReturnType<typeof getSharingAgreements>>>(new AxiosError("Network Error"));
    vi.mocked(useGetSharingAgreements).mockReturnValue(failed);
    render();

    expect(screen.getByText("No se pudieron cargar los acuerdos de reparto.")).toBeInTheDocument();
    expect(screen.queryByText(/No se encontraron acuerdos de reparto|No hay acuerdos de reparto/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(failed.refetch).toHaveBeenCalled();
  });

  it("UI-LST-005 shows no pagination for 25 agreements", () => {
    setup({ agreements: many(25) });

    expect(rows("wide")).toHaveLength(25);
    expect(screen.queryByRole("navigation", { name: PAGES_NAME })).not.toBeInTheDocument();
  });

  it("UI-LST-005 pages 26 agreements by 25", () => {
    setup({ agreements: many(26) });

    expect(rows("wide")).toHaveLength(25);
    expect(screen.getByRole("navigation", { name: PAGES_NAME })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Acuerdo 26" })).not.toBeInTheDocument();
  });

  it("goes back to the first page on a new status filter", async () => {
    setup({ agreements: many(26) });

    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(screen.getByRole("link", { name: "Acuerdo 26" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Vigente" }));

    expect(screen.getByRole("link", { name: "Acuerdo 1" })).toBeInTheDocument();
  });

  it("says nothing matches, and «Limpiar filtros» clears both the search and the status filter", async () => {
    setup({
      agreements: [
        agreement({ id: "p", name: "Reparto vigente", status: PUBLISHED }),
        agreement({ id: "d", name: "Reparto borrador", status: DRAFT }),
      ],
    });

    await userEvent.click(screen.getByRole("button", { name: "Borrador" }));
    await userEvent.type(screen.getByRole("searchbox", { name: SEARCH_NAME }), "vigente");

    expect(await screen.findByText("No hay acuerdos de reparto que coincidan", {}, DEBOUNCE_WAIT)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(screen.getByRole("searchbox", { name: SEARCH_NAME })).toHaveValue("");
    // The draft is the row both the search and the filter hid; it is back once both are cleared.
    expect(await screen.findByRole("link", { name: "Reparto borrador" }, DEBOUNCE_WAIT)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reparto vigente" })).toBeInTheDocument();
  });

  it("UI-AGR-016 each selected status filter uses the brand colour", async () => {
    setup({ agreements: [EDITED_WITH_FILE, NEVER_EDITED_WITHOUT_FILE] });

    for (const label of ["Todos", "Borrador", "Vigente", "Histórico"]) {
      const filter = screen.getByRole("button", { name: label });
      await userEvent.click(filter);
      // Structural: the palette is the subject, and MUI names it only in the class.
      expect(filter, label).toHaveClass("MuiChip-colorPrimary");
      for (const other of ["Todos", "Borrador", "Vigente", "Histórico"].filter((name) => name !== label)) {
        expect(screen.getByRole("button", { name: other }), other).toHaveClass("MuiChip-colorDefault");
      }
    }
  });
});
