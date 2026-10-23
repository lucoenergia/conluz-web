import "@testing-library/jest-dom";
import type { FC } from "react";
import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useGetCommunityContact,
  type getCommunityContact,
} from "../../api/communities/communities";
import { useGetOperatorContact, type getOperatorContact } from "../../api/info/info";
import { useActiveCommunity } from "../../context/community.context";
import { apiError } from "../../test/apiError";
import { buildContactChannel, buildOperatorContact } from "../../test/fixtures";
import { query } from "../../test/queryState";
import { renderWithProviders } from "../../test/renderWithProviders";
import { CommunityContactPage } from "./CommunityContactPage";

vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityContact: vi.fn(),
}));
vi.mock(import("../../api/info/info"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetOperatorContact: vi.fn(),
}));

const COMMUNITY_A = "community-a";
const COMMUNITY_B = "community-b";

const CHANNELS_A = [
  buildContactChannel({ type: "PHONE", label: "Teléfono de guardia", value: "+34 600 111 222", schedule: "Lunes a viernes, de 9:00 a 14:00" }),
  buildContactChannel({ type: "ADDRESS", label: "Oficina", value: "Carrer de la Pau 12, València", notes: "Primera planta." }),
  buildContactChannel({ type: "EMAIL", label: "Correo", value: "hola@solcomun.test" }),
];
const CHANNELS_B = [
  buildContactChannel({ type: "EMAIL", label: "Buzón del barrio", value: "barrio@nortesol.test" }),
  buildContactChannel({ type: "PHONE", label: "Atención", value: "600 333 444" }),
  buildContactChannel({ type: "ADDRESS", label: "Local social", value: "Plaça Major 3, Torrent" }),
];

const OPERATOR = buildOperatorContact({
  name: "Plataforma Conluz",
  email: "ayuda@conluz.test",
  phone: "+34 600 555 666",
  schedule: "De 10:00 a 13:00",
});

const INSTRUCTION = "Si necesitas ayuda, contacta con quien gestiona tu comunidad energética.";
const OPERATOR_HEADING = "¿No sabes quién gestiona tu comunidad?";

const channelsOf: Record<string, typeof CHANNELS_A> = { [COMMUNITY_A]: CHANNELS_A, [COMMUNITY_B]: CHANNELS_B };

function serveChannels(byCommunity: Record<string, typeof CHANNELS_A>) {
  vi.mocked(useGetCommunityContact).mockImplementation((communityId) =>
    communityId
      ? query.success<typeof getCommunityContact>({ channels: byCommunity[communityId] ?? [] })
      : query.disabled(),
  );
}

function serveOperator(contact: ReturnType<typeof buildOperatorContact> | null) {
  vi.mocked(useGetOperatorContact).mockImplementation((options) =>
    options?.query?.enabled === false ? query.disabled() : query.success<typeof getOperatorContact>({ contact }),
  );
}

/** Asked for the operator contact, rather than merely rendered the hook disabled. */
const operatorRequested = () =>
  vi.mocked(useGetOperatorContact).mock.calls.some(([options]) => options?.query?.enabled !== false);

// Keyed on the active community, as AuthenticatedLayout keys its Outlet.
const KeyedPage: FC = () => <CommunityContactPage key={useActiveCommunity() ?? "none"} />;

beforeEach(() => {
  vi.mocked(useGetCommunityContact).mockReset();
  vi.mocked(useGetOperatorContact).mockReset();
  serveChannels(channelsOf);
  serveOperator(OPERATOR);
});

const channelItems = () =>
  within(screen.getByRole("list", { name: "Canales de contacto" })).getAllByRole("listitem");

