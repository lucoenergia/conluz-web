import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildSupply,
  buildSupplyCapabilities,
  buildUser,
} from "../../test/fixtures";
import type { CommunityCapabilitiesResponse, SupplyCapabilitiesResponse } from "../../api/models";

// Only the reads are replaced. The actions layer runs for real -- which is the
// point: what is under test is that a card's menu and the page's buttons follow
// the capabilities on the payload, and stubbing the action hooks would mean
// restating that rule in the test instead of exercising it. Mutation hooks are
// inert until called, so leaving them real reaches no network.
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllSupplies: vi.fn(),
}));
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
  useGetUserById: vi.fn(),
}));
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));

import { getAllSupplies, useGetAllSupplies } from "../../api/supplies/supplies";
import { getSuppliesByUserId, getUserById, useGetSuppliesByUserId, useGetUserById } from "../../api/users/users";
import { getCommunityById, useGetCommunityById } from "../../api/communities/communities";
import { SupplyPointsPage } from "./SupplyPointsPage";

const COMMUNITY_ID = "community-a";
const NEW_BUTTON = "Nuevo Punto de Suministro";
const IMPORT_BUTTON = /Importar CSV/i;
const MENU_BUTTON = "Más acciones del punto de suministro";

const supply = (capabilities: Partial<SupplyCapabilitiesResponse>) =>
  buildSupply({
    id: "supply-1",
    code: "ES0021000000000000AA",
    name: "Casa",
    community: { id: COMMUNITY_ID, name: "Sol Común" },
    capabilities: buildSupplyCapabilities({ canRead: true, ...capabilities }),
  });

function setup(options: {
  community?: Partial<CommunityCapabilitiesResponse>;
  supplies?: ReturnType<typeof supply>[];
}) {
  const { community = {}, supplies = [supply({})] } = options;

  vi.mocked(useGetCommunityById).mockReturnValue(
    query.success<typeof getCommunityById>(
      buildCommunity({
        id: COMMUNITY_ID,
        capabilities: buildCommunityCapabilities({ canRead: true, canListSupplies: true, ...community }),
      }),
    ),
  );
  vi.mocked(useGetAllSupplies).mockReturnValue(
    query.success<typeof getAllSupplies>({
      items: supplies,
      size: 10000,
      totalElements: supplies.length,
      totalPages: 1,
      number: 0,
    }),
  );

  return renderWithProviders(<SupplyPointsPage />, { activeCommunityId: COMMUNITY_ID });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.disabled<Awaited<ReturnType<typeof getSuppliesByUserId>>>());
  vi.mocked(useGetUserById).mockReturnValue(query.disabled<Awaited<ReturnType<typeof getUserById>>>());
});

