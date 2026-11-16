import "@testing-library/jest-dom";
import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import { SupplyDetailPage } from "./SupplyDetailPage";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig } from "../../test/requestRouter";
import { overlayHistorySettled } from "../../components/ResponsiveOverlay/overlayHistory";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildMemberRecord,
  buildMembership,
  buildSupply,
  buildSupplyCapabilities,
} from "../../test/fixtures";
import type { SupplyCapabilitiesResponse, SupplyResponse } from "../../api/models";

/**
 * Changing a supply's holder from its detail page (#423): whether the header's
 * menu offers it, and what the page shows afterwards.
 *
 * Tier 2: the real generated hooks and actions layer run, so the supply's
 * refetch after the transfer is the real cache's.
 */
const COMMUNITY_ID = "community-1";
const SUPPLY_ID = "supply-1";
const SUPPLY_URL = `/api/v1/supplies/${SUPPLY_ID}`;
const COMMUNITY_URL = `/api/v1/communities/${COMMUNITY_ID}`;
const MEMBERSHIPS_URL = `${COMMUNITY_URL}/memberships`;
const TRANSFER_URL = `${SUPPLY_URL}/ownership/transfer`;

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const LUCIA = buildMembership({ id: "m-lucia", user: { id: "u-lucia" }, communityId: COMMUNITY_ID, fullName: "Lucía Martínez Soler", personalId: "11111111H" });
const JORGE = buildMembership({ id: "m-jorge", user: { id: "u-jorge" }, communityId: COMMUNITY_ID, fullName: "Jorge Sanz", personalId: "22222222J" });

const supplyWith = (capabilities: Partial<SupplyCapabilitiesResponse>, owner = LUCIA): SupplyResponse =>
  buildSupply({
    id: SUPPLY_ID,
    code: "ES0031406912345678JN0F",
    name: "Casa de Lucía",
    user: { id: owner.user.id },
    ownerRecord: buildMemberRecord({ fullName: owner.fullName }),
    community: { id: COMMUNITY_ID, name: "Comunidad Solar" },
    capabilities: buildSupplyCapabilities(capabilities),
  });

function renderDetail(capabilities: Partial<SupplyCapabilitiesResponse>) {
  let supply = supplyWith(capabilities);
  const router = routeRequests([
    { method: "GET", url: SUPPLY_URL, respond: () => supply },
    {
      method: "GET",
      url: COMMUNITY_URL,
      respond: () =>
        buildCommunity({
          id: COMMUNITY_ID,
          capabilities: buildCommunityCapabilities({ canRead: true, canManage: true, canManageMemberships: true }),
        }),
    },
    { method: "GET", url: MEMBERSHIPS_URL, respond: () => [LUCIA, JORGE] },
    {
      method: "POST",
      url: TRANSFER_URL,
      respond: (config: RequestConfig) => {
        const body = config.data as { newOwnerPersonalId: string };
        supply = supplyWith(capabilities, [LUCIA, JORGE].find((m) => m.personalId === body.newOwnerPersonalId));
        return supply;
      },
    },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  renderWithProviders(
    <Routes>
      <Route path="supply-points/:supplyPointId" element={<SupplyDetailPage />} />
    </Routes>,
    { route: `/supply-points/${SUPPLY_ID}`, activeCommunityId: COMMUNITY_ID },
  );
  return router;
}

const MENU_BUTTON = "Más opciones del punto de suministro";

beforeEach(() => {
  mockCustomInstance.mockReset();
});

afterEach(async () => {
  cleanup();
  await act(() => overlayHistorySettled());
});

describe("UI-SUP-024 \"Cambiar titular\" on the supply detail page", () => {
  it("UI-SUP-024 is offered from the header's menu, before the deletion, for a supply that reports canTransferOwnership", async () => {
    const u = userEvent.setup();
    renderDetail({ canEdit: true, canDelete: true, canTransferOwnership: true });

    await u.click(await screen.findByRole("button", { name: MENU_BUTTON }));

    const items = screen.getAllByRole("menuitem").map((item) => item.textContent);
    expect(items).toEqual(["Cambiar titular", "Eliminar punto de suministro"]);
  });

  it("UI-SUP-024 is not offered, not even disabled, for a supply that does not report it", async () => {
    const u = userEvent.setup();
    renderDetail({ canEdit: true, canDelete: true });

    await u.click(await screen.findByRole("button", { name: MENU_BUTTON }));

    expect(screen.getByRole("menuitem", { name: "Eliminar punto de suministro" })).toBeInTheDocument();
    expect(screen.queryByText("Cambiar titular")).not.toBeInTheDocument();
  });

  it("UI-SUP-024 gives the header a menu when the transfer is the supply's only action", async () => {
    const u = userEvent.setup();
    renderDetail({ canTransferOwnership: true });

    await u.click(await screen.findByRole("button", { name: MENU_BUTTON }));

    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Cambiar titular"]);
  });

  it("UI-SUP-028 shows the new holder in the header without a reload, and returns focus to the menu button", async () => {
    const u = userEvent.setup();
    const router = renderDetail({ canEdit: true, canTransferOwnership: true });
    // The owner sits behind the header's details toggle.
    await u.click(await screen.findByRole("button", { name: /^Ver \d+ datos más$/ }));
    expect(screen.getByText("Lucía Martínez Soler")).toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: MENU_BUTTON }));
    await u.click(screen.getByRole("menuitem", { name: "Cambiar titular" }));
    const dialog = await screen.findByRole("dialog", { name: "Cambiar titular" });
    await act(() => overlayHistorySettled());
    await u.click(await within(dialog).findByRole("combobox", { name: /^Nuevo titular/ }));
    await u.click(await screen.findByRole("option", { name: "Jorge Sanz (22222222J)" }));
    await u.click(within(dialog).getByRole("button", { name: "Cambiar titular" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());
    expect(await screen.findByText("Jorge Sanz")).toBeInTheDocument();
    expect(screen.queryByText("Lucía Martínez Soler")).not.toBeInTheDocument();
    expect(router.requests.filter((r) => r.url === TRANSFER_URL)).toHaveLength(1);
    await waitFor(() => expect(screen.getByRole("button", { name: MENU_BUTTON })).toHaveFocus());
  });
});
