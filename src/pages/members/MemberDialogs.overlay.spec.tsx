import "@testing-library/jest-dom";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig, type RequestRouter } from "../../test/requestRouter";
import { declaredStyles, hasOverlayEntry, pressBack, stubViewport } from "../../test/overlay";
import { overlayHistorySettled } from "../../components/ResponsiveOverlay/overlayHistory";
import { buildCurrentUser, buildMember, buildMembershipCapabilities } from "../../test/fixtures";
import type { RegisterMemberBody, SendInvitationsResponse } from "../../api/models";
import {
  ADMIN_COMMUNITY,
  BULK_INVITE_URL,
  CALLER_ID,
  COMMUNITY_ID,
  COMMUNITY_NAME,
  COMMUNITY_URL,
  ON_A_MEMBER,
  REGISTER_URL,
  ROSTER_URL,
  inviteUrl,
  requestsTo,
  rosterRow,
} from "./MembersPage.testUtils";
import { MembersPage } from "./MembersPage";

/**
 * The members page's dialogs on the shared overlay (#370): their size, their
 * in-flight lock, their unsaved-changes question, back, their names, and the
 * results that replace a form in the same overlay. The overlay's own behaviour
 * is ResponsiveOverlay.spec.tsx's; what each dialog sends is its own spec's.
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

const CALLER = buildCurrentUser({ id: CALLER_ID, fullName: "Ada Admin", memberships: { [COMMUNITY_ID]: "COMMUNITY_ADMIN" } });
const ON_AN_ACTIVE_MEMBER = { ...ON_A_MEMBER, canUpdateRole: true };
const ANA = rosterRow("u-ana", "Ana García", { acceptedAt: "2026-01-15T09:00:00Z", capabilities: ON_AN_ACTIVE_MEMBER });
const NADIA = rosterRow("u-nadia", "Nadia Nueva");
const BRUNO = rosterRow("u-bruno", "Bruno Blanco");

const REGISTERED = buildMember({
  id: "m-u-nuevo",
  user: { id: "u-nuevo" },
  community: { id: COMMUNITY_ID, name: COMMUNITY_NAME },
  personalId: "12345678Z",
  fullName: "Nuria Nueva",
  contactEmail: "nuria@example.com",
  capabilities: buildMembershipCapabilities({ canInvite: true }),
});

const SENT: SendInvitationsResponse = {
  sent: 2,
  remaining: 0,
  results: [
    { user: { id: "u-nadia" }, outcome: "SENT", code: null, params: {} },
    { user: { id: "u-bruno" }, outcome: "SENT", code: null, params: {} },
  ],
};

/** A request that never answers: the write stays in flight. */
const hold = () => new Promise(() => {});

type Write = "register" | "bulk" | "invite" | "remove" | "changeRole" | "disable" | "enable" | "record";

