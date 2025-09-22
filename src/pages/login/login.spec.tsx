import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Crear los mocks
const mockNavigate = vi.fn();
const mockAuthDispatch = vi.fn();
const mockLogin = vi.fn();

// Mocks
vi.mock("../../api/authentication/authentication", () => ({
  useLogin: () => ({ mutateAsync: mockLogin }),
}));

vi.mock("../../context/auth.context", () => ({
  useAuthDispatch: () => mockAuthDispatch,
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Imports después de los mocks
import { Login } from "./login";
import { MemoryRouter } from "react-router";

describe("Login component", () => {
  beforeEach(() => {
    // Limpiar mocks
    vi.clearAllMocks();
    // Configurar mocks
    mockAuthDispatch.mockClear();
    mockNavigate.mockClear();
    mockLogin.mockClear();
  });

  const setup = () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
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
      expect(mockAuthDispatch).toHaveBeenCalledWith(mockToken);
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
