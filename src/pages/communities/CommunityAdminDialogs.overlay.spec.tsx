import "@testing-library/jest-dom";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests } from "../../test/requestRouter";
import { pressBack, stubViewport } from "../../test/overlay";
import { overlayHistorySettled } from "../../components/ResponsiveOverlay/overlayHistory";
import {
  buildCommunity,
  buildCommunityAdmin,
  buildCommunityCapabilities,
  buildCurrentUser,
  buildPlatformCapabilities,
} from "../../test/fixtures";
import { CapabilityRoute } from "../../components/Auth/CapabilityRoute";
import { CommunityAdminsPage } from "./CommunityAdminsPage";

/**
 * The community admins page's own dialogs on the shared overlay (#370): the
 * admin invitation and the suspend/reactivate confirmation. The invitation
 * writes on a row are the members page's dialog, covered with it.
 *
 * Tier 2: the real generated hooks and actions layer run, so a write is held
 * in flight by a request that does not answer.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const COMMUNITY_ID = "community-1";
const COMMUNITY_NAME = "Comunidad Solar";
const COMMUNITY_URL = `/api/v1/communities/${COMMUNITY_ID}`;
const ADMINS_URL = `${COMMUNITY_URL}/admins`;

const COMMUNITY = buildCommunity({
  id: COMMUNITY_ID,
  name: COMMUNITY_NAME,
  capabilities: buildCommunityCapabilities({ canRead: true, canManageAdmins: true }),
});
const PLATFORM_ADMIN = buildCurrentUser({
  id: "platform-admin",
  fullName: "Paula Plataforma",
  isPlatformAdmin: true,
  platformCapabilities: buildPlatformCapabilities({ canAdministerPlatform: true }),
  memberships: {},
});
const ROSA = buildCommunityAdmin({
  user: { id: "u-rosa" },
  fullName: "Rosa Activa",
  acceptedAt: "2026-02-01T09:00:00Z",
  invitedAt: "2026-01-25T09:00:00Z",
});
const SERGIO = buildCommunityAdmin({
  user: { id: "u-sergio" },
  fullName: "Sergio Suspendido",
  acceptedAt: "2026-03-01T09:00:00Z",
  invitedAt: "2026-02-20T09:00:00Z",
  enabled: false,
});

/** Every write is held in flight: a request that never answers. */
function serve() {
  const hold = () => new Promise(() => {});
  const router = routeRequests([
    { method: "GET", url: "/api/v1/users/current", respond: () => PLATFORM_ADMIN },
    { method: "GET", url: "/api/v1/communities", respond: () => [COMMUNITY] },
    { method: "GET", url: COMMUNITY_URL, respond: () => COMMUNITY },
    { method: "GET", url: ADMINS_URL, respond: () => [ROSA, SERGIO] },
    { method: "POST", url: `${ADMINS_URL}/invite`, respond: hold },
    { method: "POST", url: /\/admins\/[^/]+\/(enable|disable)$/, respond: hold },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
}

async function renderPage() {
  renderWithProviders(
    <Routes>
      <Route
        path="/communities/:communityId/admins"
        element={
          <CapabilityRoute require={{ scope: "communityById", capability: "canManageAdmins" }}>
            <CommunityAdminsPage />
          </CapabilityRoute>
        }
      />
    </Routes>,
    { route: `/communities/${COMMUNITY_ID}/admins`, token: "a-token", activeCommunityId: null },
  );
  await screen.findAllByText("Rosa Activa");
}

type User = ReturnType<typeof userEvent.setup>;

const INVITE_TITLE = `Invitar administrador a ${COMMUNITY_NAME}`;

async function openInvite(u: User) {
  await u.click(await screen.findByRole("button", { name: /Invitar administrador/ }));
  return screen.findByRole("dialog", { name: INVITE_TITLE });
}

async function fromMenu(u: User, row: string, item: string, title: string) {
  await u.click(screen.getByRole("button", { name: `Más acciones para ${row}` }));
  await u.click(within(await screen.findByRole("menu")).getByRole("menuitem", { name: item }));
  return screen.findByRole("dialog", { name: title });
}

/** Pasted, not typed: what matters is that a field changed. */
async function paste(u: User, dialog: HTMLElement, label: string, value: string) {
  await u.click(within(dialog).getByLabelText(new RegExp(`^${label}`)));
  await u.paste(value);
}

type Flow = {
  title: string;
  open: (u: User) => Promise<HTMLElement>;
  send: (u: User, dialog: HTMLElement) => Promise<void>;
  pendingLabel: string;
};

const FLOWS: Array<[string, Flow]> = [
  [
    "the admin invitation",
    {
      title: INVITE_TITLE,
      open: openInvite,
      send: async (u, dialog) => {
        await paste(u, dialog, "DNI/NIE/NIF", "12345678Z");
        await paste(u, dialog, "Nombre completo", "Nora Nueva");
        await paste(u, dialog, "Email de contacto", "nora@example.com");
        await u.click(within(dialog).getByRole("button", { name: "Invitar" }));
      },
      pendingLabel: "Enviando...",
    },
  ],
  [
    "the suspension",
    {
      title: `Suspender administrador en ${COMMUNITY_NAME}`,
      open: (u) => fromMenu(u, "Rosa Activa", "Suspender", `Suspender administrador en ${COMMUNITY_NAME}`),
      send: (u, dialog) => u.click(within(dialog).getByRole("button", { name: "Suspender" })),
      // The label does not change while it runs; the button is disabled.
      pendingLabel: "Suspender",
    },
  ],
  [
    "the reactivation",
    {
      title: `Reactivar administrador en ${COMMUNITY_NAME}`,
      open: (u) => fromMenu(u, "Sergio Suspendido", "Reactivar", `Reactivar administrador en ${COMMUNITY_NAME}`),
      send: (u, dialog) => u.click(within(dialog).getByRole("button", { name: "Reactivar" })),
      pendingLabel: "Reactivar",
    },
  ],
];

beforeEach(() => {
  mockCustomInstance.mockReset();
  stubViewport(900);
  serve();
});

afterEach(async () => {
  cleanup();
  await act(() => overlayHistorySettled());
  vi.unstubAllGlobals();
});

describe("UI-OVL-002 a community admin dialog holding its request stays open, its inputs read-only", () => {
  it.each(FLOWS)("UI-OVL-002 %s stays open on Escape, the backdrop, back and Cancelar while it runs", async (_, flow) => {
    const u = userEvent.setup();
    await renderPage();
    const dialog = await flow.open(u);
    await flow.send(u, dialog);
    expect(await within(dialog).findByRole("button", { name: flow.pendingLabel })).toBeDisabled();

    fireEvent.keyDown(dialog, { key: "Escape" });
    // Structural: the backdrop has no role or name; it is MUI's own element.
    await u.click(document.querySelector(".MuiBackdrop-root") as HTMLElement);
    await pressBack();
    const cancel = within(dialog).getByRole("button", { name: "Cancelar" });
    expect(cancel).toBeDisabled();
    // A disabled button takes no pointer events, so userEvent refuses it.
    fireEvent.click(cancel);

    expect(screen.getByRole("dialog", { name: flow.title })).toBe(dialog);
    for (const field of within(dialog).queryAllByRole("textbox")) expect(field).toHaveAttribute("readonly");
  });
});

const DISCARD_QUESTION = "Tienes cambios sin guardar. Si cierras, se perderán.";

const CLOSE_ATTEMPTS = [
  ["Cancelar", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Cancelar" }))],
  ["Escape", (_: User, dialog: HTMLElement) => fireEvent.keyDown(dialog, { key: "Escape" })],
  ["back", () => pressBack()],
] as const;

describe("UI-OVL-003 the admin invitation asks before discarding changes", () => {
  it.each(CLOSE_ATTEMPTS)("UI-OVL-003 with changes, %s asks first and keeps the dialog", async (_, attempt) => {
    const u = userEvent.setup();
    await renderPage();
    const dialog = await openInvite(u);
    await paste(u, dialog, "Teléfono", "600000000");

    await attempt(u, dialog);

    expect(within(dialog).getByRole("alert")).toHaveTextContent(DISCARD_QUESTION);
    expect(screen.getByRole("dialog", { name: INVITE_TITLE })).toBe(dialog);
  });

  it.each(CLOSE_ATTEMPTS)("UI-OVL-003 without changes, %s closes directly", async (_, attempt) => {
    const u = userEvent.setup();
    await renderPage();
    const dialog = await openInvite(u);

    await attempt(u, dialog);

    await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());
    expect(screen.queryByText(DISCARD_QUESTION)).not.toBeInTheDocument();
  });
});

describe("UI-OVL-006 each community admin dialog is named by its title", () => {
  it.each(FLOWS)("UI-OVL-006 %s is a dialog named by the heading it shows", async (_, flow) => {
    const u = userEvent.setup();
    await renderPage();

    const dialog = await flow.open(u);

    expect(within(dialog).getByRole("heading", { name: flow.title })).toBeInTheDocument();
    expect(dialog).toHaveAccessibleName(flow.title);
  });
});
