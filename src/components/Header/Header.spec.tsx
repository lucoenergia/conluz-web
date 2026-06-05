import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Header } from "./Header";
import { MemoryRouter } from "react-router";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../../context/auth.context";
import { LoggedUserProvider } from "../../context/logged-user.context";
import { CommunityProvider } from "../../context/community.context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

test("Header gets render and menu fn triggered", async () => {
  const user = userEvent.setup();
  const menuFn = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <AuthProvider>
      <LoggedUserProvider>
        <CommunityProvider>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>
              <Header onMenuClick={menuFn} />
            </MemoryRouter>
          </QueryClientProvider>
        </CommunityProvider>
      </LoggedUserProvider>
    </AuthProvider>,
  );

  await user.click(screen.getByLabelText("menu"));

  expect(menuFn.mock.calls.length).toBe(1);
});
