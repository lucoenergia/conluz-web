import '@testing-library/jest-dom'
import { expect, test } from "vitest";
import { ProfileMenu } from "./ProfileMenu";
import { screen, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../../api/auth.context';
import { LoggedUserProvider } from '../../api/logged-user.context';

function setup() {
  render(
    <AuthProvider>
      <LoggedUserProvider>
        <MemoryRouter>
          <ProfileMenu username="Luis Mata" />
        </MemoryRouter>
      </LoggedUserProvider>
    </AuthProvider>
  );
}

test("ProfileMenu renders correctly with menu hidden", async () => {
  setup()
  expect(screen.getByText('Luis Mata')).not.toBeVisible();
  expect(screen.getByText('Mi perfil')).not.toBeVisible();
  expect(screen.getByText('Cambiar contraseña')).not.toBeVisible();
  expect(screen.getByText('¿Necesitas ayuda?')).not.toBeVisible();
  expect(screen.getByText('Salir')).not.toBeVisible();
})

test("ProfileMenu opens menu when clicking", async () => {
  const user = userEvent.setup();
  setup()
  await user.click(screen.getByRole('button'));
  expect(screen.getByText('Luis Mata')).toBeVisible();
  expect(screen.getByText('Mi perfil')).toBeVisible();
  expect(screen.getByText('Cambiar contraseña')).toBeVisible();
  expect(screen.getByText('¿Necesitas ayuda?')).toBeVisible();
  expect(screen.getByText('Salir')).toBeVisible();
})

test("ProfileMenu closes menu when removing focus", async () => {
  const user = userEvent.setup();
  setup()
  await user.click(screen.getByRole('button'));
  await user.keyboard('{Escape}')
  expect(screen.getByText('Luis Mata')).not.toBeVisible();
  expect(screen.getByText('Mi perfil')).not.toBeVisible();
  expect(screen.getByText('Cambiar contraseña')).not.toBeVisible();
  expect(screen.getByText('¿Necesitas ayuda?')).not.toBeVisible();
  expect(screen.getByText('Salir')).not.toBeVisible();
})
