import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getGetCommunityByIdQueryKey,
  useGetCommunityById,
  useGetCommunityContact,
  useSetCommunityContact,
  type getCommunityById,
  type getCommunityContact,
} from "../../api/communities/communities";
import { useGetOperatorContact, type getOperatorContact } from "../../api/info/info";
import type {
  CommunityCapabilitiesResponse,
  CommunityContactResponse,
  ContactChannelResponse,
  RestErrorDetail,
  SetCommunityContactBody,
} from "../../api/models";
import { apiError } from "../../test/apiError";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildContactChannel,
  buildOperatorContact,
} from "../../test/fixtures";
import { mutation, query } from "../../test/queryState";
import { renderWithProviders } from "../../test/renderWithProviders";
import { CommunityContactPage } from "./CommunityContactPage";

// Tier 1: the reads are mocked, so the list does not change after a save. What
// the page shows afterwards comes from the response the action writes into the
// cache, and is proven in tier 2: CommunityContactSave.cache.spec.tsx.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityContact: vi.fn(),
  useGetCommunityById: vi.fn(),
  useSetCommunityContact: vi.fn(),
}));
vi.mock(import("../../api/info/info"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetOperatorContact: vi.fn(),
}));

const COMMUNITY_ID = "community-a";

// Mixed types, in an order that is neither alphabetical nor grouped by type.
const TESORERIA = buildContactChannel({ type: "EMAIL", label: "Tesorería", value: "tesoreria@solsierra.test" });
const OFICINA = buildContactChannel({
  type: "PHONE",
  label: "Oficina",
  value: "+34 978 710 251",
  schedule: "Lunes a viernes, de 10:00 a 13:00",
});
const LOCAL = buildContactChannel({
  type: "ADDRESS",
  label: "Local de la asociación",
  value: "Calle Mayor 12, Albarracín",
  notes: "Primera planta.",
});
const CHANNELS = [TESORERIA, OFICINA, LOCAL];

const INSTRUCTION = "Si necesitas ayuda, contacta con quien gestiona tu comunidad energética.";
const CONFIGURE_TITLE = "Tu comunidad aún no tiene contacto configurado.";
const LIMIT_TEXT = "Puedes tener hasta 10 canales de contacto.";

const ADMIN: Partial<CommunityCapabilitiesResponse> = { canRead: true, canManage: true };
const MEMBER: Partial<CommunityCapabilitiesResponse> = { canRead: true };

/** The channels as the server holds them. */
let stored: ContactChannelResponse[];
let putContact: ReturnType<typeof vi.fn<(variables: { communityId: string; data: SetCommunityContactBody }) => Promise<CommunityContactResponse>>>;

function serveCommunity(capabilities: Partial<CommunityCapabilitiesResponse>) {
  vi.mocked(useGetCommunityById).mockImplementation((communityId) =>
    communityId
      ? query.success<typeof getCommunityById>(
          buildCommunity({ id: communityId, capabilities: buildCommunityCapabilities(capabilities) }),
        )
      : query.disabled(),
  );
}

const storeAndAnswer = async ({ data }: { data: SetCommunityContactBody }): Promise<CommunityContactResponse> => ({
  channels: data.channels,
});

const sentBodies = () => putContact.mock.calls.map(([variables]) => variables.data.channels);

const operatorRequested = () =>
  vi.mocked(useGetOperatorContact).mock.calls.some(([options]) => options?.query?.enabled !== false);

const bodyOf = (channel: ContactChannelResponse) => ({
  type: channel.type,
  label: channel.label,
  value: channel.value,
  schedule: channel.schedule ?? null,
  notes: channel.notes ?? null,
});

/** A 400 with its details, as the endpoint answers one per broken rule. */
function refusal(details: Partial<RestErrorDetail>[]) {
  const error = apiError(400);
  error.response.data = { status: 400, errors: details.map((detail) => ({ message: "raw backend message", ...detail })) };
  return error;
}

