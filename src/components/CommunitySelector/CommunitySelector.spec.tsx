import "@testing-library/jest-dom";
import { describe, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildUser } from "../../test/fixtures";
import type { UserResponse, UserResponseMemberships } from "../../api/models";
import { useGetAllCommunities, type getAllCommunities } from "../../api/communities/communities";
import { CommunitySelector } from "./CommunitySelector";

// Minimal fakes — we only test visibility logic here.
let loggedUser: UserResponse | null = null;

vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => loggedUser,
}));

vi.mock(import("../../context/community.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useActiveCommunity: () => "community-A",
  useActiveCommunityDispatch: () => vi.fn(),
}));

vi.mock(import("../../api/communities/communities"), () => ({
  useGetAllCommunities: vi.fn(),
}));

function renderSelector(memberships: UserResponseMemberships) {
  loggedUser = buildUser({ id: "u1", memberships });
  vi.mocked(useGetAllCommunities).mockReturnValue(query.success<typeof getAllCommunities>([]));
  return renderWithProviders(<CommunitySelector />);
}

describe("CommunitySelector visibility", () => {
  test("shows a non-interactive community chip for a user with exactly one community", () => {
    renderSelector({ "community-A": "COMMUNITY_MEMBER" });
    // Shows the chip but without a button role (non-interactive)
    expect(screen.getByTestId("BusinessIcon")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("is visible for a user with more than one community", () => {
    renderSelector({ "community-A": "COMMUNITY_MEMBER", "community-B": "COMMUNITY_ADMIN" });
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  test("is hidden for a user with zero communities", () => {
    const { container } = renderSelector({});
    expect(container.firstChild).toBeNull();
  });
});
