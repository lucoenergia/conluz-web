import "@testing-library/jest-dom";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig, type RequestRouter } from "../../test/requestRouter";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildCurrentUser,
  buildMembership,
  buildMembershipCapabilities,
  buildMembershipPayback,
} from "../../test/fixtures";
import type { MembershipPaybackResponse, MembershipResponse, SetMembershipInvestmentBody } from "../../api/models";
import { getGetMembershipPaybackQueryKey } from "../../api/memberships/memberships";
import { CommunityRole } from "../../hooks/permissions";
import { overlayHistorySettled } from "../../components/ResponsiveOverlay/overlayHistory";
import { pressBack } from "../../test/overlay";
import { MembersPage } from "./MembersPage";

/**
 * Recording a member's investment from the members page (#358), against
 * routed requests.
 *
 * Tier 2: the real generated hooks, the real actions layer and a real
 * QueryClient run, and only the HTTP layer is mocked. The editor reads the
 * amount from the member's payback, and what a write changes shows only once
 * that read is made again, so the cache is part of the subject.
 */
const COMMUNITY_ID = "community-1";
const COMMUNITY_NAME = "Comunidad Solar";
const COMMUNITY_URL = `/api/v1/communities/${COMMUNITY_ID}`;
const ROSTER_URL = `${COMMUNITY_URL}/memberships`;
const paybackUrl = (userId: string) => `${ROSTER_URL}/${userId}/payback`;
const investmentUrl = (userId: string) => `${ROSTER_URL}/${userId}/investment`;

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const COMMUNITY = buildCommunity({
  id: COMMUNITY_ID,
  name: COMMUNITY_NAME,
  capabilities: buildCommunityCapabilities({ canRead: true, canManageMemberships: true }),
});

const CALLER = buildCurrentUser({
  id: "admin",
  fullName: "Ada Admin",
  memberships: { [COMMUNITY_ID]: CommunityRole.COMMUNITY_ADMIN },
});

/** What the backend grants a community admin on any member's row. */
const MANAGES_INVESTMENT = buildMembershipCapabilities({ canManageInvestment: true, canReadPayback: true });

const ANA = buildMembership({
  id: "m-ana",
  communityId: COMMUNITY_ID,
  role: CommunityRole.COMMUNITY_MEMBER,
  enabled: true,
  acceptedAt: "2026-01-15T09:00:00Z",
  user: { id: "u-ana" },
  fullName: "Ana García",
  capabilities: MANAGES_INVESTMENT,
});

/** Registered and not yet accepted: an investment is recorded while onboarding. */
const PEPE = buildMembership({
  id: "m-pepe",
  communityId: COMMUNITY_ID,
  role: CommunityRole.COMMUNITY_MEMBER,
  enabled: true,
  acceptedAt: null,
  invitedAt: "2026-02-01T09:00:00Z",
  user: { id: "u-pepe" },
  fullName: "Pepe Pendiente",
  capabilities: MANAGES_INVESTMENT,
});

/** A row with a menu, for its record, but no investment to manage. */
const LUIS = buildMembership({
  id: "m-luis",
  communityId: COMMUNITY_ID,
  role: CommunityRole.COMMUNITY_MEMBER,
  enabled: true,
  acceptedAt: "2026-01-15T09:00:00Z",
  user: { id: "u-luis" },
  fullName: "Luis Sin Permiso",
  capabilities: buildMembershipCapabilities({ canEditRecord: true, canManageInvestment: false, canReadPayback: true }),
});

/** The server's own text, which the editor must never show. */
const SERVER_TEXT = "investmentEur must be less than or equal to 9999999999.99";
const RETRY_LATER = "Inténtalo de nuevo en unos minutos.";

const restError = (status: number, code: string | null = null) => ({
  response: { status, data: { status, message: "refused", errors: [{ message: SERVER_TEXT, code }] } },
});

/** The payback each member's next read serves, so a write can change it as the backend would. */
type Paybacks = Record<string, MembershipPaybackResponse>;

type Writes = {
  put?: (config: RequestConfig) => unknown;
  remove?: (config: RequestConfig) => unknown;
  payback?: (userId: string) => unknown;
};

