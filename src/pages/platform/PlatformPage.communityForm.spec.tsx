import "@testing-library/jest-dom";
import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig, type RequestRouter } from "../../test/requestRouter";
import { stubViewport } from "../../test/overlay";
import { overlayHistorySettled } from "../../components/ResponsiveOverlay/overlayHistory";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildCurrentUser,
  buildPlatformCapabilities,
} from "../../test/fixtures";
import type { CommunityResponse, CreateCommunityBody } from "../../api/models";
import { PlatformPage } from "./PlatformPage";

/**
 * Creating a community from the platform page (#374): its quick action and its
 * empty state open the community form over the page, the page shows the new
 * community afterwards, and focus goes back to what opened it. What the form
 * sends and its overlay behaviour are CommunityFormDialog's and
 * CommunitiesPage.communityForm.spec.tsx's.
 *
 * Tier 2: the real generated hooks and actions layer run, so the page's
 * refetch after the save is the real cache's.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

type User = ReturnType<typeof userEvent.setup>;

const CREATE = "Crear comunidad";
const TITLE = "Crear nueva comunidad";

const PLATFORM_ADMIN = buildCurrentUser({
  id: "u-paula",
  isPlatformAdmin: true,
  memberships: {},
  platformCapabilities: buildPlatformCapabilities({ canAdministerPlatform: true, canCreateCommunity: true }),
});

const SOL = buildCommunity({
  id: "c1",
  name: "Sol Común",
  code: "SOL",
  memberCount: 3,
  supplyPointCount: 2,
  adminNames: ["Ana Gil"],
  capabilities: buildCommunityCapabilities({ canRead: true, canUpdate: true }),
});

/** The caller, the list, and the create, which adds to the list it answers from. */
function serve(initial: CommunityResponse[]): RequestRouter {
  let communities = initial;
  const router = routeRequests([
    { method: "GET", url: "/api/v1/users/current", respond: () => PLATFORM_ADMIN },
    { method: "GET", url: "/api/v1/communities", respond: () => communities },
    {
      method: "POST",
      url: "/api/v1/communities",
      respond: (config: RequestConfig) => {
        const body = config.data as CreateCommunityBody;
        const created = buildCommunity({
          id: "c-new",
          name: body.name,
          code: body.code,
          capabilities: buildCommunityCapabilities({ canRead: true, canUpdate: true }),
        });
        communities = [...communities, created];
        return created;
      },
    },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  return router;
}

async function renderPage() {
  window.history.replaceState(null, "", "/platform");
  renderWithProviders(<PlatformPage />, { browserHistory: true, token: "a-token" });
  await screen.findByRole("heading", { level: 1, name: "Administración de plataforma" });
  await act(() => overlayHistorySettled());
}

async function open(u: User) {
  await u.click(await screen.findByRole("button", { name: CREATE }));
  const dialog = await screen.findByRole("dialog", { name: TITLE });
  await act(() => overlayHistorySettled());
  return dialog;
}

async function create(u: User, dialog: HTMLElement, name: string) {
  await u.type(within(dialog).getByRole("textbox", { name: /^Nombre/ }), name);
  await u.type(within(dialog).getByRole("textbox", { name: /^Código/ }), "MAR");
  await u.click(within(dialog).getByRole("button", { name: CREATE }));
}

const dialogGone = () =>
  waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());

beforeEach(() => {
  mockCustomInstance.mockReset();
  stubViewport(900);
});

afterEach(async () => {
  cleanup();
  await act(() => overlayHistorySettled());
  vi.unstubAllGlobals();
});

describe("UI-COM-001 creating a community from the platform page", () => {
  it("UI-COM-001 the quick action opens the create form, and the address stays the platform page's", async () => {
    const u = userEvent.setup();
    serve([SOL]);
    await renderPage();

    const dialog = await open(u);

    expect(window.location.pathname).toBe("/platform");
    expect(within(dialog).getByRole("textbox", { name: /^Nombre/ })).toHaveValue("");
  });

  it("UI-COM-001 the empty state's action opens the create form, and the address stays the platform page's", async () => {
    const u = userEvent.setup();
    serve([]);
    await renderPage();
    expect(await screen.findByText("Crea tu primera comunidad energética")).toBeInTheDocument();

    await open(u);

    expect(window.location.pathname).toBe("/platform");
  });

  it("UI-COM-001 after a create from the quick action, the page shows the new community and focus returns to the action", async () => {
    const u = userEvent.setup();
    const router = serve([SOL]);
    await renderPage();
    const dialog = await open(u);

    await create(u, dialog, "Mar Clara");

    await dialogGone();
    expect((await screen.findAllByText("Mar Clara")).length).toBeGreaterThan(0);
    expect(router.requests.filter((r) => (r.method ?? "").toUpperCase() === "POST")).toHaveLength(1);
    await waitFor(() => expect(screen.getByRole("button", { name: CREATE })).toHaveFocus());
  });

  it("UI-COM-001 after a create from the empty state, the page shows the new community instead, and focus moves to its create action", async () => {
    const u = userEvent.setup();
    serve([]);
    await renderPage();
    const dialog = await open(u);

    await create(u, dialog, "Mar Clara");

    await dialogGone();
    expect((await screen.findAllByText("Mar Clara")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Crea tu primera comunidad energética")).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/platform");
    // The button that opened the form went with the empty state; the
    // overview's own create action takes its place.
    await waitFor(() => expect(screen.getByRole("button", { name: CREATE })).toHaveFocus());
  });

  it.each([
    ["the quick action", [SOL]],
    ["the empty state's action", []],
  ] as const)("UI-COM-001 Cancelar returns focus to %s", async (_, communities) => {
    const u = userEvent.setup();
    serve([...communities]);
    await renderPage();
    const opener = await screen.findByRole("button", { name: CREATE });
    const dialog = await open(u);

    await u.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await dialogGone();
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
