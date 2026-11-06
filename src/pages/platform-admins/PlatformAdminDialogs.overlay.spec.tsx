import "@testing-library/jest-dom";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests } from "../../test/requestRouter";
import { declaredStyles, pressBack, stubViewport } from "../../test/overlay";
import { overlayHistorySettled } from "../../components/ResponsiveOverlay/overlayHistory";
import {
  buildCurrentUser,
  buildPlatformAdmin,
  buildPlatformAdminCapabilities,
  buildPlatformAdminInvitation,
  buildPlatformCapabilities,
} from "../../test/fixtures";
import { CapabilityRoute } from "../../components/Auth/CapabilityRoute";
import { PlatformAdminsPage } from "./PlatformAdminsPage";

/**
 * The platform admins page's dialogs on the shared overlay (#370): their size,
 * their in-flight lock, the invitation's unsaved-changes question, their
 * names, and the confirmation code, which asks before any close but "Hecho"
 * (UI-PAD-010).
 *
 * Tier 2: the real generated hooks and actions layer run, so a write is held
 * in flight by a request that does not answer, or answered with a code.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const PLATFORM_ADMINS_URL = "/api/v1/platform-admins";
const CODE = "K7Q2M9XZ";
const NEW_CODE = "B4N8R2TW";

const CALLER = buildCurrentUser({
  id: "u-paula",
  fullName: "Paula Plataforma",
  isPlatformAdmin: true,
  memberships: {},
  platformCapabilities: buildPlatformCapabilities({
    canAdministerPlatform: true,
    canListPlatformAdmins: true,
    canInvitePlatformAdmins: true,
  }),
});
const ALL_ROW_CAPABILITIES = buildPlatformAdminCapabilities({
  canRevoke: true,
  canResendInvitation: true,
  canRevokeInvitation: true,
});
const RAMON = buildPlatformAdmin({
  user: { id: "u-ramon" },
  fullName: "Ramón Revocable",
  email: "ramon@example.com",
  revocable: true,
  capabilities: ALL_ROW_CAPABILITIES,
});
const LUIS = buildPlatformAdminInvitation({
  user: { id: "u-luis" },
  fullName: "Luis Lapsado",
  email: "luis@example.com",
  invitation: { invitedAt: "2026-10-01T10:00:00Z", expiresAt: null },
  capabilities: ALL_ROW_CAPABILITIES,
});
const NURIA = buildPlatformAdminInvitation({
  user: { id: "u-nuria" },
  fullName: "Nuria Nueva",
  email: "nuria@example.com",
  invitation: { invitedAt: "2026-10-19T10:00:00Z", expiresAt: "2026-10-26T10:00:00Z" },
  capabilities: ALL_ROW_CAPABILITIES,
});
const IRENE = buildPlatformAdminInvitation({
  user: { id: "u-irene" },
  fullName: "Irene Invitada",
  email: "irene@example.com",
  invitation: { invitedAt: "2026-10-19T10:00:00Z", expiresAt: "2026-10-26T10:00:00Z" },
  capabilities: ALL_ROW_CAPABILITIES,
});

/** A request that never answers: the write stays in flight. */
const hold = () => new Promise(() => {});

