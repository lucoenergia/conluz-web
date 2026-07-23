import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Crear los mocks
const mockNavigate = vi.fn();
const mockHandleSubmit = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Imports después de los mocks
import { MemoryRouter } from "react-router";
import { SupplyForm } from "./SupplyForm";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

describe("Supply Form", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Limpiar mocks
    vi.clearAllMocks();
    // Configurar mocks
    mockNavigate.mockClear();
    mockHandleSubmit.mockClear();
    // Create a new QueryClient for each test to ensure isolation
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  const setup = () => {
    render(
      <TestWrapper>
        <SupplyForm handleSubmit={mockHandleSubmit} />
      </TestWrapper>,
    );
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
    render(
      <TestWrapper>
        <SupplyForm
          handleSubmit={mockHandleSubmit}
          initialValues={{
            name: "Mi casa",
            cups: "ES002100823463",
            address: "Calle Escuadra 3",
            addressRef: "AS35NB354223",
          }}
        />
      </TestWrapper>,
    );
    expect(screen.getByDisplayValue("Mi casa")).toBeVisible();
    expect(screen.getByDisplayValue("ES002100823463")).toBeVisible();
    expect(screen.getByDisplayValue("Calle Escuadra 3")).toBeVisible();
    expect(screen.getByDisplayValue("AS35NB354223")).toBeVisible();
    expect(screen.getByText("Guardar cambios")).toBeVisible();
  });
});