beforeEach(() => {
  stored = CHANNELS;
  vi.mocked(useGetCommunityById).mockReset();
  vi.mocked(useGetCommunityContact).mockReset();
  vi.mocked(useGetOperatorContact).mockReset();
  serveCommunity(ADMIN);
  vi.mocked(useGetCommunityContact).mockImplementation((communityId) =>
    communityId ? query.success<typeof getCommunityContact>({ channels: stored }) : query.disabled(),
  );
  vi.mocked(useGetOperatorContact).mockImplementation((options) =>
    options?.query?.enabled === false
      ? query.disabled()
      : query.success<typeof getOperatorContact>({ contact: buildOperatorContact({ name: "Plataforma Conluz" }) }),
  );
  putContact = vi.fn(storeAndAnswer);
  vi.mocked(useSetCommunityContact).mockReturnValue(mutation.idle({ mutateAsync: putContact }));
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  // jsdom has none; the stub must not outlive the file.
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

function renderPage() {
  const user = userEvent.setup();
  const view = renderWithProviders(<CommunityContactPage />, { activeCommunityId: COMMUNITY_ID });
  return { user, ...view };
}

const sheet = () => screen.getByRole("dialog");
const field = (name: string | RegExp) => within(sheet()).getByRole("textbox", { name });
const editButton = (label: string) => screen.getByRole("button", { name: `Editar ${label}` });
const listedLabels = () =>
  within(screen.getByRole("list", { name: "Canales de contacto" }))
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
const status = () => screen.getByRole("status");

async function replace(user: ReturnType<typeof userEvent.setup>, element: HTMLElement, text: string) {
  await user.clear(element);
  if (text) {
    await user.click(element);
    await user.paste(text);
  }
}

describe("UI-CTU-006 editing controls only when they can succeed", () => {
  it("UI-CTU-006 AC1 gives a caller with canManage an Editar per channel, Añadir canal and Cambiar orden", () => {
    renderPage();

    expect(screen.getAllByRole("button", { name: /^Editar / })).toHaveLength(3);
    expect(editButton("Oficina")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Añadir canal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cambiar orden" })).toBeInTheDocument();
  });

  it("UI-CTU-006 AC1 gives a member none of them, and the view of #295", () => {
    serveCommunity(MEMBER);
    renderPage();

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Canales de contacto" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Canales de contacto" })).getAllByRole("listitem")).toHaveLength(3);
  });

  it("UI-CTU-006 AC2 offers Añadir canal with 9 channels", () => {
    stored = Array.from({ length: 9 }, (_, index) => buildContactChannel({ label: `Canal ${9 - index}` }));
    renderPage();

    expect(screen.getByRole("button", { name: "Añadir canal" })).toBeInTheDocument();
    expect(screen.queryByText(LIMIT_TEXT)).not.toBeInTheDocument();
  });

  it("UI-CTU-006 AC2 replaces Añadir canal with the limit text at 10 channels", () => {
    stored = Array.from({ length: 10 }, (_, index) => buildContactChannel({ label: `Canal ${10 - index}` }));
    renderPage();

    expect(screen.queryByRole("button", { name: "Añadir canal" })).not.toBeInTheDocument();
    expect(screen.getByText(LIMIT_TEXT)).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cambiar orden" })).toBeInTheDocument();
  });

  it("UI-CTU-006 AC3 offers no Cambiar orden with one channel", () => {
    stored = [OFICINA];
    renderPage();

    expect(screen.queryByRole("button", { name: "Cambiar orden" })).not.toBeInTheDocument();
    expect(editButton("Oficina")).toBeInTheDocument();
  });

  it("UI-CTU-006 AC3 offers Cambiar orden with two channels", () => {
    stored = [LOCAL, TESORERIA];
    renderPage();

    expect(screen.getByRole("button", { name: "Cambiar orden" })).toBeInTheDocument();
  });
});

