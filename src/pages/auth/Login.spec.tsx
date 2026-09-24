import "@testing-library/jest-dom";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation } from "../../test/queryState";
import { useLogin } from "../../api/authentication/authentication";

// Crear los mocks
const mockNavigate = vi.fn();
const mockAuthDispatch = vi.fn();
const mockLogin = vi.fn();

// Mocks
vi.mock(import("../../api/authentication/authentication"), () => ({
  useLogin: vi.fn(),
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
});
