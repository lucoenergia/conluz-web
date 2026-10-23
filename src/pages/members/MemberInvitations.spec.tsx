import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import type { MembershipResponse, RestErrorDetailCode } from "../../api/models";
import {
  BULK_INVITE_URL,
  COMMUNITY_ID,
  COMMUNITY_NAME,
  inviteUrl,
  removeUrl,
  requestsTo,
  resendUrl,
  restError,
  revokeUrl,
  rosterReads,
  rosterRow,
  serveMembersPage,
  type Roster,
} from "./MembersPage.testUtils";
import { MembersPage } from "./MembersPage";

/**
 * The invitation writes on the roster, the bulk send, their refusals, and the
 * refusal to remove a member who owns supplies, against routed requests (#275).
 *
 * Tier 2: the real generated hooks, actions layer and QueryClient run, and only
 * the HTTP layer is mocked, so a test sees each request sent and the row the
 * page shows once its invalidation has refetched the roster.
 */
const { mockCustomInstance, mockErrorDispatch } = vi.hoisted(() => ({
  mockCustomInstance: vi.fn(),
  mockErrorDispatch: vi.fn(),
}));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

// The page's failure slot is the layout's toast, which is not rendered here;
// what the page dispatches to it is what these tests read.
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

const ACTIVE_LINK = { invitedAt: "2026-10-01T10:00:00Z", invitationExpiresAt: "2026-10-08T10:00:00Z" };
const NEW_LINK = { invitedAt: "2026-10-19T10:00:00Z", invitationExpiresAt: "2026-10-26T10:00:00Z" };

const NADIA = rosterRow("u-nadia", "Nadia Nueva");
const LUCAS = rosterRow("u-lucas", "Lucas Enlace", ACTIVE_LINK);
// Invited once, and the link has expired: the backend no longer sends its expiry.
const ELENA = rosterRow("u-elena", "Elena Caducada", { invitedAt: "2026-09-01T10:00:00Z" });
const ANA = rosterRow("u-ana", "Ana García", { acceptedAt: "2026-01-15T09:00:00Z" });

/** Changes one member's row as the backend would, for the next roster GET. */
const update = (roster: Roster, userId: string, change: Partial<MembershipResponse>) => {
  roster.current = roster.current.map((m) => (m.user?.id === userId ? { ...m, ...change } : m));
};

const renderPage = async () => {
  renderWithProviders(<MembersPage />, { activeCommunityId: COMMUNITY_ID, token: "a-token" });
  await screen.findByText("Ana García");
};

const user = () => userEvent.setup();

const rowOf = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;

async function menuOf(u: ReturnType<typeof userEvent.setup>, name: string) {
  await u.click(screen.getByRole("button", { name: `Más acciones para ${name}` }));
  return screen.findByRole("menu");
}

async function menuItemsOf(u: ReturnType<typeof userEvent.setup>, name: string) {
  const menu = await menuOf(u, name);
  const items = within(menu)
    .getAllByRole("menuitem")
    .map((item) => item.textContent);
  await u.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  return items;
}

