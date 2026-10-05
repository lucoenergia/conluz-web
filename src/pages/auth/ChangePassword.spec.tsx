import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes, useLocation } from "react-router";
import { useChangePassword, useGetCurrentUser, useUpdateProfile, type getCurrentUser } from "../../api/users/users";
import { useAuth } from "../../context/auth.context";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { buildCurrentUser } from "../../test/fixtures";
import { apiError } from "../../test/apiError";
import { expectPasswordFieldContract } from "../../test/passwordField";
import { ChangePasswordPage } from "./ChangePassword";
import { Login } from "./Login";

/**
 * Tier 1: the generated hooks are mocked, and everything between them and the
 * screen -- the action layer, the session, the router -- runs for real, so a
 * test can see the token go and the login page arrive.
 */
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useChangePassword: vi.fn(),
  useUpdateProfile: vi.fn(),
  useGetCurrentUser: vi.fn(),
}));

const mockChangePassword = vi.fn();

const VALID_NEW_PASSWORD = "el gato duerme junto a la ventana";

/** What the app holds as its session, and where the router is. */
const Probe = () => {
  const token = useAuth();
  const { pathname } = useLocation();
  return (
    <>
      <output aria-label="token">{token ?? "none"}</output>
      <output aria-label="path">{pathname}</output>
    </>
  );
};

function renderPage({ mustChangePassword = false } = {}) {
  vi.mocked(useGetCurrentUser).mockReturnValue(
    query.success<typeof getCurrentUser>(buildCurrentUser({ mustChangePassword })),
  );
  return renderWithProviders(
    <>
      <Routes>
        <Route path="change-password" element={<ChangePasswordPage />} />
        <Route path="login" element={<Login />} />
      </Routes>
      <Probe />
    </>,
    { route: "/change-password", token: "a-token", activeCommunityId: null },
  );
}

const currentField = () => screen.getByLabelText("Contraseña actual");
const newField = () => screen.getByLabelText("Nueva contraseña");
const confirmField = () => screen.getByLabelText("Repite la nueva contraseña");

async function fill(user: UserEvent, values: { current?: string; next?: string; confirm?: string }) {
  // Pasted, so spaces and emoji arrive exactly as given.
  if (values.current !== undefined) {
    await user.click(currentField());
    await user.paste(values.current);
  }
  if (values.next !== undefined) {
    await user.click(newField());
    await user.paste(values.next);
  }
  if (values.confirm !== undefined) {
    await user.click(confirmField());
    await user.paste(values.confirm);
  }
}

async function submit(user: UserEvent, values = { current: "la actual de siempre", next: VALID_NEW_PASSWORD, confirm: VALID_NEW_PASSWORD }) {
  await fill(user, values);
  await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
}

const token = () => screen.getByRole("status", { name: "token" });
const path = () => screen.getByRole("status", { name: "path" });

/** The field's own error text, from its MUI helper text. */
const helperTextOf = (input: HTMLElement) => {
  const id = input.getAttribute("aria-describedby")?.split(" ").find((ref) => ref.endsWith("-helper-text"));
  return id ? document.getElementById(id)?.textContent : undefined;
};

