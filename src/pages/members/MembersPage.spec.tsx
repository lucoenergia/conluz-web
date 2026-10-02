import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import userEvent from "@testing-library/user-event";
import type { QueryClient } from "@tanstack/react-query";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildMembership,
  buildMembershipCapabilities,
  buildUser,
  buildUserCapabilities,
} from "../../test/fixtures";
import type { MembershipResponse } from "../../api/models";
import type { CommunityCapabilitiesResponse } from "../../api/models";

const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();
const mockCreateMutate = vi.fn().mockResolvedValue({});
const mockDeleteMutate = vi.fn().mockResolvedValue({});
const mockUpdateMutate = vi.fn().mockResolvedValue({});

// The builders deny every capability by default, so a fixture that says nothing
// asks for a row the caller may do nothing with. These tests are all about what
// an administrator of the community can do, so each row names the capabilities
// that let it: the page does not read them yet, and will.
const ADMINISTRABLE = buildMembershipCapabilities({
  canUpdateRole: true,
  canDelete: true,
  canManageInvestment: true,
  canReadPayback: true,
});

// "Puntos de suministro" is the member's own supplies, not the membership's, so
// it is the USER that carries its answer.
const member = (id: string, fullName: string, email: string) =>
  buildUser({
    id,
    fullName,
    email,
    capabilities: buildUserCapabilities({ canRead: true, canListSupplies: true }),
  });

const MOCK_MEMBERSHIPS = [
  buildMembership({
    id: "m1",
    user: member("u1", "Ana García", "ana@example.com"),
    communityId: "c1",
    role: "COMMUNITY_MEMBER",
    enabled: true,
    capabilities: ADMINISTRABLE,
  }),
  buildMembership({
    id: "m2",
    user: member("u2", "Bruno Leal", "bruno@example.com"),
    communityId: "c1",
    role: "COMMUNITY_ADMIN",
    enabled: true,
    capabilities: ADMINISTRABLE,
  }),
];

const MOCK_ALL_USERS = {
  items: [
    buildUser({ id: "u1", fullName: "Ana García", email: "ana@example.com", enabled: true }),
    buildUser({ id: "u2", fullName: "Bruno Leal", email: "bruno@example.com", enabled: true }),
    buildUser({ id: "u3", fullName: "Carlos Ruiz", email: "carlos@example.com", enabled: true }),
  ],
};

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

// Only the reads are replaced, plus the three mutations these tests assert the
// arguments of. The actions layer runs for real -- which is the point: what is
// under test is that the toolbar and each row menu follow the capabilities on
// the payload, and stubbing the action hooks would mean restating that rule in
// the test instead of exercising it. Everything else the layer instantiates is
// inert until called, so leaving it real reaches no network.
vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMemberships: vi.fn(),
  useCreateMembership: vi.fn(),
  useDeleteMembership: vi.fn(),
  useUpdateMembershipRole: vi.fn(),
}));

// useActiveCommunityResource reads this one, and it is what carries the
// community-level answers the toolbar is built from.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));

vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllUsers: vi.fn(),
}));

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock("../../components/Modals/ImportPartnersModal", () => ({
  ImportPartnersModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>Import modal</div> : null,
}));

import {
  getGetAllCommunitiesQueryKey,
  getCommunityById,
  useGetCommunityById,
} from "../../api/communities/communities";
import {
  getGetMembershipsQueryKey,
  getMemberships,
  useCreateMembership,
  useDeleteMembership,
  useGetMemberships,
  useUpdateMembershipRole,
} from "../../api/memberships/memberships";
import { getAllUsers, getGetCurrentUserQueryKey, useGetAllUsers } from "../../api/users/users";
import { MembersPage } from "./MembersPage";

const ADMIN_COMMUNITY: Partial<CommunityCapabilitiesResponse> = {
  canManageMemberships: true,
  canCreateUsers: true,
};

