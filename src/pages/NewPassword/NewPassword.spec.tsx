import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { NewPassword } from './NewPassword';
import userEvent from '@testing-library/user-event';

describe('NewPassword component', () => {
  test('shows errors if empty fields', async () => {
    render(<NewPassword />);

    const submitButton = screen.getByRole('button', { name: /enviar/i });
    await userEvent.click(submitButton);

    expect(await screen.findByText(/introduce tu nueva contraseña/i)).toBeInTheDocument();
    expect(await screen.findByText(/por favor, repite tu contraseña/i)).toBeInTheDocument();
  });

  test('shows erros if passwords do not match', async () => {
    render(<NewPassword />);

    const passwordInput = screen.getByPlaceholderText(/escribe aquí tu nueva contraseña/i);
    const repeatPasswordInput = screen.getByPlaceholderText(/repite aquí tu nueva contraseña/i);
    const submitButton = screen.getByRole('button', { name: /enviar/i });

    await userEvent.type(passwordInput, 'clave123');
    await userEvent.type(repeatPasswordInput, 'otraClave123');
    await userEvent.click(submitButton);

    expect(await screen.findByText(/la contraseña no coincide/i)).toBeInTheDocument();
  });

  test('does not show errors if passwords are valid and match', async () => {
        render(<NewPassword />);
    const user = userEvent.setup();

    const newPasswordInput = screen.getByPlaceholderText(/escribe aquí tu nueva contraseña/i);
    const repeatNewPasswordInput = screen.getByPlaceholderText(/repite aquí tu nueva contraseña/i);
    const submitButton = screen.getByRole('button', { name: /enviar/i });

    await user.type(newPasswordInput, 'Password123');
    await user.type(repeatNewPasswordInput, 'Password123');
    await user.click(submitButton);

    const newPasswordHelper = document.getElementById('newPassword-helper-text');
    const repeatPasswordHelper = document.getElementById('repeatNewPassword-helper-text');

    expect(newPasswordHelper).toBeNull();
    expect(repeatPasswordHelper?.textContent).toBe('Por favor, repite tu contraseña');
  });
});
