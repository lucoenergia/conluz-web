import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { buildCommunity, buildMembership, buildUser } from "../../test/fixtures";
import { useGetAllCommunities, type getAllCommunities } from "../../api/communities/communities";
import {
  useCreateMembership,
  useDeleteMembership,
  useGetMemberships,
  useUpdateMembershipRole,
  type getMemberships,
} from "../../api/memberships/memberships";
import { useGetAllUsers, type getAllUsers } from "../../api/users/users";

const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();
const mockCreateMutate = vi.fn().mockResolvedValue({});
const mockDeleteMutate = vi.fn().mockResolvedValue({});
const mockUpdateMutate = vi.fn().mockResolvedValue({});

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
  }),
];

const MOCK_COMMUNITIES = [
  buildCommunity({
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
  buildCommunity({
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

vi.mock(import("../../api/communities/communities"), () => ({
  useGetAllCommunities: vi.fn(),
  getGetAllCommunitiesQueryKey: () => ["/api/v1/communities"] as const,
}));

vi.mock(import("../../api/memberships/memberships"), () => ({
  useGetMemberships: vi.fn(),
  useCreateMembership: vi.fn(),
  useDeleteMembership: vi.fn(),
  useUpdateMembershipRole: vi.fn(),
  getGetMembershipsQueryKey: (id: string) => [`/api/v1/communities/${id}/memberships`] as const,
}));

vi.mock(import("../../api/users/users"), () => ({
  useGetAllUsers: vi.fn(),
}));

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

import { CommunitiesPage } from "./CommunitiesPage";

describe("CommunitiesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetAllCommunities).mockReturnValue(query.success<typeof getAllCommunities>(MOCK_COMMUNITIES));
    vi.mocked(useGetMemberships).mockReturnValue(query.success<typeof getMemberships>(MOCK_MEMBERSHIPS));
    vi.mocked(useGetAllUsers).mockReturnValue(query.success<typeof getAllUsers>(MOCK_ALL_USERS));
    vi.mocked(useCreateMembership).mockReturnValue(mutation.idle({ mutateAsync: mockCreateMutate }));
    vi.mocked(useDeleteMembership).mockReturnValue(mutation.idle({ mutateAsync: mockDeleteMutate }));
    vi.mocked(useUpdateMembershipRole).mockReturnValue(mutation.idle({ mutateAsync: mockUpdateMutate }));
  });

  const setup = () => renderWithProviders(<CommunitiesPage />);

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

  it("shows a MoreVert action button per row", () => {
    setup();
    const iconButtons = screen.getAllByRole("button").filter((b) => b.textContent === "");
    expect(iconButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("navigates to /communities/:id/edit when Editar is chosen from the menu", async () => {
    const user = userEvent.setup();
    setup();

    const iconButtons = screen.getAllByRole("button").filter((b) => b.textContent === "");
    await user.click(iconButtons[0]);

    await waitFor(() => expect(screen.getByText("Editar")).toBeInTheDocument());
    await user.click(screen.getByText("Editar"));

    expect(mockNavigate).toHaveBeenCalledWith("/communities/c1/edit");
  });

  it("shows status chips Activa / Inactiva", () => {
    setup();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("Inactiva")).toBeInTheDocument();
  });

  it("opens Gestionar administradores dialog when menu item is clicked", async () => {
    const user = userEvent.setup();
    setup();

    const iconButtons = screen.getAllByRole("button").filter((b) => b.textContent === "");
    await user.click(iconButtons[0]);

    await waitFor(() => expect(screen.getByText("Gestionar administradores")).toBeInTheDocument());
    await user.click(screen.getByText("Gestionar administradores"));

    await waitFor(() =>
      expect(screen.getByText("Administradores actuales")).toBeInTheDocument(),
    );
    expect(screen.getAllByText("Sol Común").length).toBeGreaterThanOrEqual(1);
  });

  it("shows current admin in the dialog and filters them from the user picker", async () => {
    const user = userEvent.setup();
    setup();

    const iconButtons = screen.getAllByRole("button").filter((b) => b.textContent === "");
    await user.click(iconButtons[0]);
    await user.click(screen.getByText("Gestionar administradores"));

    await waitFor(() => expect(screen.getByText("Ana García")).toBeInTheDocument());

    // The picker should not list Ana García (already an admin); Bruno Leal should be available
    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await waitFor(() => expect(screen.getByRole("option", { name: "Bruno Leal" })).toBeInTheDocument());
    expect(screen.queryByRole("option", { name: "Ana García" })).not.toBeInTheDocument();
  });

  it("assigns a new admin via createMembership when user is not a member", async () => {
    const user = userEvent.setup();
    setup();

    const iconButtons = screen.getAllByRole("button").filter((b) => b.textContent === "");
    await user.click(iconButtons[0]);
    await user.click(screen.getByText("Gestionar administradores"));

    await waitFor(() => expect(screen.getByRole("combobox")).toBeInTheDocument());
    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.click(screen.getByRole("option", { name: "Bruno Leal" }));

    await user.click(screen.getByRole("button", { name: /Asignar/i }));

    await waitFor(() =>
      expect(mockCreateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: "c1",
          data: expect.objectContaining({ userId: "u2", role: "COMMUNITY_ADMIN" }),
        }),
      ),
    );
  });
});
