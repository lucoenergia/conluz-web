import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import {
  buildCommunity,
  buildCurrentUser,
  buildPlatformCapabilities,
  buildUser,
  buildUserCapabilities,
} from "../../test/fixtures";
import type { PlatformCapabilitiesResponse, UserResponse } from "../../api/models";

const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();
const mockDisableMutate = vi.fn();
const mockEnableMutate = vi.fn();
const mockGrantMutate = vi.fn();
const mockRevokeMutate = vi.fn();

const LOGGED_USER_ID = "u3";

/**
 * Three rows whose capabilities differ, which is what a real list looks like:
 *
 *   Ana   -- another platform admin, active and fully manageable;
 *   Bruno -- not an admin, and disabled;
 *   Zoe   -- the caller's own row. canDelete, canDisable and
 *            canRevokePlatformAdmin are documented always false for the caller
 *            themselves, and canEdit is false for one's own record, so the
 *            backend hands over nothing at all -- which is why her row has no
 *            menu rather than a disabled item.
 *
 * Sorted ascending by name, so the order below is the order on screen.
 *
 * Ana and Bruno each carry BOTH halves of both pairs, because that is what the
 * backend returns: canEnable/canDisable and canGrantPlatformAdmin/
 * canRevokePlatformAdmin are permission answers that fold in only whether the
 * user is the caller. Granting one half per row would describe a response the
 * API does not produce, and would let a screen that offers both halves at once
 * pass -- which is exactly what happened.
 */
const MOCK_USERS: UserResponse[] = [
  buildUser({
    id: "u1",
    fullName: "Ana García",
    personalId: "11111111A",
    email: "ana@example.com",
    phoneNumber: "600000001",
    enabled: true,
    isPlatformAdmin: true,
    memberships: { c1: "COMMUNITY_ADMIN", c2: "COMMUNITY_MEMBER", c3: "COMMUNITY_MEMBER" },
    capabilities: buildUserCapabilities({
      canRead: true,
      canEdit: true,
      canEnable: true,
      canDisable: true,
      canGrantPlatformAdmin: true,
      canRevokePlatformAdmin: true,
    }),
  }),
  buildUser({
    id: "u2",
    fullName: "Bruno Leal",
    personalId: "22222222B",
    email: "bruno@example.com",
    phoneNumber: "600000002",
    enabled: false,
    isPlatformAdmin: false,
    memberships: {},
    capabilities: buildUserCapabilities({
      canRead: true,
      canEdit: true,
      canEnable: true,
      canDisable: true,
      canGrantPlatformAdmin: true,
      canRevokePlatformAdmin: true,
    }),
  }),
  buildUser({
    id: LOGGED_USER_ID,
    fullName: "Zoe Admin",
    personalId: "33333333C",
    email: "zoe@example.com",
    phoneNumber: "600000003",
    enabled: true,
    isPlatformAdmin: true,
    memberships: {},
    capabilities: buildUserCapabilities({ canRead: true }),
  }),
];

const MOCK_COMMUNITIES = [
  buildCommunity({ id: "c1", name: "Sol Común", code: "SOL", enabled: true }),
  buildCommunity({ id: "c2", name: "Verde Activa", code: "VRD", enabled: true }),
  buildCommunity({ id: "c3", name: "Energía Norte", code: "NOR", enabled: true }),
];

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

// Only the reads are replaced, plus the four mutations these tests assert the
// arguments of. The actions layer runs for real -- which is the point: what is
// under test is that each row's menu follows the capabilities on the payload, and
// stubbing useUserActions would mean restating that rule in the test instead of
// exercising it. Spreading the original keeps the query-key getters the layer
// invalidates with.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllUsers: vi.fn(),
  useDisableUser: vi.fn(),
  useEnableUser: vi.fn(),
  useGrantPlatformAdmin: vi.fn(),
  useRevokePlatformAdmin: vi.fn(),
}));

vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllCommunities: vi.fn(),
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

