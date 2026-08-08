import "@testing-library/jest-dom";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { SharingAgreementsPage } from "./SharingAgreementsPage";

const mockErrorDispatch = vi.fn();
const mockUseSharingAgreementsData = vi.fn();

vi.mock("../../context/error.context", () => ({
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock("./useSharingAgreementsData", () => ({
  useSharingAgreementsData: (...args: unknown[]) => mockUseSharingAgreementsData(...args),
}));

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
  test("renders the page title and breadcrumb when data loads normally", () => {
    mockUseSharingAgreementsData.mockReturnValue({
      agreements: [],
      plant: undefined,
      counts: { total: 0, drafts: 0, historicos: 0 },
      isLoading: false,
      isNotFound: false,
      error: null,
    });
    setup("plant-42");

    expect(screen.getByRole("heading", { name: "Acuerdos de Reparto" })).toBeInTheDocument();
    const planLink = screen.getByText("Planta").closest("a");
    expect(planLink).toHaveAttribute("href", "/production/plant-42");
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  test("renders a dedicated not-found state instead of the title, without dispatching a toast", () => {
    mockUseSharingAgreementsData.mockReturnValue({
      agreements: [],
      plant: undefined,
      counts: { total: 0, drafts: 0, historicos: 0 },
      isLoading: false,
      isNotFound: true,
      error: null,
    });
    setup();

    expect(screen.getByText("Planta no encontrada")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Acuerdos de Reparto" })).not.toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  test("dispatches the generic error toast for a non-404 error", () => {
    mockUseSharingAgreementsData.mockReturnValue({
      agreements: [],
      plant: undefined,
      counts: { total: 0, drafts: 0, historicos: 0 },
      isLoading: false,
      isNotFound: false,
      error: { response: { status: 500 } },
    });
    setup();

    expect(mockErrorDispatch).toHaveBeenCalledWith(
      "Ha habido un problema al cargar los acuerdos de reparto. Por favor, inténtalo más tarde",
    );
  });
});
