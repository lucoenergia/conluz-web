import "@testing-library/jest-dom";
import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import { SupplyPointsPage } from "./SupplyPointsPage";
import { SupplyDetailPage } from "./SupplyDetailPage";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests } from "../../test/requestRouter";
import { hasOverlayEntry, pressBack } from "../../test/overlay";
import { overlayHistorySettled } from "../../components/ResponsiveOverlay/overlayHistory";
import { buildCommunity, buildCommunityCapabilities, buildMemberRecord, buildSupply, buildSupplyCapabilities } from "../../test/fixtures";
import type { SupplyResponse } from "../../api/models";

/**
 * The supply flows whose dialogs lead somewhere else (#369): a deletion from
 * the detail page that returns to the list, and a disable whose confirmation
 * closes before its request and is followed by a success dialog. What back
 * does afterwards is the subject (UI-OVL-002, UI-OVL-004), so the real page,
 * actions and BrowserRouter run; only the HTTP layer is mocked (tier 2).
 */
const COMMUNITY_ID = "community-1";
const SUPPLY_ID = "supply-1";
const COMMUNITY_URL = `/api/v1/communities/${COMMUNITY_ID}`;
const SUPPLY_URL = `/api/v1/supplies/${SUPPLY_ID}`;

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const COMMUNITY = buildCommunity({
  id: COMMUNITY_ID,
  name: "Comunidad Solar",
  capabilities: buildCommunityCapabilities({ canRead: true }),
});

const SUPPLY = buildSupply({
  id: SUPPLY_ID,
  code: "ES0031406912345678JN0F",
  name: "Casa de Lucía",
  enabled: true,
  user: { id: "owner-1" },
  ownerRecord: buildMemberRecord({ fullName: "Lucía Martínez Soler" }),
  community: { id: COMMUNITY_ID, name: "Comunidad Solar" },
  // canEdit covers enabling and disabling; an admin is served it with canDelete.
  capabilities: buildSupplyCapabilities({ canRead: true, canEdit: true, canDelete: true }),
});

// No permitted action, so no menu: the first supply's is the only one.
const OTHER = buildSupply({
  id: "supply-2",
  code: "ES0031406987654321QW1A",
  name: "Local de la asociación",
  enabled: true,
  user: { id: "owner-1" },
  ownerRecord: buildMemberRecord({ fullName: "Lucía Martínez Soler" }),
  community: { id: COMMUNITY_ID, name: "Comunidad Solar" },
  capabilities: buildSupplyCapabilities({ canRead: true }),
});

const page = (items: SupplyResponse[]) => ({ items, size: 10000, totalElements: items.length, totalPages: 1, number: 0 });

afterEach(async () => {
  cleanup();
  await act(() => overlayHistorySettled());
});

beforeEach(() => {
  mockCustomInstance.mockReset();
});

/** Renders the app's supply routes on the real address bar, arriving at `path` from "/start". */
function renderAt(path: string, routes: Parameters<typeof routeRequests>[0]) {
  const router = routeRequests(routes);
  mockCustomInstance.mockImplementation(router.handle);
  window.history.replaceState(null, "", "/start");
  window.history.pushState(null, "", path);
  renderWithProviders(
    <Routes>
      <Route path="/start" element={<h1>Inicio</h1>} />
      <Route path="/supply-points" element={<SupplyPointsPage />} />
      <Route path="/supply-points/:supplyPointId" element={<SupplyDetailPage />} />
    </Routes>,
    { browserHistory: true, activeCommunityId: COMMUNITY_ID },
  );
  return router;
}

describe("UI-OVL-004 deleting a supply from its detail page", () => {
  it("UI-OVL-004 lands on the list, and one back returns to the page before the detail page", async () => {
    const user = userEvent.setup();
    let supplies = [SUPPLY, OTHER];
    renderAt(`/supply-points/${SUPPLY_ID}`, [
      // Without canRead, so the detail page asks for nothing beyond the supply: not the subject.
      { method: "GET", url: SUPPLY_URL, respond: () => ({ ...SUPPLY, capabilities: buildSupplyCapabilities({ canEdit: true, canDelete: true }) }) },
      { method: "GET", url: COMMUNITY_URL, respond: () => COMMUNITY },
      { method: "GET", url: `${COMMUNITY_URL}/supplies`, respond: () => page(supplies) },
      {
        method: "DELETE",
        url: SUPPLY_URL,
        respond: () => {
          supplies = [OTHER];
          return undefined;
        },
      },
    ]);

    await user.click(await screen.findByRole("button", { name: "Más opciones del punto de suministro" }));
    await user.click(screen.getByRole("menuitem", { name: "Eliminar punto de suministro" }));
    await act(() => overlayHistorySettled());
    const dialog = await screen.findByRole("dialog", { name: /^Eliminar punto de suministro de / });
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(window.location.pathname).toBe("/supply-points"));
    await act(() => overlayHistorySettled());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(hasOverlayEntry()).toBe(false);

    await pressBack();
    expect(window.location.pathname).toBe("/start");
    expect(await screen.findByRole("heading", { name: "Inicio" })).toBeInTheDocument();
  });
});

describe("disabling a supply from the list", () => {
  function renderList() {
    let answerDisable: () => void = () => {};
    const disabled = new Promise<void>((resolve) => (answerDisable = resolve));
    renderAt("/supply-points", [
      { method: "GET", url: COMMUNITY_URL, respond: () => COMMUNITY },
      { method: "GET", url: `${COMMUNITY_URL}/supplies`, respond: () => page([SUPPLY, OTHER]) },
      { method: "POST", url: `${SUPPLY_URL}/disable`, respond: () => disabled },
    ]);
    return { answerDisable: () => answerDisable() };
  }

  async function confirmDisable(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole("button", { name: "Más acciones para Casa de Lucía" }));
    await user.click(screen.getByRole("menuitem", { name: "Deshabilitar" }));
    await act(() => overlayHistorySettled());
    const confirmation = await screen.findByRole("dialog", { name: /^Deshabilitar punto de suministro en / });
    await user.click(within(confirmation).getByRole("button", { name: "Deshabilitar" }));
    return confirmation;
  }

  it("UI-OVL-002 the confirmation, which holds no request, closes on confirm before the request settles", async () => {
    const user = userEvent.setup();
    const { answerDisable } = renderList();

    const confirmation = await confirmDisable(user);

    await waitFor(() => expect(confirmation).not.toBeInTheDocument());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await act(async () => answerDisable());
    expect(await screen.findByRole("dialog", { name: /ha sido deshabilitado/ })).toBeInTheDocument();
  });

  it("UI-OVL-004 confirmation, success dialog, close: one back returns to the page before the list", async () => {
    const user = userEvent.setup();
    const { answerDisable } = renderList();

    await confirmDisable(user);
    await act(async () => answerDisable());
    const success = await screen.findByRole("dialog", { name: /ha sido deshabilitado/ });
    await act(() => overlayHistorySettled());
    // The dialog's own "Cerrar" button, not the header's close icon of the same name.
    const closers = within(success).getAllByRole("button", { name: "Cerrar" });
    await user.click(closers[closers.length - 1]);

    await waitFor(() => expect(success).not.toBeInTheDocument());
    await act(() => overlayHistorySettled());
    expect(window.location.pathname).toBe("/supply-points");
    expect(hasOverlayEntry()).toBe(false);

    await pressBack();
    expect(window.location.pathname).toBe("/start");
    expect(await screen.findByRole("heading", { name: "Inicio" })).toBeInTheDocument();
  });
});
