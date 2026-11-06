import "@testing-library/jest-dom";
import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useGetCommunityById,
  useGetCommunityContact,
  useSetCommunityContact,
  type getCommunityById,
  type getCommunityContact,
} from "../../api/communities/communities";
import { useGetOperatorContact, type getOperatorContact } from "../../api/info/info";
import type { CommunityContactResponse, ContactChannelResponse, SetCommunityContactBody } from "../../api/models";
import { buildCommunity, buildCommunityCapabilities, buildContactChannel, buildOperatorContact } from "../../test/fixtures";
import { hasOverlayEntry, pressBack, stubViewport } from "../../test/overlay";
import { mutation, query } from "../../test/queryState";
import { renderWithProviders } from "../../test/renderWithProviders";
import { overlayHistorySettled } from "../../components/ResponsiveOverlay/overlayHistory";
import { CommunityContactPage } from "./CommunityContactPage";

/**
 * UI-CTU-009: deleting a channel asks in the editor's footer, not in a second
 * dialog over it (#369). Tier 1: the reads are mocked; the save is a spy.
 */
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

const TESORERIA = buildContactChannel({ type: "EMAIL", label: "Tesorería", value: "tesoreria@solsierra.test" });
const OFICINA = buildContactChannel({ type: "PHONE", label: "Oficina", value: "+34 978 710 251" });
const LOCAL = buildContactChannel({ type: "ADDRESS", label: "Local de la asociación", value: "Calle Mayor 12, Albarracín" });
const CHANNELS = [TESORERIA, OFICINA, LOCAL];

const QUESTION = "¿Eliminar el canal «Oficina»?";
const EFFECT = "Los miembros dejarán de verlo en Contacto. Los otros 2 canales no cambian.";
const DISCARD = "Tienes cambios sin guardar en este canal. Si cierras, se perderán.";

let putContact: ReturnType<typeof vi.fn<(variables: { communityId: string; data: SetCommunityContactBody }) => Promise<CommunityContactResponse>>>;

const bodyOf = (channel: ContactChannelResponse) => ({
  type: channel.type,
  label: channel.label,
  value: channel.value,
  schedule: channel.schedule ?? null,
  notes: channel.notes ?? null,
});
const sentBodies = () => putContact.mock.calls.map(([variables]) => variables.data.channels);

