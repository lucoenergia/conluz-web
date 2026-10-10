import "@testing-library/jest-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { buildCommunity, buildCommunityCapabilities, buildCurrentUser } from "../../test/fixtures";
import {
  useGetAllCommunities,
  useGetCommunityById,
  type getAllCommunities,
  type getCommunityById,
} from "../../api/communities/communities";
import { useCreateSupply } from "../../api/supplies/supplies";
import { useGetAllUsers, useGetSuppliesByUserId, type getAllUsers } from "../../api/users/users";
import { DisableConfirmationModal } from "../../components/Modals/DisableConfirmationModal";
import { EnableConfirmationModal } from "../../components/Modals/EnableConfirmationModal";
import { CreateSupplyPage } from "./CreateSupply";

/**
 * AC9 (#186): every surface that confirms a write changing the supply points
 * of a community names that community, in its header line and in its title.
 */

// useActiveCommunityResource reads the active community from
// useGetCommunityById, so it is mocked too: left real, it reached the network
// (#211). The spread keeps the query-key getters the actions layer uses.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllCommunities: vi.fn(),
  useGetCommunityById: vi.fn(),
}));

vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreateSupply: vi.fn(),
}));

// useGetSuppliesByUserId is read by the harness's real CommunityProvider, for the
// first-time rule (#237). The community is seeded here, so the provider's own
// choice is never what the page sees; its read is left unanswered.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllUsers: vi.fn(),
  useGetSuppliesByUserId: vi.fn(),
}));

vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => buildCurrentUser({ id: "admin", memberships: { c1: "COMMUNITY_ADMIN", c2: "COMMUNITY_MEMBER" } }),
}));

const COMMUNITY_NAME = "Comunidad Solar Norte";
const HEADER_LINE = `Comunidad · ${COMMUNITY_NAME}`;

beforeEach(() => {
  vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.disabled());
  // The admin reaching the create page may create supply points there.
  vi.mocked(useGetCommunityById).mockReturnValue(
    query.success<typeof getCommunityById>(
      buildCommunity({ id: "c1", name: COMMUNITY_NAME, capabilities: buildCommunityCapabilities({ canManage: true }) }),
    ),
  );
  vi.mocked(useGetAllCommunities).mockReturnValue(
    query.success<typeof getAllCommunities>([
      buildCommunity({ id: "c1", name: COMMUNITY_NAME }),
      buildCommunity({ id: "c2", name: "Comunidad Sur" }),
    ]),
  );
  vi.mocked(useCreateSupply).mockReturnValue(mutation.idle());
  vi.mocked(useGetAllUsers).mockReturnValue(query.success<typeof getAllUsers>({ items: [] }));
});

describe("supply point confirmations name the community (AC9)", () => {
  test("disabling a supply point", () => {
    renderWithProviders(
      <DisableConfirmationModal isOpen code="ES0021000000000001AA" onCancel={vi.fn()} onDisable={vi.fn()} />,
      { activeCommunityId: "c1" },
    );

    expect(
      screen.getByRole("heading", { name: `Deshabilitar punto de suministro en ${COMMUNITY_NAME}` }),
    ).toBeInTheDocument();
    expect(screen.getByText(HEADER_LINE)).toBeInTheDocument();
  });

  test("re-enabling a supply point", () => {
    renderWithProviders(
      <EnableConfirmationModal isOpen code="ES0021000000000001AA" onCancel={vi.fn()} onEnable={vi.fn()} />,
      { activeCommunityId: "c1" },
    );

    expect(
      screen.getByRole("heading", { name: `Rehabilitar punto de suministro en ${COMMUNITY_NAME}` }),
    ).toBeInTheDocument();
    expect(screen.getByText(HEADER_LINE)).toBeInTheDocument();
  });

  test("creating a supply point, on its full-page form", () => {
    renderWithProviders(<CreateSupplyPage />, { activeCommunityId: "c1", route: "/supply-points/new" });

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(`Crear punto de suministro en ${COMMUNITY_NAME}`);
    expect(heading.parentElement).toHaveTextContent(HEADER_LINE);
  });

  test("names the switched-to community after a switch, never a stale one", () => {
    const { switchActiveCommunity } = renderWithProviders(
      <DisableConfirmationModal isOpen code="ES0021000000000001AA" onCancel={vi.fn()} onDisable={vi.fn()} />,
      { activeCommunityId: "c1" },
    );

    switchActiveCommunity("c2");

    const heading = screen.getByRole("heading", { name: "Deshabilitar punto de suministro en Comunidad Sur" });
    expect(heading).toBeInTheDocument();
    expect(screen.queryByText(HEADER_LINE)).not.toBeInTheDocument();
  });
});
