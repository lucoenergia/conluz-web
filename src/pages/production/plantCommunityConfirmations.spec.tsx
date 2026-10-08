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
import { useCreatePlant } from "../../api/plants/plants";
import { useGetAllSupplies, type getAllSupplies } from "../../api/supplies/supplies";
import { DeleteConfirmationModal } from "../../components/Modals/DeleteConfirmationModal";
import { CreatePlantPage } from "./CreatePlantPage";

/**
 * AC9 (#186): creating or deleting a plant changes the configuration of a
 * community, so the surface that confirms it names that community in its
 * header line and in its title. Editing a plant already open on screen does not.
 */

// useActiveCommunityResource reads the active community from
// useGetCommunityById, so it is mocked too: left real, it reached the network
// (#211). The spread keeps the query-key getters the actions layer uses.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllCommunities: vi.fn(),
  useGetCommunityById: vi.fn(),
}));

vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreatePlant: vi.fn(),
}));

vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllSupplies: vi.fn(),
}));

vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => buildCurrentUser({ id: "admin", memberships: { c1: "COMMUNITY_ADMIN" } }),
}));

const COMMUNITY_NAME = "Comunidad Solar Norte";
const HEADER_LINE = `Comunidad · ${COMMUNITY_NAME}`;

beforeEach(() => {
  // The admin reaching the create page may create plants there.
  vi.mocked(useGetCommunityById).mockReturnValue(
    query.success<typeof getCommunityById>(
      buildCommunity({ id: "c1", name: COMMUNITY_NAME, capabilities: buildCommunityCapabilities({ canCreatePlants: true }) }),
    ),
  );
  vi.mocked(useGetAllCommunities).mockReturnValue(
    query.success<typeof getAllCommunities>([buildCommunity({ id: "c1", name: COMMUNITY_NAME })]),
  );
  vi.mocked(useCreatePlant).mockReturnValue(mutation.idle());
  vi.mocked(useGetAllSupplies).mockReturnValue(
    query.success<typeof getAllSupplies>({ items: [], size: 0, totalElements: 0, totalPages: 0, number: 0 }),
  );
});

describe("plant confirmations name the community (AC9)", () => {
  test("deleting a plant", () => {
    renderWithProviders(<DeleteConfirmationModal isOpen code="Planta Norte" onCancel={vi.fn()} onDelete={vi.fn()} />, {
      activeCommunityId: "c1",
    });

    expect(screen.getByRole("heading", { name: `Eliminar planta de ${COMMUNITY_NAME}` })).toBeInTheDocument();
    expect(screen.getByText(HEADER_LINE)).toBeInTheDocument();
  });

  test("creating a plant, on its full-page form", () => {
    renderWithProviders(<CreatePlantPage />, { activeCommunityId: "c1", route: "/production/new" });

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(`Crear planta en ${COMMUNITY_NAME}`);
    expect(heading.parentElement).toHaveTextContent(HEADER_LINE);
  });
});