/** Holds every write in flight, unless `answerCodes` answers the invitation and the resend with a code. */
function serve({ answerCodes = false }: { answerCodes?: boolean } = {}) {
  const router = routeRequests([
    { method: "GET", url: "/api/v1/users/current", respond: () => CALLER },
    { method: "GET", url: PLATFORM_ADMINS_URL, respond: () => [RAMON, LUIS, NURIA] },
    {
      method: "POST",
      url: `${PLATFORM_ADMINS_URL}/invite`,
      respond: answerCodes ? () => ({ platformAdmin: IRENE, confirmationCode: CODE }) : hold,
    },
    {
      method: "POST",
      url: /^\/api\/v1\/platform-admins\/[^/]+\/invitation\/resend$/,
      respond: answerCodes ? () => ({ platformAdmin: LUIS, confirmationCode: NEW_CODE }) : hold,
    },
    { method: "POST", url: /^\/api\/v1\/platform-admins\/[^/]+\/invitation\/revoke$/, respond: hold },
    { method: "POST", url: /^\/api\/v1\/users\/[^/]+\/revoke-platform-admin$/, respond: hold },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
}

async function renderPage() {
  renderWithProviders(
    <Routes>
      <Route
        path="/platform-admins"
        element={
          <CapabilityRoute require={{ scope: "platform", capability: "canListPlatformAdmins" }}>
            <PlatformAdminsPage />
          </CapabilityRoute>
        }
      />
    </Routes>,
    { route: "/platform-admins", token: "a-token", activeCommunityId: null },
  );
  await screen.findAllByText("Ramón Revocable");
}

type User = ReturnType<typeof userEvent.setup>;

const INVITE_TITLE = "Invitar administrador de plataforma";
const CODE_TITLE = "Código de confirmación";
const CODE_QUESTION = "Este código no se volverá a mostrar. ¿Lo has copiado?";

async function openInvite(u: User) {
  await u.click(await screen.findByRole("button", { name: INVITE_TITLE }));
  return screen.findByRole("dialog", { name: INVITE_TITLE });
}

async function fromMenu(u: User, row: string, item: string, title: string) {
  await u.click(screen.getByRole("button", { name: `Más acciones para ${row}` }));
  await u.click(within(await screen.findByRole("menu")).getByRole("menuitem", { name: item }));
  return screen.findByRole("dialog", { name: title });
}

/** Pasted, not typed: what matters is that a field changed. */
async function paste(u: User, dialog: HTMLElement, label: string, value: string) {
  await u.click(within(dialog).getByRole("textbox", { name: new RegExp(`^${label}`) }));
  await u.paste(value);
}

async function sendInvitation(u: User, dialog: HTMLElement) {
  await paste(u, dialog, "DNI/NIE/NIF", "12345678Z");
  await paste(u, dialog, "Nombre completo", "Irene Invitada");
  await paste(u, dialog, "Email", "irene@example.com");
  await u.click(within(dialog).getByRole("button", { name: "Invitar" }));
}

type Flow = {
  title: string;
  open: (u: User) => Promise<HTMLElement>;
  send: (u: User, dialog: HTMLElement) => Promise<void>;
  pendingLabel: string;
};

const FLOWS: Array<[string, Flow]> = [
  ["the invitation", { title: INVITE_TITLE, open: openInvite, send: sendInvitation, pendingLabel: "Enviando..." }],
  [
    "an invitation's resend",
    {
      title: "Reenviar invitación",
      open: (u) => fromMenu(u, "Luis Lapsado", "Reenviar", "Reenviar invitación"),
      send: (u, dialog) => u.click(within(dialog).getByRole("button", { name: "Reenviar" })),
      pendingLabel: "Enviando...",
    },
  ],
  [
    "an invitation's link revoke",
    {
      title: "Revocar enlace",
      open: (u) => fromMenu(u, "Nuria Nueva", "Revocar enlace", "Revocar enlace"),
      send: (u, dialog) => u.click(within(dialog).getByRole("button", { name: "Revocar enlace" })),
      pendingLabel: "Revocando...",
    },
  ],
  [
    "the role revoke",
    {
      title: "Revocar rol de administrador de plataforma",
      open: (u) => fromMenu(u, "Ramón Revocable", "Revocar rol", "Revocar rol de administrador de plataforma"),
      send: (u, dialog) => u.click(within(dialog).getByRole("button", { name: "Revocar rol" })),
      // The label does not change while it runs; the button is disabled.
      pendingLabel: "Revocar rol",
    },
  ],
];

beforeEach(() => {
  mockCustomInstance.mockReset();
  stubViewport(900);
});

afterEach(async () => {
  cleanup();
  await act(() => overlayHistorySettled());
  vi.unstubAllGlobals();
});

describe("UI-OVL-001 the platform-admin invitation: a sheet below md, a form dialog from md up", () => {
  it("UI-OVL-001 renders the invitation as a sheet at 899 px and a dialog of its size at 900 px", async () => {
    stubViewport(899);
    serve();
    await renderPage();
    expect(await openInvite(userEvent.setup())).toHaveClass("MuiDrawer-paperAnchorBottom");
    cleanup();
    await act(() => overlayHistorySettled());

    stubViewport(900);
    serve();
    await renderPage();
    const paper = await openInvite(userEvent.setup());
    expect(paper).toHaveClass("MuiDialog-paper");
    expect(declaredStyles(paper)).toContain("width:560px");
  });
});

describe("UI-OVL-002 a platform-admin dialog holding its request stays open, its inputs read-only", () => {
  it.each(FLOWS)("UI-OVL-002 %s stays open on Escape, the backdrop, back and Cancelar while it runs", async (_, flow) => {
    const u = userEvent.setup();
    serve();
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

describe("UI-OVL-003 the platform-admin invitation asks before discarding changes", () => {
  it.each(CLOSE_ATTEMPTS)("UI-OVL-003 with changes, %s asks first and keeps the dialog", async (_, attempt) => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    const dialog = await openInvite(u);
    await paste(u, dialog, "Nombre completo", "Irene");

    await attempt(u, dialog);

    expect(within(dialog).getByRole("alert")).toHaveTextContent(DISCARD_QUESTION);
    expect(screen.getByRole("dialog", { name: INVITE_TITLE })).toBe(dialog);
  });

  it.each(CLOSE_ATTEMPTS)("UI-OVL-003 without changes, %s closes directly", async (_, attempt) => {
    const u = userEvent.setup();
    serve();
    await renderPage();
    const dialog = await openInvite(u);

    await attempt(u, dialog);

    await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());
    expect(screen.queryByText(DISCARD_QUESTION)).not.toBeInTheDocument();
  });
});

describe("UI-OVL-006 each platform-admin dialog is named by its title", () => {
  it.each(FLOWS)("UI-OVL-006 %s is a dialog named by the heading it shows", async (_, flow) => {
    const u = userEvent.setup();
    serve();
    await renderPage();

    const dialog = await flow.open(u);

    expect(within(dialog).getByRole("heading", { name: flow.title })).toBeInTheDocument();
    expect(dialog).toHaveAccessibleName(flow.title);
  });
});

type CodeFlow = {
  /** Sends the write, which answers with a code, and returns the overlay that held it. */
  reach: (u: User) => Promise<HTMLElement>;
  grouped: string;
  width: string;
};

const CODE_FLOWS: Array<[string, CodeFlow]> = [
  [
    "the invitation's code",
    {
      reach: async (u) => {
        const form = await openInvite(u);
        await sendInvitation(u, form);
        return form;
      },
      grouped: "K7Q2-M9XZ",
      width: "560px",
    },
  ],
  [
    "the resend's code",
    {
      reach: async (u) => {
        const confirmation = await fromMenu(u, "Luis Lapsado", "Reenviar", "Reenviar invitación");
        await u.click(within(confirmation).getByRole("button", { name: "Reenviar" }));
        return confirmation;
      },
      grouped: "B4N8-R2TW",
      width: "440px",
    },
  ],
];

/** Shows the code, in the overlay that sent the write. */
async function showCode(u: User, flow: CodeFlow) {
  serve({ answerCodes: true });
  await renderPage();
  const sender = await flow.reach(u);
  const dialog = await screen.findByRole("dialog", { name: CODE_TITLE });
  await act(() => overlayHistorySettled());
  return { sender, dialog };
}

const copyButton = (dialog: HTMLElement) => within(dialog).getByRole("button", { name: "Copiar código" });

describe("UI-PAD-010 while the code shows, any close but Hecho asks first", () => {
  describe.each(CODE_FLOWS)("%s", (_, flow) => {
    it("UI-PAD-010 shows in the overlay that sent it, at that flow's size, with focus left where the dialog puts it", async () => {
      const { sender, dialog } = await showCode(userEvent.setup(), flow);

      expect(dialog).toBe(sender);
      expect(screen.getAllByRole("dialog")).toHaveLength(1);
      expect(declaredStyles(dialog)).toContain(`width:${flow.width}`);
      // Unchanged from before the code panel moved onto the overlay: nothing in
      // the panel takes focus when the code appears (#370).
      expect(dialog).not.toContainElement(document.activeElement as HTMLElement);
    });

    it.each([
      ["Escape", (_: User, dialog: HTMLElement) => fireEvent.keyDown(dialog, { key: "Escape" })],
      ["the close icon", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Cerrar" }))],
      ["back", () => pressBack()],
    ] as const)("UI-PAD-010 %s asks first; Volver al código keeps the code and focuses its copy button", async (_, attempt) => {
      const u = userEvent.setup();
      const { dialog } = await showCode(u, flow);

      await attempt(u, dialog);

      expect(within(dialog).getByRole("alert")).toHaveTextContent(CODE_QUESTION);
      expect(within(dialog).queryByRole("button", { name: "Hecho" })).not.toBeInTheDocument();
      await u.click(within(dialog).getByRole("button", { name: "Volver al código" }));
      expect(screen.getByRole("dialog", { name: CODE_TITLE })).toBe(dialog);
      expect(within(dialog).getByText(flow.grouped)).toBeInTheDocument();
      expect(copyButton(dialog)).toHaveFocus();
      expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    });

    it("UI-PAD-010 Cerrar sin copiar closes, and the code is gone", async () => {
      const u = userEvent.setup();
      const { dialog } = await showCode(u, flow);

      fireEvent.keyDown(dialog, { key: "Escape" });
      await u.click(within(dialog).getByRole("button", { name: "Cerrar sin copiar" }));

      await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());
      expect(screen.queryByText(flow.grouped)).not.toBeInTheDocument();
    });

    it("UI-PAD-010 Hecho closes directly, asking nothing", async () => {
      const u = userEvent.setup();
      const { dialog } = await showCode(u, flow);

      await u.click(within(dialog).getByRole("button", { name: "Hecho" }));

      expect(screen.queryByText(CODE_QUESTION)).not.toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());
      expect(screen.queryByText(flow.grouped)).not.toBeInTheDocument();
    });

    it("UI-PAD-010 after back is answered with Volver al código, a second back asks again", async () => {
      const u = userEvent.setup();
      const { dialog } = await showCode(u, flow);

      await pressBack();
      await u.click(within(dialog).getByRole("button", { name: "Volver al código" }));
      await pressBack();

      expect(within(dialog).getByRole("alert")).toHaveTextContent(CODE_QUESTION);
      expect(within(dialog).getByText(flow.grouped)).toBeInTheDocument();
    });
  });
});
