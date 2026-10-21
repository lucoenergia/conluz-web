import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildSupply, buildSupplyCapabilities } from "../../test/fixtures";
import type { SupplyCapabilitiesResponse } from "../../api/models";

const SUPPLY_ID = "supply-1";
const COMMUNITY_ID = "community-a";

vi.mock(import("./useSupplyInActiveCommunity"), () => ({ useSupplyInActiveCommunity: vi.fn() }));

// ApexCharts measures real layout and throws in jsdom. The charts are not what
// this file is about, and every spec that renders this page would otherwise
// have to carry the same failure.
// String form: the typed one cannot express this module's default export.
vi.mock("react-apexcharts", () => ({ default: () => <div /> }));

// The section under the gate makes its own request; a stub keeps this file
// about the gate rather than about the history.
vi.mock(import("../../components/SupplyCoefficientHistorySection"), () => ({
  SupplyCoefficientHistorySection: () => <div>HISTORIAL</div>,
}));

vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => {
  const actual = await importOriginal();
  const idle = () => ({ data: undefined, isLoading: false, error: null });
  return {
    ...actual,
    useGetSupplyHourlyProduction: idle,
    useGetSupplyDailyProduction: idle,
    useGetSupplyMonthlyProduction: idle,
    useGetSupplyHourlyConsumption: idle,
    useGetSupplyDailyConsumption: idle,
    useGetSupplyMonthlyConsumption: idle,
    useGetSupplyYearlyConsumption: idle,
  } as unknown as typeof actual;
});

import { useSupplyInActiveCommunity } from "./useSupplyInActiveCommunity";
import { SupplyDetailPage } from "./SupplyDetailPage";

function setup(
  wrapper: Partial<ReturnType<typeof useSupplyInActiveCommunity>> & {
    capabilities?: Partial<SupplyCapabilitiesResponse>;
  } = {},
) {
  const { capabilities, ...overrides } = wrapper;
  vi.mocked(useSupplyInActiveCommunity).mockReturnValue({
    supply:
      capabilities === undefined && "supply" in overrides
        ? undefined
        : buildSupply({
            id: SUPPLY_ID,
            code: "ES0021000000000000AA",
            community: { id: COMMUNITY_ID, name: "Sol Común" },
            capabilities: buildSupplyCapabilities(capabilities ?? {}),
          }),
    isLoading: false,
    isNotFound: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  });

  return renderWithProviders(<SupplyDetailPage />, {
    route: `/supply-points/${SUPPLY_ID}`,
    activeCommunityId: COMMUNITY_ID,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SupplyDetailPage", () => {
  // The coefficients describe the owner's own share, so the backend opens them
  // to the owner as well as to an admin. Gating them on canEdit would take the
  // panel away from exactly the person it is about.
  it("shows the coefficient history to an owner who may read but not edit", () => {
    setup({ capabilities: { canRead: true, canEdit: false, canReadPartitionCoefficients: true } });

    expect(screen.getByText("HISTORIAL")).toBeInTheDocument();
  });

  it("shows the coefficient history to an admin", () => {
    setup({ capabilities: { canRead: true, canEdit: true, canReadPartitionCoefficients: true } });

    expect(screen.getByText("HISTORIAL")).toBeInTheDocument();
  });

  it("withholds it when the supply says the caller may not read it", () => {
    setup({ capabilities: { canRead: false } });

    expect(screen.queryByText("HISTORIAL")).not.toBeInTheDocument();
  });

  // Not yet known is not "no": firing the history request for a supply that has
  // not arrived would ask about one the caller may turn out not to hold.
  it("withholds it while the supply has not arrived", () => {
    setup({ supply: undefined, isLoading: true });

    expect(screen.queryByText("HISTORIAL")).not.toBeInTheDocument();
  });

  it("renders one empty state for a missing or foreign supply", () => {
    setup({ supply: undefined, isNotFound: true });

    expect(screen.getByText("Punto de suministro no encontrado")).toBeInTheDocument();
    expect(screen.queryByText("HISTORIAL")).not.toBeInTheDocument();
  });

  describe("UI-SUP-001 Eliminar suministro on the header menu", () => {
    const MENU_BUTTON = "Más opciones del punto de suministro";

    it("UI-SUP-001 is offered for a supply that reports canDelete", async () => {
      setup({ capabilities: { canRead: true, canDelete: true } });

      await userEvent.click(screen.getByRole("button", { name: MENU_BUTTON }));

      expect(screen.getByRole("menuitem", { name: "Eliminar suministro" })).toBeInTheDocument();
    });

    // The only item, so without it there is no menu at all.
    it("UI-SUP-001 is not offered without canDelete, even with canEdit", () => {
      setup({ capabilities: { canRead: true, canEdit: true, canDelete: false } });

      expect(screen.queryByRole("button", { name: MENU_BUTTON })).not.toBeInTheDocument();
    });

    it("UI-SUP-001 is not offered by a backend that does not report canDelete", () => {
      const capabilities = buildSupplyCapabilities({ canRead: true, canEdit: true });
      delete (capabilities as Partial<SupplyCapabilitiesResponse>).canDelete;
      setup({
        supply: buildSupply({
          id: SUPPLY_ID,
          community: { id: COMMUNITY_ID, name: "Sol Común" },
          capabilities,
        }),
      });

      expect(screen.queryByRole("button", { name: MENU_BUTTON })).not.toBeInTheDocument();
    });
  });
});