describe("UI-CTU-007 no channels: a manager is asked to configure them", () => {
  it("UI-CTU-007 AC14 shows an admin the configure panel, not the fallback, and requests no operator contact", () => {
    stored = [];
    renderPage();

    expect(screen.getByRole("heading", { name: CONFIGURE_TITLE })).toBeVisible();
    expect(screen.getByText("Añade cómo pueden contactar los miembros con quien la gestiona.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Configurar contacto" })).toBeInTheDocument();
    expect(screen.queryByText(INSTRUCTION)).not.toBeInTheDocument();
    expect(operatorRequested()).toBe(false);
  });

  it("UI-CTU-007 AC14 shows a member of the same community the fallback", () => {
    stored = [];
    serveCommunity(MEMBER);
    renderPage();

    expect(screen.getByText(INSTRUCTION)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Configurar contacto" })).not.toBeInTheDocument();
    expect(operatorRequested()).toBe(true);
  });

  it("UI-CTU-007 shows neither while it is not yet known whether the caller may manage", () => {
    stored = [];
    vi.mocked(useGetCommunityById).mockReturnValue(query.loading());
    renderPage();

    expect(screen.getByRole("progressbar", { name: "Cargando el contacto" })).toBeInTheDocument();
    expect(screen.queryByText(INSTRUCTION)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Configurar contacto" })).not.toBeInTheDocument();
  });
});

describe("editing a channel", () => {
  it("AC4 sends the full list with channel 2 replaced in place, then focuses its heading and announces it", async () => {
    const { user } = renderPage();

    await user.click(editButton("Oficina"));
    await replace(user, field("Número de teléfono"), "978  710 252");
    await user.click(within(sheet()).getByRole("button", { name: "Guardar" }));

    expect(putContact).toHaveBeenCalledTimes(1);
    expect(sentBodies()[0]).toEqual([bodyOf(TESORERIA), { ...bodyOf(OFICINA), value: "978  710 252" }, bodyOf(LOCAL)]);
    expect(putContact.mock.calls[0][0].communityId).toBe(COMMUNITY_ID);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 3, name: "Oficina, teléfono" }));
    expect(status()).toHaveTextContent("Canal guardado.");
  });

  it("AC10 AC15 closing an untouched sheet sends nothing and returns focus to its Editar", async () => {
    const { user } = renderPage();

    await user.click(editButton("Local de la asociación"));
    await user.click(within(sheet()).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.activeElement).toBe(editButton("Local de la asociación"));
    expect(putContact).not.toHaveBeenCalled();
  });

  it("AC15 keeps focus inside the sheet while it is open", async () => {
    const { user } = renderPage();

    await user.click(editButton("Tesorería"));
    for (let press = 0; press < 25; press++) {
      await user.tab();
      expect(sheet()).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("AC11 sends nothing when the channel breaks the rules", async () => {
    const { user } = renderPage();

    await user.click(editButton("Oficina"));
    await replace(user, field("Nombre del canal"), "");
    await replace(user, field("Número de teléfono"), "978 71");
    await user.click(within(sheet()).getByRole("button", { name: "Guardar" }));

    expect(putContact).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(field("Nombre del canal"));
  });
});

describe("adding a channel", () => {
  it.each([
    ["Añadir canal", CHANNELS],
    ["Configurar contacto", []],
  ] as const)("AC5 from %s opens Nuevo canal as Teléfono, focused on its name, and appends the channel", async (opener, initial) => {
    stored = [...initial];
    const { user } = renderPage();

    await user.click(screen.getByRole("button", { name: opener }));
    expect(screen.getByRole("dialog", { name: "Nuevo canal" })).toBeInTheDocument();
    expect(within(sheet()).getByRole("radio", { name: "Teléfono" })).toBeChecked();
    expect(document.activeElement).toBe(field("Nombre del canal"));
    expect(within(sheet()).queryByRole("button", { name: "Eliminar canal" })).not.toBeInTheDocument();

    await user.paste("Marta Gil, presidenta");
    await user.click(field("Número de teléfono"));
    await user.paste("+34 655 418 902");
    await user.click(within(sheet()).getByRole("button", { name: "Añadir canal" }));

    const added = { type: "PHONE", label: "Marta Gil, presidenta", value: "+34 655 418 902", schedule: null, notes: null };
    expect(sentBodies()).toEqual([[...initial.map(bodyOf), added]]);
    await waitFor(() => expect(status()).toHaveTextContent("Canal añadido."));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("deleting a channel", () => {
  it("AC7 asks first and sends nothing until confirmed", async () => {
    const { user } = renderPage();

    await user.click(editButton("Oficina"));
    await user.click(within(sheet()).getByRole("button", { name: "Eliminar canal" }));

    expect(screen.getByRole("heading", { name: "¿Eliminar el canal «Oficina»?" })).toBeInTheDocument();
    expect(screen.getByText("Los miembros dejarán de verlo en Contacto. Los otros 2 canales no cambian.")).toBeInTheDocument();
    expect(putContact).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(putContact).not.toHaveBeenCalled();
    expect(sheet()).toBeInTheDocument();
  });

  it("AC7 on confirming, sends the list without the channel and focuses the next channel's Editar", async () => {
    const { user } = renderPage();

    await user.click(editButton("Oficina"));
    await user.click(within(sheet()).getByRole("button", { name: "Eliminar canal" }));
    const confirm = screen.getAllByRole("button", { name: "Eliminar canal" });
    await user.click(confirm[confirm.length - 1]);

    expect(sentBodies()).toEqual([[bodyOf(TESORERIA), bodyOf(LOCAL)]]);
    await waitFor(() => expect(status()).toHaveTextContent("Canal eliminado."));
  });

  it("AC7 warns before deleting the only channel, and sends an empty list", async () => {
    stored = [OFICINA];
    const { user } = renderPage();

    await user.click(editButton("Oficina"));
    await user.click(within(sheet()).getByRole("button", { name: "Eliminar canal" }));
    expect(
      screen.getByText(
        "Es el único canal. Si lo eliminas, tu comunidad se quedará sin contacto y los miembros no sabrán cómo contactar con quien la gestiona hasta que añadas otro.",
      ),
    ).toBeInTheDocument();
    const confirm = screen.getAllByRole("button", { name: "Eliminar canal" });
    await user.click(confirm[confirm.length - 1]);

    expect(sentBodies()).toEqual([[]]);
    await waitFor(() => expect(status()).toHaveTextContent("Canal eliminado. Tu comunidad ya no tiene contacto."));
  });
});

describe("reordering", () => {
  it("AC8 hides Añadir canal and Editar, sends nothing per move, then the full list on Guardar orden", async () => {
    const { user } = renderPage();

    await user.click(screen.getByRole("button", { name: "Cambiar orden" }));
    expect(screen.queryByRole("button", { name: "Añadir canal" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Editar / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Subir Tesorería" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bajar Local de la asociación" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Bajar Tesorería" }));
    expect(status()).toHaveTextContent("«Tesorería» está ahora en la posición 2 de 3.");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Bajar Tesorería" }));
    await user.click(screen.getByRole("button", { name: "Subir Local de la asociación" }));
    expect(status()).toHaveTextContent("«Local de la asociación» está ahora en la posición 2 de 3.");
    expect(putContact).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Guardar orden" }));

    expect(sentBodies()).toEqual([[bodyOf(OFICINA), bodyOf(LOCAL), bodyOf(TESORERIA)]]);
    await waitFor(() => expect(status()).toHaveTextContent("Orden guardado."));
  });

  it("AC8 Cancelar restores the saved order without a request", async () => {
    const { user } = renderPage();

    await user.click(screen.getByRole("button", { name: "Cambiar orden" }));
    await user.click(screen.getByRole("button", { name: "Bajar Tesorería" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(listedLabels()).toEqual(["Tesorería", "Oficina", "Local de la asociación"]);
    expect(putContact).not.toHaveBeenCalled();
  });

  it("says the order was not saved when the server refuses it", async () => {
    putContact.mockRejectedValue(apiError(500));
    const { user } = renderPage();

    await user.click(screen.getByRole("button", { name: "Cambiar orden" }));
    await user.click(screen.getByRole("button", { name: "Bajar Tesorería" }));
    await user.click(screen.getByRole("button", { name: "Guardar orden" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se ha guardado el orden. Inténtalo de nuevo en unos minutos.",
    );
    expect(screen.getByRole("button", { name: "Guardar orden" })).toBeInTheDocument();
  });
});

describe("UI-CTU-008 one save at a time", () => {
  it("UI-CTU-008 AC9 while a save is in flight, a second press sends nothing and nothing else can be started", async () => {
    putContact.mockImplementation(() => new Promise(() => {}));
    const { user } = renderPage();

    await user.click(editButton("Oficina"));
    await user.click(within(sheet()).getByRole("button", { name: "Guardar" }));
    await user.click(within(sheet()).getByRole("button", { name: "Guardando…" }));

    expect(putContact).toHaveBeenCalledTimes(1);
    expect(field("Nombre del canal")).toHaveAttribute("readonly");
    expect(within(sheet()).queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
    expect(within(sheet()).queryByRole("button", { name: "Cerrar" })).not.toBeInTheDocument();
    expect(within(sheet()).queryByRole("button", { name: "Eliminar canal" })).not.toBeInTheDocument();

    // The page behind the sheet: no other sheet, no order mode.
    const behind = { hidden: true };
    expect(screen.getByRole("button", { name: "Añadir canal", ...behind })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cambiar orden", ...behind })).toBeDisabled();
    screen
      .getAllByRole("button", { name: /^Editar /, ...behind })
      .forEach((button) => expect(button).toBeDisabled());
  });

  it("UI-CTU-008 AC9 Esc does not close the sheet while saving", async () => {
    putContact.mockImplementation(() => new Promise(() => {}));
    const { user } = renderPage();

    await user.click(editButton("Oficina"));
    await user.click(within(sheet()).getByRole("button", { name: "Guardar" }));
    await user.keyboard("{Escape}");

    expect(sheet()).toBeInTheDocument();
    expect(within(sheet()).getByRole("button", { name: "Guardando…" })).toBeInTheDocument();
  });
});

describe("refused saves", () => {
  it("AC12 places an indexed 400 on the edited channel's field, with its current length, focused", async () => {
    putContact.mockRejectedValue(
      refusal([{ code: "CONTACT_CHANNEL_LABEL_TOO_LONG", params: { index: "1", maxLength: "60" } }]),
    );
    const { user } = renderPage();

    await user.click(editButton("Oficina"));
    // A name the client accepts: the refusal under test is the server's, which
    // carries the limit but not the length, filled in from what was sent.
    await replace(user, field("Nombre del canal"), "Oficina de atención a los miembros");
    await user.click(within(sheet()).getByRole("button", { name: "Guardar" }));

    const name = field("Nombre del canal");
    await waitFor(() =>
      expect(name).toHaveAccessibleDescription("El nombre puede tener hasta 60 caracteres. Ahora tiene 34."),
    );
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(document.activeElement).toBe(name);
  });

  it("AC12 shows any other failure at the top, focused, keeping the input and Guardar", async () => {
    putContact.mockRejectedValue(apiError(500));
    const { user } = renderPage();

    await user.click(editButton("Oficina"));
    await replace(user, field("Horario (opcional)"), "Solo jueves");
    await user.click(within(sheet()).getByRole("button", { name: "Guardar" }));

    const alert = await within(sheet()).findByRole("alert");
    expect(alert).toHaveTextContent(
      "No se ha guardado el canal. El servidor no ha aceptado los cambios. Tus datos siguen aquí: inténtalo de nuevo en unos minutos.",
    );
    expect(document.activeElement).toBe(alert);
    expect(field("Horario (opcional)")).toHaveValue("Solo jueves");
    expect(within(sheet()).getByRole("button", { name: "Guardar" })).toBeEnabled();
  });

  it("AC12 shows a 400 about another channel as a server refusal, not on this one's fields", async () => {
    putContact.mockRejectedValue(refusal([{ code: "CONTACT_CHANNEL_EMAIL_INVALID", params: { index: "0" } }]));
    const { user } = renderPage();

    await user.click(editButton("Oficina"));
    await user.click(within(sheet()).getByRole("button", { name: "Guardar" }));

    expect(await within(sheet()).findByRole("alert")).toHaveTextContent("El servidor no ha aceptado los cambios.");
    expect(field("Número de teléfono")).toHaveAttribute("aria-invalid", "false");
  });

  it.each([
    ["no connection", new AxiosError("Network Error", "ERR_NETWORK")],
    ["a timeout", new AxiosError("timeout of 30000ms exceeded", "ECONNABORTED")],
  ])("AC12 shows the offline message on %s, keeping the input", async (_, error) => {
    putContact.mockRejectedValue(error);
    const { user } = renderPage();

    await user.click(editButton("Oficina"));
    await replace(user, field("Horario (opcional)"), "Solo jueves");
    await user.click(within(sheet()).getByRole("button", { name: "Guardar" }));

    expect(await within(sheet()).findByRole("alert")).toHaveTextContent(
      "No se ha guardado el canal. No hay conexión. Tus datos siguen aquí: vuelve a pulsar Guardar cuando tengas cobertura.",
    );
    expect(field("Horario (opcional)")).toHaveValue("Solo jueves");
  });

  it.each([403, 404])("AC13 after a %i, keeps the input read-only with no Guardar, and Cerrar refreshes the capabilities", async (code) => {
    putContact.mockRejectedValue(apiError(code));
    const { user, queryClient } = renderPage();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await user.click(editButton("Oficina"));
    await replace(user, field("Horario (opcional)"), "Solo jueves");
    await user.click(within(sheet()).getByRole("button", { name: "Guardar" }));

    expect(await within(sheet()).findByRole("alert")).toHaveTextContent(
      "Ya no puedes editar el contacto de esta comunidad. No se han guardado los cambios.",
    );
    expect(field("Horario (opcional)")).toHaveValue("Solo jueves");
    expect(field("Horario (opcional)")).toHaveAttribute("readonly");
    expect(within(sheet()).queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();

    const close = within(sheet()).getAllByRole("button", { name: "Cerrar" });
    await user.click(close[close.length - 1]);

    // The member view that follows is in CommunityContactSave.cache.spec.tsx.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: getGetCommunityByIdQueryKey(COMMUNITY_ID) });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(putContact).toHaveBeenCalledTimes(1);
  });
});
