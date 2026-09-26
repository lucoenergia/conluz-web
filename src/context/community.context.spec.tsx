import "@testing-library/jest-dom";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { createContext, useContext, type ReactNode } from "react";
import {
  ActiveCommunityContext,
  CommunityProvider,
  useActiveCommunity,
  useActiveCommunityDispatch,
  useIsActiveCommunityResolved,
} from "./community.context";

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

describe("CommunityProvider — resolution", () => {
  function ReadResolved() {
    const resolved = useIsActiveCommunityResolved();
    const id = useActiveCommunity();
    return <span data-testid="resolved">{`${resolved}:${id ?? "none"}`}</span>;
  }

  test("resolves for a single-community user, having picked their community", () => {
    render(
      <Wrapper user={{ id: "user1", memberships: { "community-A": "COMMUNITY_MEMBER" } }}>
        <ReadResolved />
      </Wrapper>,
    );

    expect(screen.getByTestId("resolved").textContent).toBe("true:community-A");
  });

  // The case that would hang: the answer is legitimately "no community", and a
  // caller waiting for one to appear would wait forever. Resolved must still
  // become true so the decision can be made.
  test("resolves for a multi-community user who has not picked one", () => {
    render(
      <Wrapper
        user={{
          id: "user1",
          memberships: { "community-A": "COMMUNITY_MEMBER", "community-B": "COMMUNITY_ADMIN" },
        }}
      >
        <ReadResolved />
      </Wrapper>,
    );

    expect(screen.getByTestId("resolved").textContent).toBe("true:none");
  });

  test("resolves for a user with no memberships at all", () => {
    render(
      <Wrapper user={{ id: "user1", memberships: {} }}>
        <ReadResolved />
      </Wrapper>,
    );

    expect(screen.getByTestId("resolved").textContent).toBe("true:none");
  });

  // The bug this flag exists for. Guards decide on first render, which happens
  // before the auto-select effect commits, so the very first value they see
  // must say "not yet" rather than "no community".
  test("is false on the first render, before the auto-select effect runs", () => {
    const observed: boolean[] = [];

    function RecordResolved() {
      observed.push(useIsActiveCommunityResolved());
      return null;
    }

    render(
      <Wrapper user={{ id: "user1", memberships: { "community-A": "COMMUNITY_MEMBER" } }}>
        <RecordResolved />
      </Wrapper>,
    );

    expect(observed[0]).toBe(false);
    expect(observed.at(-1)).toBe(true);
  });

  test("is false when nobody is logged in", () => {
    render(
      <Wrapper user={null}>
        <ReadResolved />
      </Wrapper>,
    );

    expect(screen.getByTestId("resolved").textContent).toBe("false:none");
  });

  // Keyed by user id, not a boolean: the next user's selection has not been
  // worked out yet even though the previous one's had.
  test("goes back to false when a different user logs in", () => {
    const { rerender } = render(
      <Wrapper user={{ id: "user1", memberships: { "community-A": "COMMUNITY_MEMBER" } }}>
        <ReadResolved />
      </Wrapper>,
    );
    expect(screen.getByTestId("resolved").textContent).toBe("true:community-A");

    const observed: boolean[] = [];
    function RecordResolved() {
      observed.push(useIsActiveCommunityResolved());
      return null;
    }

    rerender(
      <Wrapper user={{ id: "user2", memberships: { "community-B": "COMMUNITY_MEMBER" } }}>
        <RecordResolved />
      </Wrapper>,
    );

    expect(observed[0]).toBe(false);
    expect(observed.at(-1)).toBe(true);
  });
});
