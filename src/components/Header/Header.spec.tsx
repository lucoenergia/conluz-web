import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Header } from "./Header";
import { MemoryRouter } from "react-router";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../../context/auth.context";
import { LoggedUserProvider } from "../../context/logged-user.context";
import { CommunityProvider } from "../../context/community.context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildCommunity, buildUser } from "../../test/fixtures";
import { useGetAllCommunities, type getAllCommunities } from "../../api/communities/communities";
import type { UserResponse } from "../../api/models";

let loggedUser: UserResponse | null = null;

vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => loggedUser,
}));

vi.mock(import("../../api/communities/communities"), () => ({
  useGetAllCommunities: vi.fn(),
}));

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

test("AC11: the app bar holds no community selector, even for a user with several communities", () => {
  loggedUser = buildUser({
    id: "u1",
    fullName: "Ada",
    memberships: { "community-a": "COMMUNITY_ADMIN", "community-b": "COMMUNITY_MEMBER" },
  });
  vi.mocked(useGetAllCommunities).mockReturnValue(
    query.success<typeof getAllCommunities>([
      buildCommunity({ id: "community-a", name: "Comunidad Alpha" }),
      buildCommunity({ id: "community-b", name: "Comunidad Beta" }),
    ]),
  );

  renderWithProviders(<Header onMenuClick={vi.fn()} username="Ada" />, { activeCommunityId: "community-a" });

  const appBar = screen.getByRole("banner");
  expect(appBar).not.toHaveTextContent("Comunidad Alpha");
  expect(screen.queryByRole("button", { name: /comunidad/i })).not.toBeInTheDocument();
  expect(appBar.querySelector('[aria-haspopup="menu"]')).toBeNull();
});
