import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildCommunity, buildCommunityCapabilities, buildPlant, buildPlantCapabilities } from "../../test/fixtures";
import type { PlantResponse } from "../../api/models";

// The plant list's powers and CIL (#407), in both layouts. Only the reads are
// replaced.
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

type Layout = "narrow" | "wide";
const WIDTH: Record<Layout, number> = { narrow: 380, wide: 1024 };
const setViewport = (width: number) =>
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });

const plant = (id: string, name: string, overrides: Partial<PlantResponse>) =>
  buildPlant({
    id,
    name,
    providerCode: `NE=${id}`,
    address: `Calle ${id}`,
    community: { id: COMMUNITY_ID },
    capabilities: buildPlantCapabilities({ canRead: true }),
    ...overrides,
  });

// Two plants whose powers differ from each other's and from each other's
// counterpart, so a row showing another row's figure, or one power in place of
// the other, fails.
const LUCO = plant("luco", "Planta Luco", { peakPowerKWp: 80, nominalPowerKW: 60, cil: "ES0031405000000001AB1F001" });
const ESCUELAS = plant("escuelas", "Planta Escuelas", { peakPowerKWp: 35.5, nominalPowerKW: 30.25, cil: "ES0031405000000002CD2F002" });

function setup(layout: Layout, plants: PlantResponse[] = [LUCO, ESCUELAS]) {
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

function rowOf(layout: Layout, name: string): HTMLElement {
  const rows =
    layout === "narrow"
      ? within(screen.getByRole("list", { name: "Plantas" })).getAllByRole("listitem")
      : within(screen.getByRole("table")).getAllByRole("row").slice(1);
  const row = rows.find((candidate) => within(candidate).queryByRole("link", { name }));
  if (!row) throw new Error(`No row titled ${name}`);
  return row;
}

/** A header counter: its label's cell holds its value. */
const counter = (label: string) => screen.getByText(label, { selector: "*:not(th)" }).parentElement as HTMLElement;

const originalWidth = window.innerWidth;
beforeEach(() => vi.clearAllMocks());
afterEach(() => setViewport(originalWidth));

describe.each(["narrow", "wide"] as const)("the plant list's powers, %s", (layout) => {
  it("UI-PLS-001 each row shows its own peak power in kWp and nominal power in kW", () => {
    setup(layout);

    const luco = rowOf(layout, "Planta Luco");
    expect(luco).toHaveTextContent(/(^|\D)80 kWp/);
    expect(luco).toHaveTextContent(/(^|\D)60 kW(?!p)/);
    const escuelas = rowOf(layout, "Planta Escuelas");
    expect(escuelas).toHaveTextContent("35,5 kWp");
    expect(escuelas).toHaveTextContent(/30,25 kW(?!p)/);
    // Not each other's figures.
    expect(luco).not.toHaveTextContent("35,5");
    expect(escuelas).not.toHaveTextContent(/(^|\D)80 kWp/);
  });

  it("UI-PLS-001 no row shows the CIL", () => {
    setup(layout);

    expect(screen.queryByText(/ES0031405000000001AB1F001|ES0031405000000002CD2F002/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CIL/)).not.toBeInTheDocument();
  });
});

describe("UI-PLS-011 the list header sums both powers over every plant (#407)", () => {
  it("UI-PLS-011 shows the plant count, the summed peak power in kWp and the summed nominal power in kW", () => {
    setup("wide");

    expect(counter("Total plantas")).toHaveTextContent("2");
    expect(counter("Potencia pico")).toHaveTextContent("115,5 kWp");
    expect(counter("Potencia nominal")).toHaveTextContent("90,25 kW");
  });

  it("UI-PLS-011 sums every plant of the list, beyond the 25 rows of its first page", () => {
    const plants = Array.from({ length: 26 }, (_, index) =>
      plant(`p-${index}`, `Planta ${index}`, { peakPowerKWp: 10, nominalPowerKW: 8 }),
    );
    setup("wide", plants);

    expect(counter("Potencia pico")).toHaveTextContent("260 kWp");
    expect(counter("Potencia nominal")).toHaveTextContent("208 kW");
  });
});
