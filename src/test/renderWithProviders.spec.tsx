import "@testing-library/jest-dom";
import { useEffect } from "react";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth, useAuthDispatch } from "../context/auth.context";
import { useActiveCommunity } from "../context/community.context";
import { useGetCurrentUser } from "../api/users/users";
import { query } from "./queryState";
import { renderWithProviders } from "./renderWithProviders";

// This is the only spec in the repo that seeds a token through the harness, and
// a token is what enables the real LoggedUserProvider's current-user query
// (#203) -- so it is the only one where leaving that hook real would reach the
// backend. Nothing here reads the user; the mock just has to not be a request.
vi.mock(import("../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCurrentUser: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(useGetCurrentUser).mockReturnValue(query.disabled());
});

function ContextProbe({ persist = false }: { persist?: boolean }) {
  const token = useAuth();
  const activeCommunityId = useActiveCommunity();
  const authDispatch = useAuthDispatch();

  useEffect(() => {
    if (!persist) return;
    // Write storage the way the app does: a remembered login, and a
    // persisted community selection for a user.
    authDispatch({ token: "remembered-token", remember: true });
    window.localStorage.setItem("activeCommunity:u1", "c1");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  return (
    <>
      <span data-testid="token">{token ?? "none"}</span>
      <span data-testid="community">{activeCommunityId ?? "none"}</span>
    </>
  );
}

// The two tests share one jsdom window. They must pass in either order:
// the first leaves storage written, the second requires it clean.
describe("renderWithProviders storage isolation", () => {
  it("seeds the token and active community only when asked, and lets the tree write storage", async () => {
    renderWithProviders(<ContextProbe persist />, { token: "seeded-token", activeCommunityId: "c1" });

    expect(screen.getByTestId("community")).toHaveTextContent("c1");
    expect(await screen.findByText("remembered-token")).toBeInTheDocument();
    expect(window.localStorage.getItem("token")).toBe("remembered-token");
    expect(window.localStorage.getItem("activeCommunity:u1")).toBe("c1");
  });

  it("starts every render from empty storage and no selection", () => {
    renderWithProviders(<ContextProbe />);

    expect(screen.getByTestId("token")).toHaveTextContent("none");
    expect(screen.getByTestId("community")).toHaveTextContent("none");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});

describe("renderWithProviders active community seed", () => {
  it("switches a seeded community, including to an explicit null", () => {
    const { switchActiveCommunity } = renderWithProviders(<ContextProbe />, { activeCommunityId: "c1" });
    expect(screen.getByTestId("community")).toHaveTextContent("c1");

    switchActiveCommunity("c2");
    expect(screen.getByTestId("community")).toHaveTextContent("c2");

    switchActiveCommunity(null);
    expect(screen.getByTestId("community")).toHaveTextContent("none");
  });
});

describe("renderWithProviders remembered community", () => {
  it("leaves the remembered community, and nothing else, in the storage the provider reads", () => {
    renderWithProviders(<ContextProbe />, { rememberedCommunity: { userId: "u9", communityId: "c9" } });

    expect(window.localStorage.getItem("activeCommunity:u9")).toBe("c9");
    expect(window.localStorage.length).toBe(1);
  });
});
