import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig, type RequestRouter } from "../../test/requestRouter";
import { overlayHistorySettled } from "../../components/ResponsiveOverlay/overlayHistory";
import { stubViewport } from "../../test/overlay";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildMemberRecord,
  buildMembership,
  buildSupply,
  buildSupplyCapabilities,
} from "../../test/fixtures";
import type { SupplyCapabilitiesResponse, SupplyResponse, TransferSupplyOwnershipBody } from "../../api/models";
import { SupplyPointsPage } from "./SupplyPointsPage";

/**
 * Changing a supply's holder from the supply list (#423): which rows offer it,
 * what the list shows afterwards, and where focus goes. What the overlay
 * offers, sends and shows on a refusal is SupplyTransferDialog.spec.tsx's.
 *
 * Tier 2: the real generated hooks and actions layer run, so the list's
 * refetch after the transfer is the real cache's.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const COMMUNITY_ID = "community-1";
const COMMUNITY_URL = `/api/v1/communities/${COMMUNITY_ID}`;
const SUPPLIES_URL = `${COMMUNITY_URL}/supplies`;
const MEMBERSHIPS_URL = `${COMMUNITY_URL}/memberships`;

const COMMUNITY = buildCommunity({
  id: COMMUNITY_ID,
  name: "Comunidad Solar",
  capabilities: buildCommunityCapabilities({ canRead: true, canManage: true, canManageMemberships: true }),
});

const LUCIA = buildMembership({ id: "m-lucia", user: { id: "u-lucia" }, communityId: COMMUNITY_ID, fullName: "Lucía Martínez Soler", personalId: "11111111H" });
const JORGE = buildMembership({ id: "m-jorge", user: { id: "u-jorge" }, communityId: COMMUNITY_ID, fullName: "Jorge Sanz", personalId: "22222222J" });

const atCommunity = (supply: Partial<SupplyResponse> & { id: string }, capabilities: Partial<SupplyCapabilitiesResponse>) =>
  buildSupply({
    enabled: true,
    user: { id: LUCIA.user.id },
    ownerRecord: buildMemberRecord({ fullName: LUCIA.fullName }),
    community: { id: COMMUNITY_ID, name: "Comunidad Solar" },
    ...supply,
    capabilities: buildSupplyCapabilities({ canRead: true, ...capabilities }),
  });

// A community admin is handed the transfer with the other writes; the second
// row reports every other write but not this one.
const CASA = atCommunity({ id: "supply-1", code: "ES0031406912345678JN0F", name: "Casa de Lucía" }, {
  canEdit: true,
  canDelete: true,
  canTransferOwnership: true,
});
const LOCAL = atCommunity({ id: "supply-2", code: "ES0031406987654321QW1A", name: "Local de la asociación" }, {
  canEdit: true,
  canDelete: true,
});
// Nothing but the transfer: the row still needs its kebab.
const HUERTO = atCommunity({ id: "supply-3", code: "ES0031406900000000AB1C", name: "Huerto" }, { canTransferOwnership: true });

const page = (items: SupplyResponse[]) => ({ items, size: 10000, totalElements: items.length, totalPages: 1, number: 0 });

function serve(initial: SupplyResponse[] = [CASA, LOCAL, HUERTO]): RequestRouter {
  let supplies = initial;
  const router = routeRequests([
    { method: "GET", url: COMMUNITY_URL, respond: () => COMMUNITY },
    { method: "GET", url: SUPPLIES_URL, respond: () => page(supplies) },
    { method: "GET", url: MEMBERSHIPS_URL, respond: () => [LUCIA, JORGE] },
    {
      method: "GET",
      url: /^\/api\/v1\/supplies\/[^/]+$/,
      respond: (config: RequestConfig) => supplies.find((s) => s.id === (config.url ?? "").split("/").pop()),
    },
    {
      method: "POST",
      url: /^\/api\/v1\/supplies\/[^/]+\/ownership\/transfer$/,
      respond: (config: RequestConfig) => {
        const id = (config.url ?? "").split("/")[4];
        const body = config.data as TransferSupplyOwnershipBody;
        const owner = [LUCIA, JORGE].find((m) => m.personalId === body.newOwnerPersonalId)!;
        supplies = supplies.map((s) =>
          s.id === id ? { ...s, user: { id: owner.user.id }, ownerRecord: buildMemberRecord({ fullName: owner.fullName }) } : s,
        );
        return supplies.find((s) => s.id === id);
      },
    },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  return router;
}

async function renderPage() {
  const rendered = renderWithProviders(<SupplyPointsPage />, { activeCommunityId: COMMUNITY_ID, route: "/supply-points" });
  await screen.findAllByText("Casa de Lucía");
  await act(() => overlayHistorySettled());
  return rendered;
}

const kebab = (label: string) => screen.getByRole("button", { name: `Más acciones para ${label}` });
const rowOf = (name: string) => screen.getByRole("link", { name }).closest("tr") as HTMLElement;

async function openMenu(u: ReturnType<typeof userEvent.setup>, label: string) {
  await u.click(kebab(label));
  return within(await screen.findByRole("menu"));
}

beforeEach(() => {
  mockCustomInstance.mockReset();
  // Wide enough for the table, so each row shows its owner.
  stubViewport(1280);
});

afterEach(async () => {
  cleanup();
  await act(() => overlayHistorySettled());
  vi.unstubAllGlobals();
});

describe("UI-SUP-024 \"Cambiar titular\" on the supply list", () => {
  it("UI-SUP-024 is offered, after Editar, for a supply that reports canTransferOwnership", async () => {
    const u = userEvent.setup();
    serve();
    await renderPage();

    const menu = await openMenu(u, "Casa de Lucía");

    const names = menu.getAllByRole("menuitem").map((item) => item.textContent);
    expect(names.indexOf("Cambiar titular")).toBe(names.indexOf("Editar") + 1);
  });

  it("UI-SUP-024 is not offered, not even disabled, for a supply that does not report it", async () => {
    const u = userEvent.setup();
    serve();
    await renderPage();

    const menu = await openMenu(u, "Local de la asociación");

    expect(menu.getByRole("menuitem", { name: "Editar" })).toBeInTheDocument();
    expect(menu.queryByRole("menuitem", { name: "Cambiar titular" })).not.toBeInTheDocument();
    expect(screen.queryByText("Cambiar titular")).not.toBeInTheDocument();
  });

  it("UI-SUP-024 gives a row a kebab when the transfer is its only action", async () => {
    const u = userEvent.setup();
    serve();
    await renderPage();

    const menu = await openMenu(u, "Huerto");

    expect(menu.getByRole("menuitem", { name: "Cambiar titular" })).toBeInTheDocument();
  });

  it("UI-SUP-024 opens the transfer in its own overlay over the list, for that supply", async () => {
    const u = userEvent.setup();
    serve();
    await renderPage();

    await u.click((await openMenu(u, "Casa de Lucía")).getByRole("menuitem", { name: "Cambiar titular" }));

    const dialog = await screen.findByRole("dialog", { name: "Cambiar titular" });
    expect(await within(dialog).findByRole("textbox", { name: "Titular actual" })).toHaveValue("Lucía Martínez Soler");
    expect(within(dialog).queryByRole("textbox", { name: /^CUPS/ })).not.toBeInTheDocument();
  });

  it("UI-SUP-028 shows the new holder on the row without a reload, and returns focus to the row's actions", async () => {
    const u = userEvent.setup();
    const router = serve();
    await renderPage();
    expect(within(rowOf("Casa de Lucía")).getByText(/^Lucía Martínez Soler/)).toBeInTheDocument();

    await u.click((await openMenu(u, "Casa de Lucía")).getByRole("menuitem", { name: "Cambiar titular" }));
    const dialog = await screen.findByRole("dialog", { name: "Cambiar titular" });
    await act(() => overlayHistorySettled());
    await u.click(await within(dialog).findByRole("combobox", { name: /^Nuevo titular/ }));
    await u.click(await screen.findByRole("option", { name: "Jorge Sanz (22222222J)" }));
    await u.click(within(dialog).getByRole("button", { name: "Cambiar titular" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());
    await waitFor(() => expect(within(rowOf("Casa de Lucía")).getByText(/^Jorge Sanz/)).toBeInTheDocument());
    expect(router.requests.filter((r) => r.url === "/api/v1/supplies/supply-1/ownership/transfer")).toHaveLength(1);
    await waitFor(() => expect(kebab("Casa de Lucía")).toHaveFocus());
  });
});
