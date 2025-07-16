import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Crear los mocks
const mockNavigate = vi.fn();
const mockUseAuthDispatch = vi.fn();

// Mocks
vi.mock('../../api/authentication/authentication', () => ({
  login: vi.fn(),
}));

vi.mock('../../api/auth.context', () => ({
  useAuthDispatch: mockUseAuthDispatch,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
  };
});

// Imports después de los mocks
import { Login } from './login';
import { useAuthDispatch } from '../../api/auth.context';
import { login } from '../../api/authentication/authentication';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

describe('Login component', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    // Limpiar mocks
    vi.clearAllMocks();
    // Configurar mocks
    mockUseAuthDispatch.mockReturnValue(mockDispatch);
    mockNavigate.mockClear();
  });

  const setup = () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
  };

  it('submits the form with valid credentials and navigates to home', async () => {
    const mockToken = 'fake-token';
    vi.mocked(login).mockResolvedValueOnce({ token: mockToken });

    setup();

    const idInput = screen.getByPlaceholderText(/DNI\/NIF/i);
    const passwordInput = screen.getByPlaceholderText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    fireEvent.change(idInput, { target: { value: '1234567Z' } });
    fireEvent.change(passwordInput, { target: { value: 'securepass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        username: '1234567Z',
        password: 'securepass',
      });
      expect(mockDispatch).toHaveBeenCalledWith(mockToken);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows errors if empty textfields', async () => {
    setup();

    const submitButton = screen.getByRole('button', { name: /entrar/i });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/Por favor, introduce tu DNI\/NIF/i)).toBeInTheDocument();
    expect(await screen.findByText(/Por favor, introduce tu contraseña/i)).toBeInTheDocument();
  });

  it('shows error if login fails', async () => {
    vi.mocked(login).mockRejectedValueOnce(new Error('Invalid credentials'));

    setup();

    const idInput = screen.getByPlaceholderText(/DNI\/NIF/i);
    const passwordInput = screen.getByPlaceholderText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    fireEvent.change(idInput, { target: { value: '1234567Z' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    const errorText = await screen.findByText(/DNI\/NIF o contraseña incorrectos/i);
    expect(errorText).toBeInTheDocument();
  });
});