describe("SupplyPointsPage", () => {
  describe("a member of the community", () => {
    it("is offered neither creating nor importing", () => {
      setup({ community: { canManage: false } });

      expect(screen.queryByRole("link", { name: NEW_BUTTON })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: IMPORT_BUTTON })).not.toBeInTheDocument();
    });

    // Their own supply: readable, not editable. The card is the one place the
    // two used to be conflated.
    it("gets a card with no actions menu for a supply they own but may not edit", () => {
      setup({ community: { canManage: false }, supplies: [supply({ canEdit: false })] });

      expect(screen.getByRole("heading", { name: "Casa" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: MENU_BUTTON })).not.toBeInTheDocument();
    });

    it("gets an empty state that does not tell them to add one", () => {
      setup({ community: { canManage: false }, supplies: [] });

      expect(screen.queryByRole("button", { name: /Crear Punto de Suministro/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Comienza agregando/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Todavía no hay ningún punto de suministro/i)).toBeInTheDocument();
    });
  });

  describe("an admin of the community", () => {
    it("is offered creating and importing", () => {
      setup({ community: { canManage: true } });

      expect(screen.getByRole("link", { name: NEW_BUTTON })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: IMPORT_BUTTON })).toBeInTheDocument();
    });

    it("gets a card with the actions menu", async () => {
      setup({ community: { canManage: true }, supplies: [supply({ canEdit: true })] });

      await userEvent.click(screen.getByRole("button", { name: MENU_BUTTON }));

      expect(screen.getByText("Editar")).toBeInTheDocument();
      expect(screen.getByText("Deshabilitar")).toBeInTheDocument();
    });

    it("gets an empty state that offers to create the first one", () => {
      setup({ community: { canManage: true }, supplies: [] });

      expect(screen.getByRole("button", { name: /Crear Punto de Suministro/i })).toBeInTheDocument();
    });
  });

  // Every supply carries its own answer, so a list may legitimately mix them.
  it("decides each card from its own supply, not from the community", async () => {
    setup({
      community: { canManage: true },
      supplies: [
        supply({ canEdit: false }),
        { ...supply({ canEdit: true }), id: "supply-2", name: "Garaje" },
      ],
    });

    const menus = screen.getAllByRole("button", { name: MENU_BUTTON });
    expect(menus).toHaveLength(1);

    // The one menu belongs to the editable supply, not merely to some supply.
    await userEvent.click(menus[0]);
    expect(screen.getByRole("menuitem", { name: "Ver" })).toHaveAttribute(
      "href",
      "/supply-points/supply-2",
    );
  });

  // The capabilities have not arrived yet, which is not the same as "no".
  it("offers nothing while the community has not loaded", () => {
    vi.mocked(useGetCommunityById).mockReturnValue(query.loading());
    vi.mocked(useGetAllSupplies).mockReturnValue(
      query.success<typeof getAllSupplies>({
        items: [supply({ canEdit: true })],
        size: 10000,
        totalElements: 1,
        totalPages: 1,
        number: 0,
      }),
    );

    renderWithProviders(<SupplyPointsPage />, { activeCommunityId: COMMUNITY_ID });

    expect(screen.queryByRole("link", { name: NEW_BUTTON })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: IMPORT_BUTTON })).not.toBeInTheDocument();
  });

  /**
   * The ?personId= branch, reached from Members. GET /users/{userId}/supplies
   * is scoped to what the caller may READ (conluz#326), which is plural across
   * the communities they administer -- so the active community still has to be
   * applied here.
   */
  describe("one member's supplies, reached from the members screen", () => {
    const OTHER_COMMUNITY_ID = "community-b";
    const PERSON_ID = "person-1";

    const inCommunity = (id: string, communityId: string, name: string) =>
      buildSupply({
        id,
        code: `ES00210000000000${id.slice(-2)}`,
        name,
        community: { id: communityId, name: communityId },
        capabilities: buildSupplyCapabilities({ canRead: true }),
      });

    function setupPerson(supplies: ReturnType<typeof inCommunity>[], activeCommunityId: string | null = COMMUNITY_ID) {
      vi.mocked(useGetCommunityById).mockReturnValue(
        query.success<typeof getCommunityById>(
          buildCommunity({
            id: COMMUNITY_ID,
            capabilities: buildCommunityCapabilities({ canRead: true, canListSupplies: true }),
          }),
        ),
      );
      vi.mocked(useGetAllSupplies).mockReturnValue(query.disabled<Awaited<ReturnType<typeof getAllSupplies>>>());
      vi.mocked(useGetSuppliesByUserId).mockReturnValue(
        query.success<typeof getSuppliesByUserId>(supplies),
      );
      vi.mocked(useGetUserById).mockReturnValue(
        query.success<typeof getUserById>(buildUser({ id: PERSON_ID, fullName: "Pedro Sánchez" })),
      );

      return renderWithProviders(<SupplyPointsPage />, {
        activeCommunityId,
        route: `/supply-points?personId=${PERSON_ID}`,
      });
    }

    it("lists only the supplies belonging to the community on screen", () => {
      setupPerson([
        inCommunity("supply-a1", COMMUNITY_ID, "Casa en Sol Común"),
        inCommunity("supply-b1", OTHER_COMMUNITY_ID, "Casa en otra comunidad"),
      ]);

      expect(screen.getByRole("heading", { name: "Casa en Sol Común" })).toBeInTheDocument();
      // The caller may read this one -- it is theirs to administer elsewhere --
      // but it does not belong under this community's heading.
      expect(screen.queryByRole("heading", { name: "Casa en otra comunidad" })).not.toBeInTheDocument();
    });

    it("asks for nothing until the active community is known", () => {
      setupPerson([], null);

      expect(vi.mocked(useGetSuppliesByUserId).mock.calls.at(-1)?.[1]).toMatchObject({
        query: { enabled: false },
      });
    });
  });

});
