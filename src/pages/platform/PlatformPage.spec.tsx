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
} from "../../test/fixtures";
import type { CommunityResponse, PlatformCapabilitiesResponse } from "../../api/models";

// Only the reads are replaced. The page performs no write, so the whole gate --
// usePlatformActions over usePlatformCapabilities -- runs for real.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllCommunities: vi.fn(),
}));

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
import { useGetAllUsers, type getAllUsers } from "../../api/users/users";
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
const MANAGE_USERS = /Gestionar usuarios/i;
const GRANT_ADMIN = /Otorgar admin/i;

describe("PlatformPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetAllUsers).mockReturnValue(
      // Not a number any community fixture also carries: this page renders the
      // preview twice (a table and a stacked list, one hidden by CSS), so a
      // colliding value would match in four places.
      query.success<typeof getAllUsers>({ items: [], totalElements: 137 }),
    );
  });

  it("shows the community preview whatever else it offers", () => {
    setup();

    // Rendered in both the table and the stacked list, one hidden by CSS.
    expect(screen.getAllByText("Sol Común").length).toBeGreaterThan(0);
  });

  describe("a platform admin who holds everything", () => {
    it("offers all three quick actions", () => {
      setup();

      expect(screen.getByRole("link", { name: CREATE })).toHaveAttribute("href", "/communities/new");
      expect(screen.getByRole("link", { name: MANAGE_USERS })).toHaveAttribute("href", "/users");
      expect(screen.getByRole("link", { name: GRANT_ADMIN })).toHaveAttribute("href", "/users");
    });

    it("shows the Usuarios KPI with the count", () => {
      setup();

      expect(screen.getByText("Usuarios")).toBeInTheDocument();
      expect(screen.getByText("137")).toBeInTheDocument();
    });
  });

  // Each quick action leads somewhere the router gates, so offering one that
  // redirects home is worse than offering nothing.
  describe("a caller who may not list users", () => {
    const platform = { ...FULL_PLATFORM, canListUsers: false };

    it("offers neither of the two actions that lead to /users", () => {
      setup({ platform });

      expect(screen.getByRole("link", { name: CREATE })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: MANAGE_USERS })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: GRANT_ADMIN })).not.toBeInTheDocument();
    });

    it("drops the Usuarios KPI, which is the answer to a question they may not ask", () => {
      setup({ platform });

      expect(screen.queryByText("Usuarios")).not.toBeInTheDocument();
    });

    // The page used to fire the request regardless and read its 403 back off
    // isError to hide the KPI. That made a refused request part of how the page
    // decided what to render, and could not tell a refusal from a network failure.
    it("does not ask for the users page at all", () => {
      setup({ platform });

      expect(vi.mocked(useGetAllUsers)).toHaveBeenCalledWith({ size: 1 }, { query: { enabled: false } });
    });
  });

  describe("a caller who may not create a community", () => {
    const platform = { ...FULL_PLATFORM, canCreateCommunity: false };

    it("offers no Crear comunidad", () => {
      setup({ platform });

      expect(screen.queryByRole("link", { name: CREATE })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: MANAGE_USERS })).toBeInTheDocument();
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
      expect(screen.queryByRole("link", { name: MANAGE_USERS })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: GRANT_ADMIN })).not.toBeInTheDocument();
      expect(screen.queryByText("Usuarios")).not.toBeInTheDocument();
    });
  });
});
