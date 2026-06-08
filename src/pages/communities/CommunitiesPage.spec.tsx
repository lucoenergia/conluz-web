import "@testing-library/jest-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

const mockInvalidateQueries = vi.fn();
const mockUpdateMutate = vi.fn().mockResolvedValue({});
const mockErrorDispatch = vi.fn();

const MOCK_COMMUNITIES = [
  {
    id: "c1",
    name: "Sol Común",
    code: "SOL",
    legalId: "B12345678",
    address: "Calle Mayor 1",
    enabled: true,
    adminNames: ["Ana García", "Bruno Leal", "Carlos Ruiz"],
    memberCount: 25,
    supplyPointCount: 12,
  },
  {
    id: "c2",
    name: "Verde Activa",
    code: "VRD",
    legalId: undefined,
    address: undefined,
    enabled: false,
    adminNames: ["Diana Mora"],
    memberCount: 8,
    supplyPointCount: 4,
  },
];

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return { ...actual };
});

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  };
});

vi.mock("../../api/communities/communities", () => ({
  useGetAllCommunities: () => ({ data: MOCK_COMMUNITIES, isLoading: false, error: null }),
  useUpdateCommunity: () => ({ mutateAsync: mockUpdateMutate, isPending: false }),
  getGetAllCommunitiesQueryKey: () => ["/api/v1/communities"],
}));

vi.mock("../../context/error.context", () => ({
  useErrorDispatch: () => mockErrorDispatch,
}));

import { MemoryRouter } from "react-router";
import { CommunitiesPage } from "./CommunitiesPage";

describe("CommunitiesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = () =>
    render(
      <MemoryRouter>
        <CommunitiesPage />
      </MemoryRouter>,
    );

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

  it("shows edit button per row", () => {
    setup();
    const editButtons = screen.getAllByRole("button", { name: "Editar comunidad" });
    expect(editButtons).toHaveLength(2);
  });

  it("opens edit dialog with community data when edit button clicked", async () => {
    const user = userEvent.setup();
    setup();

    const editButtons = screen.getAllByRole("button", { name: "Editar comunidad" });
    await user.click(editButtons[0]);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByDisplayValue("Sol Común")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("SOL")).toBeInTheDocument();
  });

  it("calls updateCommunity and invalidates list on save", async () => {
    const user = userEvent.setup();
    setup();

    const editButtons = screen.getAllByRole("button", { name: "Editar comunidad" });
    await user.click(editButtons[0]);

    await waitFor(() => screen.getByRole("dialog"));
    const dialog = screen.getByRole("dialog");

    const nameInput = within(dialog).getByDisplayValue("Sol Común");
    await user.clear(nameInput);
    await user.type(nameInput, "Sol Común Editada");

    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: "c1",
        data: expect.objectContaining({ name: "Sol Común Editada" }),
      }),
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["/api/v1/communities"],
    });
  });

  it("shows status chips Activa / Inactiva", () => {
    setup();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("Inactiva")).toBeInTheDocument();
  });
});
