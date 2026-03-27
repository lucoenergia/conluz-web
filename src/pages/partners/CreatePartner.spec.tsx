import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

// Mocks
const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../api/users/users", () => ({
  useCreateUser: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

vi.mock("../../context/error.context", () => ({
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock("../../components/PartnerForm/PartnerForm", () => ({
  PartnerForm: ({ handleSubmit, submitLabel }: any) => (
    <button
      onClick={() =>
        handleSubmit({
          fullName: "Juan García",
          personalId: "12345678Z",
          number: 42,
          email: "juan@example.com",
          address: "Calle Mayor 1",
          phoneNumber: "600123456",
          password: "secreto123",
          role: "PARTNER",
        })
      }
    >
      {submitLabel}
    </button>
  ),
}));

// Imports after mocks
import { MemoryRouter } from "react-router";
import { CreatePartnerPage } from "./CreatePartner";

describe("CreatePartnerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = () => {
    render(
      <MemoryRouter>
        <CreatePartnerPage />
      </MemoryRouter>,
    );
  };

  it("renders page header with correct title", () => {
    setup();

    expect(screen.getByText("Crear nuevo socio")).toBeInTheDocument();
    expect(screen.getByText("Registra un nuevo socio en la comunidad energética")).toBeInTheDocument();
  });

  it("renders breadcrumb navigation", () => {
    setup();

    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Socios")).toBeInTheDocument();
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
  });

  it("renders PartnerForm submit button with correct label", () => {
    setup();

    expect(screen.getByRole("button", { name: "Crear socio" })).toBeInTheDocument();
  });

  it("calls createUser with mapped data and navigates to /partners on success", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ id: "new-id", fullName: "Juan García" });
    setup();

    await user.click(screen.getByRole("button", { name: "Crear socio" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        data: {
          fullName: "Juan García",
          personalId: "12345678Z",
          number: 42,
          email: "juan@example.com",
          address: "Calle Mayor 1",
          phoneNumber: "600123456",
          password: "secreto123",
          role: "PARTNER",
        },
      });
      expect(mockNavigate).toHaveBeenCalledWith("/partners");
    });
  });

  it("dispatches error and does not navigate when API returns falsy response", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce(null);
    setup();

    await user.click(screen.getByRole("button", { name: "Crear socio" }));

    await waitFor(() => {
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Ha habido un problema al crear el socio. Por favor, inténtalo más tarde",
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("dispatches error and does not navigate when API throws", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValueOnce(new Error("Network error"));
    setup();

    await user.click(screen.getByRole("button", { name: "Crear socio" }));

    await waitFor(() => {
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Ha habido un problema al crear el socio. Por favor, inténtalo más tarde",
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
