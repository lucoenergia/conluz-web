import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Header } from "./Header";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";

// Through the harness rather than a hand-built provider stack: LoggedUserProvider
// is a query now (#203), so it has to sit under the QueryClientProvider, and the
// harness is the one place that nesting is written down.
test("Header gets render and menu fn triggered", async () => {
  const user = userEvent.setup();
  const menuFn = vi.fn();

  renderWithProviders(<Header onMenuClick={menuFn} />);

  await user.click(screen.getByLabelText("menu"));

  expect(menuFn.mock.calls.length).toBe(1);
});
