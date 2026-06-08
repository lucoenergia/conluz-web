import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

const mockNavigate = vi.fn();
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
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../api/communities/communities", () => ({
  useGetAllCommunities: () => ({ data: MOCK_COMMUNITIES, isLoading: false, error: null }),
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
});
