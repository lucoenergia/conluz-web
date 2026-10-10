import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { Header } from "./Header";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildCommunity, buildCurrentUser } from "../../test/fixtures";
import type { CurrentUserResponse } from "../../api/models";

let loggedUser: CurrentUserResponse | null = null;

vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => loggedUser,
}));

vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllCommunities: vi.fn(),
}));

// Read by the harness's real CommunityProvider, for the first-time rule (#237).
// The community is seeded where it matters, so the provider's own choice is
// never what the header sees; its read is left unanswered.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
}));

import { useGetAllCommunities, type getAllCommunities } from "../../api/communities/communities";
import { useGetSuppliesByUserId } from "../../api/users/users";

beforeEach(() => {
  vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.disabled());
});

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

// The scope surface moved off the app bar and into the side menu and the strip
// beneath it (#186). Asserted here because a user with several communities is
// exactly the caller who used to get a selector in the bar.
test("the app bar holds no community selector, even for a user with several communities", () => {
  loggedUser = buildCurrentUser({
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