/** Picks the item from the row's menu, and confirms in the dialog it opens. */
async function confirmFromMenu(
  u: ReturnType<typeof userEvent.setup>,
  name: string,
  item: "Invitar" | "Reenviar" | "Revocar enlace",
  title: string,
) {
  const menu = await menuOf(u, name);
  await u.click(within(menu).getByRole("menuitem", { name: item }));
  const dialog = await screen.findByRole("dialog", { name: `${title} ${COMMUNITY_NAME}` });
  expect(within(dialog).getByText(name)).toBeInTheDocument();
  await u.click(within(dialog).getByRole("button", { name: item }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

beforeEach(() => {
  mockCustomInstance.mockReset();
  mockErrorDispatch.mockReset();
});

describe("inviting from the roster", () => {
  it("UI-MBR-012 invites a never-invited member, and the row shows the active link and its expiry", async () => {
    const u = user();
    const roster: Roster = { current: [NADIA, ANA] };
    const router = serveMembersPage(mockCustomInstance, roster, {
      invite: () => {
        update(roster, "u-nadia", NEW_LINK);
        return {};
      },
    });
    await renderPage();
    expect(within(rowOf("Nadia Nueva")).getByText("Sin invitar")).toBeInTheDocument();

    await confirmFromMenu(u, "Nadia Nueva", "Invitar", "Enviar invitación en");

    expect(requestsTo(router, "POST", inviteUrl("u-nadia"))).toHaveLength(1);
    expect(await within(rowOf("Nadia Nueva")).findByText("Enlace activo hasta el 26 oct 2026")).toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  it("UI-MBR-012 offers Reenviar, not Invitar, on a member whose link expired, and resending shows a new active link", async () => {
    const u = user();
    const roster: Roster = { current: [ELENA, ANA] };
    const router = serveMembersPage(mockCustomInstance, roster, {
      resend: () => {
        update(roster, "u-elena", NEW_LINK);
        return {};
      },
    });
    await renderPage();
    expect(within(rowOf("Elena Caducada")).getByText("Enlace caducado o revocado")).toBeInTheDocument();
    expect(await menuItemsOf(u, "Elena Caducada")).toEqual(["Editar ficha", "Reenviar", "Suspender", "Eliminar"]);

    await confirmFromMenu(u, "Elena Caducada", "Reenviar", "Reenviar invitación en");

    expect(requestsTo(router, "POST", resendUrl("u-elena"))).toHaveLength(1);
    expect(requestsTo(router, "POST", inviteUrl("u-elena"))).toHaveLength(0);
    expect(await within(rowOf("Elena Caducada")).findByText("Enlace activo hasta el 26 oct 2026")).toBeInTheDocument();
  });

  it.each([
    ["the Retry-After header", { headers: { "retry-after": "7200" } }, "2 horas"],
    ["params.retryAfterSeconds", { params: { retryAfterSeconds: "1500" } }, "25 minutos"],
  ])("UI-MBR-014 says when another resend becomes possible, from %s", async (_source, detail, wait) => {
    const u = user();
    serveMembersPage(mockCustomInstance, { current: [LUCAS, ANA] }, {
      resend: () => {
        throw restError(429, "MEMBERSHIP_INVITATION_RESEND_LIMIT_REACHED", detail);
      },
    });
    await renderPage();

    await confirmFromMenu(u, "Lucas Enlace", "Reenviar", "Reenviar invitación en");

    await waitFor(() =>
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        `Has alcanzado el límite de reenvíos para este miembro. Podrás volver a reenviar la invitación dentro de ${wait}.`,
      ),
    );
  });

  it("UI-MBR-012 revoking leaves no active link and still offers Reenviar", async () => {
    const u = user();
    const roster: Roster = { current: [LUCAS, ANA] };
    const router = serveMembersPage(mockCustomInstance, roster, {
      revoke: () => {
        update(roster, "u-lucas", { invitationExpiresAt: null });
        return {};
      },
    });
    await renderPage();
    expect(await menuItemsOf(u, "Lucas Enlace")).toContain("Revocar enlace");

    await confirmFromMenu(u, "Lucas Enlace", "Revocar enlace", "Revocar enlace en");

    expect(requestsTo(router, "POST", revokeUrl("u-lucas"))).toHaveLength(1);
    expect(await within(rowOf("Lucas Enlace")).findByText("Enlace caducado o revocado")).toBeInTheDocument();
    const items = await menuItemsOf(u, "Lucas Enlace");
    expect(items).toContain("Reenviar");
    expect(items).not.toContain("Revocar enlace");
    expect(items).not.toContain("Invitar");
  });
});

describe("sending the pending invitations in bulk", () => {
  it("UI-MBR-013 sends 120 in three batches, showing the counts and offering to continue while some remain", async () => {
    const u = user();
    const batches = [
      { sent: 50, remaining: 70 },
      { sent: 50, remaining: 20 },
      { sent: 20, remaining: 0 },
    ];
    const router = serveMembersPage(mockCustomInstance, { current: [NADIA, ANA] }, {
      bulk: () => batches[requestsTo(router, "POST", BULK_INVITE_URL).length - 1],
    });
    await renderPage();
    const readsBefore = rosterReads(router);

    await u.click(screen.getByRole("button", { name: "Enviar invitaciones pendientes" }));
    const dialog = await screen.findByRole("dialog", { name: `Enviar invitaciones pendientes en ${COMMUNITY_NAME}` });
    // A confirmation first: nothing is sent on opening.
    expect(requestsTo(router, "POST", BULK_INVITE_URL)).toHaveLength(0);
    await u.click(within(dialog).getByRole("button", { name: "Enviar invitaciones" }));

    expect(await within(dialog).findByText("Se han enviado 50 invitaciones.")).toBeInTheDocument();
    expect(within(dialog).getByText(/Quedan 70 por enviar/)).toBeInTheDocument();
    await u.click(within(dialog).getByRole("button", { name: "Enviar las siguientes" }));

    expect(await within(dialog).findByText(/Quedan 20 por enviar/)).toBeInTheDocument();
    expect(within(dialog).getByText("Se han enviado 50 invitaciones.")).toBeInTheDocument();
    await u.click(within(dialog).getByRole("button", { name: "Enviar las siguientes" }));

    expect(await within(dialog).findByText("Se han enviado 20 invitaciones.")).toBeInTheDocument();
    expect(within(dialog).getByText("No queda ninguna invitación pendiente de enviar.")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Enviar las siguientes" })).not.toBeInTheDocument();

    expect(requestsTo(router, "POST", BULK_INVITE_URL)).toHaveLength(3);
    // Each batch changes rows, so the roster is refetched after each.
    await waitFor(() => expect(rosterReads(router)).toBeGreaterThanOrEqual(readsBefore + 3));
  });

  it("UI-MBR-014 says invitations cannot be sent right now, in the dialog", async () => {
    const u = user();
    serveMembersPage(mockCustomInstance, { current: [NADIA, ANA] }, {
      bulk: () => {
        throw restError(503, "MEMBERSHIP_INVITATION_UNAVAILABLE");
      },
    });
    await renderPage();

    await u.click(screen.getByRole("button", { name: "Enviar invitaciones pendientes" }));
    const dialog = await screen.findByRole("dialog");
    await u.click(within(dialog).getByRole("button", { name: "Enviar invitaciones" }));

    expect(
      await within(dialog).findByText("Ahora mismo no se pueden enviar invitaciones. Inténtalo más tarde."),
    ).toBeInTheDocument();
  });
});

describe("invitation refusals", () => {
  it.each([
    [
      "MEMBERSHIP_WITHOUT_CONTACT_EMAIL",
      400,
      "Este miembro no tiene email de contacto. Añádelo desde «Editar ficha» y vuelve a intentarlo.",
    ],
    ["MEMBERSHIP_INVITATION_UNAVAILABLE", 503, "Ahora mismo no se pueden enviar invitaciones. Inténtalo más tarde."],
  ] as const)("UI-MBR-014 words %s, and leaves the roster as it was", async (code, status, message) => {
    const u = user();
    const router = serveMembersPage(mockCustomInstance, { current: [NADIA, ANA] }, {
      invite: () => {
        throw restError(status, code);
      },
    });
    await renderPage();
    const readsBefore = rosterReads(router);

    await confirmFromMenu(u, "Nadia Nueva", "Invitar", "Enviar invitación en");

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(message));
    expect(rosterReads(router)).toBe(readsBefore);
  });

  it("UI-MBR-014 says the member is suspended, refetches the roster, and the row then shows Suspendido with no invitation action", async () => {
    const u = user();
    const roster: Roster = { current: [NADIA, ANA] };
    const router = serveMembersPage(mockCustomInstance, roster, {
      invite: () => {
        // Suspended in another session since the roster was read.
        update(roster, "u-nadia", { enabled: false });
        throw restError(409, "MEMBERSHIP_DISABLED");
      },
    });
    await renderPage();
    const readsBefore = rosterReads(router);

    await confirmFromMenu(u, "Nadia Nueva", "Invitar", "Enviar invitación en");

    await waitFor(() =>
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Este miembro está suspendido, así que no se le puede invitar. Hemos actualizado la lista.",
      ),
    );
    await waitFor(() => expect(rosterReads(router)).toBeGreaterThan(readsBefore));
    expect(await within(rowOf("Nadia Nueva")).findByText("Suspendido")).toBeInTheDocument();
    const items = await menuItemsOf(u, "Nadia Nueva");
    expect(items).not.toContain("Invitar");
    expect(items).not.toContain("Reenviar");
    expect(items).not.toContain("Revocar enlace");
  });

  it.each<[string, MembershipResponse, "Invitar" | "Reenviar", string, RestErrorDetailCode, Partial<MembershipResponse>, string, string]>([
    [
      "an invite to a member invited meanwhile",
      NADIA,
      "Invitar",
      "Enviar invitación en",
      "MEMBERSHIP_ALREADY_INVITED",
      ACTIVE_LINK,
      "Este miembro ya tenía una invitación enviada. Hemos actualizado la lista.",
      "Enlace activo hasta el 8 oct 2026",
    ],
    [
      "a resend to a member whose invitation is gone",
      ELENA,
      "Reenviar",
      "Reenviar invitación en",
      "MEMBERSHIP_NOT_INVITED",
      { invitedAt: null, invitationExpiresAt: null },
      "Este miembro todavía no tiene ninguna invitación que reenviar. Hemos actualizado la lista.",
      "Sin invitar",
    ],
  ])("UI-MBR-014 refetches the roster after %s, and shows its new state", async (_case, row, item, title, code, change, message, shown) => {
    const u = user();
    const roster: Roster = { current: [row, ANA] };
    const userId = row.user?.id ?? "";
    const name = row.user?.fullName ?? "";
    const router = serveMembersPage(mockCustomInstance, roster, {
      [item === "Invitar" ? "invite" : "resend"]: () => {
        update(roster, userId, change);
        throw restError(409, code);
      },
    });
    await renderPage();
    const readsBefore = rosterReads(router);

    await confirmFromMenu(u, name, item, title);

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(message));
    await waitFor(() => expect(rosterReads(router)).toBeGreaterThan(readsBefore));
    expect(await within(rowOf(name)).findByText(shown)).toBeInTheDocument();
  });
});

describe("removing a member who owns supplies", () => {
  it("UI-MBR-015 says why, recommending suspension, and the member stays in the roster", async () => {
    const u = user();
    const router = serveMembersPage(mockCustomInstance, { current: [ANA] }, {
      remove: () => {
        throw restError(409, "MEMBERSHIP_OWNS_SUPPLIES");
      },
    });
    await renderPage();

    const menu = await menuOf(u, "Ana García");
    await u.click(within(menu).getByRole("menuitem", { name: "Eliminar" }));
    const dialog = await screen.findByRole("dialog", { name: `Eliminar miembro de ${COMMUNITY_NAME}` });
    await u.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(requestsTo(router, "DELETE", removeUrl("u-ana"))).toHaveLength(1));
    await waitFor(() =>
      expect(mockErrorDispatch).toHaveBeenCalledWith(
        "Este miembro es titular de suministros en esta comunidad. Si quieres que deje de tener acceso, suspéndelo; para eliminarlo, antes hay que eliminar sus suministros.",
      ),
    );
    expect(mockErrorDispatch).not.toHaveBeenCalledWith("Error al eliminar el miembro. Por favor, inténtalo de nuevo.");
    await u.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(await screen.findByText("Ana García")).toBeInTheDocument();
  });
});
