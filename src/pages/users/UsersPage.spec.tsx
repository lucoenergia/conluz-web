import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { buildCommunity, buildUser } from "../../test/fixtures";
import {
  useDisableUser,
  useEnableUser,
  useGetAllUsers,
  useGrantPlatformAdmin,
  useRevokePlatformAdmin,
  type getAllUsers,
} from "../../api/users/users";
import { useGetAllCommunities, type getAllCommunities } from "../../api/communities/communities";

const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();
const mockDisableMutate = vi.fn();
const mockEnableMutate = vi.fn();
const mockGrantMutate = vi.fn();
const mockRevokeMutate = vi.fn();

// The logged-in user — used to assert the self-revoke guard (revoke disabled on own row).
const LOGGED_USER_ID = "u3";

const MOCK_USERS = [
  buildUser({
    id: "u1",
    fullName: "Ana García",
    personalId: "11111111A",
    email: "ana@example.com",
    phoneNumber: "600000001",
    enabled: true,
    isPlatformAdmin: true, // another platform admin (not the logged-in user) → revoke enabled
    memberships: { "c1": "COMMUNITY_ADMIN", "c2": "COMMUNITY_MEMBER", "c3": "COMMUNITY_MEMBER" },
  }),
  buildUser({
    id: "u2",
    fullName: "Bruno Leal",
    personalId: "22222222B",
    email: "bruno@example.com",
    phoneNumber: "600000002",
    enabled: false,
    isPlatformAdmin: false, // not an admin → grant shown
    memberships: {},
  }),
  buildUser({
    id: LOGGED_USER_ID,
    fullName: "Zoe Admin",
    personalId: "33333333C",
    email: "zoe@example.com",
    phoneNumber: "600000003",
    enabled: true,
    isPlatformAdmin: true, // the logged-in user → revoke disabled
    memberships: {},
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

vi.mock(import("../../api/users/users"), () => ({
  useGetAllUsers: vi.fn(),
  useDisableUser: vi.fn(),
  useEnableUser: vi.fn(),
  useGrantPlatformAdmin: vi.fn(),
  useRevokePlatformAdmin: vi.fn(),
}));

vi.mock(import("../../api/communities/communities"), () => ({
  useGetAllCommunities: vi.fn(),
}));

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => buildUser({ id: LOGGED_USER_ID }),
}));

