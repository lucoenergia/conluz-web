import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildCommunity, buildCommunityCapabilities, buildMembershipCapabilities } from "../../test/fixtures";
import { getGetMembershipsQueryKey } from "../../api/memberships/memberships";
import { getGetCommunityByIdQueryKey } from "../../api/communities/communities";
import type {
  CommunityResponse,
  MembershipResponse,
  RestErrorDetailCode,
  SendInvitationResultResponse,
  SendInvitationsResponse,
} from "../../api/models";
import {
  ADMIN_COMMUNITY,
  BULK_INVITE_URL,
  COMMUNITY_ID,
  COMMUNITY_NAME,
  requestsTo,
  restError,
  rosterReads,
  rosterRow,
  serveMembersPage,
  type Writes,
} from "./MembersPage.testUtils";
import { MembersPage } from "./MembersPage";
import { VISIBLE } from "../../test/visibleText";

/**
 * Selecting the members to invite or resend, and the send itself (#328),
 * against routed requests.
 *
 * Tier 2: the real generated hooks, actions layer and QueryClient run, and only
 * the HTTP layer is mocked, so a test sees the body sent and the roster
 * refetched once the send has settled.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const INVITED = { invitedAt: "2026-10-01T10:00:00Z", invitationExpiresAt: "2026-10-08T10:00:00Z" };

const NADIA = rosterRow("u-nadia", "Nadia Nueva");
const PEDRO = rosterRow("u-pedro", "Pedro Pendiente", INVITED);
const BRUNO = rosterRow("u-bruno", "Bruno Blanco");
const OSCAR = rosterRow("u-oscar", "Óscar Sincorreo", { contactEmail: null });
const ANA = rosterRow("u-ana", "Ana García", { acceptedAt: "2026-01-15T09:00:00Z" });
// Suspended while pending: an invitation to a disabled membership always fails.
const SARA = rosterRow("u-sara", "Sara Suspendida", { enabled: false });
// Pending, but the backend does not let this caller invite it.
const TOMAS = rosterRow("u-tomas", "Tomás Ajeno", {
  capabilities: buildMembershipCapabilities({ canDelete: true }),
});

const DIALOG_NAME = `Enviar invitación en ${COMMUNITY_NAME}`;

const setViewport = (width: number) =>
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });

const serve = (roster: MembershipResponse[], writes: Writes = {}, community: CommunityResponse = ADMIN_COMMUNITY) =>
  serveMembersPage(mockCustomInstance, { current: roster }, writes, community);

const renderPage = async (firstName: string) => {
  const rendered = renderWithProviders(<MembersPage />, { activeCommunityId: COMMUNITY_ID, token: "a-token" });
  await screen.findByText(firstName);
  // The community answers separately from the roster: wait until the page
  // knows whether it may offer the send, so an absence is not just "not yet".
  await waitFor(() =>
    expect(rendered.queryClient.getQueryState(getGetCommunityByIdQueryKey(COMMUNITY_ID))?.status).toBe("success"),
  );
  return rendered;
};

const checkboxNames = () =>
  screen.queryAllByRole("checkbox").map((checkbox) => checkbox.getAttribute("aria-label") ?? "");

const result = (
  userId: string,
  outcome: SendInvitationResultResponse["outcome"],
  code: RestErrorDetailCode = null,
  params: Record<string, string> = {},
): SendInvitationResultResponse => ({ user: { id: userId }, outcome, code, params });

const answer = (results: SendInvitationResultResponse[]): SendInvitationsResponse => ({
  sent: results.filter((r) => r.outcome === "SENT").length,
  remaining: 0,
  results,
});

const itemsOf = (list: HTMLElement) => within(list).getAllByRole("listitem").map((item) => item.textContent);

beforeEach(() => {
  mockCustomInstance.mockReset();
});

afterEach(() => setViewport(1024));

describe("which rows can be selected", () => {
  const ROSTER = [NADIA, PEDRO, OSCAR, ANA, SARA, TOMAS];

  it("UI-MBR-037 offers a checkbox only on pending, enabled rows with a contact email and canInvite, in the table", async () => {
    serve(ROSTER);
    await renderPage("Nadia Nueva");

    expect(await screen.findByRole("checkbox", { name: "Seleccionar Nadia Nueva" })).toBeInTheDocument();
    expect(checkboxNames()).toEqual(["Seleccionar todo", "Seleccionar Nadia Nueva", "Seleccionar Pedro Pendiente"]);
    const oscarRow = screen.getByText("Óscar Sincorreo").closest("tr") as HTMLElement;
    expect(within(oscarRow).getByText("Sin email de contacto")).toBeInTheDocument();
    // Only the row that would be selectable but for its email says so.
    expect(screen.getAllByText("Sin email de contacto")).toHaveLength(1);
  });

  it("UI-MBR-037 offers the same checkboxes, and the same reason, in the narrow list", async () => {
    setViewport(380);
    serve(ROSTER);
    await renderPage("Nadia Nueva");

    const list = screen.getByRole("list", { name: "Miembros de la comunidad" });
    expect(await within(list).findByRole("checkbox", { name: "Seleccionar Nadia Nueva" })).toBeInTheDocument();
    expect(within(list).getAllByRole("checkbox").map((c) => c.getAttribute("aria-label"))).toEqual([
      "Seleccionar Nadia Nueva",
      "Seleccionar Pedro Pendiente",
    ]);
    const oscarCard = within(list).getByText("Óscar Sincorreo").closest("li") as HTMLElement;
    expect(within(oscarCard).getByText("Sin email de contacto")).toBeInTheDocument();
    // The card list has no head, so "select all" is labelled above it.
    expect(screen.getByRole("checkbox", { name: "Seleccionar todo" })).toBeInTheDocument();
  });

  it("UI-MBR-037 offers no checkbox on rows without canInvite", async () => {
    serve([NADIA, TOMAS]);
    await renderPage("Nadia Nueva");

    await screen.findByRole("checkbox", { name: "Seleccionar Nadia Nueva" });
    expect(screen.queryByRole("checkbox", { name: "Seleccionar Tomás Ajeno" })).not.toBeInTheDocument();
  });

  it.each([
    [
      "without canInviteMembers",
      buildCommunity({
        ...ADMIN_COMMUNITY,
        capabilities: buildCommunityCapabilities({ canRead: true, canManageMemberships: true, canRegisterMembers: true }),
      }),
    ],
    [
      "from a backend that predates the capability",
      (() => {
        const legacy = buildCommunityCapabilities({ canRead: true, canManageMemberships: true });
        delete (legacy as Partial<typeof legacy>).canInviteMembers;
        return buildCommunity({ ...ADMIN_COMMUNITY, capabilities: legacy });
      })(),
    ],
  ])("UI-MBR-039 offers no selection and no send to a community %s", async (_, community) => {
    serve([NADIA, PEDRO], {}, community);
    await renderPage("Nadia Nueva");

    expect(screen.getByText("Pedro Pendiente")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Enviar invitación/ })).not.toBeInTheDocument();
    // Nor is the caller told why nobody can be invited: they may not invite at all.
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});

describe("selecting everyone", () => {
  const SIXTY = Array.from({ length: 60 }, (_, i) =>
    rosterRow(`u${i + 1}`, `Miembro ${String(i + 1).padStart(2, "0")}`),
  );

  it("UI-MBR-038 selects the first 50 rows the filters let through, says so, and admits no 51st", async () => {
    const u = userEvent.setup();
    serve(SIXTY);
    await renderPage("Miembro 01");

    await u.click(await screen.findByRole("checkbox", { name: "Seleccionar todo" }));

    expect(screen.getByText("50 seleccionados")).toBeInTheDocument();
    expect(screen.getByText("Se han seleccionado los 50 primeros: es el máximo por envío.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar invitación (50)" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Seleccionar Miembro 25" })).toBeChecked();

    // Row 51 is on the third page: across pages, every row was in reach.
    await u.type(screen.getByRole("searchbox", { name: "Buscar miembros" }), "Miembro 51");
    const fiftyFirst = await screen.findByRole("checkbox", { name: "Seleccionar Miembro 51" });
    expect(fiftyFirst).not.toBeChecked();
    expect(fiftyFirst).toBeDisabled();
  });
});

describe("the confirmation", () => {
  it("UI-MBR-039 names everyone, first invitations apart from resends, and sends their ids in that order", async () => {
    const u = userEvent.setup();
    const router = serve([NADIA, PEDRO, BRUNO, ANA], {
      bulk: () => answer([result("u-nadia", "SENT"), result("u-bruno", "SENT"), result("u-pedro", "RESENT")]),
    });
    await renderPage("Nadia Nueva");

    // Clicked out of roster order: the order sent is the confirmation's, not the clicks'.
    await u.click(await screen.findByRole("checkbox", { name: "Seleccionar Pedro Pendiente" }));
    await u.click(screen.getByRole("checkbox", { name: "Seleccionar Bruno Blanco" }));
    await u.click(screen.getByRole("checkbox", { name: "Seleccionar Nadia Nueva" }));
    await u.click(screen.getByRole("button", { name: "Enviar invitación (3)" }));

    const dialog = await screen.findByRole("dialog", { name: DIALOG_NAME });
    expect(within(dialog).getByText("Recibirán un email estas 3 personas:")).toBeInTheDocument();
    expect(itemsOf(within(dialog).getByRole("list", { name: "Primera invitación" }))).toEqual([
      "Nadia Nueva",
      "Bruno Blanco",
    ]);
    expect(itemsOf(within(dialog).getByRole("list", { name: "Reenvío" }))).toEqual(["Pedro Pendiente"]);
    expect(requestsTo(router, "POST", BULK_INVITE_URL)).toEqual([]);

    await u.click(within(dialog).getByRole("button", { name: "Enviar invitación (3)" }));

    await waitFor(() => expect(requestsTo(router, "POST", BULK_INVITE_URL)).toHaveLength(1));
    expect(requestsTo(router, "POST", BULK_INVITE_URL)[0].data).toEqual({
      userIds: ["u-nadia", "u-bruno", "u-pedro"],
    });
  });

  it("UI-MBR-039 shows the first five names of a group and counts the rest", async () => {
    const u = userEvent.setup();
    const eight = Array.from({ length: 8 }, (_, i) => rosterRow(`u${i + 1}`, `Miembro ${i + 1}`));
    serve(eight);
    await renderPage("Miembro 1");

    await u.click(await screen.findByRole("checkbox", { name: "Seleccionar todo" }));
    await u.click(screen.getByRole("button", { name: "Enviar invitación (8)" }));

    const dialog = await screen.findByRole("dialog", { name: DIALOG_NAME });
    expect(itemsOf(within(dialog).getByRole("list", { name: "Primera invitación" }))).toEqual([
      "Miembro 1",
      "Miembro 2",
      "Miembro 3",
      "Miembro 4",
      "Miembro 5",
      "y 3 más",
    ]);
    expect(within(dialog).getByText("Primera invitación (8)")).toBeInTheDocument();
    expect(within(dialog).queryByRole("list", { name: "Reenvío" })).not.toBeInTheDocument();
  });

  it("UI-MBR-039 cannot be dismissed while the send is in flight (#310)", async () => {
    const u = userEvent.setup();
    serve([NADIA], { bulk: () => new Promise(() => {}) });
    await renderPage("Nadia Nueva");

    await u.click(await screen.findByRole("checkbox", { name: "Seleccionar Nadia Nueva" }));
    await u.click(screen.getByRole("button", { name: "Enviar invitación (1)" }));
    const dialog = await screen.findByRole("dialog", { name: DIALOG_NAME });
    await u.click(within(dialog).getByRole("button", { name: "Enviar invitación (1)" }));

    expect(await within(dialog).findByRole("button", { name: "Enviando..." })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toBeDisabled();
    await u.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: DIALOG_NAME })).toBeInTheDocument();
  });
});

describe("the result", () => {
  const REFUSED_ROSTER = [
    NADIA,
    PEDRO,
    rosterRow("u-gone", "Gema Ida"),
    rosterRow("u-accepted", "Alba Aceptada"),
    rosterRow("u-suspended", "Sergio Suspendido"),
    rosterRow("u-noemail", "Nora Sincorreo"),
    rosterRow("u-limit", "Lola Límite", INVITED),
  ];

  it("UI-MBR-040 shows the counts and one line per refusal with its reason, refreshes the roster and clears the selection", async () => {
    const u = userEvent.setup();
    const router = serve(REFUSED_ROSTER, {
      bulk: () =>
        answer([
          result("u-nadia", "SENT"),
          result("u-gone", "REFUSED", "MEMBERSHIP_NOT_FOUND"),
          result("u-accepted", "REFUSED", "MEMBERSHIP_ALREADY_EXISTS"),
          result("u-suspended", "REFUSED", "MEMBERSHIP_DISABLED"),
          result("u-noemail", "REFUSED", "MEMBERSHIP_WITHOUT_CONTACT_EMAIL"),
          result("u-pedro", "RESENT"),
          result("u-limit", "REFUSED", "MEMBERSHIP_INVITATION_RESEND_LIMIT_REACHED", { retryAfterSeconds: "72001" }),
        ]),
    });
    const { queryClient } = await renderPage("Nadia Nueva");
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await u.click(await screen.findByRole("checkbox", { name: "Seleccionar todo" }));
    await u.click(screen.getByRole("button", { name: "Enviar invitación (7)" }));
    const dialog = await screen.findByRole("dialog", { name: DIALOG_NAME });
    const region = within(dialog).getByRole("status");
    expect(region).toHaveTextContent(/^$/);
    const readsBefore = rosterReads(router);
    await u.click(within(dialog).getByRole("button", { name: "Enviar invitación (7)" }));

    expect(await within(dialog).findByText("Primeras invitaciones enviadas: 1.", VISIBLE)).toBeInTheDocument();
    expect(within(dialog).getByText("Invitaciones reenviadas: 1.", VISIBLE)).toBeInTheDocument();
    expect(within(dialog).getByText("No se ha podido enviar a 5 personas:")).toBeInTheDocument();
    expect(itemsOf(within(dialog).getByRole("list", { name: "Personas a las que no se ha enviado" }))).toEqual([
      "Gema Ida: Ya no forma parte de esta comunidad.",
      "Alba Aceptada: Este miembro ya ha aceptado la invitación.",
      "Sergio Suspendido: Este miembro está suspendido, así que no se le puede invitar.",
      "Nora Sincorreo: Este miembro no tiene email de contacto. Añádelo desde «Editar ficha» y vuelve a intentarlo.",
      "Lola Límite: Has alcanzado el límite de reenvíos para este miembro. Podrás volver a reenviar la invitación dentro de 21 horas.",
    ]);
    expect(region).toHaveTextContent(
      "Primeras invitaciones enviadas: 1. Invitaciones reenviadas: 1. No se ha podido enviar a 5 personas.",
    );

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetMembershipsQueryKey(COMMUNITY_ID) });
    await waitFor(() => expect(rosterReads(router)).toBeGreaterThan(readsBefore));
    // Only "Cerrar" is left, and the selection is already cleared behind the dialog.
    expect(within(dialog).getAllByRole("button").map((button) => button.textContent)).toEqual(["Cerrar"]);
    await u.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Enviar invitación/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("checkbox").filter((checkbox) => (checkbox as HTMLInputElement).checked)).toEqual([]);
  });

  it("UI-MBR-040 says when another resend becomes possible", async () => {
    const u = userEvent.setup();
    serve([PEDRO], {
      bulk: () =>
        answer([
          result("u-pedro", "REFUSED", "MEMBERSHIP_INVITATION_RESEND_LIMIT_REACHED", { retryAfterSeconds: "1500" }),
        ]),
    });
    await renderPage("Pedro Pendiente");

    await u.click(await screen.findByRole("checkbox", { name: "Seleccionar Pedro Pendiente" }));
    await u.click(screen.getByRole("button", { name: "Enviar invitación (1)" }));
    const dialog = await screen.findByRole("dialog", { name: DIALOG_NAME });
    await u.click(within(dialog).getByRole("button", { name: "Enviar invitación (1)" }));

    expect(
      await within(dialog).findByText(/Podrás volver a reenviar la invitación dentro de 25 minutos\./),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Primeras invitaciones enviadas: 0.", VISIBLE)).toBeInTheDocument();
    expect(within(dialog).getByText("Invitaciones reenviadas: 0.", VISIBLE)).toBeInTheDocument();
  });
});

describe("a send refused as a whole", () => {
  it.each([
    [400, "MEMBERSHIP_INVITATION_SELECTION_EMPTY", {}, "No has seleccionado a nadie. Selecciona al menos un miembro."],
    [
      400,
      "MEMBERSHIP_INVITATION_SELECTION_TOO_LARGE",
      { maxUserIds: "50" },
      "Puedes enviar hasta 50 invitaciones a la vez. Quita a alguien de la selección.",
    ],
    [400, "MEMBERSHIP_INVITATION_SELECTION_DUPLICATED", {}, "La selección repite a algún miembro. Vuelve a seleccionarlos."],
    [503, "MEMBERSHIP_INVITATION_UNAVAILABLE", {}, "Ahora mismo no se pueden enviar invitaciones. Inténtalo más tarde."],
  ] as const)(
    "UI-MBR-041 answers %s %s with its own message, reports nothing sent, and keeps the selection",
    async (status, code, params, message) => {
      const u = userEvent.setup();
      serve([NADIA], {
        bulk: () => {
          throw restError(status, code, { params });
        },
      });
      await renderPage("Nadia Nueva");

      await u.click(await screen.findByRole("checkbox", { name: "Seleccionar Nadia Nueva" }));
      await u.click(screen.getByRole("button", { name: "Enviar invitación (1)" }));
      const dialog = await screen.findByRole("dialog", { name: DIALOG_NAME });
      await u.click(within(dialog).getByRole("button", { name: "Enviar invitación (1)" }));

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(message);
      expect(within(dialog).queryByText(/invitaciones enviadas/)).not.toBeInTheDocument();
      expect(within(dialog).getByRole("status")).toHaveTextContent(/^$/);
      // The confirmation stays, so the send can be tried again.
      expect(within(dialog).getByRole("button", { name: "Enviar invitación (1)" })).toBeEnabled();
      await u.click(within(dialog).getByRole("button", { name: "Cancelar" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(screen.getByRole("checkbox", { name: "Seleccionar Nadia Nueva" })).toBeChecked();
      expect(screen.getByText("1 seleccionado")).toBeInTheDocument();
    },
  );
});

describe("when nobody can be selected", () => {
  it("UI-MBR-042 says everyone has accepted, and offers no checkbox and no send", async () => {
    serve([ANA, rosterRow("u-luis", "Luis Activo", { acceptedAt: "2026-02-01T09:00:00Z" })]);
    await renderPage("Ana García");

    expect(
      await screen.findByText("Todos los miembros han aceptado ya la invitación: no hay nadie a quien invitar."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Enviar invitación/ })).not.toBeInTheDocument();
  });

  it("UI-MBR-042 says nobody pending has a contact email", async () => {
    serve([ANA, OSCAR]);
    await renderPage("Ana García");

    expect(
      await screen.findByText(
        "Ningún miembro pendiente tiene email de contacto. Añádelo desde «Editar ficha» para poder invitarlo.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Enviar invitación/ })).not.toBeInTheDocument();
  });

  it("UI-MBR-042 says nobody pending can be sent the invitation otherwise", async () => {
    serve([ANA, SARA, TOMAS]);
    await renderPage("Ana García");

    expect(
      await screen.findByText("No hay ningún miembro pendiente al que puedas enviar la invitación."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
