import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildCurrentUser,
  buildMembership,
  buildMembershipCapabilities,
  buildPlatformCapabilities,
  buildUser,
} from "../../test/fixtures";
import type {
  CommunityCapabilitiesResponse,
  CommunityResponse,
  PlatformCapabilitiesResponse,
} from "../../api/models";

const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();
const mockCreateMutate = vi.fn().mockResolvedValue({});
const mockDeleteMutate = vi.fn().mockResolvedValue({});
const mockUpdateMutate = vi.fn().mockResolvedValue({});

/**
 * What a platform admin holds on a community they administer. canUpdate, canEnable
 * and canDisable are platform-wide decisions; canManageMemberships is allowed for
 * any platform admin who can see the community, which is every community.
 */
const PLATFORM_VIEW: Partial<CommunityCapabilitiesResponse> = {
  canRead: true,
  canUpdate: true,
  canEnable: true,
  canDisable: true,
  canManageMemberships: true,
};

/** What a community's own admin holds: the roster, but not the community record. */
const COMMUNITY_ADMIN_VIEW: Partial<CommunityCapabilitiesResponse> = {
  canRead: true,
  canUpdate: false,
  canManageMemberships: true,
};

const MOCK_ALL_USERS = {
  items: [
    buildUser({ id: "u1", fullName: "Ana García", email: "ana@example.com" }),
    buildUser({ id: "u2", fullName: "Bruno Leal", email: "bruno@example.com" }),
  ],
};

const MOCK_MEMBERSHIPS = [
  buildMembership({
    id: "m1",
    user: buildUser({ id: "u1", fullName: "Ana García", email: "ana@example.com" }),
    communityId: "c1",
    role: "COMMUNITY_ADMIN",
    enabled: true,
    capabilities: buildMembershipCapabilities({ canUpdateRole: true, canDelete: true }),
  }),
];

const community = (
  overrides: Partial<CommunityResponse>,
  capabilities: Partial<CommunityCapabilitiesResponse> = PLATFORM_VIEW,
): CommunityResponse =>
  buildCommunity({ ...overrides, capabilities: buildCommunityCapabilities(capabilities) });

const MOCK_COMMUNITIES = [
  community({
    id: "c1",
    name: "Sol Común",
    code: "SOL",
    legalId: "B12345678",
    address: "Calle Mayor 1",
    enabled: true,
    adminNames: ["Ana García", "Bruno Leal", "Carlos Ruiz"],
    memberCount: 25,
    supplyPointCount: 12,
  }),
  community({
    id: "c2",
    name: "Verde Activa",
    code: "VRD",
    legalId: undefined,
    address: undefined,
    enabled: false,
    adminNames: ["Diana Mora"],
    memberCount: 8,
    supplyPointCount: 4,
  }),
];

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

// Only the reads are replaced, plus the three membership mutations these tests
// assert the arguments of. The actions layer runs for real -- which is the point:
// what is under test is that each row's menu follows the capabilities on the
// payload. Spreading the original keeps the real query-key getters, which is what
// the layer invalidates with.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllCommunities: vi.fn(),
}));

vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMemberships: vi.fn(),
  useCreateMembership: vi.fn(),
  useDeleteMembership: vi.fn(),
  useUpdateMembershipRole: vi.fn(),
}));

vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllUsers: vi.fn(),
}));

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

const loggedUser = vi.hoisted(() => ({ current: null as ReturnType<typeof Object> | null }));

vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => loggedUser.current,
}));

import { useGetAllCommunities, type getAllCommunities } from "../../api/communities/communities";
import {
  getGetMembershipsQueryKey,
  useCreateMembership,
  useDeleteMembership,
  useGetMemberships,
  useUpdateMembershipRole,
  type getMemberships,
} from "../../api/memberships/memberships";
import { useGetAllUsers, type getAllUsers } from "../../api/users/users";
import { CommunitiesPage } from "./CommunitiesPage";

const menuFor = (name: string) => screen.getByRole("button", { name: `Más acciones para ${name}` });
const noMenuFor = (name: string) =>
  screen.queryByRole("button", { name: `Más acciones para ${name}` });

function setup(
  options: {
    communities?: CommunityResponse[];
    platform?: Partial<PlatformCapabilitiesResponse> | null;
    communitiesLoading?: boolean;
    memberships?: ReturnType<typeof buildMembership>[];
  } = {},
) {
  const {
    communities = MOCK_COMMUNITIES,
    platform = { canAdministerPlatform: true, canCreateCommunity: true },
    memberships = MOCK_MEMBERSHIPS,
  } = options;

  loggedUser.current =
    platform === null
      ? null
      : buildCurrentUser({ platformCapabilities: buildPlatformCapabilities(platform) });

  vi.mocked(useGetAllCommunities).mockReturnValue(
    options.communitiesLoading
      ? query.loading()
      : query.success<typeof getAllCommunities>(communities),
  );
  vi.mocked(useGetMemberships).mockReturnValue(query.success<typeof getMemberships>(memberships));

  return renderWithProviders(<CommunitiesPage />);
}

