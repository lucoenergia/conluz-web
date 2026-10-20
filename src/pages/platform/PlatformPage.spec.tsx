import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildCurrentUser,
  buildPlatformCapabilities,
  buildPlatformCapabilitiesWithout,
} from "../../test/fixtures";
import type { CommunityResponse, PlatformCapabilitiesResponse } from "../../api/models";

// Only the reads are replaced. The page performs no write, so the whole gate --
// usePlatformActions over usePlatformCapabilities -- runs for real.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllCommunities: vi.fn(),
}));

// Mocked so a spec can show the page never lists users (#285).
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllUsers: vi.fn(),
}));

const loggedUser = vi.hoisted(() => ({ current: null as ReturnType<typeof Object> | null }));

vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => loggedUser.current,
}));

import { useGetAllCommunities, type getAllCommunities } from "../../api/communities/communities";
import { useGetAllUsers } from "../../api/users/users";
import { PlatformPage } from "./PlatformPage";

const COMMUNITIES: CommunityResponse[] = [
  buildCommunity({
    id: "c1",
    name: "Sol Común",
    code: "SOL",
    enabled: true,
    adminNames: ["Ana Gil"],
    memberCount: 38,
    supplyPointCount: 42,
    capabilities: buildCommunityCapabilities({ canRead: true }),
  }),
];

const FULL_PLATFORM: Partial<PlatformCapabilitiesResponse> = {
  canAdministerPlatform: true,
  canCreateCommunity: true,
  canListPlatformAdmins: true,
  // Still reported by the backend; the page no longer reads it (#285).
  canListUsers: true,
};

function setup(
  options: {
    platform?: Partial<PlatformCapabilitiesResponse> | null;
    communities?: CommunityResponse[];
  } = {},
) {
  const { platform = FULL_PLATFORM, communities = COMMUNITIES } = options;

  loggedUser.current =
    platform === null
      ? null
      : buildCurrentUser({ platformCapabilities: buildPlatformCapabilities(platform) });

  vi.mocked(useGetAllCommunities).mockReturnValue(
    query.success<typeof getAllCommunities>(communities),
  );

  return renderWithProviders(<PlatformPage />);
}

const CREATE = /Crear comunidad/i;
const PLATFORM_ADMINS = /Administradores de plataforma/i;

describe("PlatformPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the community preview whatever else it offers", () => {
    setup();

    // Rendered in both the table and the stacked list, one hidden by CSS.
    expect(screen.getAllByText("Sol Común").length).toBeGreaterThan(0);
  });

  describe("a platform admin who holds everything", () => {
    it("offers both quick actions", () => {
      setup();

      expect(screen.getByRole("link", { name: CREATE })).toHaveAttribute("href", "/communities/new");
      expect(screen.getByRole("link", { name: PLATFORM_ADMINS })).toHaveAttribute("href", "/platform-admins");
    });

    // The users page is gone, and with it the platform admin's reading of
    // users: no count of them, and no request for one, whatever the backend
    // still reports.
    it("neither counts users nor asks for them, even with canListUsers", () => {
      setup();

      expect(screen.queryByText("Usuarios")).not.toBeInTheDocument();
      expect(vi.mocked(useGetAllUsers)).not.toHaveBeenCalled();
      expect(screen.queryByRole("link", { name: /usuarios/i })).not.toBeInTheDocument();
    });
  });

  // Each quick action leads somewhere the router gates, so offering one that
  // redirects home is worse than offering nothing.
  describe("a caller who may not list the platform admins", () => {
    it("UI-PAD-001 offers no link to them", () => {
      setup({ platform: { ...FULL_PLATFORM, canListPlatformAdmins: false } });

      expect(screen.getByRole("link", { name: CREATE })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: PLATFORM_ADMINS })).not.toBeInTheDocument();
    });

    // A backend that predates the capability sends no key: a refusal.
    it("UI-PAD-001 offers no link to them when the backend does not report the capability", () => {
      loggedUser.current = buildCurrentUser({
        platformCapabilities: buildPlatformCapabilitiesWithout("canListPlatformAdmins", FULL_PLATFORM),
      });
      vi.mocked(useGetAllCommunities).mockReturnValue(query.success<typeof getAllCommunities>(COMMUNITIES));
      renderWithProviders(<PlatformPage />);

      expect(screen.queryByRole("link", { name: PLATFORM_ADMINS })).not.toBeInTheDocument();
    });
  });

  describe("a caller who may not create a community", () => {
    const platform = { ...FULL_PLATFORM, canCreateCommunity: false };

    it("offers no Crear comunidad", () => {
      setup({ platform });

      expect(screen.queryByRole("link", { name: CREATE })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: PLATFORM_ADMINS })).toBeInTheDocument();
    });

    // Inviting somebody to create one they may not create is an instruction they
    // can only fail to follow.
    it("states the empty list without inviting them to fix it", () => {
      setup({ platform, communities: [] });

      expect(screen.getByText("Aún no hay comunidades en la plataforma.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: CREATE })).not.toBeInTheDocument();
    });

    it("offers the empty-state action to a caller who may create one", () => {
      setup({ communities: [] });

      expect(screen.getByRole("button", { name: CREATE })).toBeInTheDocument();
    });
  });

  // Not yet known is not "no", and it is not "yes" either.
  describe("before the current user has arrived", () => {
    it("offers no quick action at all", () => {
      setup({ platform: null });

      expect(screen.queryByRole("link", { name: CREATE })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: PLATFORM_ADMINS })).not.toBeInTheDocument();
    });
  });
});
