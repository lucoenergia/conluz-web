import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMediaQuery } from "@mui/material";
import { PlantDetailHeader } from "./PlantDetailHeader";
import type { PlantResponse } from "../../api/models";
import { renderWithProviders } from "../../test/renderWithProviders";
import { declaredStyle } from "../../test/declaredStyle";
import { buildPlant, buildPlantCapabilities } from "../../test/fixtures";
import { colors } from "../../theme/tokens";

// The strip's width decides how many key facts it holds.
vi.mock("@mui/material", async () => ({ ...(await vi.importActual("@mui/material")), useMediaQuery: vi.fn() }));
const mockUseMediaQuery = useMediaQuery as unknown as Mock;
beforeEach(() => mockUseMediaQuery.mockReturnValue(false));

const CIL = "ES0031405000000001AB1F001";

const PLANT = buildPlant({
  id: "plant-1",
  name: "Planta Luco",
  regulatoryCode: "ES0031300325733001FH0FA000",
  cil: CIL,
  peakPowerKWp: 80,
  nominalPowerKW: 60,
  capabilities: buildPlantCapabilities({ canRead: true }),
});

/** The type requires the field, so an answer without it can only be built by deleting it. */
function withoutCil(plant: PlantResponse): PlantResponse {
  const copy: Partial<PlantResponse> = { ...plant };
  delete copy.cil;
  return copy as PlantResponse;
}

// Rendered with the app's theme, so "neutral" is the theme's own text colour.
const renderHeader = (plant: PlantResponse) => renderWithProviders(<PlantDetailHeader plant={plant} />);

const expandDetails = async () => {
  await userEvent.setup().click(screen.getByRole("button", { name: /^Ver \d+ dato/ }));
};

/** The value under a details label. */
const detail = (label: string) => screen.getByText(label).parentElement as HTMLElement;

describe("UI-PLT-015 the plant's CIL in the header's details (#407)", () => {
  it("UI-PLT-015 shows the plant's CIL among the details", async () => {
    renderHeader(PLANT);
    await expandDetails();

    expect(detail("CIL")).toHaveTextContent(CIL);
    expect(screen.queryByText("Sin CIL")).not.toBeInTheDocument();
  });

  it("UI-PLT-015 offers nothing to do with the CIL: no copy control", async () => {
    renderHeader(PLANT);
    await expandDetails();

    expect(screen.queryByRole("button", { name: /CIL/ })).not.toBeInTheDocument();
  });

  it.each([
    ["null", { ...PLANT, cil: null }],
    ["absent", withoutCil(PLANT)],
  ])("UI-PLT-015 says «Sin CIL» in neutral text when the CIL is %s", async (_, plant) => {
    renderHeader(plant);
    await expandDetails();

    const none = screen.getByText("Sin CIL");
    expect(detail("CIL")).toHaveTextContent("Sin CIL");
    // Neutral, never alert colour (UI-PLT-006).
    expect(declaredStyle(none).color?.toLowerCase()).toBe(colors.text.secondary.toLowerCase());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("UI-PLT-016 the header's key facts are the CAU and both powers (#407)", () => {
  it("UI-PLT-016 shows the CAU, the peak power in kWp and the nominal power in kW", () => {
    renderHeader(PLANT);

    expect(screen.getByText("CAU").parentElement).toHaveTextContent("ES0031300325733001FH0FA000");
    expect(screen.getByText("Potencia pico").parentElement).toHaveTextContent("80 kWp");
    expect(screen.getByText("Potencia nominal").parentElement).toHaveTextContent("60 kW");
  });

  it("UI-PLT-016 on a phone keeps the CAU, copyable, and the peak power, and moves the nominal power into the details", async () => {
    mockUseMediaQuery.mockReturnValue(true);
    renderHeader(PLANT);

    expect(screen.getByRole("button", { name: "Copiar CAU" })).toBeInTheDocument();
    expect(screen.getByText("80 kWp")).toBeInTheDocument();
    expect(screen.queryByText("60 kW")).not.toBeInTheDocument();

    await expandDetails();

    expect(screen.getByText("Potencia nominal").parentElement).toHaveTextContent("60 kW");
  });
});