vi.mock(import("../../hooks/useActiveCommunityRole"), () => ({
  useIsPlatformAdmin: () => true,
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

vi.mock("../../components/Modals/ResetPasswordConfirmationModal", () => ({
  ResetPasswordConfirmationModal: ({ isOpen, onCancel }: { isOpen: boolean; onCancel: () => void }) =>
    isOpen ? (
      <div>
        <span>Reset password modal</span>
        <button onClick={onCancel}>Cancelar</button>
      </div>
    ) : null,
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

import { UsersPage } from "./UsersPage";

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetAllUsers).mockReturnValue(query.success<typeof getAllUsers>({ items: MOCK_USERS }));
    vi.mocked(useGetAllCommunities).mockReturnValue(query.success<typeof getAllCommunities>(MOCK_COMMUNITIES));
    vi.mocked(useDisableUser).mockReturnValue(mutation.idle({ mutateAsync: mockDisableMutate }));
    vi.mocked(useEnableUser).mockReturnValue(mutation.idle({ mutateAsync: mockEnableMutate }));
    vi.mocked(useGrantPlatformAdmin).mockReturnValue(mutation.idle({ mutateAsync: mockGrantMutate }));
    vi.mocked(useRevokePlatformAdmin).mockReturnValue(mutation.idle({ mutateAsync: mockRevokeMutate }));
  });

  const setup = () => {
    renderWithProviders(<UsersPage />);
  };

  describe("narrow viewport", () => {
    const setViewport = (width: number) => {
      Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
    };

    afterEach(() => setViewport(1024));

    it("reaches row actions without horizontal scrolling", async () => {
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

  it("shows Nuevo Usuario button linking to /users/new", () => {
    setup();

    const btn = screen.getByRole("link", { name: /nuevo usuario/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("href", "/users/new");
  });

  it("navigates to /users/:id/edit when edit action is chosen", async () => {
    const user = userEvent.setup();
    setup();

    const iconButtons = screen.getAllByRole("button").filter((b) => b.textContent === "");
    await user.click(iconButtons[0]);

    await waitFor(() => expect(screen.getByText("Editar datos")).toBeInTheDocument());
    await user.click(screen.getByText("Editar datos"));

    expect(mockNavigate).toHaveBeenCalledWith("/users/u1/edit");
  });

  it("opens disable confirmation when disable action is chosen for an active user", async () => {
    const user = userEvent.setup();
    setup();

    // Click icon button for Ana García (enabled=true)
    const iconButtons = screen.getAllByRole("button").filter((b) => b.textContent === "");
    await user.click(iconButtons[0]);

    await waitFor(() => expect(screen.queryByText("Deshabilitar")).toBeInTheDocument());
    await user.click(screen.getByText("Deshabilitar"));

    expect(screen.getByText(/Disable modal for Ana García/)).toBeInTheDocument();
  });

  it("opens enable confirmation when enable action is chosen for an inactive user", async () => {
    const user = userEvent.setup();
    setup();

    // Click icon button for Bruno Leal (enabled=false) — second icon button
    const iconButtons = screen.getAllByRole("button").filter((b) => b.textContent === "");
    await user.click(iconButtons[1]);

    await waitFor(() => expect(screen.queryByText("Habilitar")).toBeInTheDocument());
    await user.click(screen.getByText("Habilitar"));

    expect(screen.getByText(/Enable modal for Bruno Leal/)).toBeInTheDocument();
  });

  it("opens reset password modal when reset action is chosen", async () => {
    const user = userEvent.setup();
    setup();

    const iconButtons = screen.getAllByRole("button").filter((b) => b.textContent === "");
    await user.click(iconButtons[0]);

    await waitFor(() => expect(screen.queryByText("Reestablecer contraseña")).toBeInTheDocument());
    await user.click(screen.getByText("Reestablecer contraseña"));

    expect(screen.getByText("Reset password modal")).toBeInTheDocument();
  });

  it("shows Comunidades column header", () => {
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
    // There should be a — for Bruno (no memberships)
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("Comunidades column is read-only — no assign/edit buttons in that column", () => {
    setup();
    // No buttons or links inside the communities cell — just chips
  const communityChips = screen.getAllByText(/· Admin|· Miembro/);
    communityChips.forEach((chip) => {
      expect(chip.closest("button")).toBeNull();
    });
  });

  it("shows the platform-admin indicator only on platform-admin rows", () => {
    setup();
    // Ana and Zoe are platform admins; Bruno is not.
    expect(screen.getAllByText("Admin plataforma")).toHaveLength(2);
  });

  it("shows the grant action on a non-admin row", async () => {
    const user = userEvent.setup();
    setup();

    // Sorted asc by name: Ana(0), Bruno(1), Zoe(2). Bruno is not a platform admin.
    const iconButtons = screen.getAllByRole("button").filter((b) => b.textContent === "");
    await user.click(iconButtons[1]);

    await waitFor(() => expect(screen.getByText("Conceder admin de plataforma")).toBeInTheDocument());
    expect(screen.queryByText("Revocar admin de plataforma")).not.toBeInTheDocument();
  });

  it("enables revoke on another platform admin's row", async () => {
    const user = userEvent.setup();
    setup();

    // Ana (index 0) is a platform admin but not the logged-in user → revoke enabled.
    const iconButtons = screen.getAllByRole("button").filter((b) => b.textContent === "");
    await user.click(iconButtons[0]);

    await waitFor(() => expect(screen.getByText("Revocar admin de plataforma")).toBeInTheDocument());
    const menuItem = screen.getByText("Revocar admin de plataforma").closest("li");
    expect(menuItem).not.toHaveAttribute("aria-disabled", "true");
  });

  it("disables revoke on the logged-in user's own row", async () => {
    const user = userEvent.setup();
    setup();

    // Zoe (index 2) is the logged-in platform admin → self-revoke guard disables the item.
    const iconButtons = screen.getAllByRole("button").filter((b) => b.textContent === "");
    await user.click(iconButtons[2]);

    await waitFor(() => expect(screen.getByText("Revocar admin de plataforma")).toBeInTheDocument());
    const menuItem = screen.getByText("Revocar admin de plataforma").closest("li");
    expect(menuItem).toHaveAttribute("aria-disabled", "true");
  });

  it("grants platform admin through the confirmation modal", async () => {
    const user = userEvent.setup();
    setup();

    const iconButtons = screen.getAllByRole("button").filter((b) => b.textContent === "");
    await user.click(iconButtons[1]); // Bruno

    await waitFor(() => expect(screen.getByText("Conceder admin de plataforma")).toBeInTheDocument());
    await user.click(screen.getByText("Conceder admin de plataforma"));

    expect(screen.getByText(/Grant modal for Bruno Leal/)).toBeInTheDocument();
    await user.click(screen.getByText("Confirmar conceder"));

    await waitFor(() => expect(mockGrantMutate).toHaveBeenCalledWith({ userId: "u2" }));
  });

  it("revokes platform admin through the confirmation modal", async () => {
    const user = userEvent.setup();
    setup();

    const iconButtons = screen.getAllByRole("button").filter((b) => b.textContent === "");
    await user.click(iconButtons[0]); // Ana

    await waitFor(() => expect(screen.getByText("Revocar admin de plataforma")).toBeInTheDocument());
    await user.click(screen.getByText("Revocar admin de plataforma"));

    expect(screen.getByText(/Revoke modal for Ana García/)).toBeInTheDocument();
    await user.click(screen.getByText("Confirmar revocar"));

    await waitFor(() => expect(mockRevokeMutate).toHaveBeenCalledWith({ userId: "u1" }));
  });
});
