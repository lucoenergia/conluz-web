import "@testing-library/jest-dom";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyPointsPage } from "./SupplyPointsPage";
import { ErrorDisplay } from "../../components/Errors/ErrorDisplay";
import { SuccessDisplay } from "../../components/Success/SuccessDisplay";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type Route } from "../../test/requestRouter";
import { apiError } from "../../test/apiError";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildMemberRecord,
  buildSupply,
  buildSupplyCapabilities,
  buildUser,
} from "../../test/fixtures";
import type { SupplyResponse } from "../../api/models";
import { getGetAllSuppliesQueryKey, getGetSupplyQueryKey } from "../../api/supplies/supplies";
import { getGetSuppliesByUserIdQueryKey } from "../../api/users/users";
import { getGetAllCommunitiesQueryKey, getGetCommunityByIdQueryKey } from "../../api/communities/communities";
import {
  getGetMembershipEnergyMetricsQueryKey,
  getGetMembershipMonthlyConsumptionQueryKey,
} from "../../api/memberships/memberships";

/**
 * Deleting a supply from its card menu (#290), in the community's supply list
 * and in a member's supplies (?personId=).
 *
 * Tier 2: the subject is what the deletion refreshes, so the real action hook,
 * a real QueryClient and the real toasts run; only the HTTP layer is mocked.
 * The server's state is mutable, so a refetch after the DELETE answers without
 * the supply, as the backend would.
 */
const COMMUNITY_ID = "community-1";
const OWNER_ID = "owner-1";
const DELETABLE_ID = "supply-deletable";
const KEPT_ID = "supply-kept";

const COMMUNITY_URL = `/api/v1/communities/${COMMUNITY_ID}`;
const COMMUNITY_SUPPLIES_URL = `${COMMUNITY_URL}/supplies`;
const OWNER_URL = `/api/v1/users/${OWNER_ID}`;
const OWNER_SUPPLIES_URL = `${OWNER_URL}/supplies`;
const DELETE_URL = `/api/v1/supplies/${DELETABLE_ID}`;
const DISABLE_URL = `/api/v1/supplies/${DELETABLE_ID}/disable`;

const MENU_BUTTON = "Más acciones para Casa de Lucía";
const DELETE_TITLE = /^Eliminar punto de suministro de /;

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

// The account GET /users/{userId} answers on the owner's supply list; a supply
// names its owner by id and carries their record (lucoenergia/conluz#448).
const OWNER = buildUser({ id: OWNER_ID, fullName: "Lucía Martínez Soler" });
const OWNER_RECORD = buildMemberRecord({ fullName: "Lucía Martínez Soler" });

const DELETABLE = buildSupply({
  id: DELETABLE_ID,
  code: "ES0031406912345678JN0F",
  name: "Casa de Lucía",
  user: { id: OWNER_ID },
  ownerRecord: OWNER_RECORD,
  community: { id: COMMUNITY_ID, name: "Comunidad Solar" },
  // Both halves an admin is served: canEdit and canDelete come together.
  capabilities: buildSupplyCapabilities({ canRead: true, canEdit: true, canDelete: true }),
});

// No permitted action, so no menu: the deletable supply's is the only one.
const KEPT = buildSupply({
  id: KEPT_ID,
  code: "ES0031406987654321QW1A",
  name: "Local de la asociación",
  user: { id: OWNER_ID },
  ownerRecord: OWNER_RECORD,
  community: { id: COMMUNITY_ID, name: "Comunidad Solar" },
  capabilities: buildSupplyCapabilities({ canRead: true }),
});

const page = (items: SupplyResponse[]) => ({
  items,
  size: 10000,
  totalElements: items.length,
  totalPages: 1,
  number: 0,
});

type ServerState = { supplies: SupplyResponse[]; communityListServed: number; ownerListServed: number };

/** The backend's supplies, and how often each listing was served. */
function server(onDelete: (state: ServerState) => unknown, supplies: SupplyResponse[] = [DELETABLE, KEPT]) {
  const state: ServerState = { supplies, communityListServed: 0, ownerListServed: 0 };
  const routes: Route[] = [
    { method: "GET", url: COMMUNITY_URL, respond: () => COMMUNITY },
    {
      method: "GET",
      url: COMMUNITY_SUPPLIES_URL,
      respond: () => {
        state.communityListServed += 1;
        return page(state.supplies);
      },
    },
    { method: "GET", url: OWNER_URL, respond: () => OWNER },
    {
      method: "GET",
      url: OWNER_SUPPLIES_URL,
      respond: () => {
        state.ownerListServed += 1;
        return state.supplies;
      },
    },
    {
      method: "DELETE",
      url: DELETE_URL,
      respond: () => onDelete(state),
    },
    {
      method: "POST",
      url: DISABLE_URL,
      respond: () => {
        state.supplies = state.supplies.map((supply) =>
          supply.id === DELETABLE_ID ? { ...supply, enabled: false } : supply,
        );
        return undefined;
      },
    },
  ];
  return { state, routes };
}

