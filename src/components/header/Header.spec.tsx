import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Header } from "./Header";
import { MemoryRouter } from "react-router";
import userEvent from "@testing-library/user-event";

test("Header gets render and menu fn triggered", async () => {
  const user = userEvent.setup();
  const menuFn = vi.fn()
  render(
    <MemoryRouter>
      <Header onMenuClick={menuFn}/>
    </MemoryRouter>
  );

  await user.click(screen.getByLabelText('menu'));

  expect(menuFn.mock.calls.length).toBe(1)
});
