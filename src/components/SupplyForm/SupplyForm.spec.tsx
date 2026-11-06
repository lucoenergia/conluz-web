import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";

// Crear los mocks
const mockNavigate = vi.fn();
const mockHandleSubmit = vi.fn();

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

// Imports después de los mocks
import { SupplyForm } from "./SupplyForm";
import userEvent from "@testing-library/user-event";

describe("Supply Form", () => {
  beforeEach(() => {
    // Limpiar mocks
    vi.clearAllMocks();
    // Configurar mocks
    mockNavigate.mockClear();
    mockHandleSubmit.mockClear();
  });

  const setup = () => {
    renderWithProviders(<SupplyForm handleSubmit={mockHandleSubmit} />);
  };

  it("Submits correct data", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText("Nombre"), "Mi casa");
    await user.type(screen.getByLabelText(/CUPS/i), "ES002100823463");
    await user.type(screen.getByLabelText(/Dirección/i), "Calle Escuadra 3");
    await user.type(screen.getByLabelText(/Referencia catastral/i), "AS35NB354223");
    await user.click(screen.getByRole("button"));
    expect(mockHandleSubmit).toBeCalledWith({
      name: "Mi casa",
      cups: "ES002100823463",
      address: "Calle Escuadra 3",
      addressRef: "AS35NB354223",
      personalId: undefined,
    });
  });

  it("Loads inital values and shows correct button text", async () => {
    renderWithProviders(
      <SupplyForm
        handleSubmit={mockHandleSubmit}
        initialValues={{
          name: "Mi casa",
          cups: "ES002100823463",
          address: "Calle Escuadra 3",
          addressRef: "AS35NB354223",
        }}
      />,
    );
    expect(screen.getByDisplayValue("Mi casa")).toBeVisible();
    expect(screen.getByDisplayValue("ES002100823463")).toBeVisible();
    expect(screen.getByDisplayValue("Calle Escuadra 3")).toBeVisible();
    expect(screen.getByDisplayValue("AS35NB354223")).toBeVisible();
    expect(screen.getByText("Guardar cambios")).toBeVisible();
  });

  it("keeps the submit disabled while the members are loading", () => {
    renderWithProviders(<SupplyForm handleSubmit={mockHandleSubmit} owner={{ mode: "choose", status: "loading", options: [] }} />);

    expect(screen.getByRole("combobox", { name: /^Propietario/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear punto de suministro" })).toBeDisabled();
  });

  it("shows a given owner read-only, with no picker", () => {
    renderWithProviders(<SupplyForm handleSubmit={mockHandleSubmit} owner={{ mode: "show", fullName: "Ana García" }} />);

    expect(screen.getByRole("textbox", { name: "Propietario" })).toHaveValue("Ana García");
    expect(screen.getByRole("textbox", { name: "Propietario" })).toHaveAttribute("readonly");
    expect(screen.queryByRole("combobox", { name: /^Propietario/ })).not.toBeInTheDocument();
  });
});
