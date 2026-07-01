import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();
const mockDisableMutate = vi.fn();
const mockEnableMutate = vi.fn();
const mockGrantMutate = vi.fn();
const mockRevokeMutate = vi.fn();

// The logged-in user — used to assert the self-revoke guard (revoke disabled on own row).
const LOGGED_USER_ID = "u3";

const MOCK_USERS = [
  {
    id: "u1",
    fullName: "Ana García",
    personalId: "11111111A",
    email: "ana@example.com",
    phoneNumber: "600000001",
    enabled: true,
    isPlatformAdmin: true, // another platform admin (not the logged-in user) → revoke enabled
    memberships: { "c1": "COMMUNITY_ADMIN", "c2": "COMMUNITY_MEMBER", "c3": "COMMUNITY_MEMBER" },
  },
  {
    id: "u2",
    fullName: "Bruno Leal",
    personalId: "22222222B",
    email: "bruno@example.com",
    phoneNumber: "600000002",
    enabled: false,
    isPlatformAdmin: false, // not an admin → grant shown
    memberships: {},
  },
  {
    id: LOGGED_USER_ID,
    fullName: "Zoe Admin",
    personalId: "33333333C",
    email: "zoe@example.com",
    phoneNumber: "600000003",
    enabled: true,
    isPlatformAdmin: true, // the logged-in user → revoke disabled
    memberships: {},
  },
];

const MOCK_COMMUNITIES = [
  { id: "c1", name: "Sol Común", code: "SOL", enabled: true },
  { id: "c2", name: "Verde Activa", code: "VRD", enabled: true },
  { id: "c3", name: "Energía Norte", code: "NOR", enabled: true },
];

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../api/users/users", () => ({
  useGetAllUsers: () => ({ data: { items: MOCK_USERS }, isLoading: false, error: null, refetch: vi.fn() }),
  useDisableUser: () => ({ mutateAsync: mockDisableMutate }),
  useEnableUser: () => ({ mutateAsync: mockEnableMutate }),
  useGrantPlatformAdmin: () => ({ mutateAsync: mockGrantMutate, isPending: false }),
  useRevokePlatformAdmin: () => ({ mutateAsync: mockRevokeMutate, isPending: false }),
}));

vi.mock("../../api/communities/communities", () => ({
  useGetAllCommunities: () => ({ data: MOCK_COMMUNITIES }),
}));

vi.mock("../../context/error.context", () => ({
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock("../../context/logged-user.context", () => ({
  useLoggedUser: () => ({ id: LOGGED_USER_ID }),
}));

vi.mock("../../hooks/useActiveCommunityRole", () => ({
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

import { MemoryRouter } from "react-router";
import { UsersPage } from "./UsersPage";

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    );
  };

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
    expect(screen.getByText(/Sol Común · Adm/)).toBeInTheDocument();
    expect(screen.getByText(/Verde Activa · Mbr/)).toBeInTheDocument();
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
    const communityChips = screen.getAllByText(/· Adm|· Mbr/);
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

    await waitFor(() => expect(mockGrantMutate).toHaveBeenCalledWith({ id: "u2" }));
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

    await waitFor(() => expect(mockRevokeMutate).toHaveBeenCalledWith({ id: "u1" }));
  });
});
