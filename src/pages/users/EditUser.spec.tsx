import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { buildUser, buildUserCapabilities } from "../../test/fixtures";
import type { UserCapabilitiesResponse, UserResponse } from "../../api/models";

const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

// The read, and the write whose arguments these tests assert. Everything else in
// the module stays real, including the query-key getters the actions layer
// invalidates with -- and the gate runs for real, which is the point: what is
// under test is that the submit follows the account's own canEdit.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetUserById: vi.fn(),
  useUpdateUser: vi.fn(),
}));

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

// The form is stubbed so one click stands in for filling it, as it was before.
// It passes `disabled` through, because that is the part of the contract this
// page now depends on: a caller without canEdit must not be offered a live
// submit. UserForm.spec owns whether the real form honours it.
vi.mock("../../components/UserForm/UserForm", () => ({
  UserForm: ({ handleSubmit, submitLabel, initialValues, mode, disabled }: {
    handleSubmit: (v: Record<string, unknown>) => void;
    submitLabel: string;
    initialValues?: Record<string, string | number | undefined>;
    mode: string;
    disabled?: boolean;
  }) => (
    <div>
      <span data-testid="form-mode">{mode}</span>
      <span data-testid="form-initial-fullname">{initialValues?.fullName}</span>
      <span data-testid="form-initial-email">{initialValues?.email}</span>
      <button
        data-testid="mock-user-form"
        disabled={disabled}
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

import { Route, Routes } from "react-router";
import { useGetUserById, useUpdateUser, type getUserById } from "../../api/users/users";
import { EditUserPage } from "./EditUser";

const mockGetUserById = vi.mocked(useGetUserById);

const SUBMIT = "Guardar cambios";

const editableUser = (capabilities: Partial<UserCapabilitiesResponse> = { canEdit: true }): UserResponse =>
  buildUser({
    id: "test-user-id",
    fullName: "Carlos Ruiz",
    personalId: "87654321X",
    email: "carlos@example.com",
    address: "Avenida Libertad 5",
    phoneNumber: "611987654",
    number: 3,
    enabled: true,
    capabilities: buildUserCapabilities({ canRead: true, ...capabilities }),
  });

const mockUserData = editableUser();

describe("EditUserPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserById.mockReturnValue(query.success<typeof getUserById>(mockUserData));
    vi.mocked(useUpdateUser).mockReturnValue(mutation.idle({ mutateAsync: mockMutateAsync }));
  });

  const setup = () => {
    // The userId comes from real routing, as under /users/:userId/edit in App.tsx.
    renderWithProviders(
      <Routes>
        <Route path="/users/:userId/edit" element={<EditUserPage />} />
      </Routes>,
      { route: "/users/test-user-id/edit" },
    );
  };

  it("shows loading spinner while fetching user data", () => {
    mockGetUserById.mockReturnValue(query.loading());
    setup();

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText("Editar usuario")).not.toBeInTheDocument();
  });

  it("shows error alert when user data cannot be loaded", () => {
    mockGetUserById.mockReturnValue(query.error(new Error("Not found")));
    setup();

    expect(screen.getByText("No se pudo cargar la información del usuario")).toBeInTheDocument();
  });

  it("shows error alert when user data is null without an error", () => {
    // No data and no error: reachable only while the query is disabled (no id in the route).
    mockGetUserById.mockReturnValue(query.disabled());
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

  it("renders UserForm in edit mode with user initial values", () => {
    setup();

    expect(screen.getByTestId("form-mode")).toHaveTextContent("edit");
    expect(screen.getByTestId("form-initial-fullname")).toHaveTextContent("Carlos Ruiz");
    expect(screen.getByTestId("form-initial-email")).toHaveTextContent("carlos@example.com");
    expect(screen.getByRole("button", { name: SUBMIT })).toBeEnabled();
  });

  it("calls updateUser with correct data and navigates to /users on success", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce(mockUserData);
    setup();

    await user.click(screen.getByRole("button", { name: SUBMIT }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        userId: "test-user-id",
        data: expect.objectContaining({
          fullName: mockUserData.fullName,
          email: mockUserData.email,
          // Read off the loaded account rather than cast away. UpdateUserBody
          // requires it, and the cast this page used to carry hid that.
          number: 3,
        }),
      });
      expect(mockNavigate).toHaveBeenCalledWith("/users");
    });

    expect(mockMutateAsync.mock.calls[0][0].data).not.toHaveProperty("role");
  });

  it("dispatches user-scoped error and does not navigate when the write fails", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValueOnce(new Error("Network error"));
    setup();

    await user.click(screen.getByRole("button", { name: SUBMIT }));

    await waitFor(() => {
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Ha habido un problema al editar el usuario. Por favor, inténtalo más tarde",
      );
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // The route guard already refuses this, so it is the second line rather than
  // the first -- but the form must not present itself as a live write path.
  // canEdit is false for an ordinary member on their own record by documented
  // design: changing one's own details is PUT /users/profile.
  it("offers no way to submit when the account does not permit an administrative edit", async () => {
    mockGetUserById.mockReturnValue(query.success<typeof getUserById>(editableUser({ canEdit: false })));
    setup();

    expect(screen.getByRole("button", { name: SUBMIT })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: SUBMIT }));
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
