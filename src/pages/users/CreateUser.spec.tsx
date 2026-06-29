import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

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

vi.mock("../../context/community.context", () => ({
  useActiveCommunity: () => "community-1",
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

import { MemoryRouter } from "react-router";
import { CreateUserPage } from "./CreateUser";

describe("CreateUserPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = () => {
    render(
      <MemoryRouter>
        <CreateUserPage />
      </MemoryRouter>,
    );
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
          communityId: "community-1",
          communityRole: "COMMUNITY_MEMBER",
        },
      });
      const submittedData = mockMutateAsync.mock.calls[0][0].data;
      expect(submittedData).not.toHaveProperty("role");
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
