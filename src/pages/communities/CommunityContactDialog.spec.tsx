import "@testing-library/jest-dom";
import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGetCommunityContact, type getCommunityContact } from "../../api/communities/communities";
import { useGetOperatorContact } from "../../api/info/info";
import { useGetCurrentUser, type getCurrentUser } from "../../api/users/users";
import {
  buildContactChannel,
  buildCurrentUser,
  buildPlatformCapabilities,
} from "../../test/fixtures";
import { query } from "../../test/queryState";
import { renderWithProviders } from "../../test/renderWithProviders";
import { CommunityContactDialog } from "./CommunityContactDialog";

vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityContact: vi.fn(),
}));
vi.mock(import("../../api/info/info"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetOperatorContact: vi.fn(),
}));
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCurrentUser: vi.fn(),
}));

const COMMUNITY_ID = "community-x";

// A platform admin with no membership of the community they open.
const PLATFORM_ADMIN = buildCurrentUser({
  id: "platform-admin-1",
  isPlatformAdmin: true,
  memberships: {},
  platformCapabilities: buildPlatformCapabilities({ canAdministerPlatform: true }),
});

const CHANNELS = [
  buildContactChannel({ type: "EMAIL", label: "Correo de la junta", value: "junta@nortesol.test", schedule: "Respuesta en 48 horas" }),
  buildContactChannel({ type: "ADDRESS", label: "Local social", value: "Plaça Major 3, Torrent" }),
  buildContactChannel({ type: "PHONE", label: "Atención", value: "+34 600 111 222", notes: "Solo urgencias." }),
];

const NOT_CONFIGURED = "Esta comunidad aún no ha configurado su contacto.";

function renderContactDialog() {
  renderWithProviders(
    <CommunityContactDialog community={{ id: COMMUNITY_ID, name: "Norte Sol" }} onClose={() => {}} />,
    { token: "a-token" },
  );
}

const contactSection = () => screen.getByRole("dialog", { name: "Contacto" });

beforeEach(() => {
  vi.mocked(useGetOperatorContact).mockReset().mockReturnValue(query.disabled());
  vi.mocked(useGetCurrentUser).mockReturnValue(query.success<typeof getCurrentUser>(PLATFORM_ADMIN));
});

describe("CommunityContactDialog, opened from the communities list", () => {
  it("UI-CTU-004 shows a platform admin who is not a member the community's channels, read-only, in stored order", () => {
    vi.mocked(useGetCommunityContact).mockReturnValue(query.success<typeof getCommunityContact>({ channels: CHANNELS }));
    renderContactDialog();

    expect(vi.mocked(useGetCommunityContact)).toHaveBeenCalledWith(COMMUNITY_ID);
    const section = contactSection();
    const items = within(within(section).getByRole("list", { name: "Canales de contacto" })).getAllByRole("listitem");
    ["Correo de la junta", "Local social", "Atención"].forEach((label, index) => {
      expect(within(items[index]).getByText(label)).toBeVisible();
    });
    expect(within(items[0]).getByText("Respuesta en 48 horas")).toBeVisible();
    expect(within(items[2]).getByText("Solo urgencias.")).toBeVisible();
    expect(within(section).getByRole("link", { name: "junta@nortesol.test" })).toHaveAttribute("href", "mailto:junta@nortesol.test");
    expect(within(section).getByRole("link", { name: "+34 600 111 222" })).toHaveAttribute("href", "tel:+34600111222");

    // Read-only: nothing to press but the overlay's own close, and the only
    // links are the channels themselves.
    expect(within(section).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      "Cerrar",
    ]);
    expect(within(section).queryAllByRole("textbox")).toEqual([]);
    expect(within(section).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "mailto:junta@nortesol.test",
      "tel:+34600111222",
    ]);
  });

  it("UI-CTU-004 with no channels, says the community has not configured its contact, neutrally and without the operator", () => {
    vi.mocked(useGetCommunityContact).mockReturnValue(query.success<typeof getCommunityContact>({ channels: [] }));
    renderContactDialog();

    const section = contactSection();
    expect(within(section).getByText(NOT_CONFIGURED)).toBeVisible();
    expect(within(section).queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Si necesitas ayuda, contacta con quien gestiona tu comunidad energética.")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "¿No sabes quién gestiona tu comunidad?" })).not.toBeInTheDocument();
    expect(vi.mocked(useGetOperatorContact)).not.toHaveBeenCalled();
  });

  it("UI-CTU-004 shows no 'not configured' text while the channels are loading", () => {
    vi.mocked(useGetCommunityContact).mockReturnValue(query.loading());
    renderContactDialog();

    expect(within(contactSection()).getByRole("progressbar", { name: "Cargando el contacto de la comunidad" })).toBeVisible();
    expect(screen.queryByText(NOT_CONFIGURED)).not.toBeInTheDocument();
  });
});
