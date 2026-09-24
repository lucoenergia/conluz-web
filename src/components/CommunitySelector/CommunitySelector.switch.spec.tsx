import "@testing-library/jest-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestQueryClient, renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildCommunity, buildUser } from "../../test/fixtures";
import { useGetAllCommunities, type getAllCommunities } from "../../api/communities/communities";
import { CommunitySelector } from "./CommunitySelector";

vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () =>
    buildUser({ id: "u1", memberships: { "community-A": "COMMUNITY_MEMBER", "community-B": "COMMUNITY_ADMIN" } }),
}));

const mockDispatch = vi.fn();
const mockActiveCommunity = { current: "community-A" };

vi.mock(import("../../context/community.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useActiveCommunity: () => mockActiveCommunity.current,
  useActiveCommunityDispatch: () => mockDispatch,
}));

vi.mock(import("../../api/communities/communities"), () => ({
  useGetAllCommunities: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(useGetAllCommunities).mockReturnValue(
    query.success<typeof getAllCommunities>([
      buildCommunity({ id: "community-A", name: "Comunidad Alpha" }),
      buildCommunity({ id: "community-B", name: "Comunidad Beta" }),
    ]),
  );
});

describe("CommunitySelector — community switch", () => {
  test("calls dispatch and invalidateQueries when selecting a different community", async () => {
    const user = userEvent.setup();
    const qc = createTestQueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    renderWithProviders(<CommunitySelector />, { queryClient: qc });

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

    renderWithProviders(<CommunitySelector />);

    await user.click(screen.getByRole("button"));

    // MUI Menu renders in a portal attached to document.body
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("Comunidad Alpha");
    expect(allText).toContain("Comunidad Beta");
  });
});
