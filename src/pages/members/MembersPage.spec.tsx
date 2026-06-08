import "@testing-library/jest-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();
const mockCreateMutate = vi.fn().mockResolvedValue({});
const mockDeleteMutate = vi.fn().mockResolvedValue({});
const mockUpdateMutate = vi.fn().mockResolvedValue({});
const mockInvalidateQueries = vi.fn();

const MOCK_MEMBERSHIPS = [
  {
    id: "m1",
    user: { id: "u1", fullName: "Ana García", email: "ana@example.com" },
    communityId: "c1",
    role: "COMMUNITY_MEMBER",
    enabled: true,
  },
  {
    id: "m2",
    user: { id: "u2", fullName: "Bruno Leal", email: "bruno@example.com" },
    communityId: "c1",
    role: "COMMUNITY_ADMIN",
    enabled: true,
  },
];

const MOCK_ALL_USERS = {
  items: [
    { id: "u1", fullName: "Ana García", email: "ana@example.com", enabled: true },
    { id: "u2", fullName: "Bruno Leal", email: "bruno@example.com", enabled: true },
    { id: "u3", fullName: "Carlos Ruiz", email: "carlos@example.com", enabled: true },
  ],
};

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  };
});

vi.mock("../../api/memberships/memberships", () => ({
  useGetMemberships: () => ({
    data: MOCK_MEMBERSHIPS,
    isLoading: false,
    error: null,
  }),
  useCreateMembership: () => ({ mutateAsync: mockCreateMutate, isPending: false }),
  useDeleteMembership: () => ({ mutateAsync: mockDeleteMutate, isPending: false }),
  useUpdateMembershipRole: () => ({ mutateAsync: mockUpdateMutate }),
  getGetMembershipsQueryKey: (id: string) => [`/api/v1/communities/${id}/memberships`],
}));

vi.mock("../../api/communities/communities", () => ({
  getGetAllCommunitiesQueryKey: () => ["/api/v1/communities"],
}));

vi.mock("../../api/users/users", () => ({
  useGetAllUsers: () => ({ data: MOCK_ALL_USERS }),
}));

vi.mock("../../context/community.context", () => ({
  useActiveCommunity: () => "c1",
}));

vi.mock("../../context/error.context", () => ({
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock("../../components/Modals/ImportPartnersModal", () => ({
  ImportPartnersModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>Import modal</div> : null,
}));

import { MemoryRouter } from "react-router";
import { MembersPage } from "./MembersPage";

describe("MembersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = () =>
    render(
      <MemoryRouter>
        <MembersPage />
      </MemoryRouter>,
    );

  it("renders census with fullName and email from membership.user", () => {
    setup();
    expect(screen.getByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("Bruno Leal")).toBeInTheDocument();
    expect(screen.getByText("bruno@example.com")).toBeInTheDocument();
  });

  it("renders role column with selects for each member", () => {
    setup();
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThanOrEqual(2);
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
        id: "c1",
        data: { userId: "u3", role: "COMMUNITY_MEMBER" },
      }),
    );
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
  });

  it("remove button opens confirmation dialog with member name", async () => {
    const user = userEvent.setup();
    setup();

    const removeButtons = screen.getAllByText("Eliminar");
    await user.click(removeButtons[0]);

    await waitFor(() => expect(screen.getByText("Confirmar eliminación")).toBeInTheDocument());
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Ana García/)).toBeInTheDocument();
  });

  it("confirm remove calls deleteMembership and invalidates queries", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getAllByText("Eliminar")[0]);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() =>
      expect(mockDeleteMutate).toHaveBeenCalledWith({ id: "c1", userId: "u1" }),
    );
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
  });

  it("role change calls updateRole with new role and invalidates queries", async () => {
    const user = userEvent.setup();
    setup();

    // Find Ana's row role select (first combobox in the main table, Ana is COMMUNITY_MEMBER)
    const tableBody = document.querySelector("tbody");
    const anaRow = tableBody?.querySelectorAll("tr")[0];
    const roleSelect = anaRow?.querySelector("[role=combobox]") as HTMLElement;
    await user.click(roleSelect);

    // Choose COMMUNITY_ADMIN from the listbox
    const listbox = await screen.findByRole("listbox");
    const adminOption = within(listbox).getByText("Administrador");
    await user.click(adminOption);

    await waitFor(() =>
      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: "c1",
        userId: "u1",
        data: { role: "COMMUNITY_ADMIN" },
      }),
    );
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
  });
});