beforeEach(() => {
  stubViewport(390);
  vi.mocked(useGetCommunityById).mockImplementation((communityId) =>
    communityId
      ? query.success<typeof getCommunityById>(
          buildCommunity({ id: communityId, capabilities: buildCommunityCapabilities({ canRead: true, canManage: true }) }),
        )
      : query.disabled(),
  );
  vi.mocked(useGetCommunityContact).mockImplementation((communityId) =>
    communityId ? query.success<typeof getCommunityContact>({ channels: CHANNELS }) : query.disabled(),
  );
  vi.mocked(useGetOperatorContact).mockImplementation(() =>
    query.success<typeof getOperatorContact>({ contact: buildOperatorContact({ name: "Plataforma Conluz" }) }),
  );
  putContact = vi.fn(async ({ data }) => ({ channels: data.channels }));
  vi.mocked(useSetCommunityContact).mockReturnValue(mutation.idle({ mutateAsync: putContact }));
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(async () => {
  cleanup();
  await act(() => overlayHistorySettled());
  vi.unstubAllGlobals();
  // jsdom has none; the stub must not outlive the file.
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

const editor = () => screen.getByRole("dialog", { name: "Editar canal" });
const deleteButton = () => within(editor()).getByRole("button", { name: "Eliminar canal" });

async function openQuestion() {
  const user = userEvent.setup();
  renderWithProviders(<CommunityContactPage />, { activeCommunityId: COMMUNITY_ID });
  await user.click(screen.getByRole("button", { name: "Editar Oficina" }));
  await act(() => overlayHistorySettled());
  await user.click(deleteButton());
  return user;
}

describe("UI-CTU-009 deleting a channel asks in the editor's footer", () => {
  it("UI-CTU-009 asks with the channel's name and the effect on the others, in the open editor, sending nothing", async () => {
    await openQuestion();

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    const question = within(editor()).getByRole("alert");
    expect(question).toHaveTextContent(QUESTION);
    expect(question).toHaveTextContent(EFFECT);
    expect(within(editor()).getByRole("button", { name: "Cancelar" })).toHaveFocus();
    expect(within(editor()).getByRole("button", { name: "Eliminar canal" })).toBeInTheDocument();
    expect(putContact).not.toHaveBeenCalled();
  });

  it.each([
    ["Cancelar", (user: ReturnType<typeof userEvent.setup>) => user.click(within(editor()).getByRole("button", { name: "Cancelar" }))],
    ["Escape", (user: ReturnType<typeof userEvent.setup>) => user.keyboard("{Escape}")],
    ["the close icon", (user: ReturnType<typeof userEvent.setup>) => user.click(within(editor()).getByRole("button", { name: "Cerrar" }))],
    ["back", () => pressBack()],
  ] as const)("UI-CTU-009 %s withdraws the question, keeps the editor, deletes nothing and gives focus back to Eliminar canal", async (_, withdraw) => {
    const user = await openQuestion();

    await withdraw(user);

    await waitFor(() => expect(within(editor()).queryByRole("alert")).not.toBeInTheDocument());
    expect(within(editor()).getByRole("textbox", { name: "Nombre del canal" })).toHaveValue("Oficina");
    await waitFor(() => expect(deleteButton()).toHaveFocus());
    expect(putContact).not.toHaveBeenCalled();
  });

  it("UI-CTU-009 typing in a field keeps the question, and focus stays in the field", async () => {
    const user = await openQuestion();
    const name = within(editor()).getByRole("textbox", { name: "Nombre del canal" });

    await user.click(name);
    await user.keyboard(" central");

    expect(within(editor()).getByRole("alert")).toHaveTextContent(QUESTION);
    expect(name).toHaveFocus();
    expect(name).toHaveValue("Oficina central");
    expect(putContact).not.toHaveBeenCalled();
  });

  it("UI-CTU-009 gives focus back to Eliminar canal in the dialog too, where the button sits in the footer", async () => {
    stubViewport(900);
    const user = await openQuestion();

    await user.click(within(editor()).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(deleteButton()).toHaveFocus());
    expect(editor()).toHaveClass("MuiDialog-paper");
  });

  it("UI-CTU-009 confirming sends the list without the channel, and the editor shows Guardando… under the lock", async () => {
    let answer: (response: CommunityContactResponse) => void = () => {};
    putContact.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    const user = await openQuestion();

    const buttons = within(editor()).getAllByRole("button", { name: "Eliminar canal" });
    await user.click(buttons[buttons.length - 1]);

    expect(sentBodies()).toEqual([[bodyOf(TESORERIA), bodyOf(LOCAL)]]);
    expect(within(editor()).getByRole("button", { name: /Guardando…/ })).toBeInTheDocument();
    expect(within(editor()).queryByRole("button", { name: "Cerrar" })).not.toBeInTheDocument();
    expect(within(editor()).queryByRole("alert")).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(editor()).toBeInTheDocument();

    await act(async () => answer({ channels: [TESORERIA, LOCAL] }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("UI-CTU-009 with unsaved changes, confirming deletes without discarding them first", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommunityContactPage />, { activeCommunityId: COMMUNITY_ID });
    await user.click(screen.getByRole("button", { name: "Editar Oficina" }));
    await act(() => overlayHistorySettled());
    await user.type(within(editor()).getByRole("textbox", { name: "Nombre del canal" }), " central");
    await user.click(deleteButton());

    expect(within(editor()).getByRole("alert")).toHaveTextContent(QUESTION);
    const buttons = within(editor()).getAllByRole("button", { name: "Eliminar canal" });
    await user.click(buttons[buttons.length - 1]);

    expect(sentBodies()).toEqual([[bodyOf(TESORERIA), bodyOf(LOCAL)]]);
  });

  it("UI-CTU-009 after back withdraws the question, a second back closes a clean editor", async () => {
    await openQuestion();

    await pressBack();
    await waitFor(() => expect(within(editor()).queryByRole("alert")).not.toBeInTheDocument());
    expect(hasOverlayEntry()).toBe(true);
    await pressBack();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(putContact).not.toHaveBeenCalled();
  });

  it("UI-CTU-009 after back withdraws the question, a second back with changes asks to discard them", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommunityContactPage />, { activeCommunityId: COMMUNITY_ID });
    await user.click(screen.getByRole("button", { name: "Editar Oficina" }));
    await act(() => overlayHistorySettled());
    await user.type(within(editor()).getByRole("textbox", { name: "Nombre del canal" }), " central");
    await user.click(deleteButton());

    await pressBack();
    await waitFor(() => expect(within(editor()).queryByText(QUESTION)).not.toBeInTheDocument());
    await pressBack();

    expect(within(editor()).getByRole("alert")).toHaveTextContent(DISCARD);
    expect(putContact).not.toHaveBeenCalled();
  });
});
