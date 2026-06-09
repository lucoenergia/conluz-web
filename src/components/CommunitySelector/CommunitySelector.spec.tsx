import "@testing-library/jest-dom";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, type ReactNode } from "react";
import { CommunitySelector } from "./CommunitySelector";

// Minimal fakes — we only test visibility logic here.
const FakeLoggedUserContext = createContext<{
  id?: string;
  memberships?: Record<string, string>;
} | null>(null);

vi.mock("../../context/logged-user.context", () => ({
  useLoggedUser: () => useContext(FakeLoggedUserContext),
}));

vi.mock("../../context/community.context", () => ({
  useActiveCommunity: () => "community-A",
  useActiveCommunityDispatch: () => vi.fn(),
}));

vi.mock("../../api/communities/communities", () => ({
  useGetAllCommunities: () => ({ data: [] }),
}));

function Wrapper({
  memberships,
  children,
}: {
  memberships: Record<string, string>;
  children: ReactNode;
}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <FakeLoggedUserContext.Provider value={{ id: "u1", memberships }}>
      <QueryClientProvider client={qc}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    </FakeLoggedUserContext.Provider>
  );
}

describe("CommunitySelector visibility", () => {
  test("shows a non-interactive community chip for a user with exactly one community", () => {
    render(
      <Wrapper memberships={{ "community-A": "COMMUNITY_MEMBER" }}>
        <CommunitySelector />
      </Wrapper>,
    );
    // Shows the chip but without a button role (non-interactive)
    expect(screen.getByTestId("BusinessIcon")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("is visible for a user with more than one community", () => {
    render(
      <Wrapper
        memberships={{ "community-A": "COMMUNITY_MEMBER", "community-B": "COMMUNITY_ADMIN" }}
      >
        <CommunitySelector />
      </Wrapper>,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  test("is hidden for a user with zero communities", () => {
    const { container } = render(
      <Wrapper memberships={{}}>
        <CommunitySelector />
      </Wrapper>,
    );
    expect(container.firstChild).toBeNull();
  });
});
