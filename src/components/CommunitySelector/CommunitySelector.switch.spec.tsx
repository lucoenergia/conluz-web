import "@testing-library/jest-dom";
import { describe, expect, test, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, type ReactNode } from "react";
import { CommunitySelector } from "./CommunitySelector";

const FakeLoggedUserContext = createContext<{
  id?: string;
  memberships?: Record<string, string>;
} | null>(null);

vi.mock("../../context/logged-user.context", () => ({
  useLoggedUser: () => useContext(FakeLoggedUserContext),
}));

const mockDispatch = vi.fn();
const mockActiveCommunity = { current: "community-A" };

vi.mock("../../context/community.context", () => ({
  useActiveCommunity: () => mockActiveCommunity.current,
  useActiveCommunityDispatch: () => mockDispatch,
}));

vi.mock("../../api/communities/communities", () => ({
  useGetAllCommunities: () => ({
    data: [
      { id: "community-A", name: "Comunidad Alpha" },
      { id: "community-B", name: "Comunidad Beta" },
    ],
  }),
}));

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <FakeLoggedUserContext.Provider
      value={{ id: "u1", memberships: { "community-A": "COMMUNITY_MEMBER", "community-B": "COMMUNITY_ADMIN" } }}
    >
      <QueryClientProvider client={qc}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    </FakeLoggedUserContext.Provider>
  );
}

describe("CommunitySelector — community switch", () => {
  test("calls dispatch and invalidateQueries when selecting a different community", async () => {
    const user = userEvent.setup();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    render(
      <FakeLoggedUserContext.Provider
        value={{ id: "u1", memberships: { "community-A": "COMMUNITY_MEMBER", "community-B": "COMMUNITY_ADMIN" } }}
      >
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <CommunitySelector />
          </MemoryRouter>
        </QueryClientProvider>
      </FakeLoggedUserContext.Provider>,
    );

    // Open the dropdown
    await user.click(screen.getByRole("button"));

    // Select a different community
    const betaOption = await screen.findByText("Comunidad Beta");
    await user.click(betaOption);

    expect(mockDispatch).toHaveBeenCalledWith("community-B");
    expect(invalidateSpy).toHaveBeenCalled();
  });
});

describe("CommunitySelector — renders community names", () => {
  test("shows community names in dropdown via portal", async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <CommunitySelector />
      </Wrapper>,
    );

    await user.click(screen.getByRole("button"));

    // MUI Menu renders in a portal attached to document.body
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("Comunidad Alpha");
    expect(allText).toContain("Comunidad Beta");
  });
});