describe("ChangePasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useChangePassword).mockReturnValue(mutation.idle({ mutateAsync: mockChangePassword }));
    vi.mocked(useUpdateProfile).mockReturnValue(mutation.idle({ mutateAsync: vi.fn() }));
  });

  describe("on success (204)", () => {
    it("ends the session and lands on the login page with a confirmation (AC1)", async () => {
      mockChangePassword.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      renderPage();

      await submit(user);

      await waitFor(() => expect(path()).toHaveTextContent("/login"));
      expect(token()).toHaveTextContent("none");
      expect(screen.getByRole("alert")).toHaveTextContent("Contraseña cambiada. Inicia sesión con tu nueva contraseña.");
    });
  });

  describe("sends what was typed", () => {
    it("sends both passwords exactly as typed, spaces included (AC3)", async () => {
      mockChangePassword.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      renderPage();

      await submit(user, {
        current: "  actual con espacios  ",
        next: "  frase con espacios larga  ",
        confirm: "  frase con espacios larga  ",
      });

      await waitFor(() =>
        expect(mockChangePassword).toHaveBeenCalledWith({
          data: { currentPassword: "  actual con espacios  ", newPassword: "  frase con espacios larga  " },
        }),
      );
    });
  });

  describe("the fields (AC4)", () => {
    it("gives every field a toggle, the right autocomplete and no keyboard rewriting", async () => {
      const user = userEvent.setup();
      renderPage();

      await expectPasswordFieldContract(user, currentField(), "current-password");
      await expectPasswordFieldContract(user, newField(), "new-password");
      await expectPasswordFieldContract(user, confirmField(), "new-password");
    });

    it("shows the policy with a passphrase example, tied to the new password", () => {
      renderPage();

      const hint = screen.getByText(/Usa entre 15 y 64 caracteres/);
      expect(hint).toHaveTextContent("«el gato duerme junto a la ventana»");
      expect(newField().getAttribute("aria-describedby")).toContain(hint.id);
    });
  });

  describe("client-side checks, before anything is sent (AC2)", () => {
    it.each([
      ["14 characters", "a".repeat(14), "La contraseña debe tener al menos 15 caracteres."],
      ["65 characters", "a".repeat(65), "La contraseña no puede tener más de 64 caracteres."],
      // 8 emoji: 16 UTF-16 units, but 8 characters.
      ["8 emoji", "😀".repeat(8), "La contraseña debe tener al menos 15 caracteres."],
      // 19 emoji: 19 characters, 76 bytes.
      ["19 emoji", "😀".repeat(19), "La contraseña es demasiado larga"],
    ])("refuses %s with a visible reason", async (_label, value, message) => {
      const user = userEvent.setup();
      renderPage();

      await submit(user, { current: "la actual de siempre", next: value, confirm: value });

      expect(helperTextOf(newField())).toContain(message);
      expect(mockChangePassword).not.toHaveBeenCalled();
      expect(token()).toHaveTextContent("a-token");
    });

    it("accepts 15 emoji, counted as 15 characters", async () => {
      mockChangePassword.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      renderPage();

      const emoji = "😀".repeat(15);
      await submit(user, { current: "la actual de siempre", next: emoji, confirm: emoji });

      await waitFor(() =>
        expect(mockChangePassword).toHaveBeenCalledWith({ data: { currentPassword: "la actual de siempre", newPassword: emoji } }),
      );
    });

    it("refuses a confirmation that does not match", async () => {
      const user = userEvent.setup();
      renderPage();

      await submit(user, { current: "la actual de siempre", next: VALID_NEW_PASSWORD, confirm: `${VALID_NEW_PASSWORD}!` });

      expect(helperTextOf(confirmField())).toBe("Las contraseñas no coinciden");
      expect(mockChangePassword).not.toHaveBeenCalled();
    });
  });

  describe("server refusals keep the user on the page and the session alive (AC2)", () => {
    it("marks the current password when it is wrong", async () => {
      mockChangePassword.mockRejectedValueOnce(apiError(400, { code: "USER_CURRENT_PASSWORD_INCORRECT" }));
      const user = userEvent.setup();
      renderPage();

      await submit(user);

      await waitFor(() => expect(helperTextOf(currentField())).toBe("La contraseña actual no es correcta."));
      expect(token()).toHaveTextContent("a-token");
      expect(path()).toHaveTextContent("/change-password");
    });

    it.each([
      ["TOO_SHORT", "La contraseña debe tener al menos 15 caracteres."],
      ["TOO_LONG", "La contraseña no puede tener más de 64 caracteres."],
      ["TOO_MANY_BYTES", "La contraseña es demasiado larga"],
    ])("explains a %s policy violation on the new password", async (rule, message) => {
      mockChangePassword.mockRejectedValueOnce(apiError(400, { code: "USER_PASSWORD_POLICY_VIOLATION", params: { rule } }));
      const user = userEvent.setup();
      renderPage();

      await submit(user);

      await waitFor(() => expect(helperTextOf(newField())).toContain(message));
      expect(token()).toHaveTextContent("a-token");
      expect(path()).toHaveTextContent("/change-password");
    });
  });

  describe("when the change is throttled (429)", () => {
    it.each([
      ["params.retryAfterSeconds", apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS", params: { retryAfterSeconds: "840" } }), "dentro de 14 minutos"],
      ["the Retry-After header", apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS" }, { "retry-after": "840" }), "dentro de 14 minutos"],
      ["neither", apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS" }), "Vuelve a intentarlo más tarde."],
    ])("says how long to wait, from %s, keeps the session and clears the fields (AC9, AC10)", async (_source, error, expected) => {
      mockChangePassword.mockRejectedValueOnce(error);
      const user = userEvent.setup();
      renderPage();

      await submit(user);

      expect(await screen.findByRole("alert")).toHaveTextContent(expected);
      expect(screen.getByRole("alert")).toHaveTextContent("Demasiados intentos fallidos.");
      expect(token()).toHaveTextContent("a-token");
      expect(path()).toHaveTextContent("/change-password");
      expect(currentField()).toHaveValue("");
      expect(newField()).toHaveValue("");
      expect(confirmField()).toHaveValue("");
    });
  });

  it("ends the session when the token was no longer valid (401)", async () => {
    mockChangePassword.mockRejectedValueOnce(apiError(401));
    const user = userEvent.setup();
    renderPage();

    await submit(user);

    await waitFor(() => expect(token()).toHaveTextContent("none"));
  });

  describe("when the change is required", () => {
    it("says so, without claiming who chose the current password", () => {
      renderPage({ mustChangePassword: true });

      expect(screen.getByRole("alert")).toHaveTextContent("Por seguridad, debes cambiar tu contraseña antes de continuar.");
    });

    it("offers no way out but the change itself", () => {
      renderPage({ mustChangePassword: true });

      expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Mi perfil" })).not.toBeInTheDocument();
    });

    it("keeps Cancel when the change is voluntary", () => {
      renderPage();

      expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    });
  });
});