/** A successful delete: the supply is gone from every later read. */
const deleted = (state: ServerState) => {
  state.supplies = state.supplies.filter((supply) => supply.id !== DELETABLE_ID);
  return undefined;
};

/** A refused delete: nothing changes, and the request fails with `error`. */
const refused = (error: unknown) => () => {
  throw error;
};

function renderPage(
  route: string,
  onDelete: (state: ServerState) => unknown,
  supplies?: SupplyResponse[],
) {
  const { state, routes } = server(onDelete, supplies);
  const router = routeRequests(routes);
  mockCustomInstance.mockImplementation(router.handle);
  const rendered = renderWithProviders(
    <>
      <SupplyPointsPage />
      <ErrorDisplay />
      <SuccessDisplay />
    </>,
    { route, activeCommunityId: COMMUNITY_ID },
  );
  return { ...rendered, state, router };
}

async function openDeletion(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: MENU_BUTTON }));
  await user.click(screen.getByRole("menuitem", { name: "Eliminar punto de suministro" }));
  // The community it names is supplyCommunityConfirmations.spec.tsx's subject.
  return screen.findByRole("heading", { name: DELETE_TITLE });
}

const deleteRequests = (router: ReturnType<typeof routeRequests>) =>
  router.requests.filter((request) => request.method === "DELETE");