describe("CommunityContactPage", () => {
  it("UI-CTU-001 shows the active community's channels in stored order, each with its schedule and notes", () => {
    renderWithProviders(<CommunityContactPage />, { activeCommunityId: COMMUNITY_A });

    const items = channelItems();
    expect(items).toHaveLength(3);
    ["Teléfono de guardia", "Oficina", "Correo"].forEach((label, index) => {
      expect(within(items[index]).getByText(label)).toBeVisible();
    });
    expect(within(items[0]).getByText("Lunes a viernes, de 9:00 a 14:00")).toBeVisible();
    expect(within(items[1]).getByText("Primera planta.")).toBeVisible();
    expect(vi.mocked(useGetCommunityContact)).toHaveBeenCalledWith(COMMUNITY_A, expect.anything());
    // Channels to show: no fallback, and the operator is not asked.
    expect(screen.queryByText(INSTRUCTION)).not.toBeInTheDocument();
    expect(operatorRequested()).toBe(false);
  });

  it("UI-CTU-001 shows the newly active community's channels after a switch", () => {
    const { switchActiveCommunity } = renderWithProviders(<KeyedPage />, { activeCommunityId: COMMUNITY_A });
    expect(screen.getByText("Teléfono de guardia")).toBeVisible();

    switchActiveCommunity(COMMUNITY_B);

    const items = channelItems();
    ["Buzón del barrio", "Atención", "Local social"].forEach((label, index) => {
      expect(within(items[index]).getByText(label)).toBeVisible();
    });
    expect(screen.queryByText("Teléfono de guardia")).not.toBeInTheDocument();
    expect(vi.mocked(useGetCommunityContact)).toHaveBeenLastCalledWith(COMMUNITY_B, expect.anything());
  });

  it("UI-CTU-003 with no channels, shows the instruction first and the operator contact below it", () => {
    serveChannels({});
    renderWithProviders(<CommunityContactPage />, { activeCommunityId: COMMUNITY_A });

    const instruction = screen.getByText(INSTRUCTION);
    const operatorHeading = screen.getByRole("heading", { name: OPERATOR_HEADING });
    expect(instruction.compareDocumentPosition(operatorHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Plataforma Conluz")).toBeVisible();
    expect(screen.getByRole("link", { name: "+34 600 555 666" })).toHaveAttribute("href", "tel:+34600555666");
    expect(screen.getByRole("link", { name: "ayuda@conluz.test" })).toHaveAttribute("href", "mailto:ayuda@conluz.test");
    expect(screen.getByText("De 10:00 a 13:00")).toBeVisible();
  });

  it("UI-CTU-003 with no channels and no operator configured, shows only the instruction", () => {
    serveChannels({});
    serveOperator(null);
    renderWithProviders(<CommunityContactPage />, { activeCommunityId: COMMUNITY_A });

    expect(screen.getByText(INSTRUCTION)).toBeVisible();
    expect(screen.queryByRole("heading", { name: OPERATOR_HEADING })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("UI-CTU-003 with no channels and a failed operator request, shows only the instruction and no alert", () => {
    serveChannels({});
    vi.mocked(useGetOperatorContact).mockReturnValue(query.error(apiError(500)));
    renderWithProviders(<CommunityContactPage />, { activeCommunityId: COMMUNITY_A });

    expect(screen.getByText(INSTRUCTION)).toBeVisible();
    expect(screen.queryByRole("heading", { name: OPERATOR_HEADING })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("UI-CTU-003 for a caller with no community, shows the fallback and requests no channels", () => {
    renderWithProviders(<CommunityContactPage />, { activeCommunityId: null });

    expect(screen.getByText(INSTRUCTION)).toBeVisible();
    expect(screen.getByRole("heading", { name: OPERATOR_HEADING })).toBeVisible();
    for (const [communityId, options] of vi.mocked(useGetCommunityContact).mock.calls) {
      expect(!!communityId && options?.query?.enabled !== false).toBe(false);
    }
  });

  it("UI-CTU-003 shows no fallback while the channels are loading", () => {
    vi.mocked(useGetCommunityContact).mockReturnValue(query.loading());
    renderWithProviders(<CommunityContactPage />, { activeCommunityId: COMMUNITY_A });

    expect(screen.getByRole("progressbar", { name: "Cargando el contacto" })).toBeVisible();
    expect(screen.queryByText(INSTRUCTION)).not.toBeInTheDocument();
    expect(operatorRequested()).toBe(false);
  });

  it("UI-CTU-003 shows no fallback while the active community is not yet known", () => {
    // No seeded community and no session: the real provider stays unresolved.
    renderWithProviders(<CommunityContactPage />);

    expect(screen.getByRole("progressbar", { name: "Cargando el contacto" })).toBeVisible();
    expect(screen.queryByText(INSTRUCTION)).not.toBeInTheDocument();
    expect(operatorRequested()).toBe(false);
  });

  it("UI-CTU-003 shows a failed channels request as an error with a retry, not as the fallback", () => {
    const failed = query.error(apiError(500));
    vi.mocked(useGetCommunityContact).mockReturnValue(failed);
    renderWithProviders(<CommunityContactPage />, { activeCommunityId: COMMUNITY_A });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("No se pudo cargar el contacto de tu comunidad.");
    expect(within(alert).getByRole("button", { name: "Reintentar" })).toBeVisible();
    expect(screen.queryByText(INSTRUCTION)).not.toBeInTheDocument();
    expect(operatorRequested()).toBe(false);
  });
});
