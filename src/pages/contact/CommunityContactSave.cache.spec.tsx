import "@testing-library/jest-dom";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGetCommunityContactQueryKey } from "../../api/communities/communities";
import type {
  CommunityCapabilitiesResponse,
  CommunityContactResponse,
  ContactChannelResponse,
  SetCommunityContactBody,
} from "../../api/models";
import { apiError } from "../../test/apiError";
import { buildCommunity, buildCommunityCapabilities, buildContactChannel } from "../../test/fixtures";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestRouter } from "../../test/requestRouter";
import { CommunityContactPage } from "./CommunityContactPage";

// Tier 2: the subject is the cache. A save writes the list the server returned
// into the channels query instead of fetching it again, so the real hooks run
// against a real QueryClient and only the HTTP layer is replaced.
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const COMMUNITY_ID = "community-a";
const COMMUNITY_URL = `/api/v1/communities/${COMMUNITY_ID}`;
const CONTACT_URL = `${COMMUNITY_URL}/contact`;

// Mixed types, in an order that is neither alphabetical nor grouped by type.
const TESORERIA = buildContactChannel({ type: "EMAIL", label: "Tesorería", value: "tesoreria@solsierra.test" });
const OFICINA = buildContactChannel({ type: "PHONE", label: "Oficina", value: "+34 978 710 251" });
const LOCAL = buildContactChannel({ type: "ADDRESS", label: "Local de la asociación", value: "Calle Mayor 12, Albarracín" });

const INSTRUCTION = "Si necesitas ayuda, contacta con quien gestiona tu comunidad energética.";
const CONFIGURE_TITLE = "Tu comunidad aún no tiene contacto configurado.";
const ADMIN: Partial<CommunityCapabilitiesResponse> = { canRead: true, canManage: true };
const MEMBER: Partial<CommunityCapabilitiesResponse> = { canRead: true };

/** The community's stored channels, as the backend would keep them between sessions. */
let stored: ContactChannelResponse[];
/** What GET /communities/{id} answers the caller may do; a test may change it mid-way. */
let capabilities: Partial<CommunityCapabilitiesResponse>;
/** How the PUT answers: by default it stores the list, collapsing repeated spaces as a server might normalise it. */
let answerPut: (body: SetCommunityContactBody) => CommunityContactResponse;

const storeAndAnswer = (body: SetCommunityContactBody): CommunityContactResponse => {
  stored = body.channels.map((channel) => ({ ...channel, value: channel.value.replace(/ {2,}/g, " ") }));
  return { channels: stored };
};

function serve(): RequestRouter {
  const router = routeRequests([
    {
      method: "GET",
      url: COMMUNITY_URL,
      respond: () => buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities(capabilities) }),
    },
    { method: "GET", url: CONTACT_URL, respond: (): CommunityContactResponse => ({ channels: stored }) },
    { method: "PUT", url: CONTACT_URL, respond: (config) => answerPut(config.data as SetCommunityContactBody) },
    { method: "GET", url: "/api/v1/operator-contact", respond: () => ({ contact: null }) },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  return router;
}

const contactReads = (router: RequestRouter) =>
  router.requests.filter((request) => request.method === "GET" && request.url === CONTACT_URL);
const puts = (router: RequestRouter) =>
  router.requests.filter((request) => request.method === "PUT").map((request) => (request.data as SetCommunityContactBody).channels);

const listedLabels = () =>
  within(screen.getByRole("list", { name: "Canales de contacto" }))
    .getAllByRole("listitem")
    .map((item) => item.querySelector("h3")?.textContent);
const editButton = (label: string) => screen.getByRole("button", { name: `Editar ${label}` });
const sheet = () => screen.getByRole("dialog");
const field = (name: string) => within(sheet()).getByRole("textbox", { name });
const bodyOf = (channel: ContactChannelResponse) => ({ ...channel, schedule: channel.schedule ?? null, notes: channel.notes ?? null });

async function renderPage() {
  const router = serve();
  const user = userEvent.setup();
  const view = renderWithProviders(<CommunityContactPage />, { activeCommunityId: COMMUNITY_ID });
  return { router, user, ...view };
}

async function deleteFromSheet(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(await screen.findByRole("button", { name: `Editar ${label}` }));
  await user.click(within(sheet()).getByRole("button", { name: "Eliminar canal" }));
  const buttons = screen.getAllByRole("button", { name: "Eliminar canal" });
  await user.click(buttons[buttons.length - 1]);
}

beforeEach(() => {
  mockCustomInstance.mockReset();
  stored = [TESORERIA, OFICINA, LOCAL];
  capabilities = ADMIN;
  answerPut = storeAndAnswer;
  Element.prototype.scrollIntoView = vi.fn();
  return () => {
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  };
});

