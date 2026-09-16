import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router";
import { useMediaQuery } from "@mui/material";
import { PlantDetailHeader } from "./PlantDetailHeader";
import type { PlantResponse, SupplyResponse } from "../../api/models";

vi.mock("@mui/material", async () => {
  const actual = await vi.importActual("@mui/material");
  return { ...actual, useMediaQuery: vi.fn() };
});

const mockUseMediaQuery = useMediaQuery as unknown as ReturnType<typeof vi.fn>;

const linkedSupply = {
  id: "supply-7",
  code: "ES0031300806333002ET0F",
  name: "Casa de Luco",
} as SupplyResponse;

const mockPlant = {
  id: "plant-1",
  name: "21088 Luco de Jiloca",
  address: "Calle Callejas 4, 44391, Luco de Jiloca, Teruel",
  regulatoryCode: "ES0031300325733001FH0FA000",
  providerCode: "NE=35899672",
  totalPower: 63,
  connectionDate: "2024-04-20",
  inverterProvider: "HUAWEI",
  description: "Huerto solar Luco Energía",
  supply: linkedSupply,
} as unknown as PlantResponse;

/**
 * `plant` is explicit rather than defaulted: a default parameter would silently
 * swap `undefined` back for the mock, and the not-yet-arrived case is exactly
 * what one of these tests is about.
 */
function renderHeader(plant: PlantResponse | undefined, props = {}) {
  return render(
    <MemoryRouter>
      <PlantDetailHeader plant={plant} {...props} />
    </MemoryRouter>,
  );
}

const expandDetails = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /^Ver \d+ dato/ }));
};

describe("PlantDetailHeader", () => {
  beforeEach(() => {
    mockUseMediaQuery.mockClear();
    mockUseMediaQuery.mockReturnValue(false);
  });

  describe("identity", () => {
    it("names the plant and its address", () => {
      renderHeader(mockPlant);

      expect(screen.getByRole("heading", { level: 1, name: "21088 Luco de Jiloca" })).toBeInTheDocument();
      expect(screen.getByText("Calle Callejas 4, 44391, Luco de Jiloca, Teruel")).toBeInTheDocument();
    });

    it("falls back to generic text when the plant has not arrived", () => {
      renderHeader(undefined);

      expect(screen.getByText("Planta de Producción")).toBeInTheDocument();
      expect(screen.getByText("Dirección no disponible")).toBeInTheDocument();
    });
  });

  describe("the key-fact strip", () => {
    it("promotes power and the CAU, leaving everything else behind the toggle", () => {
      renderHeader(mockPlant);

      expect(screen.getByText("63 kW")).toBeInTheDocument();
      expect(screen.getByText("ES0031300325733001FH0FA000")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ver 5 datos más" })).toBeInTheDocument();
      expect(screen.queryByText("HUAWEI")).not.toBeInTheDocument();
    });

    it("offers to copy the CAU", () => {
      renderHeader(mockPlant);

      expect(screen.getByRole("button", { name: "Copiar CAU" })).toBeInTheDocument();
    });

    // AC2.
    it("shows a dash and no copy button when the plant has no CAU", () => {
      renderHeader({ ...mockPlant, regulatoryCode: null } as unknown as PlantResponse);

      expect(screen.queryByRole("button", { name: "Copiar CAU" })).not.toBeInTheDocument();
      expect(screen.getByText("CAU").parentElement).toHaveTextContent("-");
    });
  });

  describe("the details", () => {
    it("carries the secondary fields, with the connection date in short form", async () => {
      const user = userEvent.setup();
      renderHeader(mockPlant);
      await expandDetails(user);

      expect(screen.getByText("NE=35899672")).toBeInTheDocument();
      expect(screen.getByText("HUAWEI")).toBeInTheDocument();
      expect(screen.getByText("20 abr 2024")).toBeInTheDocument();
      expect(screen.getByText("Huerto solar Luco Energía")).toBeInTheDocument();
    });

    // AC7.
    it("links the supply by its CUPS, never by its name", async () => {
      const user = userEvent.setup();
      renderHeader(mockPlant);
      await expandDetails(user);

      const link = screen.getByRole("link", { name: /ES0031300806333002ET0F/ });
      expect(link).toHaveAttribute("href", "/supply-points/supply-7");
      // The name is secondary text, so a UUID stored there can never become the
      // label of the link.
      expect(link).not.toHaveTextContent("Casa de Luco");
      expect(screen.getByText("Casa de Luco")).toBeInTheDocument();
    });

    it("still links the supply when it has no name at all", async () => {
      const user = userEvent.setup();
      renderHeader({
        ...mockPlant,
        supply: { ...linkedSupply, name: null },
      } as unknown as PlantResponse);
      await expandDetails(user);

      expect(screen.getByRole("link", { name: /ES0031300806333002ET0F/ })).toHaveAttribute(
        "href",
        "/supply-points/supply-7",
      );
    });

    it("omits the optional fields the plant does not have, and counts only what is left", () => {
      renderHeader({ ...mockPlant, supply: undefined, description: null } as unknown as PlantResponse);

      expect(screen.getByRole("button", { name: "Ver 3 datos más" })).toBeInTheDocument();
    });
  });

  // AC13.
  describe("loading and error", () => {
    it("renders neither the strip nor the details while loading", () => {
      renderHeader(mockPlant, { isLoading: true });

      expect(screen.queryByText("63 kW")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Ver \d+ dato/ })).not.toBeInTheDocument();
    });

    it("renders neither the strip nor the details on error", () => {
      renderHeader(mockPlant, { error: new Error("boom") });

      expect(screen.queryByText("63 kW")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Ver \d+ dato/ })).not.toBeInTheDocument();
    });
  });

  // AC1 / AC5: the strip already holds only two facts, so nothing is displaced
  // and the count stays at the five details.
  it("keeps both key facts on a narrow viewport and still offers exactly five", () => {
    mockUseMediaQuery.mockReturnValue(true);
    renderHeader(mockPlant);

    expect(screen.getByText("63 kW")).toBeInTheDocument();
    expect(screen.getByText("+5")).toBeInTheDocument();
  });
});
