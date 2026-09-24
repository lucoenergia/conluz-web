import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import userEvent from "@testing-library/user-event";
import type { QueryClient } from "@tanstack/react-query";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { buildMembership, buildUser } from "../../test/fixtures";
import {
  getGetMembershipsQueryKey,
  useCreateMembership,
  useDeleteMembership,
  useGetMemberships,
  useUpdateMembershipRole,
  type getMemberships,
} from "../../api/memberships/memberships";
import { getGetAllCommunitiesQueryKey } from "../../api/communities/communities";
import { useGetAllUsers, type getAllUsers } from "../../api/users/users";

const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();
const mockCreateMutate = vi.fn().mockResolvedValue({});
const mockDeleteMutate = vi.fn().mockResolvedValue({});
const mockUpdateMutate = vi.fn().mockResolvedValue({});

const MOCK_MEMBERSHIPS = [
  buildMembership({
    id: "m1",
    user: buildUser({ id: "u1", fullName: "Ana García", email: "ana@example.com" }),
    communityId: "c1",
    role: "COMMUNITY_MEMBER",
    enabled: true,
  }),
  buildMembership({
    id: "m2",
    user: buildUser({ id: "u2", fullName: "Bruno Leal", email: "bruno@example.com" }),
    communityId: "c1",
    role: "COMMUNITY_ADMIN",
    enabled: true,
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

vi.mock(import("../../api/memberships/memberships"), () => ({
  useGetMemberships: vi.fn(),
  useCreateMembership: vi.fn(),
  useDeleteMembership: vi.fn(),
  useUpdateMembershipRole: vi.fn(),
  getGetMembershipsQueryKey: (id: string) => [`/api/v1/communities/${id}/memberships`] as const,
}));

vi.mock(import("../../api/communities/communities"), () => ({
  getGetAllCommunitiesQueryKey: () => ["/api/v1/communities"] as const,
}));

vi.mock(import("../../api/users/users"), () => ({
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

import { MembersPage } from "./MembersPage";

describe("MembersPage", () => {
  let mockInvalidateQueries: MockInstance<QueryClient["invalidateQueries"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetMemberships).mockReturnValue(query.success<typeof getMemberships>(MOCK_MEMBERSHIPS));
    vi.mocked(useGetAllUsers).mockReturnValue(query.success<typeof getAllUsers>(MOCK_ALL_USERS));
    vi.mocked(useCreateMembership).mockReturnValue(mutation.idle({ mutateAsync: mockCreateMutate }));
    vi.mocked(useDeleteMembership).mockReturnValue(mutation.idle({ mutateAsync: mockDeleteMutate }));
    vi.mocked(useUpdateMembershipRole).mockReturnValue(mutation.idle({ mutateAsync: mockUpdateMutate }));
  });

  // Invalidation is observed on the real QueryClient the harness creates.
  const setup = () => {
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
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: getGetMembershipsQueryKey("c1") });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllCommunitiesQueryKey() });
  });

  it("row menu opens confirmation dialog with member name on Eliminar", async () => {
    const user = userEvent.setup();
    setup();

    // Buttons: [0] Importar miembros, [1] Añadir miembro, [2] MoreVert Ana, [3] MoreVert Bruno
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[2]);

    const eliminarMenuItem = await screen.findByRole("menuitem", { name: /Eliminar/ });
    await user.click(eliminarMenuItem);

    await waitFor(() => expect(screen.getByText("Confirmar eliminación")).toBeInTheDocument());
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Ana García/)).toBeInTheDocument();
  });

  it("confirm remove calls deleteMembership and invalidates queries", async () => {
    const user = userEvent.setup();
    setup();

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[2]);

    const eliminarMenuItem = await screen.findByRole("menuitem", { name: /Eliminar/ });
    await user.click(eliminarMenuItem);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() =>
      expect(mockDeleteMutate).toHaveBeenCalledWith({ communityId: "c1", userId: "u1" }),
    );
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: getGetMembershipsQueryKey("c1") });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllCommunitiesQueryKey() });
  });

  it("role change modal calls updateRole with new role and invalidates queries", async () => {
    const user = userEvent.setup();
    setup();

    // Open menu for Ana's row (first MoreVert button after the two header buttons)
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[2]);

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
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: getGetMembershipsQueryKey("c1") });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllCommunitiesQueryKey() });
  });
});
