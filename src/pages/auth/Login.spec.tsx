import "@testing-library/jest-dom";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation } from "../../test/queryState";
import { useLogin, useLogout } from "../../api/authentication/authentication";
import userEvent from "@testing-library/user-event";
import { apiError } from "../../test/apiError";
import { expectPasswordFieldContract } from "../../test/passwordField";
import { markPasswordChanged, takePasswordChanged } from "../../utils/session";

// Crear los mocks
const mockNavigate = vi.fn();
const mockAuthDispatch = vi.fn();
const mockLogin = vi.fn();

// Mocks
// useSessionActions runs for real; it calls both hooks on every render.
vi.mock(import("../../api/authentication/authentication"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLogin: vi.fn(),
  useLogout: vi.fn(),
}));

vi.mock(import("../../context/auth.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useAuthDispatch: () => mockAuthDispatch,
}));

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

// Imports después de los mocks
import { Login } from "./Login";

describe("Login component", () => {
  beforeEach(() => {
    // Limpiar mocks
    vi.clearAllMocks();
    // Configurar mocks
    mockAuthDispatch.mockClear();
    mockNavigate.mockClear();
    mockLogin.mockClear();
    vi.mocked(useLogin).mockReturnValue(mutation.idle({ mutateAsync: mockLogin }));
    vi.mocked(useLogout).mockReturnValue(mutation.idle({ mutateAsync: vi.fn() }));
  });

  const setup = () => {
    renderWithProviders(<Login />);
  };

  it("submits the form with valid credentials and navigates to home", async () => {
    const mockToken = "fake-token";
    vi.mocked(mockLogin).mockResolvedValueOnce({ token: mockToken });

    setup();

    const idInput = screen.getByPlaceholderText(/DNI\/NIF/i);
    const passwordInput = screen.getByPlaceholderText(/contraseña/i);
    const submitButton = screen.getByRole("button", { name: /entrar/i });

    fireEvent.change(idInput, { target: { value: "1234567Z" } });
    fireEvent.change(passwordInput, { target: { value: "securepass" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        data: {
          username: "1234567Z",
          password: "securepass",
        },
      });
      expect(mockAuthDispatch).toHaveBeenCalledWith({ token: mockToken, remember: false});
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("shows error if login fails", async () => {
    vi.mocked(mockLogin).mockRejectedValueOnce(new Error("Invalid credentials"));

    setup();

    const idInput = screen.getByPlaceholderText(/DNI\/NIF/i);
    const passwordInput = screen.getByPlaceholderText(/contraseña/i);
    const submitButton = screen.getByRole("button", { name: /entrar/i });

    fireEvent.change(idInput, { target: { value: "1234567Z" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpass" } });
    fireEvent.click(submitButton);

    const errorText = await screen.findByText(/DNI\/NIF o contraseña incorrectos/i);
    expect(errorText).toBeInTheDocument();
  });
  const fillAndSubmit = async (username: string, password: string) => {
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/DNI\/NIF/i), username);
    // paste, not type: userEvent.type would read leading spaces literally too,
    // but paste is how somebody brings a long passphrase from a manager.
    await user.click(screen.getByPlaceholderText(/contraseña/i));
    await user.paste(password);
    await user.click(screen.getByRole("button", { name: /entrar/i }));
    return user;
  };

  describe("the password (#196)", () => {
    it("is sent exactly as typed, leading and trailing spaces included", async () => {
      mockLogin.mockResolvedValueOnce({ token: "fake-token" });
      setup();

      await fillAndSubmit("1234567Z", "  frase con espacios larga  ");

      await waitFor(() =>
        expect(mockLogin).toHaveBeenCalledWith({
          data: { username: "1234567Z", password: "  frase con espacios larga  " },
        }),
      );
    });

    it("has a toggle, autocomplete=current-password and no keyboard rewriting", async () => {
      setup();
      expect(screen.getByPlaceholderText(/DNI\/NIF/i)).toHaveAttribute("autocomplete", "username");
      await expectPasswordFieldContract(userEvent.setup(), screen.getByPlaceholderText(/contraseña/i), "current-password");
    });
  });

  describe("when the login is throttled (429)", () => {
    it("says how many minutes to wait, from params.retryAfterSeconds", async () => {
      mockLogin.mockRejectedValueOnce(
        apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS", params: { retryAfterSeconds: "840" } }),
      );
      setup();

      await fillAndSubmit("1234567Z", "una contraseña cualquiera");

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Demasiados intentos fallidos. Vuelve a intentarlo dentro de 14 minutos.",
      );
      expect(screen.queryByText(/DNI\/NIF o contraseña incorrectos/)).not.toBeInTheDocument();
    });

    it("falls back to the Retry-After header", async () => {
      mockLogin.mockRejectedValueOnce(apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS" }, { "retry-after": "840" }));
      setup();

      await fillAndSubmit("1234567Z", "una contraseña cualquiera");

      expect(await screen.findByRole("alert")).toHaveTextContent("dentro de 14 minutos");
    });

    it("names no wait when neither is present", async () => {
      mockLogin.mockRejectedValueOnce(apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS" }));
      setup();

      await fillAndSubmit("1234567Z", "una contraseña cualquiera");

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Demasiados intentos fallidos. Vuelve a intentarlo más tarde.",
      );
    });

    it("keeps the typed username and clears the password", async () => {
      mockLogin.mockRejectedValueOnce(
        apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS", params: { retryAfterSeconds: "840" } }),
      );
      setup();

      await fillAndSubmit("1234567Z", "una contraseña cualquiera");

      await screen.findByRole("alert");
      expect(screen.getByPlaceholderText(/DNI\/NIF/i)).toHaveValue("1234567Z");
      expect(screen.getByPlaceholderText(/contraseña/i)).toHaveValue("");
      expect(mockAuthDispatch).not.toHaveBeenCalled();
    });
  });

  it("still says the credentials are wrong on a 400", async () => {
    mockLogin.mockRejectedValueOnce(apiError(400));
    setup();

    await fillAndSubmit("1234567Z", "una contraseña cualquiera");

    expect(await screen.findByRole("alert")).toHaveTextContent("DNI/NIF o contraseña incorrectos");
  });

  // On the flag itself: the harness clears browser storage before every
  // render, so a flag set here would not survive into one. The page showing
  // it after a real change is covered in ChangePassword.spec.tsx.
  it("reads the password-changed notice once", () => {
    markPasswordChanged();

    expect(takePasswordChanged()).toBe(true);
    expect(takePasswordChanged()).toBe(false);
  });

  it("shows no notice on a plain visit", () => {
    setup();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
