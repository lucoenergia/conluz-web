import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter } from "react-router";
import { theme } from "../../theme";
import { CoefficientHistory, type CoefficientHistoryProps } from "./CoefficientHistory";
import type { PartitionCoefficientResponse } from "../../api/models";

const PLANT_NORTE = { id: "plant-norte", name: "Planta Solar Norte" };
const PLANT_SUR = { id: "plant-sur", name: "Planta Solar Sur" };

function period(overrides: Partial<PartitionCoefficientResponse>): PartitionCoefficientResponse {
  return {
    id: "p1",
    supply: { id: "s1", code: "ES0031300000000001AB", name: "Vivienda A" },
    plant: PLANT_NORTE,
    sharingAgreement: { id: "sa-2024", name: "Reparto 2024", status: "PUBLISHED" },
    coefficient: 0.15,
    validFrom: "2024-01-01T00:00:00Z",
    validTo: null,
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

/**
 * A supply genuinely participating in two plants. Single-plant fixtures
 * validate no selection logic at all, so every grouping assertion below runs
 * against this shape.
 */
const TWO_PLANT_HISTORY: PartitionCoefficientResponse[] = [
  period({
    id: "norte-old",
    plant: PLANT_NORTE,
    sharingAgreement: { id: "sa-2023", name: "Reparto 2023", status: "SUPERSEDED" },
    coefficient: 0.1,
    validFrom: "2023-01-01T00:00:00Z",
    validTo: "2024-01-01T00:00:00Z",
  }),
  period({
    id: "norte-active",
    plant: PLANT_NORTE,
    sharingAgreement: { id: "sa-2024", name: "Reparto 2024", status: "PUBLISHED" },
    coefficient: 0.15,
    validFrom: "2024-01-01T00:00:00Z",
    validTo: null,
  }),
  period({
    id: "sur-active",
    plant: PLANT_SUR,
    sharingAgreement: { id: "sa-sur", name: "Reparto Sur", status: "PUBLISHED" },
    coefficient: 0.2,
    validFrom: "2025-06-01T00:00:00Z",
    validTo: null,
  }),
];

function renderHistory(props: Partial<CoefficientHistoryProps> = {}) {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <CoefficientHistory periods={TWO_PLANT_HISTORY} {...props} />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("CoefficientHistory", () => {
  it("groups a two-plant timeline under one heading per plant", () => {
    renderHistory();

    expect(screen.getByRole("heading", { name: "Planta Solar Norte" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Planta Solar Sur" })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Periodos de Planta Solar Norte" })).getAllByRole("listitem")).toHaveLength(2);
    expect(within(screen.getByRole("list", { name: "Periodos de Planta Solar Sur" })).getAllByRole("listitem")).toHaveLength(1);
  });

  it("orders each plant's periods newest first", () => {
    renderHistory();

    const norte = within(screen.getByRole("list", { name: "Periodos de Planta Solar Norte" })).getAllByRole("listitem");
    expect(norte[0]).toHaveTextContent("Reparto 2024");
    expect(norte[1]).toHaveTextContent("Reparto 2023");
  });

  it("excludes pending periods, which admins receive but which were never in force", () => {
    renderHistory({
      periods: [
        ...TWO_PLANT_HISTORY,
        period({ id: "pending", sharingAgreement: { id: "sa-draft", name: "Borrador 2026", status: "DRAFT" }, validFrom: null }),
      ],
    });

    expect(screen.queryByText("Borrador 2026")).not.toBeInTheDocument();
  });

  it("marks the active period of each plant, so a two-plant supply shows two", () => {
    renderHistory();

    expect(screen.getAllByText("En vigor")).toHaveLength(2);

    const norte = within(screen.getByRole("list", { name: "Periodos de Planta Solar Norte" })).getAllByRole("listitem");
    expect(within(norte[0]).getByText("En vigor")).toBeInTheDocument();
    expect(within(norte[1]).queryByText("En vigor")).not.toBeInTheDocument();
  });

  it("shows an open period as open-ended and a closed one as a raw validTo range", () => {
    renderHistory();

    expect(screen.getByText("Desde 1 ene 2024")).toBeInTheDocument();
    expect(screen.getByText("1 ene 2023 → 1 ene 2024")).toBeInTheDocument();
  });

  it("formats coefficients at the same four decimals as the rest of the app", () => {
    renderHistory();

    expect(screen.getByText("15,0000 %")).toBeInTheDocument();
    expect(screen.getByText("20,0000 %")).toBeInTheDocument();
  });

  it("renders no links at all when links are not allowed", () => {
    renderHistory({ showAgreementLinks: false });

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText("Reparto 2024")).toBeInTheDocument();
  });

  it("links each agreement to its own plant's agreement page when links are allowed", () => {
    renderHistory({ showAgreementLinks: true });

    expect(screen.getByRole("link", { name: "Reparto 2024" })).toHaveAttribute(
      "href",
      "/production/plant-norte/sharing-agreements/sa-2024",
    );
    expect(screen.getByRole("link", { name: "Reparto Sur" })).toHaveAttribute(
      "href",
      "/production/plant-sur/sharing-agreements/sa-sur",
    );
  });

  it("marks the agreement already on screen and does not link it to itself", () => {
    renderHistory({ showAgreementLinks: true, currentSharingAgreementId: "sa-2024" });

    expect(screen.queryByRole("link", { name: "Reparto 2024" })).not.toBeInTheDocument();
    expect(screen.getByText("Este acuerdo")).toBeInTheDocument();
    // The other periods keep their links.
    expect(screen.getByRole("link", { name: "Reparto 2023" })).toBeInTheDocument();
  });

  it("shows the empty state when every period is pending", () => {
    renderHistory({ periods: [period({ validFrom: null })] });

    expect(screen.getByText("Sin periodos aplicados")).toBeInTheDocument();
  });

  it("shows a caller-supplied empty subtitle", () => {
    renderHistory({ periods: [], emptySubtitle: "Este suministro todavía no reparte producción." });

    expect(screen.getByText("Este suministro todavía no reparte producción.")).toBeInTheDocument();
  });

  it("shows a spinner while loading, and no empty state", () => {
    renderHistory({ periods: undefined, isLoading: true });

    expect(screen.getByLabelText("Cargando el histórico de coeficientes")).toBeInTheDocument();
    expect(screen.queryByText("Sin periodos aplicados")).not.toBeInTheDocument();
  });

  it("shows an error instead of an empty state when the query failed", () => {
    renderHistory({ periods: undefined, error: new Error("boom") });

    expect(screen.getByRole("alert")).toHaveTextContent("No se ha podido cargar el histórico de coeficientes");
    expect(screen.queryByText("Sin periodos aplicados")).not.toBeInTheDocument();
  });
});
