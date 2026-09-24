import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation } from "../../test/queryState";
import { useCreateUser } from "../../api/users/users";

const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

vi.mock(import("../../api/users/users"), () => ({
  useCreateUser: vi.fn(),
}));

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock("../../components/PartnerForm/PartnerForm", () => ({
  PartnerForm: ({ handleSubmit, submitLabel }: { handleSubmit: (v: Record<string, unknown>) => void; submitLabel: string }) => (
    <button
      onClick={() =>
        handleSubmit({
          fullName: "Ana García",
          personalId: "12345678Z",
          number: 1,
          email: "ana@example.com",
          address: "Calle Mayor 1",
          phoneNumber: "600123456",
          password: "secreto123",
        })
      }
    >
      {submitLabel}
    </button>
  ),
}));

import { CreateUserPage } from "./CreateUser";

describe("CreateUserPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreateUser).mockReturnValue(mutation.idle({ mutateAsync: mockMutateAsync }));
  });

  const setup = () => {
    renderWithProviders(<CreateUserPage />);
  };

  it("renders page header with user-scoped title", () => {
    setup();

    expect(screen.getByText("Crear nuevo usuario")).toBeInTheDocument();
    expect(screen.getByText("Registra un nuevo usuario en la plataforma")).toBeInTheDocument();
  });

  it("renders breadcrumb with Usuarios (not Socios)", () => {
    setup();

    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
    expect(screen.queryByText("Socios")).not.toBeInTheDocument();
  });

  it("renders PartnerForm submit button with correct label", () => {
    setup();

    expect(screen.getByRole("button", { name: "Crear usuario" })).toBeInTheDocument();
  });

  it("calls createUser with mapped data and navigates to /users on success", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ id: "new-id", fullName: "Ana García" });
    setup();

    await user.click(screen.getByRole("button", { name: "Crear usuario" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        data: {
          fullName: "Ana García",
          personalId: "12345678Z",
          number: 1,
          email: "ana@example.com",
          address: "Calle Mayor 1",
          phoneNumber: "600123456",
          password: "secreto123",
        },
      });
      const submittedData = mockMutateAsync.mock.calls[0][0].data;
      expect(submittedData).not.toHaveProperty("role");
      expect(submittedData).not.toHaveProperty("communityId");
      expect(submittedData).not.toHaveProperty("communityRole");
      expect(mockNavigate).toHaveBeenCalledWith("/users");
    });
  });

  it("dispatches error and does not navigate when API returns falsy response", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce(null);
    setup();

    await user.click(screen.getByRole("button", { name: "Crear usuario" }));

    await waitFor(() => {
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Ha habido un problema al crear el usuario. Por favor, inténtalo más tarde",
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("dispatches error and does not navigate when API throws", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValueOnce(new Error("Network error"));
    setup();

    await user.click(screen.getByRole("button", { name: "Crear usuario" }));

    await waitFor(() => {
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Ha habido un problema al crear el usuario. Por favor, inténtalo más tarde",
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
