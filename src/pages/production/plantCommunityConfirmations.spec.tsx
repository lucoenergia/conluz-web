import "@testing-library/jest-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { buildCommunity, buildCurrentUser } from "../../test/fixtures";
import { useGetAllCommunities, type getAllCommunities } from "../../api/communities/communities";
import { useCreatePlant } from "../../api/plants/plants";
import { useGetAllSupplies, type getAllSupplies } from "../../api/supplies/supplies";
import { DeleteConfirmationModal } from "../../components/Modals/DeleteConfirmationModal";
import { CreatePlantPage } from "./CreatePlantPage";

/**
 * AC9 (#186): creating or deleting a plant changes the configuration of a
 * community, so the surface that confirms it names that community in its
 * header line and in its title. Editing a plant already open on screen does not.
 */

// Spread the original: useActiveCommunityResource reads useGetCommunityById
// from this module to resolve the active community's capabilities, so a bare
// factory would leave that export undefined.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllCommunities: vi.fn(),
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
