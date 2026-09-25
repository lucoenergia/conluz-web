import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { useGetAllUsers, type getAllUsers } from "../../api/users/users";

// Crear los mocks
const mockNavigate = vi.fn();
const mockHandleSubmit = vi.fn();

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

// The form loads the user list for its owner picker; answer with a settled,
// empty page so no test reaches the network.
vi.mock(import("../../api/users/users"), () => ({
  useGetAllUsers: vi.fn(),
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
    vi.mocked(useGetAllUsers).mockReturnValue(
      query.success<typeof getAllUsers>({ items: [], size: 0, totalElements: 0, totalPages: 0, number: 0 }),
    );
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
      personalId: "",
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
});