describe("MembersPage", () => {
  let mockInvalidateQueries: MockInstance<QueryClient["invalidateQueries"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetAllUsers).mockReturnValue(query.success<typeof getAllUsers>(MOCK_ALL_USERS));
    vi.mocked(useCreateMembership).mockReturnValue(mutation.idle({ mutateAsync: mockCreateMutate }));
    vi.mocked(useDeleteMembership).mockReturnValue(mutation.idle({ mutateAsync: mockDeleteMutate }));
    vi.mocked(useUpdateMembershipRole).mockReturnValue(mutation.idle({ mutateAsync: mockUpdateMutate }));
  });

  // Invalidation is observed on the real QueryClient the harness creates.
  const setup = (
    options: {
      community?: Partial<CommunityCapabilitiesResponse>;
      memberships?: MembershipResponse[];
      communityLoading?: boolean;
    } = {},
  ) => {
    const { community = ADMIN_COMMUNITY, memberships = MOCK_MEMBERSHIPS, communityLoading = false } = options;

    vi.mocked(useGetCommunityById).mockReturnValue(
      communityLoading
        ? query.loading()
        : query.success<typeof getCommunityById>(
            buildCommunity({
              id: "c1",
              capabilities: buildCommunityCapabilities({ canRead: true, ...community }),
            }),
          ),
    );
    vi.mocked(useGetMemberships).mockReturnValue(query.success<typeof getMemberships>(memberships));

    const rendered = renderWithProviders(<MembersPage />, { activeCommunityId: "c1" });
    mockInvalidateQueries = vi.spyOn(rendered.queryClient, "invalidateQueries");
    return rendered;
  };

  it("renders census with fullName and email from membership.user", () => {
    setup();
    expect(screen.getByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("Bruno Leal")).toBeInTheDocument();
    expect(screen.getByText("bruno@example.com")).toBeInTheDocument();
  });

  it("renders role column with text labels for each member", () => {
    setup();
    // "Miembro" also appears as the column header, so scope the role label
    // assertions to each member's row to avoid ambiguity.
    const anaRow = screen.getByText("Ana García").closest("tr") as HTMLElement;
    const brunoRow = screen.getByText("Bruno Leal").closest("tr") as HTMLElement;
    expect(within(anaRow).getByText("Miembro")).toBeInTheDocument();
    expect(within(brunoRow).getByText("Administrador")).toBeInTheDocument();
  });

  it("add dialog offers only non-members (Carlos but not Ana/Bruno)", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByText("Añadir miembro"));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    const dialog = screen.getByRole("dialog");
    // Open first combobox (user picker) inside the dialog
    const comboboxes = within(dialog).getAllByRole("combobox");
    await user.click(comboboxes[0]);

    await waitFor(() => {
      expect(screen.getByText("Carlos Ruiz (carlos@example.com)")).toBeInTheDocument();
    });
    expect(screen.queryByText("Ana García (ana@example.com)")).not.toBeInTheDocument();
    expect(screen.queryByText("Bruno Leal (bruno@example.com)")).not.toBeInTheDocument();
  });

  it("add dialog calls createMembership and invalidates queries on submit", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByText("Añadir miembro"));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    const dialog = screen.getByRole("dialog");
    const comboboxes = within(dialog).getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await waitFor(() => screen.getByText("Carlos Ruiz (carlos@example.com)"));
    await user.click(screen.getByText("Carlos Ruiz (carlos@example.com)"));

    await user.click(within(dialog).getByRole("button", { name: "Añadir" }));

    await waitFor(() =>
      expect(mockCreateMutate).toHaveBeenCalledWith({
        communityId: "c1",
        data: { userId: "u3", role: "COMMUNITY_MEMBER" },
      }),
    );
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: getGetMembershipsQueryKey("c1") });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllCommunitiesQueryKey() });
    // The third key: the membership changed may be the caller's own, and their
    // memberships live on the current user (#203).
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: getGetCurrentUserQueryKey() });
  });

  it("row menu opens confirmation dialog with member name on Eliminar", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Más acciones para Ana García" }));

    const eliminarMenuItem = await screen.findByRole("menuitem", { name: /Eliminar/ });
    await user.click(eliminarMenuItem);

    await waitFor(() => expect(screen.getByText("Confirmar eliminación")).toBeInTheDocument());
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Ana García/)).toBeInTheDocument();
  });

  it("confirm remove calls deleteMembership and invalidates queries", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Más acciones para Ana García" }));

    const eliminarMenuItem = await screen.findByRole("menuitem", { name: /Eliminar/ });
    await user.click(eliminarMenuItem);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() =>
      expect(mockDeleteMutate).toHaveBeenCalledWith({ communityId: "c1", userId: "u1" }),
    );
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: getGetMembershipsQueryKey("c1") });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllCommunitiesQueryKey() });
    // The third key: the membership changed may be the caller's own, and their
    // memberships live on the current user (#203).
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: getGetCurrentUserQueryKey() });
  });

  it("role change modal calls updateRole with new role and invalidates queries", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Más acciones para Ana García" }));

    const cambiarRolItem = await screen.findByRole("menuitem", { name: /Cambiar rol/ });
    await user.click(cambiarRolItem);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    const dialog = screen.getByRole("dialog");

    // Open the role select inside the dialog and pick Administrador
    const combobox = within(dialog).getByRole("combobox");
    await user.click(combobox);
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("Administrador"));

    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(mockUpdateMutate).toHaveBeenCalledWith({
        communityId: "c1",
        userId: "u1",
        data: { role: "COMMUNITY_ADMIN" },
      }),
    );
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: getGetMembershipsQueryKey("c1") });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllCommunitiesQueryKey() });
    // The third key: the membership changed may be the caller's own, and their
    // memberships live on the current user (#203).
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: getGetCurrentUserQueryKey() });
  });
  describe("an admin of the community", () => {
    it("is offered both ways to bring a member in", () => {
      setup();

      expect(screen.getByRole("button", { name: "Añadir miembro" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Importar miembros" })).toBeInTheDocument();
    });

    it("gets every row action the backend granted on the row", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(screen.getByRole("button", { name: "Más acciones para Ana García" }));

      expect(await screen.findByRole("menuitem", { name: /Puntos de suministro/ })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /Cambiar rol/ })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /Eliminar/ })).toBeInTheDocument();
    });
  });

  describe("a caller who may see the roster but change nothing", () => {
    const READ_ONLY = [
      buildMembership({
        id: "m1",
        user: buildUser({ id: "u1", fullName: "Ana García", email: "ana@example.com" }),
        communityId: "c1",
        role: "COMMUNITY_MEMBER",
        enabled: true,
      }),
    ];

    it("is offered no way to add or import", () => {
      setup({ community: { canManageMemberships: false, canCreateUsers: false }, memberships: READ_ONLY });

      expect(screen.queryByRole("button", { name: "Añadir miembro" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Importar miembros" })).not.toBeInTheDocument();
    });

    it("gets a row with no menu at all, rather than a menu with nothing in it", () => {
      setup({ community: { canManageMemberships: false, canCreateUsers: false }, memberships: READ_ONLY });

      expect(screen.getByText("Ana García")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Más acciones para Ana García" })).not.toBeInTheDocument();
    });
  });

  describe("a platform admin who is not a member of this community", () => {
    it("gets nothing, because the flag is not a grant over a community's roster", () => {
      // canManageMembershipInvestment's doc puts it plainly for the money; the
      // roster is the same shape of answer. Only what the backend said is read.
      setup({ community: { canManageMemberships: false, canCreateUsers: false }, memberships: [] });

      expect(screen.queryByRole("button", { name: "Añadir miembro" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Importar miembros" })).not.toBeInTheDocument();
    });
  });

  it("decides each row from its own membership, not from the community", async () => {
    const user = userEvent.setup();
    setup({
      memberships: [
        buildMembership({
          id: "m1",
          user: member("u1", "Ana García", "ana@example.com"),
          communityId: "c1",
          role: "COMMUNITY_MEMBER",
          enabled: true,
          capabilities: buildMembershipCapabilities({ canDelete: true }),
        }),
        buildMembership({
          id: "m2",
          user: buildUser({ id: "u2", fullName: "Bruno Leal", email: "bruno@example.com" }),
          communityId: "c1",
          role: "COMMUNITY_ADMIN",
          enabled: true,
        }),
      ],
    });

    // Bruno's row carries no capability at all, so it loses its menu even
    // though the caller may administer the roster as a whole.
    expect(screen.queryByRole("button", { name: "Más acciones para Bruno Leal" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Más acciones para Ana García" }));

    expect(await screen.findByRole("menuitem", { name: /Eliminar/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Cambiar rol/ })).not.toBeInTheDocument();
  });

  it("reads the caller's own row like any other -- the answer is the backend's", async () => {
    const user = userEvent.setup();
    setup({
      memberships: [
        buildMembership({
          id: "m1",
          user: member("u1", "Ana García", "ana@example.com"),
          communityId: "c1",
          role: "COMMUNITY_ADMIN",
          enabled: true,
          // What the backend answers for an admin looking at themselves: they
          // may still be re-roled by a peer, but not removed by themselves.
          capabilities: buildMembershipCapabilities({ canUpdateRole: true, canDelete: false }),
        }),
      ],
    });

    await user.click(screen.getByRole("button", { name: "Más acciones para Ana García" }));

    expect(await screen.findByRole("menuitem", { name: /Cambiar rol/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Eliminar/ })).not.toBeInTheDocument();
  });

  it("offers nothing while the community has not loaded -- not yet known is not 'no'", () => {
    // The rows are deliberately permissive, so the only unresolved answer is
    // the community's.
    setup({ communityLoading: true });

    expect(screen.queryByRole("button", { name: "Añadir miembro" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Importar miembros" })).not.toBeInTheDocument();
  });
});
