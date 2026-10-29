import "@testing-library/jest-dom";
import { act, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import userEvent from "@testing-library/user-event";
import type { QueryClient } from "@tanstack/react-query";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildCurrentUser,
  buildMembership,
  buildMembershipCapabilities,
} from "../../test/fixtures";
import type { MembershipResponse } from "../../api/models";
import type { CommunityCapabilitiesResponse } from "../../api/models";

const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();
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
  canListSupplies: true,
});

// A roster row carries the community's record at its top level and its user by
// id only (lucoenergia/conluz#448).
const member = (id: string, fullName: string, email: string) => ({ user: { id }, fullName, contactEmail: email });

// "Puntos de suministro" is decided apart from the roster rights, so a row that
// offers it carries canListSupplies on its own.
const SUPPLIES = { canListSupplies: true };

const MOCK_MEMBERSHIPS = [
  buildMembership({
    id: "m1",
    ...member("u1", "Ana García", "ana@example.com"),
    communityId: "c1",
    role: "COMMUNITY_MEMBER",
    enabled: true,
    capabilities: ADMINISTRABLE,
  }),
  buildMembership({
    id: "m2",
    ...member("u2", "Bruno Leal", "bruno@example.com"),
    communityId: "c1",
    role: "COMMUNITY_ADMIN",
    enabled: true,
    capabilities: ADMINISTRABLE,
  }),
];

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

// Only the reads are replaced, plus the two mutations these tests assert the
// arguments of. The actions layer runs for real -- which is the point: what is
// under test is that the toolbar and each row menu follow the capabilities on
// the payload, and stubbing the action hooks would mean restating that rule in
// the test instead of exercising it. Everything else the layer instantiates is
// inert until called, so leaving it real reaches no network.
vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMemberships: vi.fn(),
  useDeleteMembership: vi.fn(),
  useUpdateMembershipRole: vi.fn(),
}));

// useActiveCommunityResource reads this one, and it is what carries the
// community-level answers the toolbar is built from. useGetAllCommunities is
// what names the community in the confirming dialogs (#186).
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
  useGetAllCommunities: vi.fn(),
}));

// The community name is resolved from the caller's own memberships, so the
// dialogs can state which community they are about to write into.
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () =>
    buildCurrentUser({ id: "admin", memberships: { c1: "COMMUNITY_ADMIN", c2: "COMMUNITY_MEMBER" } }),
}));

const COMMUNITY_NAME = "Comunidad Solar Norte";

/** The confirming dialog names the community in its header line and in its title (#186). */
function expectNamesTheCommunity(dialog: HTMLElement, title: string) {
  expect(dialog).toHaveAccessibleName(title);
  expect(within(dialog).getByRole("heading", { name: title })).toBeInTheDocument();
  expect(within(dialog).getByText(`Comunidad · ${COMMUNITY_NAME}`)).toBeInTheDocument();
}

// useGetSuppliesByUserId is read by the harness's real CommunityProvider, for the
// first-time rule (#237). The community is seeded here, so the provider's own
// choice is never what the page sees; its read is left unanswered.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
}));

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

import {
  getAllCommunities,
  getGetAllCommunitiesQueryKey,
  getCommunityById,
  useGetAllCommunities,
  useGetCommunityById,
} from "../../api/communities/communities";
import {
  getGetMembershipsQueryKey,
  getMemberships,
  useDeleteMembership,
  useGetMemberships,
  useUpdateMembershipRole,
} from "../../api/memberships/memberships";
import { getGetCurrentUserQueryKey, useGetSuppliesByUserId } from "../../api/users/users";
import { MembersPage } from "./MembersPage";
import { useActiveCommunity } from "../../context/community.context";

const ADMIN_COMMUNITY: Partial<CommunityCapabilitiesResponse> = {
  canManageMemberships: true,
  canRegisterMembers: true,
  canInviteMembers: true,
};

