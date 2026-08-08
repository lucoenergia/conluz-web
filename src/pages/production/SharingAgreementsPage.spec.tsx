import "@testing-library/jest-dom";
import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { SharingAgreementsPage } from "./SharingAgreementsPage";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse } from "../../api/models";
import type { SharingAgreementsData } from "./useSharingAgreementsData";

const mockErrorDispatch = vi.fn();
const mockUseSharingAgreementsData = vi.fn();

vi.mock("../../context/error.context", () => ({
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock("./useSharingAgreementsData", () => ({
  useSharingAgreementsData: (...args: unknown[]) => mockUseSharingAgreementsData(...args),
}));

const AGREEMENTS: SharingAgreementResponse[] = [
  { id: "1", name: "Reparto vecinos bloque A", status: SharingAgreementResponseStatus.PUBLISHED },
  { id: "2", name: "Borrador reciente", status: SharingAgreementResponseStatus.DRAFT },
  { id: "3", name: "Acuerdo histórico norte", status: SharingAgreementResponseStatus.SUPERSEDED },
];

function mockData(overrides: Partial<SharingAgreementsData> = {}) {
  mockUseSharingAgreementsData.mockReturnValue({ ...baseData(), ...overrides });
}

function baseData(): SharingAgreementsData {
  return {
    agreements: AGREEMENTS,
    plant: { name: "Planta Solar Norte", regulatoryCode: "CAU-123" },
    counts: { total: 3, drafts: 1, historicos: 1 },
    isLoading: false,
    isNotFound: false,
    error: null,
  };
}

function setup(plantId = "plant-1") {
  render(
    <MemoryRouter initialEntries={[`/production/${plantId}/sharing-agreements`]}>
      <Routes>
        <Route path="/production/:plantId/sharing-agreements" element={<SharingAgreementsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SharingAgreementsPage", () => {
  test("renders plant name, CAU, counts and every agreement card on normal load", () => {
    mockData();
    setup("plant-42");

    expect(screen.getByRole("heading", { name: "Planta Solar Norte" })).toBeInTheDocument();
    expect(screen.getByText("CAU: CAU-123")).toBeInTheDocument();
    expect(screen.getByText("Reparto vecinos bloque A")).toBeInTheDocument();
    expect(screen.getByText("Borrador reciente")).toBeInTheDocument();
    expect(screen.getByText("Acuerdo histórico norte")).toBeInTheDocument();

    const planLink = screen.getByText("Planta").closest("a");
    expect(planLink).toHaveAttribute("href", "/production/plant-42");
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  test("renders a dedicated not-found state instead of the header, without dispatching a toast", () => {
    mockData({ isNotFound: true, agreements: [], plant: undefined });
    setup();

    expect(screen.getByText("Planta no encontrada")).toBeInTheDocument();
    expect(screen.queryByText("Reparto vecinos bloque A")).not.toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  test("dispatches the generic error toast for a non-404 error", () => {
    mockData({ error: { response: { status: 500 } } });
    setup();

    expect(mockErrorDispatch).toHaveBeenCalledWith(
      "Ha habido un problema al cargar los acuerdos de reparto. Por favor, inténtalo más tarde",
    );
  });

  test("shows a distinct empty state when the plant has no agreements at all", () => {
    mockData({ agreements: [], counts: { total: 0, drafts: 0, historicos: 0 } });
    setup();

    expect(screen.getByText("Esta planta todavía no tiene acuerdos de reparto registrados.")).toBeInTheDocument();
  });

  test("clicking a status chip filters the cards client-side without changing the header counts", async () => {
    mockData();
    setup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Borrador" }));

    expect(screen.getByText("Borrador reciente")).toBeInTheDocument();
    expect(screen.queryByText("Reparto vecinos bloque A")).not.toBeInTheDocument();
    expect(screen.queryByText("Acuerdo histórico norte")).not.toBeInTheDocument();
    // Header counts stay derived from the unfiltered response.
    expect(mockUseSharingAgreementsData).toHaveBeenCalled();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  test("search filters cards by name, case- and accent-insensitively", async () => {
    mockData();
    setup();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Buscar por nombre o notas..."), "historico");

    await waitFor(() => {
      expect(screen.getByText("Acuerdo histórico norte")).toBeInTheDocument();
      expect(screen.queryByText("Reparto vecinos bloque A")).not.toBeInTheDocument();
    });
  });

  test("shows the loading skeleton while data is loading", () => {
    mockData({ isLoading: true });
    setup();

    expect(screen.queryByText("Reparto vecinos bloque A")).not.toBeInTheDocument();
  });
});
