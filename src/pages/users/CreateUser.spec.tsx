import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation } from "../../test/queryState";
import { buildCurrentUser, buildPlatformCapabilities, buildUser } from "../../test/fixtures";
import type { PlatformCapabilitiesResponse } from "../../api/models";
import { apiError } from "../../test/apiError";

const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

// Only the write is replaced, and only because these tests assert its arguments.
// Everything else in the module stays real, including the query-key getters the
// actions layer invalidates with. The gate itself runs for real -- which is the
// point: what is under test is that the submit follows the caller's platform
// capabilities, and stubbing usePlatformActions would mean restating that rule
// in the test instead of exercising it.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreateUser: vi.fn(),
}));

const loggedUser = vi.hoisted(() => ({ current: null as ReturnType<typeof Object> | null }));

vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => loggedUser.current,
}));

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

// The form is stubbed so one click stands in for filling it, as it was before.
// It passes `disabled` through, because that is the part of the contract this
// page now depends on: a caller without the capability must not be offered a
// live submit. UserForm.spec owns whether the real form honours it.
vi.mock("../../components/UserForm/UserForm", () => ({
  UserForm: ({
    handleSubmit,
    submitLabel,
    disabled,
  }: {
    handleSubmit: (v: Record<string, unknown>) => void;
    submitLabel: string;
    disabled?: boolean;
  }) => (
    <button
      disabled={disabled}
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

import { useCreateUser } from "../../api/users/users";
import { CreateUserPage } from "./CreateUser";

const SUBMIT = "Crear usuario";

function setup(platform: Partial<PlatformCapabilitiesResponse> | null = { canCreateUsers: true }) {
  loggedUser.current =
    platform === null ? null : buildCurrentUser({ platformCapabilities: buildPlatformCapabilities(platform) });
  return renderWithProviders(<CreateUserPage />);
}

describe("CreateUserPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreateUser).mockReturnValue(mutation.idle({ mutateAsync: mockMutateAsync }));
  });

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

  describe("a caller the platform lets create users", () => {
    it("renders UserForm submit button with correct label", () => {
      setup();

      expect(screen.getByRole("button", { name: SUBMIT })).toBeEnabled();
    });

    it("calls createUser with mapped data and navigates to /users on success", async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce(buildUser({ id: "new-id", fullName: "Ana García" }));
      setup();

      await user.click(screen.getByRole("button", { name: SUBMIT }));

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
        expect(mockNavigate).toHaveBeenCalledWith("/users");
      });

      // No community is named, which is why this gates on the PLATFORM's
      // canCreateUsers: the user is attached to no community. Creating one
      // inside a community is a different surface with its own answer.
      const submittedData = mockMutateAsync.mock.calls[0][0].data;
      expect(submittedData).not.toHaveProperty("role");
      expect(submittedData).not.toHaveProperty("communityId");
      expect(submittedData).not.toHaveProperty("communityRole");
    });

    it("dispatches error and does not navigate when the write fails", async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValueOnce(new Error("Network error"));
      setup();

      await user.click(screen.getByRole("button", { name: SUBMIT }));

      await waitFor(() => {
        expect(mockErrorDispatch).toHaveBeenCalledWith(
          "Ha habido un problema al crear el usuario. Por favor, inténtalo más tarde",
        );
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    // #196: the server is the authority on the password policy. When it
    // refuses one, the admin is told which rule, not to try again later.
    it.each([
      ["TOO_SHORT", "La contraseña debe tener al menos 15 caracteres."],
      ["TOO_LONG", "La contraseña no puede tener más de 64 caracteres."],
    ])("says which policy rule (%s) the server refused the password for", async (rule, message) => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValueOnce(
        apiError(400, { code: "USER_PASSWORD_POLICY_VIOLATION", params: { rule } }),
      );
      setup();

      await user.click(screen.getByRole("button", { name: SUBMIT }));

      await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(message));
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // The route guard already refuses this, so it is the second line rather than
  // the first -- but the form must not present itself as a live write path.
  describe("a caller the platform does not", () => {
    it("offers no way to submit, and writes nothing if one is forced", async () => {
      setup({ canCreateUsers: false });

      expect(screen.getByRole("button", { name: SUBMIT })).toBeDisabled();

      await userEvent.click(screen.getByRole("button", { name: SUBMIT }));
      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // Not yet known is not "no", and it is not "yes" either.
  it("offers no submit while the current user has not arrived", () => {
    setup(null);

    expect(screen.getByRole("button", { name: SUBMIT })).toBeDisabled();
  });
});
