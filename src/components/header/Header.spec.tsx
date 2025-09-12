import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Header } from "./Header";
import { MemoryRouter } from "react-router";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../../context/auth.context";
import { LoggedUserProvider } from "../../context/logged-user.context";

test("Header gets render and menu fn triggered", async () => {
  const user = userEvent.setup();
  const menuFn = vi.fn()
  render(
    <AuthProvider>
      <LoggedUserProvider>
        <MemoryRouter>
          <Header onMenuClick={menuFn} />
        </MemoryRouter>
      </LoggedUserProvider>
    </AuthProvider>
  );

  await user.click(screen.getByLabelText('menu'));

  expect(menuFn.mock.calls.length).toBe(1)
});