describe("MembersPage", () => {
  let mockInvalidateQueries: MockInstance<QueryClient["invalidateQueries"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.disabled());
    vi.mocked(useDeleteMembership).mockReturnValue(mutation.idle({ mutateAsync: mockDeleteMutate }));
    vi.mocked(useUpdateMembershipRole).mockReturnValue(mutation.idle({ mutateAsync: mockUpdateMutate }));
    vi.mocked(useGetAllCommunities).mockReturnValue(
      query.success<typeof getAllCommunities>([
        buildCommunity({ id: "c1", name: COMMUNITY_NAME }),
        buildCommunity({ id: "c2", name: "Comunidad Sur" }),
      ]),
    );
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

  it("renders census with the name and contact email of the membership's record", () => {
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

  it("row menu opens confirmation dialog with member name on Eliminar", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Más acciones para Ana García" }));

    const eliminarMenuItem = await screen.findByRole("menuitem", { name: /Eliminar/ });
    await user.click(eliminarMenuItem);

    const dialog = await screen.findByRole("dialog");
    expectNamesTheCommunity(dialog, `Eliminar miembro de ${COMMUNITY_NAME}`);
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
    expectNamesTheCommunity(dialog, `Cambiar rol en ${COMMUNITY_NAME}`);

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
    it("is offered both ways to bring a member in, and the bulk send", () => {
      setup();

      expect(screen.getByRole("button", { name: "Registrar miembro" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Importar miembros" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Enviar invitaciones pendientes" })).toBeInTheDocument();
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
        user: { id: "u1" },
        fullName: "Ana García",
        contactEmail: "ana@example.com",
        communityId: "c1",
        role: "COMMUNITY_MEMBER",
        enabled: true,
      }),
    ];

    it("is offered no way to add or import", () => {
      setup({ community: { canManageMemberships: false }, memberships: READ_ONLY });

      expect(screen.queryByRole("button", { name: "Registrar miembro" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Enviar invitaciones pendientes" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Importar miembros" })).not.toBeInTheDocument();
    });

    it("gets a row with no menu at all, rather than a menu with nothing in it", () => {
      setup({ community: { canManageMemberships: false }, memberships: READ_ONLY });

      expect(screen.getByText("Ana García")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Más acciones para Ana García" })).not.toBeInTheDocument();
    });
  });

  describe("a platform admin who is not a member of this community", () => {
    it("gets nothing, because the flag is not a grant over a community's roster", () => {
      // canManageMembershipInvestment's doc puts it plainly for the money; the
      // roster is the same shape of answer. Only what the backend said is read.
      setup({ community: { canManageMemberships: false }, memberships: [] });

      expect(screen.queryByRole("button", { name: "Registrar miembro" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Enviar invitaciones pendientes" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Importar miembros" })).not.toBeInTheDocument();
    });
  });

  it("decides each row from its own membership, not from the community", async () => {
    const user = userEvent.setup();
    setup({
      memberships: [
        buildMembership({
          id: "m1",
          ...member("u1", "Ana García", "ana@example.com"),
          communityId: "c1",
          role: "COMMUNITY_MEMBER",
          enabled: true,
          capabilities: buildMembershipCapabilities({ canDelete: true, ...SUPPLIES }),
        }),
        buildMembership({
          id: "m2",
          user: { id: "u2" },
          fullName: "Bruno Leal",
          contactEmail: "bruno@example.com",
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
          ...member("u1", "Ana García", "ana@example.com"),
          communityId: "c1",
          role: "COMMUNITY_ADMIN",
          enabled: true,
          // What the backend answers for an admin looking at themselves: they
          // may still be re-roled by a peer, but not removed by themselves.
          capabilities: buildMembershipCapabilities({ canUpdateRole: true, canDelete: false, ...SUPPLIES }),
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

    expect(screen.queryByRole("button", { name: "Registrar miembro" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar invitaciones pendientes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Importar miembros" })).not.toBeInTheDocument();
  });

  describe("the member record edit and the suspension (#272)", () => {
    const row = (overrides: Partial<MembershipResponse> & Pick<MembershipResponse, "id" | "user">) =>
      buildMembership({ communityId: "c1", role: "COMMUNITY_MEMBER", enabled: true, ...overrides });
    const openMenuFor = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
      await user.click(screen.getByRole("button", { name: `Más acciones para ${name}` }));
      return screen.findByRole("menu");
    };
    const NEW_ACTIONS = /Editar ficha|Suspender|Reactivar/;

    it.each([
      // A platform admin who is not an admin of the community, and a plain
      // member: the backend grants neither any of the three.
      ["a platform admin", buildMembershipCapabilities({ canReadPayback: true })],
      ["a plain member", buildMembershipCapabilities({ canReadPayback: true })],
    ])("UI-MBR-001 offers %s neither the record edit nor the suspension", async (_caller, capabilities) => {
      const user = userEvent.setup();
      setup({
        community: { canManageMemberships: false },
        memberships: [
          row({ id: "m1", ...member("u1", "Ana García", "ana@example.com"), capabilities: { ...capabilities, ...SUPPLIES } }),
        ],
      });

      // The supply list is decided apart from the roster rights, so the row keeps a menu.
      const menu = await openMenuFor(user, "Ana García");
      expect(within(menu).getByRole("menuitem", { name: /Puntos de suministro/ })).toBeInTheDocument();
      expect(within(menu).queryByRole("menuitem", { name: NEW_ACTIONS })).not.toBeInTheDocument();
    });

    it("UI-MBR-001 offers the record edit from canEditRecord alone, on any role, the caller's own row included", async () => {
      const user = userEvent.setup();
      setup({
        memberships: [
          row({
            id: "m1",
            user: { id: "admin" },
            fullName: "Ada Admin",
            contactEmail: "ada@example.com",
            role: "COMMUNITY_ADMIN",
            acceptedAt: null,
            capabilities: buildMembershipCapabilities({ canEditRecord: true }),
          }),
        ],
      });

      const menu = await openMenuFor(user, "Ada Admin");
      expect(within(menu).getByRole("menuitem", { name: /Editar ficha/ })).toBeInTheDocument();
      // canEditRecord says nothing about suspending.
      expect(within(menu).queryByRole("menuitem", { name: /Suspender|Reactivar/ })).not.toBeInTheDocument();
    });

    it("UI-MBR-005 offers Suspender on an active row and Reactivar on a suspended one, never both", async () => {
      const user = userEvent.setup();
      const both = buildMembershipCapabilities({ canEnable: true, canDisable: true, ...SUPPLIES });
      setup({
        memberships: [
          row({ id: "m1", ...member("u1", "Ana García", "ana@example.com"), enabled: true, capabilities: both }),
          row({ id: "m2", ...member("u2", "Bruno Leal", "bruno@example.com"), enabled: false, capabilities: both }),
        ],
      });

      let menu = await openMenuFor(user, "Ana García");
      expect(within(menu).getByRole("menuitem", { name: /Suspender/ })).toBeInTheDocument();
      expect(within(menu).queryByRole("menuitem", { name: /Reactivar/ })).not.toBeInTheDocument();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());

      menu = await openMenuFor(user, "Bruno Leal");
      expect(within(menu).getByRole("menuitem", { name: /Reactivar/ })).toBeInTheDocument();
      expect(within(menu).queryByRole("menuitem", { name: /Suspender/ })).not.toBeInTheDocument();
    });

    it.each([
      ["an active row without canDisable", true, { canEnable: true }],
      ["a suspended row without canEnable", false, { canDisable: true }],
    ])("UI-MBR-005 offers no toggle on %s", async (_case, enabled, capabilities) => {
      const user = userEvent.setup();
      setup({
        memberships: [
          row({
            id: "m1",
            ...member("u1", "Ana García", "ana@example.com"),
            enabled,
            capabilities: buildMembershipCapabilities({ ...capabilities, ...SUPPLIES }),
          }),
        ],
      });

      const menu = await openMenuFor(user, "Ana García");
      expect(within(menu).queryByRole("menuitem", { name: /Suspender|Reactivar/ })).not.toBeInTheDocument();
    });

    it("UI-MBR-006 shows a suspended membership as Suspendido", () => {
      setup({
        memberships: [row({ id: "m1", ...member("u1", "Ana García", "ana@example.com"), enabled: false })],
      });

      const anaRow = screen.getByText("Ana García").closest("tr") as HTMLElement;
      expect(within(anaRow).getByText("Suspendido")).toBeInTheDocument();
    });

    it("never leads a community admin to the account edit screen", async () => {
      const user = userEvent.setup();
      setup({
        memberships: [
          row({
            id: "m1",
            ...member("u1", "Ana García", "ana@example.com"),
            capabilities: buildMembershipCapabilities({ canEditRecord: true, canEnable: true, canDisable: true, ...SUPPLIES }),
          }),
        ],
      });

      await openMenuFor(user, "Ana García");
      await user.click(screen.getByRole("menuitem", { name: /Editar ficha/ }));

      expect(await screen.findByRole("dialog", { name: `Editar ficha en ${COMMUNITY_NAME}` })).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringMatching(/^\/users\/.*\/edit$/));
    });
  });

  describe("a member without email (#272)", () => {
    it("UI-MBR-007 shows the name alone in the roster", () => {
      setup({
        memberships: [
          buildMembership({
            id: "m1",
            user: { id: "u1" },
            fullName: "Ana García",
            contactEmail: null,
            communityId: "c1",
            enabled: true,
          }),
        ],
      });

      const cell = screen.getByText("Ana García").parentElement as HTMLElement;
      expect(cell).toHaveTextContent(/^Ana García$/);
    });
  });
  describe("pending members and their invitations (#275)", () => {
    const INVITER = buildMembershipCapabilities({ canInvite: true });
    const pending = (
      id: string,
      fullName: string,
      overrides: Partial<MembershipResponse> = {},
    ): MembershipResponse =>
      buildMembership({
        id: `m-${id}`,
        // No canListSupplies, so a row's menu holds only membership writes.
        user: { id },
        fullName,
        contactEmail: `${id}@example.com`,
        communityId: "c1",
        role: "COMMUNITY_MEMBER",
        enabled: true,
        acceptedAt: null,
        invitedAt: null,
        invitationExpiresAt: null,
        capabilities: INVITER,
        ...overrides,
      });

    /** One row per state the roster tells apart, every one inviting. */
    const ROSTER = [
      pending("never", "Nadia Nueva"),
      pending("linked", "Lucas Enlace", {
        invitedAt: "2026-10-01T10:00:00Z",
        invitationExpiresAt: "2026-10-08T10:00:00Z",
      }),
      pending("lapsed", "Elena Caducada", { invitedAt: "2026-09-01T10:00:00Z" }),
      pending("active", "Andrés Activo", { acceptedAt: "2026-02-01T10:00:00Z", invitedAt: "2026-01-25T10:00:00Z" }),
      pending("suspended", "Sara Suspendida", { acceptedAt: "2026-02-01T10:00:00Z", enabled: false }),
      pending("suspended-pending", "Pablo Pausado", {
        enabled: false,
        invitedAt: "2026-10-01T10:00:00Z",
        invitationExpiresAt: "2026-10-08T10:00:00Z",
      }),
    ];

    const rowOf = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;

    const menuItemsFor = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
      await user.click(screen.getByRole("button", { name: `Más acciones para ${name}` }));
      const menu = await screen.findByRole("menu");
      const items = within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent);
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
      return items;
    };

    it("UI-MBR-010 UI-MBR-030 tells active, pending and suspended apart, a pending row by its sub-status", () => {
      setup({ memberships: ROSTER });

      expect(within(rowOf("Nadia Nueva")).getByText("Sin invitar")).toBeInTheDocument();
      expect(within(rowOf("Lucas Enlace")).getByText("Invitación enviada")).toBeInTheDocument();
      expect(within(rowOf("Elena Caducada")).getByText("Invitación caducada o revocada")).toBeInTheDocument();
      expect(within(rowOf("Andrés Activo")).getByText("Activo")).toBeInTheDocument();
      expect(within(rowOf("Sara Suspendida")).getByText("Suspendido")).toBeInTheDocument();
      // Suspended wins over a pending membership's usable link.
      expect(within(rowOf("Pablo Pausado")).getByText("Suspendido")).toBeInTheDocument();
      expect(within(rowOf("Pablo Pausado")).queryByText("Invitación enviada")).not.toBeInTheDocument();
    });

    it("UI-MBR-010 counts as active only the accepted, enabled members", () => {
      setup({ memberships: ROSTER });

      const activeFact = screen.getByText("Activos").parentElement as HTMLElement;
      expect(activeFact).toHaveTextContent(/^Activos\s*1$/);
    });

    it("UI-MBR-030 shows a pending row's sub-status and no link caption", () => {
      setup({ memberships: [...ROSTER, pending("no-email", "Sonia Sincorreo", { contactEmail: null })] });

      expect(within(rowOf("Sonia Sincorreo")).getByText("Sin email")).toBeInTheDocument();
      // The sub-status replaces the link captions of #275, the expiry date included.
      expect(screen.queryByText(/Enlace activo hasta el|Enlace caducado o revocado/)).not.toBeInTheDocument();
    });

    describe("on a narrow viewport", () => {
      const setViewport = (width: number) => {
        Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
      };
      afterEach(() => setViewport(1024));

      it("UI-MBR-010 UI-MBR-030 shows the derived status in the list too, with no invitation line", () => {
        setViewport(390);
        setup({ memberships: ROSTER });

        const list = screen.getByRole("list", { name: "Miembros de la comunidad" });
        const item = within(list).getByText("Lucas Enlace").closest("li") as HTMLElement;
        expect(within(item).getByText("Invitación enviada")).toBeInTheDocument();
        expect(within(item).queryByText("Invitación")).not.toBeInTheDocument();
        const suspended = within(list).getByText("Pablo Pausado").closest("li") as HTMLElement;
        expect(within(suspended).getByText("Suspendido")).toBeInTheDocument();
      });
    });

    it("UI-MBR-012 offers each invitation write only in the state it applies to", async () => {
      const user = userEvent.setup();
      setup({ memberships: ROSTER });

      expect(await menuItemsFor(user, "Nadia Nueva")).toEqual(["Invitar"]);
      expect(await menuItemsFor(user, "Lucas Enlace")).toEqual(["Reenviar", "Revocar enlace"]);
      expect(await menuItemsFor(user, "Elena Caducada")).toEqual(["Reenviar"]);
      // Suspended: nothing can be sent, but a live link can still be stopped.
      expect(await menuItemsFor(user, "Pablo Pausado")).toEqual(["Revocar enlace"]);
      // Accepted, or suspended once accepted: no invitation write applies, and
      // the row has nothing else granted, so it has no menu at all.
      expect(screen.queryByRole("button", { name: "Más acciones para Andrés Activo" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Más acciones para Sara Suspendida" })).not.toBeInTheDocument();
    });

    it("UI-MBR-012 offers no invitation write on a row without canInvite", () => {
      const withoutCapability = ROSTER.map((membership) => ({
        ...membership,
        capabilities: buildMembershipCapabilities(),
      }));
      setup({ memberships: withoutCapability });

      for (const { fullName } of withoutCapability) {
        expect(
          screen.queryByRole("button", { name: `Más acciones para ${fullName}` }),
        ).not.toBeInTheDocument();
      }
    });

    it("UI-MBR-012 offers no invitation write on a roster from a backend that predates canInvite", async () => {
      const user = userEvent.setup();
      // As that backend serves it: the capability is simply not there.
      const legacy = buildMembershipCapabilities({ canInvite: true, canDelete: true });
      delete (legacy as Partial<typeof legacy>).canInvite;
      setup({ memberships: [{ ...pending("never", "Nadia Nueva"), capabilities: legacy }] });

      expect(await menuItemsFor(user, "Nadia Nueva")).toEqual(["Eliminar"]);
    });

    it("UI-MBR-008 UI-MBR-013 UI-MBR-018 offers neither registration, import nor bulk send to a community without the capabilities", () => {
      setup({ community: { canManageMemberships: true } });

      expect(screen.queryByRole("button", { name: "Registrar miembro" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Importar miembros" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Enviar invitaciones pendientes" })).not.toBeInTheDocument();
    });

    it("UI-MBR-008 UI-MBR-013 UI-MBR-018 offers none of them to a community from a backend that predates the capabilities", () => {
      // The keys are absent, not false: setup builds on top of the defaults,
      // so the community is mocked here as that backend serves it.
      const legacy = buildCommunityCapabilities({ canRead: true, canManageMemberships: true });
      delete (legacy as Partial<typeof legacy>).canRegisterMembers;
      delete (legacy as Partial<typeof legacy>).canInviteMembers;
      vi.mocked(useGetMemberships).mockReturnValue(query.success<typeof getMemberships>(MOCK_MEMBERSHIPS));
      vi.mocked(useGetCommunityById).mockReturnValue(
        query.success<typeof getCommunityById>(buildCommunity({ id: "c1", capabilities: legacy })),
      );
      renderWithProviders(<MembersPage />, { activeCommunityId: "c1" });

      expect(screen.getByText("Ana García")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Registrar miembro" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Importar miembros" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Enviar invitaciones pendientes" })).not.toBeInTheDocument();
    });
  });

  it("UI-MBR-025 offers the member's supplies from the row's canListSupplies alone", async () => {
    const user = userEvent.setup();
    setup({
      memberships: [
        buildMembership({
          id: "m1",
          ...member("u1", "Ana García", "ana@example.com"),
          communityId: "c1",
          capabilities: buildMembershipCapabilities({ canListSupplies: true }),
        }),
        buildMembership({
          id: "m2",
          ...member("u2", "Bruno Leal", "bruno@example.com"),
          communityId: "c1",
          capabilities: buildMembershipCapabilities({ canListSupplies: false }),
        }),
      ],
    });

    // Without it, and with nothing else granted, the row has no menu at all.
    expect(screen.queryByRole("button", { name: "Más acciones para Bruno Leal" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Más acciones para Ana García" }));
    await user.click(await screen.findByRole("menuitem", { name: /Puntos de suministro/ }));

    expect(mockNavigate).toHaveBeenCalledWith("/supply-points?personId=u1");
  });

  describe("a person in two communities with a different record in each (lucoenergia/conluz#448)", () => {
    const RECORDS: Record<string, Pick<MembershipResponse, "fullName" | "contactEmail">> = {
      c1: { fullName: "Ana García", contactEmail: "ana@norte.example" },
      c2: { fullName: "Ana G. Pérez", contactEmail: "ana@sur.example" },
    };

    // Keyed on the active community, as the layout renders the routed page.
    function KeyedPage() {
      const communityId = useActiveCommunity();
      return <MembersPage key={communityId} />;
    }

    it("UI-MBR-025 shows each community's record of the same person on that community's roster", async () => {
      vi.mocked(useGetCommunityById).mockImplementation((communityId) =>
        query.success<typeof getCommunityById>(
          buildCommunity({ id: communityId, capabilities: buildCommunityCapabilities({ canRead: true, ...ADMIN_COMMUNITY }) }),
        ),
      );
      vi.mocked(useGetMemberships).mockImplementation((communityId) =>
        query.success<typeof getMemberships>([
          buildMembership({ id: `m-${communityId}`, communityId, user: { id: "u-ana" }, ...RECORDS[communityId] }),
        ]),
      );
      const { switchActiveCommunity } = renderWithProviders(<KeyedPage />, { activeCommunityId: "c1" });

      expect(screen.getByText("Ana García")).toBeInTheDocument();
      expect(screen.getByText("ana@norte.example")).toBeInTheDocument();

      act(() => switchActiveCommunity("c2"));

      expect(await screen.findByText("Ana G. Pérez")).toBeInTheDocument();
      expect(screen.getByText("ana@sur.example")).toBeInTheDocument();
      expect(screen.queryByText("Ana García")).not.toBeInTheDocument();
      expect(screen.queryByText("ana@norte.example")).not.toBeInTheDocument();
    });
  });
});