describe("CommunitiesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetAllUsers).mockReturnValue(query.success<typeof getAllUsers>(MOCK_ALL_USERS));
    vi.mocked(useCreateMembership).mockReturnValue(mutation.idle({ mutateAsync: mockCreateMutate }));
    vi.mocked(useDeleteMembership).mockReturnValue(mutation.idle({ mutateAsync: mockDeleteMutate }));
    vi.mocked(useUpdateMembershipRole).mockReturnValue(mutation.idle({ mutateAsync: mockUpdateMutate }));
  });

  it("renders community names and codes", () => {
    setup();
    expect(screen.getByText("Sol Común")).toBeInTheDocument();
    expect(screen.getByText("SOL")).toBeInTheDocument();
    expect(screen.getByText("Verde Activa")).toBeInTheDocument();
    expect(screen.getByText("VRD")).toBeInTheDocument();
  });

  it("shows first two admin names and 'y N más' overflow for Sol Común", () => {
    setup();
    expect(screen.getByText(/Ana García, Bruno Leal/)).toBeInTheDocument();
    expect(screen.getByText(/y 1 más/)).toBeInTheDocument();
  });

  it("shows single admin name without overflow for Verde Activa", () => {
    setup();
    expect(screen.getByText("Diana Mora")).toBeInTheDocument();
    expect(screen.queryByText(/y.*más/)).toBeInTheDocument(); // only for Sol Común
  });

  it("shows memberCount and supplyPointCount columns", () => {
    setup();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows status chips Activa / Inactiva", () => {
    setup();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("Inactiva")).toBeInTheDocument();
  });

  describe("creating a community", () => {
    it("offers Nueva Comunidad when the platform permits it", () => {
      setup();

      expect(screen.getByRole("link", { name: /Nueva Comunidad/i })).toHaveAttribute(
        "href",
        "/communities/new",
      );
    });

    it("offers nothing when it does not", () => {
      setup({ platform: { canAdministerPlatform: true, canCreateCommunity: false } });

      expect(screen.queryByRole("link", { name: /Nueva Comunidad/i })).not.toBeInTheDocument();
    });

    // Not yet known is not "no", and it is not "yes" either.
    it("offers nothing while the current user has not arrived", () => {
      setup({ platform: null });

      expect(screen.queryByRole("link", { name: /Nueva Comunidad/i })).not.toBeInTheDocument();
    });
  });

  describe("the row menu", () => {
    it("offers both items to a platform admin", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(menuFor("Sol Común"));

      expect(await screen.findByRole("menuitem", { name: /Editar/ })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /Gestionar administradores/ })).toBeInTheDocument();
    });

    // The two are genuinely different answers: canUpdate is a platform-wide
    // decision that being a community's admin does not confer, while the roster
    // is exactly what a community admin does administer.
    it("offers a community admin the roster but not the community record", async () => {
      const user = userEvent.setup();
      setup({ communities: [community({ id: "c1", name: "Sol Común" }, COMMUNITY_ADMIN_VIEW)] });

      await user.click(menuFor("Sol Común"));

      expect(
        await screen.findByRole("menuitem", { name: /Gestionar administradores/ }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: /Editar/ })).not.toBeInTheDocument();
    });

    it("gives a plain member no menu at all", () => {
      setup({ communities: [community({ id: "c1", name: "Sol Común" }, { canRead: true })] });

      expect(noMenuFor("Sol Común")).toBeNull();
    });

    // Every community carries its own answer, so a list may legitimately mix them.
    it("decides each row from its own community, not from the platform", () => {
      setup({
        communities: [
          community({ id: "c1", name: "Sol Común" }, PLATFORM_VIEW),
          community({ id: "c2", name: "Verde Activa" }, { canRead: true }),
        ],
      });

      expect(menuFor("Sol Común")).toBeInTheDocument();
      expect(noMenuFor("Verde Activa")).toBeNull();
    });

    it("offers nothing while the list has not loaded — not yet known is not 'no'", () => {
      setup({ communitiesLoading: true });

      expect(noMenuFor("Sol Común")).toBeNull();
    });

    it("navigates to /communities/:id/edit when Editar is chosen from the menu", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(menuFor("Sol Común"));
      await user.click(await screen.findByRole("menuitem", { name: /Editar/ }));

      expect(mockNavigate).toHaveBeenCalledWith("/communities/c1/edit");
    });
  });

  describe("managing administrators", () => {
    const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(menuFor("Sol Común"));
      await user.click(await screen.findByRole("menuitem", { name: /Gestionar administradores/ }));
      await waitFor(() => expect(screen.getByText("Administradores actuales")).toBeInTheDocument());
    };

    it("opens the dialog when the menu item is chosen", async () => {
      const user = userEvent.setup();
      setup();

      await openDialog(user);

      expect(screen.getAllByText("Sol Común").length).toBeGreaterThanOrEqual(1);
    });

    // The dialog is mounted inside the same gate as the item that opens it, so a
    // caller who was never given the roster has no way to reach it.
    it("is not reachable without canManageMemberships", async () => {
      const user = userEvent.setup();
      setup({
        communities: [community({ id: "c1", name: "Sol Común" }, { canRead: true, canUpdate: true })],
      });

      await user.click(menuFor("Sol Común"));

      expect(await screen.findByRole("menuitem", { name: /Editar/ })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: /Gestionar administradores/ })).not.toBeInTheDocument();
    });

    it("shows current admins and leaves them out of the picker", async () => {
      const user = userEvent.setup();
      setup();

      await openDialog(user);
      expect(screen.getByText("Ana García")).toBeInTheDocument();

      await user.click(screen.getByRole("combobox"));
      expect(await screen.findByRole("option", { name: "Bruno Leal" })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "Ana García" })).not.toBeInTheDocument();
    });

    it("assigns a new admin through the community's own action", async () => {
      const user = userEvent.setup();
      setup();

      await openDialog(user);
      await user.click(screen.getByRole("combobox"));
      await user.click(await screen.findByRole("option", { name: "Bruno Leal" }));
      await user.click(screen.getByRole("button", { name: /Asignar/i }));

      await waitFor(() =>
        expect(mockCreateMutate).toHaveBeenCalledWith({
          communityId: "c1",
          data: { userId: "u2", role: "COMMUNITY_ADMIN" },
        }),
      );
    });

    // Adding somebody who is not in the community is the community's
    // canManageMemberships; promoting somebody already in it is that membership's
    // canUpdateRole. A candidate the backend would refuse is left out rather than
    // offered and refused on submit.
    it("leaves out an existing member whose membership refuses a role change", async () => {
      const user = userEvent.setup();
      setup({
        memberships: [
          ...MOCK_MEMBERSHIPS,
          buildMembership({
            id: "m2",
            user: buildUser({ id: "u2", fullName: "Bruno Leal", email: "bruno@example.com" }),
            communityId: "c1",
            role: "COMMUNITY_MEMBER",
            capabilities: buildMembershipCapabilities({ canUpdateRole: false }),
          }),
        ],
      });

      await openDialog(user);

      // Nobody is assignable, so the whole section goes rather than offering an
      // empty picker.
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Asignar/i })).not.toBeInTheDocument();
    });

    it("promotes an existing member through that membership's own action", async () => {
      const user = userEvent.setup();
      setup({
        memberships: [
          ...MOCK_MEMBERSHIPS,
          buildMembership({
            id: "m2",
            user: buildUser({ id: "u2", fullName: "Bruno Leal", email: "bruno@example.com" }),
            communityId: "c1",
            role: "COMMUNITY_MEMBER",
            capabilities: buildMembershipCapabilities({ canUpdateRole: true }),
          }),
        ],
      });

      await openDialog(user);
      await user.click(screen.getByRole("combobox"));
      await user.click(await screen.findByRole("option", { name: "Bruno Leal" }));
      await user.click(screen.getByRole("button", { name: /Asignar/i }));

      await waitFor(() =>
        expect(mockUpdateMutate).toHaveBeenCalledWith({
          communityId: "c1",
          userId: "u2",
          data: { role: "COMMUNITY_ADMIN" },
        }),
      );
      expect(mockCreateMutate).not.toHaveBeenCalled();
    });

    it("offers no removal on an administrator whose membership refuses it", async () => {
      const user = userEvent.setup();
      setup({
        memberships: [
          buildMembership({
            ...MOCK_MEMBERSHIPS[0],
            capabilities: buildMembershipCapabilities({ canDelete: false }),
          }),
        ],
      });

      await openDialog(user);

      expect(
        screen.queryByRole("button", { name: /Eliminar administrador Ana García/ }),
      ).not.toBeInTheDocument();
    });

    // Removing an administrator used to happen on the first click, with nothing
    // in between.
    it("asks before removing an administrator, and removes on confirmation", async () => {
      const user = userEvent.setup();
      const { queryClient } = setup();
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await openDialog(user);
      await user.click(screen.getByRole("button", { name: /Eliminar administrador Ana García/ }));

      expect(await screen.findByText("Confirmar eliminación")).toBeInTheDocument();
      expect(mockDeleteMutate).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Eliminar" }));

      await waitFor(() =>
        expect(mockDeleteMutate).toHaveBeenCalledWith({ communityId: "c1", userId: "u1" }),
      );
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetMembershipsQueryKey("c1") });
    });

    it("removes nothing when the confirmation is dismissed", async () => {
      const user = userEvent.setup();
      setup();

      await openDialog(user);
      await user.click(screen.getByRole("button", { name: /Eliminar administrador Ana García/ }));
      await user.click(await screen.findByRole("button", { name: "Cancelar" }));

      expect(mockDeleteMutate).not.toHaveBeenCalled();
    });
  });
});