function serve(paybacks: Paybacks, writes: Writes = {}, roster: MembershipResponse[] = [ANA, PEPE, LUIS]): RequestRouter {
  const userOf = (config: RequestConfig) => (config.url ?? "").split("/").at(-2) ?? "";
  const router = routeRequests([
    { method: "GET", url: "/api/v1/users/current", respond: () => CALLER },
    { method: "GET", url: "/api/v1/communities", respond: () => [COMMUNITY] },
    { method: "GET", url: COMMUNITY_URL, respond: () => COMMUNITY },
    { method: "GET", url: ROSTER_URL, respond: () => roster },
    {
      method: "GET",
      url: /\/memberships\/[^/]+\/payback$/,
      respond: (config) => (writes.payback ? writes.payback(userOf(config)) : paybacks[userOf(config)]),
    },
    {
      method: "PUT",
      url: /\/memberships\/[^/]+\/investment$/,
      respond: (config) => {
        if (!writes.put) throw new Error("unexpected investment write");
        return writes.put(config);
      },
    },
    {
      method: "DELETE",
      url: /\/memberships\/[^/]+\/investment$/,
      respond: (config) => {
        if (!writes.remove) throw new Error("unexpected investment removal");
        return writes.remove(config);
      },
    },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  return router;
}

const requestsTo = (router: RequestRouter, method: string, url: string) =>
  router.requests.filter((r) => (r.method ?? "GET").toUpperCase() === method && r.url === url);

const recorded = (investmentEur: number) => buildMembershipPayback({ investmentEur });
const NONE = buildMembershipPayback({ investmentEur: null });

const renderPage = async () => {
  const rendered = renderWithProviders(<MembersPage />, { activeCommunityId: COMMUNITY_ID, token: "a-token" });
  await screen.findByText("Ana García");
  return rendered;
};

type User = ReturnType<typeof userEvent.setup>;

async function openRowMenu(u: User, name: string) {
  await u.click(await screen.findByRole("button", { name: `Más acciones para ${name}` }));
  return screen.findByRole("menu");
}

async function openEditor(u: User, name: string) {
  await openRowMenu(u, name);
  await u.click(await screen.findByRole("menuitem", { name: "Inversión" }));
  return screen.findByRole("dialog", { name: `Inversión de ${name}` });
}

/** The editor once the amount has been read: the field is enabled. */
async function openLoadedEditor(u: User, name: string) {
  const dialog = await openEditor(u, name);
  await waitFor(() => expect(within(dialog).getByRole("textbox", { name: "Importe en euros" })).toBeEnabled());
  return dialog;
}

const amountField = (dialog: HTMLElement) => within(dialog).getByRole("textbox", { name: "Importe en euros" });

async function typeAmount(u: User, dialog: HTMLElement, value: string) {
  const field = amountField(dialog);
  await u.clear(field);
  if (value !== "") await u.type(field, value);
}

const REMOVE_QUESTION = "¿Quitar la inversión de 1500,50 € registrada para Ana García?";

/** Asks to remove the recorded amount: the question replaces the editor's footer. */
async function askToRemove(u: User, dialog: HTMLElement) {
  await u.click(within(dialog).getByRole("button", { name: "Quitar inversión" }));
  return within(dialog).findByRole("alert");
}

const announced = (message: string) => screen.queryByText(message, { selector: '[role="status"]' });

describe("recording a member's investment (#358)", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  afterEach(async () => {
    await act(() => overlayHistorySettled());
  });

  describe("UI-MBR-043 the action follows canManageInvestment", () => {
    it("UI-MBR-043 offers Inversión on every row that grants it, a pending one included, and on no other", async () => {
      const u = userEvent.setup();
      serve({});
      await renderPage();

      for (const name of ["Ana García", "Pepe Pendiente"]) {
        const menu = await openRowMenu(u, name);
        expect(within(menu).getByRole("menuitem", { name: "Inversión" })).toBeInTheDocument();
        await u.keyboard("{Escape}");
        await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
      }

      const menu = await openRowMenu(u, "Luis Sin Permiso");
      expect(within(menu).queryByRole("menuitem", { name: "Inversión" })).not.toBeInTheDocument();
      expect(within(menu).getByRole("menuitem", { name: /Editar ficha/ })).toBeInTheDocument();
    });

    it("UI-MBR-043 records the investment of a member who has not accepted yet", async () => {
      const u = userEvent.setup();
      const router = serve({ "u-pepe": NONE }, { put: () => undefined });
      await renderPage();

      const dialog = await openLoadedEditor(u, "Pepe Pendiente");
      await typeAmount(u, dialog, "2000");
      await u.click(within(dialog).getByRole("button", { name: "Guardar" }));

      await waitFor(() => expect(requestsTo(router, "PUT", investmentUrl("u-pepe"))).toHaveLength(1));
      expect(requestsTo(router, "PUT", investmentUrl("u-pepe"))[0].data).toEqual({ investmentEur: 2000 });
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });
  });

  describe("UI-MBR-044 the editor reads, sets and clears the amount", () => {
    it("UI-MBR-044 shows the recorded amount, and offers to remove it", async () => {
      const u = userEvent.setup();
      serve({ "u-ana": recorded(1500.5) });
      await renderPage();

      const dialog = await openLoadedEditor(u, "Ana García");

      expect(amountField(dialog)).toHaveValue("1500,5");
      expect(within(dialog).getByRole("button", { name: "Guardar" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Quitar inversión" })).toBeInTheDocument();
    });

    it("UI-MBR-044 starts empty, and offers no removal, when no amount is recorded", async () => {
      const u = userEvent.setup();
      serve({ "u-ana": NONE });
      await renderPage();

      const dialog = await openLoadedEditor(u, "Ana García");

      expect(amountField(dialog)).toHaveValue("");
      expect(within(dialog).getByRole("button", { name: "Guardar" })).toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: "Quitar inversión" })).not.toBeInTheDocument();
    });

    it("UI-MBR-044 disables the field, and offers no save, while the amount is loading", async () => {
      const u = userEvent.setup();
      serve({}, { payback: () => new Promise(() => {}) });
      await renderPage();

      const dialog = await openEditor(u, "Ana García");

      expect(amountField(dialog)).toBeDisabled();
      expect(within(dialog).getByText("Cargando el importe actual…")).toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
    });

    it("UI-MBR-044 offers a retry, and no save, when the amount cannot be read", async () => {
      const u = userEvent.setup();
      let fail = true;
      serve(
        {},
        {
          payback: () => {
            if (fail) throw restError(500);
            return recorded(300);
          },
        },
      );
      await renderPage();

      const dialog = await openEditor(u, "Ana García");

      const alert = await within(dialog).findByRole("alert");
      expect(alert).toHaveTextContent("No se pudo cargar la inversión registrada.");
      expect(within(dialog).queryByRole("textbox", { name: "Importe en euros" })).not.toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();

      fail = false;
      await u.click(within(alert).getByRole("button", { name: "Reintentar" }));

      await waitFor(() => expect(amountField(dialog)).toHaveValue("300"));
      expect(within(dialog).getByRole("button", { name: "Guardar" })).toBeInTheDocument();
    });

    it("UI-MBR-044 saves the amount, closes and says so", async () => {
      const u = userEvent.setup();
      const paybacks: Paybacks = { "u-ana": recorded(1000) };
      const router = serve(paybacks, {
        put: ({ data }) => {
          paybacks["u-ana"] = recorded((data as SetMembershipInvestmentBody).investmentEur);
        },
      });
      await renderPage();

      const dialog = await openLoadedEditor(u, "Ana García");
      await typeAmount(u, dialog, "1250,75");
      await u.click(within(dialog).getByRole("button", { name: "Guardar" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(requestsTo(router, "PUT", investmentUrl("u-ana"))[0].data).toEqual({ investmentEur: 1250.75 });
      await waitFor(() => expect(announced("Inversión guardada.")).toBeInTheDocument());

      const reopened = await openLoadedEditor(u, "Ana García");
      expect(amountField(reopened)).toHaveValue("1250,75");
    });

    it("UI-MBR-044 removes the amount after confirming, and the editor then opens empty", async () => {
      const u = userEvent.setup();
      const paybacks: Paybacks = { "u-ana": recorded(1500.5) };
      const router = serve(paybacks, {
        remove: () => {
          paybacks["u-ana"] = NONE;
        },
      });
      await renderPage();

      const dialog = await openLoadedEditor(u, "Ana García");
      const question = await askToRemove(u, dialog);
      expect(question).toHaveTextContent(REMOVE_QUESTION);
      expect(screen.getAllByRole("dialog")).toHaveLength(1);
      expect(within(dialog).getByRole("button", { name: "Cancelar" })).toHaveFocus();
      expect(requestsTo(router, "DELETE", investmentUrl("u-ana"))).toHaveLength(0);

      await u.click(within(dialog).getByRole("button", { name: "Quitar inversión" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(requestsTo(router, "DELETE", investmentUrl("u-ana"))).toHaveLength(1);
      await waitFor(() => expect(announced("Inversión quitada.")).toBeInTheDocument());

      const reopened = await openLoadedEditor(u, "Ana García");
      expect(amountField(reopened)).toHaveValue("");
      expect(within(reopened).queryByRole("button", { name: "Quitar inversión" })).not.toBeInTheDocument();
    });

    it.each([
      ["Cancelar", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Cancelar" }))],
      ["Escape", (u: User) => u.keyboard("{Escape}")],
      ["back", () => pressBack()],
    ] as const)(
      "UI-MBR-044 %s withdraws the removal question, keeps the editor, removes nothing and gives focus back to Quitar inversión",
      async (_, withdraw) => {
        const u = userEvent.setup();
        const router = serve({ "u-ana": recorded(1500.5) }, { remove: () => undefined });
        await renderPage();

        const dialog = await openLoadedEditor(u, "Ana García");
        await act(() => overlayHistorySettled());
        await askToRemove(u, dialog);

        await withdraw(u, dialog);

        await waitFor(() => expect(within(dialog).queryByText(REMOVE_QUESTION)).not.toBeInTheDocument());
        expect(screen.getByRole("dialog", { name: "Inversión de Ana García" })).toBeInTheDocument();
        expect(amountField(dialog)).toHaveValue("1500,5");
        await waitFor(() => expect(within(dialog).getByRole("button", { name: "Quitar inversión" })).toHaveFocus());
        expect(requestsTo(router, "DELETE", investmentUrl("u-ana"))).toHaveLength(0);
      },
    );

    it("UI-MBR-044 reads the amount afresh on every opening, never from an earlier answer", async () => {
      const u = userEvent.setup();
      const paybacks: Paybacks = { "u-ana": recorded(1000) };
      serve(paybacks);
      await renderPage();

      const first = await openLoadedEditor(u, "Ana García");
      expect(amountField(first)).toHaveValue("1000");
      await u.click(within(first).getByRole("button", { name: "Cancelar" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

      // Changed by somebody else since: the cached answer is out of date.
      paybacks["u-ana"] = recorded(2500);
      const reopened = await openLoadedEditor(u, "Ana García");

      expect(amountField(reopened)).toHaveValue("2500");
    });

    it("UI-MBR-044 keeps the typed amount when the amount is read again while the editor is open", async () => {
      const u = userEvent.setup();
      const paybacks: Paybacks = { "u-ana": recorded(1000) };
      const router = serve(paybacks);
      const { queryClient } = await renderPage();

      const dialog = await openLoadedEditor(u, "Ana García");
      await typeAmount(u, dialog, "1800");
      const readsBefore = requestsTo(router, "GET", paybackUrl("u-ana")).length;

      // Removed elsewhere: the new answer shows, as the removal it no longer offers.
      paybacks["u-ana"] = NONE;
      await queryClient.invalidateQueries({ queryKey: getGetMembershipPaybackQueryKey(COMMUNITY_ID, "u-ana") });

      expect(requestsTo(router, "GET", paybackUrl("u-ana")).length).toBeGreaterThan(readsBefore);
      await waitFor(() =>
        expect(within(dialog).queryByRole("button", { name: "Quitar inversión" })).not.toBeInTheDocument(),
      );
      expect(amountField(dialog)).toHaveValue("1800");
    });

    it.each([400, 404, 500])(
      "UI-MBR-044 keeps the editor open with the typed amount when the save is refused with %i",
      async (status) => {
        const u = userEvent.setup();
        serve(
          { "u-ana": recorded(1000) },
          {
            put: () => {
              throw restError(status);
            },
          },
        );
        await renderPage();

        const dialog = await openLoadedEditor(u, "Ana García");
        await typeAmount(u, dialog, "1200");
        await u.click(within(dialog).getByRole("button", { name: "Guardar" }));

        const alert = await within(dialog).findByRole("alert");
        expect(alert).toHaveTextContent("No se ha guardado la inversión.");
        expect(alert).toHaveTextContent(RETRY_LATER);
        expect(alert).not.toHaveTextContent(SERVER_TEXT);
        expect(amountField(dialog)).toHaveValue("1200");
        expect(screen.getByRole("dialog", { name: "Inversión de Ana García" })).toBeInTheDocument();
        expect(announced("Inversión guardada.")).not.toBeInTheDocument();
      },
    );

    it.each([400, 404, 500])(
      "UI-MBR-044 keeps the editor open with the amount when the removal is refused with %i",
      async (status) => {
        const u = userEvent.setup();
        serve(
          { "u-ana": recorded(1500.5) },
          {
            remove: () => {
              throw restError(status);
            },
          },
        );
        await renderPage();

        const dialog = await openLoadedEditor(u, "Ana García");
        await askToRemove(u, dialog);
        await u.click(within(dialog).getByRole("button", { name: "Quitar inversión" }));

        // The question is withdrawn as the removal is sent, so the one alert left is the refusal.
        const alert = await within(dialog).findByRole("alert");
        expect(alert).toHaveTextContent("No se ha quitado la inversión.");
        expect(alert).not.toHaveTextContent(REMOVE_QUESTION);
        expect(alert).toHaveTextContent(RETRY_LATER);
        expect(alert).not.toHaveTextContent(SERVER_TEXT);
        expect(amountField(dialog)).toHaveValue("1500,5");
        expect(announced("Inversión quitada.")).not.toBeInTheDocument();
      },
    );

    it.each([
      [400, "CODE_UNKNOWN_TO_THIS_CLIENT", RETRY_LATER],
      [404, "MEMBERSHIP_NOT_FOUND", "Ya no forma parte de esta comunidad."],
    ])(
      "UI-MBR-044 words a refused save with code %i %s from the catalogue, never with the server's text",
      async (status, code, wording) => {
        const u = userEvent.setup();
        serve(
          { "u-ana": recorded(1000) },
          {
            put: () => {
              throw restError(status, code);
            },
          },
        );
        await renderPage();

        const dialog = await openLoadedEditor(u, "Ana García");
        await typeAmount(u, dialog, "1200");
        await u.click(within(dialog).getByRole("button", { name: "Guardar" }));

        const alert = await within(dialog).findByRole("alert");
        expect(alert).toHaveTextContent(`No se ha guardado la inversión. ${wording}`);
        expect(alert).not.toHaveTextContent(SERVER_TEXT);
      },
    );

    it("UI-MBR-044 explains, sends no payback read and offers no save when the amount cannot be read", async () => {
      const u = userEvent.setup();
      const unreadable = buildMembership({
        ...ANA,
        capabilities: buildMembershipCapabilities({ canManageInvestment: true, canReadPayback: false }),
      });
      const router = serve({ "u-ana": recorded(1000) }, {}, [unreadable, PEPE, LUIS]);
      await renderPage();

      const dialog = await openEditor(u, "Ana García");

      expect(
        within(dialog).getByText(
          "No puedes consultar la inversión registrada de este miembro, así que no se puede cambiar desde aquí.",
        ),
      ).toBeVisible();
      expect(within(dialog).queryByRole("textbox", { name: "Importe en euros" })).not.toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: "Quitar inversión" })).not.toBeInTheDocument();
      expect(requestsTo(router, "GET", paybackUrl("u-ana"))).toHaveLength(0);
    });
  });

  describe("UI-MBR-045 the amount is checked before it is sent", () => {
    it.each([
      ["0", "El importe debe ser mayor que cero."],
      ["-5", "El importe debe ser mayor que cero."],
      ["1,234", "Usa como mucho dos decimales."],
      ["abc", "Escribe solo un número, por ejemplo 1500,50."],
      ["", "Indica el importe."],
      ["1.500", "Escribe el importe sin puntos de miles, por ejemplo 1500,50."],
      ["1.500,50", "Escribe el importe sin puntos de miles, por ejemplo 1500,50."],
      ["10000000000", "El importe no puede superar 9.999.999.999,99 €."],
    ])("UI-MBR-045 refuses %j with a visible reason and sends nothing", async (typed, reason) => {
      const u = userEvent.setup();
      const router = serve({ "u-ana": NONE }, { put: () => undefined });
      await renderPage();

      const dialog = await openLoadedEditor(u, "Ana García");
      await typeAmount(u, dialog, typed);
      await u.click(within(dialog).getByRole("button", { name: "Guardar" }));

      expect(await within(dialog).findByText(reason)).toBeVisible();
      expect(amountField(dialog)).toHaveAccessibleDescription(reason);
      expect(requestsTo(router, "PUT", investmentUrl("u-ana"))).toHaveLength(0);
    });

    it.each([
      ["1500,50", 1500.5],
      ["1500.5", 1500.5],
      ["9999999999,99", 9999999999.99],
    ])("UI-MBR-045 sends %j as the number %d", async (typed, sent) => {
      const u = userEvent.setup();
      const router = serve({ "u-ana": NONE }, { put: () => undefined });
      await renderPage();

      const dialog = await openLoadedEditor(u, "Ana García");
      await typeAmount(u, dialog, typed);
      await u.click(within(dialog).getByRole("button", { name: "Guardar" }));

      await waitFor(() => expect(requestsTo(router, "PUT", investmentUrl("u-ana"))).toHaveLength(1));
      expect(requestsTo(router, "PUT", investmentUrl("u-ana"))[0].data).toEqual({ investmentEur: sent });
    });
  });
});