describe("UI-CTU-008 the list shown after a save is the one the server returned", () => {
  it("UI-CTU-008 AC4 shows the edited channel as returned, highlighted and focused, without fetching the list again", async () => {
    const { router, user } = await renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar Oficina" }));
    await user.clear(field("Número de teléfono"));
    await user.click(field("Número de teléfono"));
    await user.paste("978  710 252");
    await user.click(within(sheet()).getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("link", { name: "978 710 252" })).toHaveAttribute("href", "tel:978710252");
    expect(listedLabels()).toEqual(["Tesorería", "Oficina", "Local de la asociación"]);
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 3, name: "Oficina, teléfono" }));
    expect(screen.getByRole("status")).toHaveTextContent("Canal guardado.");
    expect(contactReads(router)).toHaveLength(1);
  });

  it("UI-CTU-008 AC5 shows an added channel at the end, focused", async () => {
    const { router, user } = await renderPage();

    await user.click(await screen.findByRole("button", { name: "Añadir canal" }));
    await user.paste("Marta Gil, presidenta");
    await user.click(field("Número de teléfono"));
    await user.paste("+34 655 418 902");
    await user.click(within(sheet()).getByRole("button", { name: "Añadir canal" }));

    await waitFor(() =>
      expect(listedLabels()).toEqual(["Tesorería", "Oficina", "Local de la asociación", "Marta Gil, presidenta"]),
    );
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 3, name: "Marta Gil, presidenta, teléfono" }));
    expect(contactReads(router)).toHaveLength(1);
  });

  it("UI-CTU-008 AC7 after a delete, shows the rest and focuses the next channel's Editar", async () => {
    const { router, user } = await renderPage();

    await deleteFromSheet(user, "Oficina");

    await waitFor(() => expect(listedLabels()).toEqual(["Tesorería", "Local de la asociación"]));
    expect(document.activeElement).toBe(editButton("Local de la asociación"));
    expect(contactReads(router)).toHaveLength(1);
  });

  it("AC7 after deleting the last channel of the list, focuses the previous channel's Editar", async () => {
    const { user } = await renderPage();

    await deleteFromSheet(user, "Local de la asociación");

    await waitFor(() => expect(listedLabels()).toEqual(["Tesorería", "Oficina"]));
    expect(document.activeElement).toBe(editButton("Oficina"));
  });

  it("AC7 after deleting the only channel, shows the admin the configure panel and a member the fallback", async () => {
    stored = [OFICINA];
    const { router, user } = await renderPage();

    await deleteFromSheet(user, "Oficina");

    expect(await screen.findByRole("heading", { name: CONFIGURE_TITLE })).toBeVisible();
    expect(screen.queryByText(INSTRUCTION)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Canal eliminado. Tu comunidad ya no tiene contacto.");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Configurar contacto" })));
    expect(contactReads(router)).toHaveLength(1);
    expect(stored).toEqual([]);

    cleanup();
    capabilities = MEMBER;
    await renderPage();

    expect(await screen.findByText(INSTRUCTION)).toBeVisible();
    expect(screen.queryByRole("heading", { name: CONFIGURE_TITLE })).not.toBeInTheDocument();
  });

  it("UI-CTU-008 AC8 shows the saved order without fetching the list again", async () => {
    const { router, user } = await renderPage();

    await user.click(await screen.findByRole("button", { name: "Cambiar orden" }));
    await user.click(screen.getByRole("button", { name: "Subir Local de la asociación" }));
    await user.click(screen.getByRole("button", { name: "Guardar orden" }));

    await waitFor(() => expect(listedLabels()).toEqual(["Tesorería", "Local de la asociación", "Oficina"]));
    expect(screen.getByRole("status")).toHaveTextContent("Orden guardado.");
    expect(contactReads(router)).toHaveLength(1);
  });
});

describe("UI-CTU-008 the list sent is the one the admin was looking at", () => {
  it("UI-CTU-008 AC4 replaces the edited channel in the list taken when the sheet opened, not in one refetched meanwhile", async () => {
    const { router, user, queryClient } = await renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar Oficina" }));
    // Another admin added a channel at position 1, and a refetch (on window
    // focus, say) brought it in while this sheet was open.
    const inserted = buildContactChannel({ type: "PHONE", label: "Guardia", value: "600 111 222" });
    queryClient.setQueryData(getGetCommunityContactQueryKey(COMMUNITY_ID), { channels: [TESORERIA, inserted, OFICINA, LOCAL] });
    await user.type(within(sheet()).getByRole("textbox", { name: "Horario (opcional)" }), "Por las mañanas");
    await user.click(within(sheet()).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(puts(router)).toHaveLength(1));
    expect(puts(router)[0]).toEqual([
      bodyOf(TESORERIA),
      { ...bodyOf(OFICINA), schedule: "Por las mañanas" },
      bodyOf(LOCAL),
    ]);
  });
});

describe("losing the right to edit", () => {
  it.each([403, 404])("AC13 after a %i, Cerrar leads to the member view", async (code) => {
    answerPut = () => {
      throw apiError(code);
    };
    const { user } = await renderPage();

    await user.click(await screen.findByRole("button", { name: "Editar Oficina" }));
    await user.click(within(sheet()).getByRole("button", { name: "Guardar" }));
    await within(sheet()).findByText("Ya no puedes editar el contacto de esta comunidad. No se han guardado los cambios.");

    // The capabilities the refetch brings say the caller is a member now.
    capabilities = MEMBER;
    const close = within(sheet()).getAllByRole("button", { name: "Cerrar" });
    await user.click(close[close.length - 1]);

    await waitFor(() => expect(screen.queryByRole("button", { name: /^Editar / })).not.toBeInTheDocument());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Añadir canal" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Canales de contacto" })).getAllByRole("listitem")).toHaveLength(3);
  });
});
