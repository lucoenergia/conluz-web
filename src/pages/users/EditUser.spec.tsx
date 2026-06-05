import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();
const mockMutateAsync = vi.fn();
const mockGetUserById = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ userId: "test-user-id" }),
  };
});

vi.mock("../../api/users/users", () => ({
  useGetUserById: (id: string) => mockGetUserById(id),
  useUpdateUser: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

vi.mock("../../context/error.context", () => ({
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock("../../components/PartnerForm/PartnerForm", () => ({
  PartnerForm: ({ handleSubmit, submitLabel, initialValues, mode }: {
    handleSubmit: (v: Record<string, unknown>) => void;
    submitLabel: string;
    initialValues?: Record<string, string | number | undefined>;
    mode: string;
  }) => (
    <div>
      <span data-testid="form-mode">{mode}</span>
      <span data-testid="form-initial-fullname">{initialValues?.fullName}</span>
      <span data-testid="form-initial-email">{initialValues?.email}</span>
      <button
        data-testid="mock-partner-form"
        onClick={() =>
          handleSubmit({
            fullName: initialValues?.fullName ?? "Updated Name",
            personalId: initialValues?.personalId ?? "12345678Z",
            email: initialValues?.email ?? "updated@example.com",
            address: initialValues?.address ?? "Updated Address",
            phoneNumber: initialValues?.phoneNumber ?? "600000000",
          })
        }
      >
        {submitLabel}
      </button>
    </div>
  ),
}));

import { MemoryRouter } from "react-router";
import { EditUserPage } from "./EditUser";

const mockUserData = {
  id: "test-user-id",
  fullName: "Carlos Ruiz",
  personalId: "87654321X",
  email: "carlos@example.com",
  address: "Avenida Libertad 5",
  phoneNumber: "611987654",
  number: 3,
  role: "PARTNER" as const,
  enabled: true,
};

describe("EditUserPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserById.mockReturnValue({ data: mockUserData, isLoading: false, error: null });
  });

  const setup = () => {
    render(
      <MemoryRouter>
        <EditUserPage />
      </MemoryRouter>,
    );
  };

  it("shows loading spinner while fetching user data", () => {
    mockGetUserById.mockReturnValue({ data: null, isLoading: true, error: null });
    setup();

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText("Editar usuario")).not.toBeInTheDocument();
  });

  it("shows error alert when user data cannot be loaded", () => {
    mockGetUserById.mockReturnValue({ data: null, isLoading: false, error: new Error("Not found") });
    setup();

    expect(screen.getByText("No se pudo cargar la información del usuario")).toBeInTheDocument();
  });

  it("shows error alert when user data is null without an error", () => {
    mockGetUserById.mockReturnValue({ data: null, isLoading: false, error: null });
    setup();

    expect(screen.getByText("No se pudo cargar la información del usuario")).toBeInTheDocument();
  });

  it("renders page header and breadcrumb with Usuarios (not Socios)", () => {
    setup();

    expect(screen.getByText("Editar usuario")).toBeInTheDocument();
    expect(screen.getAllByText("Carlos Ruiz").length).toBeGreaterThan(0);
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    expect(screen.queryByText("Socios")).not.toBeInTheDocument();
  });

  it("renders PartnerForm in edit mode with user initial values", () => {
    setup();

    expect(screen.getByTestId("form-mode")).toHaveTextContent("edit");
    expect(screen.getByTestId("form-initial-fullname")).toHaveTextContent("Carlos Ruiz");
    expect(screen.getByTestId("form-initial-email")).toHaveTextContent("carlos@example.com");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });

  it("calls updateUser with correct data and navigates to /users on success", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ id: "test-user-id", fullName: "Carlos Ruiz" });
    setup();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        {
          id: "test-user-id",
          data: expect.objectContaining({
            fullName: mockUserData.fullName,
            email: mockUserData.email,
          }),
        },
        {},
      );
      expect(mockNavigate).toHaveBeenCalledWith("/users");
    });
  });

  it("dispatches user-scoped error and does not navigate when API returns falsy response", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce(null);
    setup();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Ha habido un problema al editar el usuario. Por favor, inténtalo más tarde",
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("dispatches user-scoped error and does not navigate when API throws", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValueOnce(new Error("Network error"));
    setup();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Ha habido un problema al editar el usuario. Por favor, inténtalo más tarde",
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