/** Every write is held in flight unless the test answers it. */
function serve(answers: Partial<Record<Write, (config: RequestConfig) => unknown>> = {}): RequestRouter {
  const write = (name: Write) => (config: RequestConfig) => (answers[name] ?? hold)(config);
  const router = routeRequests([
    { method: "GET", url: "/api/v1/users/current", respond: () => CALLER },
    { method: "GET", url: "/api/v1/communities", respond: () => [ADMIN_COMMUNITY] },
    { method: "GET", url: COMMUNITY_URL, respond: () => ADMIN_COMMUNITY },
    { method: "GET", url: ROSTER_URL, respond: () => [ANA, NADIA, BRUNO] },
    { method: "POST", url: REGISTER_URL, respond: write("register") },
    { method: "POST", url: BULK_INVITE_URL, respond: write("bulk") },
    { method: "POST", url: /\/memberships\/[^/]+\/invite$/, respond: write("invite") },
    { method: "POST", url: /\/memberships\/[^/]+\/disable$/, respond: write("disable") },
    { method: "POST", url: /\/memberships\/[^/]+\/enable$/, respond: write("enable") },
    { method: "PUT", url: /\/memberships\/[^/]+\/record$/, respond: write("record") },
    { method: "DELETE", url: /\/memberships\/[^/]+$/, respond: write("remove") },
    { method: "PATCH", url: /\/memberships\/[^/]+$/, respond: write("changeRole") },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  return router;
}

async function renderPage() {
  renderWithProviders(<MembersPage />, { activeCommunityId: COMMUNITY_ID, token: "a-token" });
  await screen.findAllByText("Ana García");
  // The send needs the community's capabilities: wait until the page offers it.
  await screen.findByRole("checkbox", { name: "Seleccionar Nadia Nueva" });
}

type User = ReturnType<typeof userEvent.setup>;

const dialogNamed = (name: string) => screen.findByRole("dialog", { name });

async function fromMenu(u: User, row: string, item: string, title: string) {
  await u.click(screen.getByRole("button", { name: `Más acciones para ${row}` }));
  await u.click(within(await screen.findByRole("menu")).getByRole("menuitem", { name: item }));
  return dialogNamed(title);
}

/** Pasted, not typed: what matters is that a field changed. */
async function paste(u: User, dialog: HTMLElement, label: string, value: string) {
  await u.click(within(dialog).getByLabelText(new RegExp(`^${label}`)));
  await u.paste(value);
}

async function pickRole(u: User, dialog: HTMLElement, role: string) {
  await u.click(within(dialog).getByRole("combobox"));
  await u.click(within(await screen.findByRole("listbox")).getByRole("option", { name: role }));
  await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
}

const REGISTER_TITLE = `Registrar miembro en ${COMMUNITY_NAME}`;
const REGISTERED_TITLE = `Miembro registrado en ${COMMUNITY_NAME}`;
const RECORD_TITLE = `Editar ficha en ${COMMUNITY_NAME}`;
const SEND_TITLE = `Enviar invitación en ${COMMUNITY_NAME}`;
const SUSPEND_TITLE = `Suspender miembro en ${COMMUNITY_NAME}`;
const ROLE_TITLE = `Cambiar rol en ${COMMUNITY_NAME}`;
const REMOVE_TITLE = `Eliminar miembro de ${COMMUNITY_NAME}`;

const openRegister = async (u: User) => {
  await u.click(screen.getByRole("button", { name: "Registrar miembro" }));
  return dialogNamed(REGISTER_TITLE);
};

const fillRegistration = async (u: User, dialog: HTMLElement) => {
  await paste(u, dialog, "DNI/NIE/NIF", "12345678Z");
  await paste(u, dialog, "Nombre completo", "Nuria Nueva");
  await paste(u, dialog, "Email de contacto", "nuria@example.com");
};

const openRegistered = async (u: User) => {
  const form = await openRegister(u);
  await fillRegistration(u, form);
  await u.click(within(form).getByRole("button", { name: "Registrar" }));
  return dialogNamed(REGISTERED_TITLE);
};

const openSend = async (u: User) => {
  await u.click(screen.getByRole("checkbox", { name: "Seleccionar Nadia Nueva" }));
  await u.click(screen.getByRole("checkbox", { name: "Seleccionar Bruno Blanco" }));
  await u.click(screen.getByRole("button", { name: "Enviar invitación (2)" }));
  return dialogNamed(SEND_TITLE);
};

type Flow = {
  title: string;
  answers?: Partial<Record<Write, (config: RequestConfig) => unknown>>;
  open: (u: User) => Promise<HTMLElement>;
  /** Sends the write, which the router holds in flight. */
  send: (u: User, dialog: HTMLElement) => Promise<void>;
  /** The confirm button while the write runs. */
  pendingLabel: string;
};

const FLOWS: Array<[string, Flow]> = [
  [
    "the registration",
    {
      title: REGISTER_TITLE,
      open: openRegister,
      send: async (u, dialog) => {
        await fillRegistration(u, dialog);
        await u.click(within(dialog).getByRole("button", { name: "Registrar" }));
      },
      pendingLabel: "Registrando...",
    },
  ],
  [
    "the registration's result, inviting now",
    {
      title: REGISTERED_TITLE,
      answers: { register: () => REGISTERED },
      open: openRegistered,
      send: (u, dialog) => u.click(within(dialog).getByRole("button", { name: "Invitar ahora" })),
      pendingLabel: "Enviando...",
    },
  ],
  [
    "the record edit",
    {
      title: RECORD_TITLE,
      open: (u) => fromMenu(u, "Ana García", "Editar ficha", RECORD_TITLE),
      send: (u, dialog) => u.click(within(dialog).getByRole("button", { name: "Guardar" })),
      pendingLabel: "Guardando...",
    },
  ],
  [
    "the send to selected members",
    {
      title: SEND_TITLE,
      open: openSend,
      send: (u, dialog) => u.click(within(dialog).getByRole("button", { name: "Enviar invitación (2)" })),
      pendingLabel: "Enviando...",
    },
  ],
  [
    "a row's invitation",
    {
      title: SEND_TITLE,
      open: (u) => fromMenu(u, "Nadia Nueva", "Invitar", SEND_TITLE),
      send: (u, dialog) => u.click(within(dialog).getByRole("button", { name: "Invitar" })),
      pendingLabel: "Enviando...",
    },
  ],
  [
    "the suspension",
    {
      title: SUSPEND_TITLE,
      open: (u) => fromMenu(u, "Ana García", "Suspender", SUSPEND_TITLE),
      send: (u, dialog) => u.click(within(dialog).getByRole("button", { name: "Suspender" })),
      // The label does not change while it runs; the button is disabled.
      pendingLabel: "Suspender",
    },
  ],
  [
    "the role change",
    {
      title: ROLE_TITLE,
      open: (u) => fromMenu(u, "Ana García", "Cambiar rol", ROLE_TITLE),
      send: async (u, dialog) => {
        await pickRole(u, dialog, "Administrador");
        await u.click(within(dialog).getByRole("button", { name: "Confirmar" }));
      },
      pendingLabel: "Guardando...",
    },
  ],
  [
    "the removal",
    {
      title: REMOVE_TITLE,
      open: (u) => fromMenu(u, "Ana García", "Eliminar", REMOVE_TITLE),
      send: (u, dialog) => u.click(within(dialog).getByRole("button", { name: "Eliminar" })),
      pendingLabel: "Eliminando...",
    },
  ],
];

beforeEach(() => {
  mockCustomInstance.mockReset();
  stubViewport(900);
});

afterEach(async () => {
  // An overlay left open gives its history entry back on unmount: let that
  // back land before the next test reads the history.
  cleanup();
  await act(() => overlayHistorySettled());
  vi.unstubAllGlobals();
});

describe("UI-OVL-001 a member form and a member confirmation: a sheet below md, a dialog of their size from md up", () => {
  it.each([
    ["the registration", openRegister, REGISTER_TITLE, "560px"],
    ["the removal", (u: User) => fromMenu(u, "Ana García", "Eliminar", REMOVE_TITLE), REMOVE_TITLE, "440px"],
  ] as const)("UI-OVL-001 renders %s as a sheet at 899 px and a dialog of its size at 900 px", async (_, open, title, width) => {
    stubViewport(899);
    serve();
    await renderPage();
    expect(await open(userEvent.setup())).toHaveClass("MuiDrawer-paperAnchorBottom");
    cleanup();
    await act(() => overlayHistorySettled());

    stubViewport(900);
    serve();
    await renderPage();
    const paper = await open(userEvent.setup());
    expect(paper).toHaveClass("MuiDialog-paper");
    expect(declaredStyles(paper)).toContain(`width:${width}`);
    expect(paper).toHaveAccessibleName(title);
  });
});

describe("UI-OVL-002 a member dialog holding its request stays open, its inputs read-only", () => {
  it.each(FLOWS)("UI-OVL-002 %s stays open on Escape, the backdrop, back and Cancelar while it runs", async (_, flow) => {
    const u = userEvent.setup();
    serve(flow.answers);
    await renderPage();
    const dialog = await flow.open(u);
    await flow.send(u, dialog);
    expect(await within(dialog).findByRole("button", { name: flow.pendingLabel })).toBeDisabled();

    fireEvent.keyDown(dialog, { key: "Escape" });
    // Structural: the backdrop has no role or name; it is MUI's own element.
    await u.click(document.querySelector(".MuiBackdrop-root") as HTMLElement);
    await pressBack();
    const cancel = within(dialog).getByRole("button", { name: /^(Cancelar|Cerrar)$/ });
    expect(cancel).toBeDisabled();
    // A disabled button takes no pointer events, so userEvent refuses it.
    fireEvent.click(cancel);

    expect(screen.getByRole("dialog", { name: flow.title })).toBe(dialog);
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    for (const field of within(dialog).queryAllByRole("textbox")) expect(field).toHaveAttribute("readonly");
    // The role list does not open while the change runs.
    const role = within(dialog).queryByRole("combobox");
    if (role) {
      await u.click(role);
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    }
  });
});

type DirtyCase = {
  title: string;
  open: (u: User) => Promise<HTMLElement>;
  change: (u: User, dialog: HTMLElement) => Promise<void>;
};

const DIRTY_CASES: Array<[string, DirtyCase]> = [
  ["the registration", { title: REGISTER_TITLE, open: openRegister, change: (u, d) => paste(u, d, "Nombre completo", "Nuria") }],
  [
    "the record edit",
    {
      title: RECORD_TITLE,
      open: (u) => fromMenu(u, "Ana García", "Editar ficha", RECORD_TITLE),
      change: (u, d) => paste(u, d, "Teléfono", "600000000"),
    },
  ],
  [
    "the role change",
    {
      title: ROLE_TITLE,
      open: (u) => fromMenu(u, "Ana García", "Cambiar rol", ROLE_TITLE),
      change: (u, d) => pickRole(u, d, "Administrador"),
    },
  ],
];

const DISCARD_QUESTION = "Tienes cambios sin guardar. Si cierras, se perderán.";

const CLOSE_ATTEMPTS = [
  ["Cancelar", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Cancelar" }))],
  ["Escape", (_: User, dialog: HTMLElement) => fireEvent.keyDown(dialog, { key: "Escape" })],
  ["back", () => pressBack()],
] as const;

describe("UI-OVL-003 a member dialog with changes asks before discarding them", () => {
  describe.each(DIRTY_CASES)("%s", (_, { title, open, change }) => {
    it.each(CLOSE_ATTEMPTS)("UI-OVL-003 with changes, %s asks first and keeps the dialog", async (_, attempt) => {
      const u = userEvent.setup();
      serve();
      await renderPage();
      const dialog = await open(u);
      await change(u, dialog);

      await attempt(u, dialog);

      expect(within(dialog).getByRole("alert")).toHaveTextContent(DISCARD_QUESTION);
      expect(screen.getByRole("dialog", { name: title })).toBe(dialog);
    });

    it.each(CLOSE_ATTEMPTS)("UI-OVL-003 without changes, %s closes directly", async (_, attempt) => {
      const u = userEvent.setup();
      serve();
      await renderPage();
      const dialog = await open(u);

      await attempt(u, dialog);

      await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());
      expect(screen.queryByText(DISCARD_QUESTION)).not.toBeInTheDocument();
    });
  });

  it.each(CLOSE_ATTEMPTS.filter(([name]) => name !== "Cancelar"))(
    "UI-OVL-003 the registration's result asks nothing: %s closes it",
    async (_, attempt) => {
      const u = userEvent.setup();
      serve({ register: () => REGISTERED });
      await renderPage();
      const dialog = await openRegistered(u);

      await attempt(u, dialog);

      await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());
      expect(screen.queryByText(DISCARD_QUESTION)).not.toBeInTheDocument();
    },
  );
});

describe("UI-OVL-004 back closes a member dialog, not the page", () => {
  async function renderRouted() {
    window.history.replaceState(null, "", "/start");
    window.history.pushState(null, "", "/members");
    renderWithProviders(
      <Routes>
        <Route path="/start" element={<p>Inicio</p>} />
        <Route path="/members" element={<MembersPage />} />
      </Routes>,
      { browserHistory: true, activeCommunityId: COMMUNITY_ID, token: "a-token" },
    );
    await screen.findAllByText("Ana García");
    await act(() => overlayHistorySettled());
  }

  it("UI-OVL-004 back closes a clean member dialog and the members page stays", async () => {
    const u = userEvent.setup();
    serve();
    await renderRouted();
    await fromMenu(u, "Ana García", "Eliminar", REMOVE_TITLE);
    await act(() => overlayHistorySettled());

    await pressBack();

    await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());
    expect(window.location.pathname).toBe("/members");
    expect(screen.getAllByText("Ana García").length).toBeGreaterThan(0);
    expect(hasOverlayEntry()).toBe(false);
  });

  it("UI-OVL-004 after Cancelar, one back leaves the members page, with no dead step", async () => {
    const u = userEvent.setup();
    serve();
    await renderRouted();
    const dialog = await openRegister(u);
    await act(() => overlayHistorySettled());

    await u.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    await act(() => overlayHistorySettled());
    expect(window.location.pathname).toBe("/members");
    expect(hasOverlayEntry()).toBe(false);

    await pressBack();
    expect(window.location.pathname).toBe("/start");
    expect(await screen.findByText("Inicio")).toBeInTheDocument();
  });
});