vi.mock("../../components/Modals/DisablePartnerConfirmationModal", () => ({
  DisablePartnerConfirmationModal: ({ isOpen, onDisable, onCancel, partnerName }: {
    isOpen: boolean; onDisable: () => void; onCancel: () => void; partnerName: string;
  }) =>
    isOpen ? (
      <div>
        <span>Disable modal for {partnerName}</span>
        <button onClick={onDisable}>Confirmar deshabilitar</button>
        <button onClick={onCancel}>Cancelar</button>
      </div>
    ) : null,
}));

vi.mock("../../components/Modals/EnablePartnerConfirmationModal", () => ({
  EnablePartnerConfirmationModal: ({ isOpen, onEnable, onCancel, partnerName }: {
    isOpen: boolean; onEnable: () => void; onCancel: () => void; partnerName: string;
  }) =>
    isOpen ? (
      <div>
        <span>Enable modal for {partnerName}</span>
        <button onClick={onEnable}>Confirmar habilitar</button>
        <button onClick={onCancel}>Cancelar</button>
      </div>
    ) : null,
}));

vi.mock("../../components/Modals/DisablePartnerSuccessModal", () => ({
  DisablePartnerSuccessModal: () => null,
}));

vi.mock("../../components/Modals/GrantPlatformAdminConfirmationModal", () => ({
  GrantPlatformAdminConfirmationModal: ({ isOpen, onConfirm, userName }: {
    isOpen: boolean; onConfirm: () => void; userName: string;
  }) =>
    isOpen ? (
      <div>
        <span>Grant modal for {userName}</span>
        <button onClick={onConfirm}>Confirmar conceder</button>
      </div>
    ) : null,
}));

vi.mock("../../components/Modals/RevokePlatformAdminConfirmationModal", () => ({
  RevokePlatformAdminConfirmationModal: ({ isOpen, onConfirm, userName }: {
    isOpen: boolean; onConfirm: () => void; userName: string;
  }) =>
    isOpen ? (
      <div>
        <span>Revoke modal for {userName}</span>
        <button onClick={onConfirm}>Confirmar revocar</button>
      </div>
    ) : null,
}));

vi.mock("../../components/Modals/PlatformAdminSuccessModal", () => ({
  PlatformAdminSuccessModal: ({ isOpen, userName, wasGranted }: {
    isOpen: boolean; userName: string; wasGranted: boolean;
  }) =>
    isOpen ? <span>Platform admin {wasGranted ? "granted" : "revoked"} for {userName}</span> : null,
}));

import {
  getGetAllUsersQueryKey,
  getGetCurrentUserQueryKey,
  getGetUserByIdQueryKey,
  useDisableUser,
  useEnableUser,
  useGetAllUsers,
  useGrantPlatformAdmin,
  useRevokePlatformAdmin,
  type getAllUsers,
} from "../../api/users/users";
import { useGetAllCommunities, type getAllCommunities } from "../../api/communities/communities";
import { UsersPage } from "./UsersPage";

const menuFor = (name: string) => screen.getByRole("button", { name: `Más acciones para ${name}` });
const noMenuFor = (name: string) =>
  screen.queryByRole("button", { name: `Más acciones para ${name}` });

