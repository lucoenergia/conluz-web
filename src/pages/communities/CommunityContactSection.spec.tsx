import "@testing-library/jest-dom";
import { screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useGetCommunityById,
  useGetCommunityContact,
  type getCommunityById,
  type getCommunityContact,
} from "../../api/communities/communities";
import { useGetOperatorContact } from "../../api/info/info";
import { useGetCurrentUser, type getCurrentUser } from "../../api/users/users";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildContactChannel,
  buildCurrentUser,
  buildPlatformCapabilities,
} from "../../test/fixtures";
import { query } from "../../test/queryState";
import { renderWithProviders } from "../../test/renderWithProviders";
import { EditCommunityPage } from "./EditCommunityPage";

vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
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

function renderCommunityPage() {
  renderWithProviders(
    <Routes>
      <Route path="/communities/:communityId/edit" element={<EditCommunityPage />} />
    </Routes>,
    { route: `/communities/${COMMUNITY_ID}/edit`, token: "a-token" },
  );
}

const contactSection = () => screen.getByRole("region", { name: "Contacto de la comunidad" });

beforeEach(() => {
  vi.mocked(useGetOperatorContact).mockReset().mockReturnValue(query.disabled());
  vi.mocked(useGetCurrentUser).mockReturnValue(query.success<typeof getCurrentUser>(PLATFORM_ADMIN));
  vi.mocked(useGetCommunityById).mockReturnValue(
    query.success<typeof getCommunityById>(
      buildCommunity({
        id: COMMUNITY_ID,
        name: "Norte Sol",
        code: "NORTE",
        capabilities: buildCommunityCapabilities({ canUpdate: true }),
      }),
    ),
  );
});

describe("CommunityContactSection on the community page", () => {
  it("UI-CTU-004 shows a platform admin who is not a member the community's channels, read-only, in stored order", () => {
    vi.mocked(useGetCommunityContact).mockReturnValue(query.success<typeof getCommunityContact>({ channels: CHANNELS }));
    renderCommunityPage();

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

    // Read-only: nothing to press, and the only links are the channels themselves.
    expect(within(section).queryAllByRole("button")).toEqual([]);
    expect(within(section).queryAllByRole("textbox")).toEqual([]);
    expect(within(section).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "mailto:junta@nortesol.test",
      "tel:+34600111222",
    ]);
  });

  it("UI-CTU-004 with no channels, says the community has not configured its contact, neutrally and without the operator", () => {
    vi.mocked(useGetCommunityContact).mockReturnValue(query.success<typeof getCommunityContact>({ channels: [] }));
    renderCommunityPage();

    const section = contactSection();
    expect(within(section).getByText(NOT_CONFIGURED)).toBeVisible();
    expect(within(section).queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Si necesitas ayuda, contacta con quien gestiona tu comunidad energética.")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "¿No sabes quién gestiona tu comunidad?" })).not.toBeInTheDocument();
    expect(vi.mocked(useGetOperatorContact)).not.toHaveBeenCalled();
  });

  it("UI-CTU-004 shows no 'not configured' text while the channels are loading", () => {
    vi.mocked(useGetCommunityContact).mockReturnValue(query.loading());
    renderCommunityPage();

    expect(within(contactSection()).getByRole("progressbar", { name: "Cargando el contacto de la comunidad" })).toBeVisible();
    expect(screen.queryByText(NOT_CONFIGURED)).not.toBeInTheDocument();
  });
});
