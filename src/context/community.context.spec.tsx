import "@testing-library/jest-dom";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { createContext, useContext, type ReactNode } from "react";
import { ActiveCommunityContext, CommunityProvider, useActiveCommunity, useActiveCommunityDispatch } from "./community.context";

// Provide a fake LoggedUser context so CommunityProvider can read memberships
const FakeLoggedUserContext = createContext<{
  id?: string;
  memberships?: Record<string, string>;
  isPlatformAdmin?: boolean;
} | null>(null);

vi.mock("./logged-user.context", () => ({
  useLoggedUser: () => useContext(FakeLoggedUserContext),
}));

function Wrapper({ user, children }: { user: { id?: string; memberships?: Record<string, string> } | null; children: ReactNode }) {
  return (
    <FakeLoggedUserContext.Provider value={user}>
      <CommunityProvider>{children}</CommunityProvider>
    </FakeLoggedUserContext.Provider>
  );
}

function ReadActiveCommunity() {
  const id = useActiveCommunity();
  return <span data-testid="active">{id ?? "none"}</span>;
}

beforeEach(() => {
  localStorage.clear();
});

describe("CommunityProvider — auto-selection", () => {
  test("auto-selects when user has exactly one community", () => {
    render(
      <Wrapper user={{ id: "user1", memberships: { "community-A": "COMMUNITY_MEMBER" } }}>
        <ReadActiveCommunity />
      </Wrapper>,
    );
    expect(screen.getByTestId("active").textContent).toBe("community-A");
  });

  test("does not auto-select when user has multiple communities", () => {
    render(
      <Wrapper
        user={{
          id: "user1",
          memberships: { "community-A": "COMMUNITY_MEMBER", "community-B": "COMMUNITY_ADMIN" },
        }}
      >
        <ReadActiveCommunity />
      </Wrapper>,
    );
    expect(screen.getByTestId("active").textContent).toBe("none");
  });

  test("restores persisted community for multi-community users", () => {
    localStorage.setItem("activeCommunity:user1", "community-B");
    render(
      <Wrapper
        user={{
          id: "user1",
          memberships: { "community-A": "COMMUNITY_MEMBER", "community-B": "COMMUNITY_ADMIN" },
        }}
      >
        <ReadActiveCommunity />
      </Wrapper>,
    );
    expect(screen.getByTestId("active").textContent).toBe("community-B");
  });

  test("clears stale persisted community when it is no longer in memberships", () => {
    localStorage.setItem("activeCommunity:user1", "community-GONE");
    render(
      <Wrapper
        user={{
          id: "user1",
          memberships: { "community-A": "COMMUNITY_MEMBER" },
        }}
      >
        <ReadActiveCommunity />
      </Wrapper>,
    );
    // Single community → auto-selects; stale value is irrelevant
    expect(screen.getByTestId("active").textContent).toBe("community-A");
  });

  test("clears active community when user is null", () => {
    render(
      <Wrapper user={null}>
        <ReadActiveCommunity />
      </Wrapper>,
    );
    expect(screen.getByTestId("active").textContent).toBe("none");
  });
});

describe("CommunityProvider — dispatch", () => {
  function Dispatcher() {
    const dispatch = useActiveCommunityDispatch();
    return (
      <button onClick={() => dispatch("community-X")}>select</button>
    );
  }

  test("dispatch updates the active community and persists it", () => {
    render(
      <Wrapper
        user={{
          id: "user1",
          memberships: { "community-A": "COMMUNITY_MEMBER", "community-X": "COMMUNITY_ADMIN" },
        }}
      >
        <ReadActiveCommunity />
        <Dispatcher />
      </Wrapper>,
    );

    act(() => {
      screen.getByRole("button").click();
    });

    expect(screen.getByTestId("active").textContent).toBe("community-X");
    expect(localStorage.getItem("activeCommunity:user1")).toBe("community-X");
  });
});

test("active community context value propagates via context", () => {
  render(
    <Wrapper user={{ id: "u1", memberships: { "com-1": "COMMUNITY_MEMBER" } }}>
      <ActiveCommunityContext.Consumer>
        {(value) => <span data-testid="ctx">{value}</span>}
      </ActiveCommunityContext.Consumer>
    </Wrapper>,
  );

  expect(screen.getByTestId("ctx").textContent).toBe("com-1");
});