function setup(
  options: {
    users?: UserResponse[];
    platform?: Partial<PlatformCapabilitiesResponse> | null;
    usersLoading?: boolean;
  } = {},
) {
  const { users = MOCK_USERS, platform = { canListUsers: true, canCreateUsers: true } } = options;

  loggedUser.current =
    platform === null
      ? null
      : buildCurrentUser({
          id: LOGGED_USER_ID,
          platformCapabilities: buildPlatformCapabilities(platform),
        });

  vi.mocked(useGetAllUsers).mockReturnValue(
    options.usersLoading ? query.loading() : query.success<typeof getAllUsers>({ items: users }),
  );

  return renderWithProviders(<UsersPage />);
}

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetAllCommunities).mockReturnValue(
      query.success<typeof getAllCommunities>(MOCK_COMMUNITIES),
    );
    vi.mocked(useDisableUser).mockReturnValue(mutation.idle({ mutateAsync: mockDisableMutate }));
    vi.mocked(useEnableUser).mockReturnValue(mutation.idle({ mutateAsync: mockEnableMutate }));
    vi.mocked(useGrantPlatformAdmin).mockReturnValue(mutation.idle({ mutateAsync: mockGrantMutate }));
    vi.mocked(useRevokePlatformAdmin).mockReturnValue(mutation.idle({ mutateAsync: mockRevokeMutate }));
  });

  describe("narrow viewport", () => {
    const setViewport = (width: number) => {
      Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
    };

    afterEach(() => setViewport(1024));

    it("reaches row actions without horizontal scrolling", () => {
      // The bug this guards: on a phone the table scrolled sideways and the
      // actions column — the only route to edit or disable a user — sat
      // off-canvas with no affordance suggesting it was there.
      setViewport(390);
      setup();

      expect(screen.queryByRole("table")).not.toBeInTheDocument();

      const list = screen.getByRole("list", { name: "Usuarios" });
      expect(within(list).getByRole("button", { name: "Más acciones para Ana García" })).toBeVisible();
    });

    it("still shows each user's data, not just their name", () => {
      setViewport(390);
      setup();

      expect(screen.getByText("ana@example.com")).toBeInTheDocument();
      expect(screen.getByText("11111111A")).toBeInTheDocument();
      expect(screen.getByText("600000001")).toBeInTheDocument();
    });

    it("renders the table and no stacked list above the breakpoint", () => {
      setViewport(1024);
      setup();

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.queryByRole("list", { name: "Usuarios" })).not.toBeInTheDocument();
    });

    // The stacked list takes a node rather than a predicate, so it has to apply
    // the same answer by hand. A row with nothing to offer must lose its button
    // in both layouts or one of them is a way round the gate.
    it("gives a row with no permitted action no button here either", () => {
      setViewport(390);
      setup();

      const list = screen.getByRole("list", { name: "Usuarios" });
      expect(within(list).queryByRole("button", { name: "Más acciones para Zoe Admin" })).toBeNull();
    });
  });

  it("renders the page title and breadcrumb with user terminology", () => {
    setup();

    expect(screen.getByText("Gestión de Usuarios")).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    expect(screen.queryByText("Socios")).not.toBeInTheDocument();
  });

  it("renders table without Nº Socio column", () => {
    setup();

    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.getByText("NIF/CIF")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.queryByText("Nº Socio")).not.toBeInTheDocument();
  });

  it("displays user rows from API", () => {
    setup();

    expect(screen.getByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText("Bruno Leal")).toBeInTheDocument();
  });

  it("does not render a role label in user rows", () => {
    setup();

    expect(screen.queryByText("PARTNER")).not.toBeInTheDocument();
  });

  it("shows summary stats", () => {
    setup();

    expect(screen.getByText("3")).toBeInTheDocument(); // Total (Ana, Bruno, Zoe)
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getAllByText("Activos").length).toBeGreaterThan(0);
  });

  it("does not show Importar CSV button", () => {
    setup();

    expect(screen.queryByText("Importar CSV")).not.toBeInTheDocument();
  });

  describe("creating a user", () => {
    it("offers Nuevo Usuario when the platform permits it", () => {
      setup();

      expect(screen.getByRole("link", { name: /nuevo usuario/i })).toHaveAttribute("href", "/users/new");
    });

    it("offers nothing when it does not", () => {
      setup({ platform: { canListUsers: true, canCreateUsers: false } });

      expect(screen.queryByRole("link", { name: /nuevo usuario/i })).not.toBeInTheDocument();
    });

    // Not yet known is not "no", and it is not "yes" either.
    it("offers nothing while the current user has not arrived", () => {
      setup({ platform: null });

      expect(screen.queryByRole("link", { name: /nuevo usuario/i })).not.toBeInTheDocument();
    });
  });

  describe("the row menu", () => {
    // Every row carries its own answer, so a list may legitimately mix them.
    it("decides each row from its own account, not from the platform", () => {
      setup();

      expect(menuFor("Ana García")).toBeInTheDocument();
      expect(menuFor("Bruno Leal")).toBeInTheDocument();
      // Zoe is the caller: the backend hands over nothing for her own record, so
      // her row loses the menu rather than opening an empty one.
      expect(noMenuFor("Zoe Admin")).toBeNull();
    });

    it("offers no menu at all while the list is still loading", () => {
      setup({ usersLoading: true });

      expect(noMenuFor("Ana García")).toBeNull();
    });

    it("navigates to /users/:id/edit when edit action is chosen", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(menuFor("Ana García"));
      await user.click(await screen.findByRole("menuitem", { name: /Editar datos/ }));

      expect(mockNavigate).toHaveBeenCalledWith("/users/u1/edit");
    });

    it("offers no Editar datos without canEdit", async () => {
      const user = userEvent.setup();
      setup({
        users: [
          buildUser({
            ...MOCK_USERS[0],
            capabilities: buildUserCapabilities({ canRead: true, canDisable: true }),
          }),
        ],
      });

      await user.click(menuFor("Ana García"));

      expect(await screen.findByRole("menuitem", { name: /Deshabilitar/ })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: /Editar datos/ })).not.toBeInTheDocument();
    });

    // The reset had no endpoint and silently did nothing, so it is gone
    // rather than gated (#196), even for a row the caller may edit.
    it("offers no password reset, even on a row the caller may edit", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(menuFor("Ana García"));

      expect(await screen.findByRole("menuitem", { name: /Editar datos/ })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: /contraseña/i })).not.toBeInTheDocument();
    });
  });

  describe("enabling and disabling", () => {
    // Which of the pair appears is the action the caller holds, not the row's
    // status: the backend has already folded status into the answer.
    it("opens disable confirmation on a row that permits disabling", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(menuFor("Ana García"));
      await user.click(await screen.findByRole("menuitem", { name: /Deshabilitar/ }));

      expect(screen.getByText(/Disable modal for Ana García/)).toBeInTheDocument();
    });

    // The backend permits both halves at once, so the row's own state is what
    // decides which one is offered. Without that, an active user was shown
    // Habilitar beside Deshabilitar.
    it("offers only the half of the status pair that applies to the row", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(menuFor("Ana García"));
      expect(await screen.findByRole("menuitem", { name: /Deshabilitar/ })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: /^Habilitar/ })).not.toBeInTheDocument();
      await user.keyboard("{Escape}");

      await user.click(menuFor("Bruno Leal"));
      expect(await screen.findByRole("menuitem", { name: /^Habilitar/ })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: /Deshabilitar/ })).not.toBeInTheDocument();
    });

    // The severe half of the same defect: the handler used to pick with `??`,
    // so with both halves permitted "disable" always won and Habilitar disabled
    // the user it was meant to enable.
    it("runs the operation the chosen item names, not whichever action exists", async () => {
      const user = userEvent.setup();
      mockEnableMutate.mockResolvedValueOnce(undefined);
      setup();

      await user.click(menuFor("Bruno Leal"));
      await user.click(await screen.findByRole("menuitem", { name: /^Habilitar/ }));
      await user.click(screen.getByText("Confirmar habilitar"));

      await waitFor(() => expect(mockEnableMutate).toHaveBeenCalledWith({ userId: "u2" }));
      expect(mockDisableMutate).not.toHaveBeenCalled();
    });

    // Ana is enabled and permits disabling, Bruno is disabled and permits
    // enabling, so in the list above status and capability agree and either would
    // explain the menu. These two rows are the ones where they disagree, which is
    // the only shape that can tell the gate apart from the status it replaced.
    it("follows the capability, not the row's status", async () => {
      const user = userEvent.setup();
      setup({
        users: [
          buildUser({
            ...MOCK_USERS[0],
            fullName: "Carla Núñez",
            enabled: true,
            capabilities: buildUserCapabilities({ canRead: true, canEdit: true, canDisable: false }),
          }),
          buildUser({
            ...MOCK_USERS[1],
            fullName: "Diego Ortiz",
            enabled: false,
            capabilities: buildUserCapabilities({ canRead: true, canEdit: true, canEnable: false }),
          }),
        ],
      });

      await user.click(menuFor("Carla Núñez"));
      await screen.findByRole("menuitem", { name: /Editar datos/ });
      expect(screen.queryByRole("menuitem", { name: /Deshabilitar/ })).not.toBeInTheDocument();
      await user.keyboard("{Escape}");

      await user.click(menuFor("Diego Ortiz"));
      await waitFor(() =>
        expect(screen.queryByRole("menuitem", { name: /Habilitar/ })).not.toBeInTheDocument(),
      );
    });

    it("opens enable confirmation on a row that permits enabling", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(menuFor("Bruno Leal"));
      await user.click(await screen.findByRole("menuitem", { name: /Habilitar/ }));

      expect(screen.getByText(/Enable modal for Bruno Leal/)).toBeInTheDocument();
    });

    it("disables the user and invalidates the account and the list", async () => {
      const user = userEvent.setup();
      mockDisableMutate.mockResolvedValueOnce(undefined);
      const { queryClient } = setup();
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await user.click(menuFor("Ana García"));
      await user.click(await screen.findByRole("menuitem", { name: /Deshabilitar/ }));
      await user.click(screen.getByText("Confirmar deshabilitar"));

      await waitFor(() => expect(mockDisableMutate).toHaveBeenCalledWith({ userId: "u1" }));
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetUserByIdQueryKey("u1") });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllUsersQueryKey() });
    });

    it("reports a failure and leaves the list alone", async () => {
      const user = userEvent.setup();
      mockDisableMutate.mockRejectedValueOnce(new Error("nope"));
      setup();

      await user.click(menuFor("Ana García"));
      await user.click(await screen.findByRole("menuitem", { name: /Deshabilitar/ }));
      await user.click(screen.getByText("Confirmar deshabilitar"));

      await waitFor(() =>
        expect(mockErrorDispatch).toHaveBeenCalledWith(
          "Error al deshabilitar el usuario. Por favor, inténtalo de nuevo.",
        ),
      );
    });
  });

  describe("the platform-admin flag", () => {
    // Display, not a decision: the badge is data about the user. What moved onto
    // capabilities is the decision to OFFER grant or revoke.
    it("shows the platform-admin indicator only on platform-admin rows", () => {
      setup();

      expect(screen.getAllByText("Admin plataforma")).toHaveLength(2);
    });

    it("offers grant on a row that permits granting", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(menuFor("Bruno Leal"));

      expect(await screen.findByRole("menuitem", { name: /Conceder admin de plataforma/ })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: /Revocar admin de plataforma/ })).not.toBeInTheDocument();
    });

    it("offers revoke on a row that permits revoking", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(menuFor("Ana García"));

      expect(await screen.findByRole("menuitem", { name: /Revocar admin de plataforma/ })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: /Conceder admin de plataforma/ })).not.toBeInTheDocument();
    });

    // The rule the page used to enforce itself with an id comparison. It is the
    // backend's: canRevokePlatformAdmin is documented always false for the caller.
    it("offers no revoke on a row that refuses it, rather than a disabled item", async () => {
      const user = userEvent.setup();
      setup({
        users: [
          buildUser({
            ...MOCK_USERS[0],
            capabilities: buildUserCapabilities({
              canRead: true,
              canEdit: true,
              canRevokePlatformAdmin: false,
            }),
          }),
        ],
      });

      await user.click(menuFor("Ana García"));

      await screen.findByRole("menuitem", { name: /Editar datos/ });
      expect(screen.queryByRole("menuitem", { name: /Revocar admin de plataforma/ })).not.toBeInTheDocument();
    });

    it("offers only the half of the platform-admin pair that applies to the row", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(menuFor("Ana García"));
      expect(await screen.findByRole("menuitem", { name: /Revocar admin de plataforma/ })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: /Conceder admin de plataforma/ })).not.toBeInTheDocument();
      await user.keyboard("{Escape}");

      await user.click(menuFor("Bruno Leal"));
      expect(await screen.findByRole("menuitem", { name: /Conceder admin de plataforma/ })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: /Revocar admin de plataforma/ })).not.toBeInTheDocument();
    });

    it("grants platform admin and refreshes the row, not the caller", async () => {
      const user = userEvent.setup();
      mockGrantMutate.mockResolvedValueOnce(undefined);
      const { queryClient } = setup();
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await user.click(menuFor("Bruno Leal"));
      await user.click(await screen.findByRole("menuitem", { name: /Conceder admin de plataforma/ }));

      expect(screen.getByText(/Grant modal for Bruno Leal/)).toBeInTheDocument();
      await user.click(screen.getByText("Confirmar conceder"));

      await waitFor(() => expect(mockGrantMutate).toHaveBeenCalledWith({ userId: "u2" }));
      // Bruno permits revoking too -- the backend answers both halves -- so this
      // also pins that the item's own operation ran, not the first one that
      // happened to exist.
      expect(mockRevokeMutate).not.toHaveBeenCalled();
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetUserByIdQueryKey("u2") });
      // Not the current user: the backend refuses a platform-admin change aimed
      // at the caller, so this can only ever change somebody else's flag and
      // the caller's own capabilities are untouched (#203, ADR-0004).
      expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: getGetCurrentUserQueryKey() });
    });

    it("revokes platform admin and refreshes the row, not the caller", async () => {
      const user = userEvent.setup();
      mockRevokeMutate.mockResolvedValueOnce(undefined);
      const { queryClient } = setup();
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await user.click(menuFor("Ana García"));
      await user.click(await screen.findByRole("menuitem", { name: /Revocar admin de plataforma/ }));

      expect(screen.getByText(/Revoke modal for Ana García/)).toBeInTheDocument();
      await user.click(screen.getByText("Confirmar revocar"));

      await waitFor(() => expect(mockRevokeMutate).toHaveBeenCalledWith({ userId: "u1" }));
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetUserByIdQueryKey("u1") });
      expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: getGetCurrentUserQueryKey() });
    });

    it("reports a failure rather than claiming the flag changed", async () => {
      const user = userEvent.setup();
      mockRevokeMutate.mockRejectedValueOnce(new Error("nope"));
      setup();

      await user.click(menuFor("Ana García"));
      await user.click(await screen.findByRole("menuitem", { name: /Revocar admin de plataforma/ }));
      await user.click(screen.getByText("Confirmar revocar"));

      await waitFor(() =>
        expect(mockErrorDispatch).toHaveBeenCalledWith(
          "No se pudo actualizar el rol de administrador de plataforma.",
        ),
      );
      expect(screen.queryByText(/Platform admin revoked/)).not.toBeInTheDocument();
    });
  });

  describe("the Comunidades column", () => {
    it("shows the header", () => {
      setup();
      expect(screen.getByText("Comunidades")).toBeInTheDocument();
    });

    it("shows community membership chips for Ana (first 2 + overflow)", () => {
      setup();
      // Ana has 3 memberships: c1 (admin), c2 (member), c3 (member) — shows 2 chips + +1
      expect(screen.getByText(/Sol Común · Admin/)).toBeInTheDocument();
      expect(screen.getByText(/Verde Activa · Miembro/)).toBeInTheDocument();
      expect(screen.getByText("+1")).toBeInTheDocument();
    });

    it("shows dash for Bruno who has no memberships", () => {
      setup();
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it("is read-only — no assign/edit buttons in that column", () => {
      setup();
      const communityChips = screen.getAllByText(/· Admin|· Miembro/);
      communityChips.forEach((chip) => {
        expect(chip.closest("button")).toBeNull();
      });
    });
  });
});