describe("deleting a supply from its card menu", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  describe.each([
    ["the community's supply list", "/supply-points", "communityListServed"],
    ["a member's supplies", `/supply-points?personId=${OWNER_ID}`, "ownerListServed"],
  ] as const)("from %s", (_, route, listServed) => {
    it("UI-SUP-003 sends the deletion, and the supply leaves the list while the rest stay", async () => {
      const user = userEvent.setup();
      const { router, state, queryClient } = renderPage(route, deleted);
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
      const removeQueries = vi.spyOn(queryClient, "removeQueries");
      expect(await screen.findByRole("heading", { name: "Casa de Lucía" })).toBeInTheDocument();

      await openDeletion(user);
      await user.click(screen.getByRole("button", { name: "Eliminar" }));

      await waitFor(() => expect(deleteRequests(router)).toHaveLength(1));
      await waitFor(() => expect(state[listServed]).toBe(2));
      await waitFor(() => expect(screen.queryByRole("heading", { name: "Casa de Lucía" })).not.toBeInTheDocument());
      expect(screen.getByRole("heading", { name: "Local de la asociación" })).toBeInTheDocument();
      expect(await screen.findByText("Punto de suministro ES0031406912345678JN0F eliminado.")).toBeInTheDocument();

      expect(removeQueries).toHaveBeenCalledWith({ queryKey: getGetSupplyQueryKey(DELETABLE_ID), type: "inactive" });
      for (const queryKey of [
        getGetAllSuppliesQueryKey(COMMUNITY_ID),
        getGetSuppliesByUserIdQueryKey(OWNER_ID),
        getGetAllCommunitiesQueryKey(),
        getGetCommunityByIdQueryKey(COMMUNITY_ID),
        getGetMembershipEnergyMetricsQueryKey(COMMUNITY_ID, OWNER_ID),
        getGetMembershipMonthlyConsumptionQueryKey(COMMUNITY_ID, OWNER_ID),
      ]) {
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
      }
    });
  });

  it("#310 AC4 keeps the confirmation open while the deletion is in flight, then closes it as before", async () => {
    const user = userEvent.setup();
    let settle!: () => void;
    const { router } = renderPage("/supply-points", (state) => {
      return new Promise((resolve) => {
        settle = () => resolve(deleted(state));
      });
    });

    await openDeletion(user);
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(deleteRequests(router)).toHaveLength(1));

    const dialog = screen.getByRole("dialog", { name: DELETE_TITLE });
    fireEvent.keyDown(dialog, { key: "Escape" });
    // The backdrop has no role or name: its class is the only way to click it.
    await user.click(document.querySelector(".MuiBackdrop-root")!);
    const cancel = within(dialog).getByRole("button", { name: "Cancelar" });
    expect(cancel).toBeDisabled();
    // A disabled button takes no pointer events, so userEvent refuses it.
    fireEvent.click(cancel);
    expect(screen.getByRole("dialog", { name: DELETE_TITLE })).toBeInTheDocument();

    settle();

    await waitFor(() => expect(screen.queryByRole("dialog", { name: DELETE_TITLE })).not.toBeInTheDocument());
    expect(await screen.findByText("Punto de suministro ES0031406912345678JN0F eliminado.")).toBeInTheDocument();
  });

  it("UI-SUP-002 names the supply and its owner, and says it cannot be undone", async () => {
    const user = userEvent.setup();
    renderPage("/supply-points", deleted);

    await openDeletion(user);
    const dialog = within(screen.getByRole("dialog", { name: /^Eliminar punto de suministro de / }));

    expect(dialog.getByText("ES0031406912345678JN0F")).toBeInTheDocument();
    expect(dialog.getByText("Casa de Lucía")).toBeInTheDocument();
    expect(dialog.getByText("Lucía Martínez Soler")).toBeInTheDocument();
    expect(dialog.getByText(/Esta acción no se puede deshacer\./)).toBeInTheDocument();
  });

  it("UI-SUP-005 names no owner when the owner has no record in the supply's community", async () => {
    const user = userEvent.setup();
    renderPage("/supply-points", deleted, [{ ...DELETABLE, ownerRecord: null }, KEPT]);

    await openDeletion(user);
    const dialog = within(screen.getByRole("dialog", { name: /^Eliminar punto de suministro de / }));

    expect(dialog.getByText("ES0031406912345678JN0F")).toBeInTheDocument();
    expect(dialog.queryByText(/Titular/)).not.toBeInTheDocument();
    expect(dialog.queryByText("Lucía Martínez Soler")).not.toBeInTheDocument();
  });

  it("UI-SUP-002 sends nothing when the confirmation is dismissed", async () => {
    const user = userEvent.setup();
    const { router } = renderPage("/supply-points", deleted);

    await openDeletion(user);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: DELETE_TITLE }),
      ).not.toBeInTheDocument(),
    );
    expect(deleteRequests(router)).toHaveLength(0);
    expect(screen.getByRole("heading", { name: "Casa de Lucía" })).toBeInTheDocument();
  });

  it.each([
    ["SUPPLY_HAS_PLANTS", "tiene una planta asociada"],
    ["SUPPLY_HAS_PARTITION_COEFFICIENTS", "forma parte de un acuerdo de reparto"],
  ] as const)("UI-SUP-004 a 409 %s recommends «Deshabilitar», and the supply stays", async (code, reason) => {
    const user = userEvent.setup();
    const { router, state } = renderPage("/supply-points", refused(apiError(409, { code })));
    await screen.findByRole("heading", { name: "Casa de Lucía" });

    await openDeletion(user);
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    const alert = await screen.findByText(new RegExp(reason));
    expect(alert).toHaveTextContent("Si quieres dejar de usarlo, deshabilítalo con «Deshabilitar»");
    expect(deleteRequests(router)).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Casa de Lucía" })).toBeInTheDocument();
    // Nothing was deleted, so nothing was refetched.
    expect(state.communityListServed).toBe(1);
  });

  it("UI-SUP-004 a 403 says the caller may not delete it, and the supply stays", async () => {
    const user = userEvent.setup();
    const { state } = renderPage("/supply-points", refused(apiError(403)));
    await screen.findByRole("heading", { name: "Casa de Lucía" });

    await openDeletion(user);
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("No tienes permiso para eliminar este punto de suministro.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Casa de Lucía" })).toBeInTheDocument();
    expect(state.communityListServed).toBe(1);
  });

  it("UI-SUP-004 a 404 says the supply no longer exists, and refreshes the list", async () => {
    const user = userEvent.setup();
    // Somebody else deleted it first: the server no longer has it.
    const { state } = renderPage("/supply-points", (server) => {
      server.supplies = [KEPT];
      throw apiError(404);
    });
    await screen.findByRole("heading", { name: "Casa de Lucía" });

    await openDeletion(user);
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(
      await screen.findByText("Este punto de suministro ya no existe. Hemos actualizado la lista."),
    ).toBeInTheDocument();
    await waitFor(() => expect(state.communityListServed).toBe(2));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Casa de Lucía" })).not.toBeInTheDocument());
  });
});

describe("disabling a supply from a member's supplies", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  // The refusals above recommend «Deshabilitar», which an admin may do from here.
  it("refetches the member's supplies, and the card shows the new state", async () => {
    const user = userEvent.setup();
    const { state } = renderPage(`/supply-points?personId=${OWNER_ID}`, deleted);
    await screen.findByRole("heading", { name: "Casa de Lucía" });

    await user.click(await screen.findByRole("button", { name: MENU_BUTTON }));
    await user.click(screen.getByRole("menuitem", { name: "Deshabilitar" }));
    await screen.findByRole("heading", { name: /^Deshabilitar punto de suministro en / });
    await user.click(screen.getByRole("button", { name: "Deshabilitar" }));

    await waitFor(() => expect(state.ownerListServed).toBe(2));
    // Both supplies were enabled; only the refetched read can say otherwise.
    await waitFor(() => expect(screen.getAllByText("Inactivo")).toHaveLength(1));
  });
});