describe("a result replaces its form in the same overlay", () => {
  it("UI-MBR-009 the registration's result shows in the registration's overlay, and Invitar ahora invites", async () => {
    const u = userEvent.setup();
    const router = serve({ register: () => REGISTERED, invite: () => undefined });
    await renderPage();
    const form = await openRegister(u);
    await fillRegistration(u, form);
    await u.click(within(form).getByRole("button", { name: "Registrar" }));

    const result = await dialogNamed(REGISTERED_TITLE);
    // The overlay that held the form, not a second one.
    expect(result).toBe(form);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);

    await u.click(within(result).getByRole("button", { name: "Invitar ahora" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());
    expect(requestsTo(router, "POST", inviteUrl("u-nuevo"))).toHaveLength(1);
    expect(requestsTo(router, "POST", REGISTER_URL)[0].data).toMatchObject({ fullName: "Nuria Nueva" } satisfies Partial<RegisterMemberBody>);
  });

  it("UI-MBR-040 the send's result, per person, shows in the confirmation's overlay", async () => {
    const u = userEvent.setup();
    serve({ bulk: () => SENT });
    await renderPage();
    const confirmation = await openSend(u);

    await u.click(within(confirmation).getByRole("button", { name: "Enviar invitación (2)" }));

    expect(await within(confirmation).findByText("Primeras invitaciones enviadas: 2.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: SEND_TITLE })).toBe(confirmation);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });
});

describe("UI-OVL-006 each member dialog is named by its title", () => {
  it.each(FLOWS)("UI-OVL-006 %s is a dialog named by the heading it shows", async (_, flow) => {
    const u = userEvent.setup();
    serve(flow.answers);
    await renderPage();

    const dialog = await flow.open(u);

    expect(within(dialog).getByRole("heading", { name: flow.title })).toBeInTheDocument();
    expect(dialog).toHaveAccessibleName(flow.title);
  });
});
