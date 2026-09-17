import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter } from "react-router";
import { theme } from "../../theme";
import { SupplyCoefficientHistorySection } from "./SupplyCoefficientHistorySection";
import { CommunityRole } from "../../api/models";
import type { PartitionCoefficientResponse } from "../../api/models";

const SUPPLY_ID = "supply-1";
const ACTIVE_COMMUNITY = { id: "community-1", name: "Sol Común" };
const OTHER_COMMUNITY = { id: "community-2", name: "Vecinos del Sur" };
const PLANT_NORTE = { id: "plant-norte", name: "Planta Solar Norte" };
const PLANT_SUR = { id: "plant-sur", name: "Planta Solar Sur" };

const historyCalls: { supplyId: string; params: unknown }[] = [];
let historyState: { data: PartitionCoefficientResponse[] | undefined; isLoading: boolean; error: unknown } = {
  data: [],
  isLoading: false,
  error: null,
};
let activeCommunityId: string | null = ACTIVE_COMMUNITY.id;
let activeRole: CommunityRole | null = CommunityRole.COMMUNITY_MEMBER;

vi.mock("../../api/supplies/supplies", () => ({
  useGetPartitionCoefficientHistory: (supplyId: string, params: unknown) => {
    historyCalls.push({ supplyId, params });
    return historyState;
  },
}));

vi.mock("../../context/community.context", () => ({ useActiveCommunity: () => activeCommunityId }));
vi.mock("../../hooks/useActiveCommunityRole", () => ({ useActiveCommunityRole: () => activeRole }));

function period(overrides: Partial<PartitionCoefficientResponse>): PartitionCoefficientResponse {
  return {
    id: "p1",
    supply: { id: SUPPLY_ID, code: "ES0031300000000001AB", name: "Vivienda A" },
    community: ACTIVE_COMMUNITY,
    plant: PLANT_NORTE,
    sharingAgreement: { id: "sa-2024", name: "Reparto 2024", status: "PUBLISHED" },
    coefficient: 0.15,
    validFrom: "2024-01-01T00:00:00Z",
    validTo: null,
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

/** A supply genuinely in two plants — a one-plant fixture validates no grouping. */
const TWO_PLANTS: PartitionCoefficientResponse[] = [
  period({ id: "norte", plant: PLANT_NORTE }),
  period({
    id: "sur",
    plant: PLANT_SUR,
    sharingAgreement: { id: "sa-sur", name: "Reparto Sur", status: "PUBLISHED" },
    coefficient: 0.4,
    validFrom: "2025-06-01T00:00:00Z",
  }),
];

function renderSection() {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <SupplyCoefficientHistorySection supplyId={SUPPLY_ID} />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("SupplyCoefficientHistorySection", () => {
  beforeEach(() => {
    historyCalls.length = 0;
    historyState = { data: TWO_PLANTS, isLoading: false, error: null };
    activeCommunityId = ACTIVE_COMMUNITY.id;
    activeRole = CommunityRole.COMMUNITY_MEMBER;
  });

  it("asks for every plant, passing no plantId filter", () => {
    renderSection();

    expect(historyCalls[0]).toMatchObject({ supplyId: SUPPLY_ID, params: undefined });
  });

  it("groups a supply that takes part in two plants", () => {
    renderSection();

    expect(screen.getByRole("heading", { name: "Planta Solar Norte" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Planta Solar Sur" })).toBeInTheDocument();
  });

  it("shows agreement links to a community admin", () => {
    activeRole = CommunityRole.COMMUNITY_ADMIN;
    renderSection();

    expect(screen.getByRole("link", { name: "Reparto 2024" })).toHaveAttribute(
      "href",
      "/production/plant-norte/sharing-agreements/sa-2024",
    );
  });

  it("shows no agreement links to an owner who is not an admin — the route would redirect them", () => {
    activeRole = CommunityRole.COMMUNITY_MEMBER;
    renderSection();

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText("Reparto 2024")).toBeInTheDocument();
  });

  it("does not link for a platform admin either, since CommunityAdminRoute ignores that flag", () => {
    activeRole = null;
    renderSection();

    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("hides another community's periods rather than only their links", () => {
    historyState = {
      data: [period({ id: "mine" }), period({ id: "theirs", community: OTHER_COMMUNITY, plant: PLANT_SUR })],
      isLoading: false,
      error: null,
    };
    renderSection();

    expect(screen.getByRole("heading", { name: "Planta Solar Norte" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Planta Solar Sur" })).not.toBeInTheDocument();
  });

  it("shows the empty state for a supply whose whole history belongs to another community", () => {
    historyState = { data: [period({ community: OTHER_COMMUNITY })], isLoading: false, error: null };
    renderSection();

    expect(screen.getByText("Sin periodos aplicados")).toBeInTheDocument();
  });

  it("shows the empty state, with its own wording, when the supply has no periods", () => {
    historyState = { data: [], isLoading: false, error: null };
    renderSection();

    expect(screen.getByText("Sin periodos aplicados")).toBeInTheDocument();
    expect(
      screen.getByText("Este punto de suministro todavía no tiene ningún coeficiente aplicado."),
    ).toBeInTheDocument();
  });

  it("keeps loading — never claims emptiness — while no community is selected yet", () => {
    activeCommunityId = null;
    renderSection();

    expect(screen.getByLabelText("Cargando el histórico de coeficientes")).toBeInTheDocument();
    expect(screen.queryByText("Sin periodos aplicados")).not.toBeInTheDocument();
  });

  it("keeps loading while the query is still in flight", () => {
    historyState = { data: undefined, isLoading: true, error: null };
    renderSection();

    expect(screen.getByLabelText("Cargando el histórico de coeficientes")).toBeInTheDocument();
  });

  it("surfaces a failure instead of an empty state", () => {
    historyState = { data: undefined, isLoading: false, error: new Error("boom") };
    renderSection();

    expect(screen.getByRole("alert")).toHaveTextContent("No se ha podido cargar el histórico de coeficientes");
    expect(screen.queryByText("Sin periodos aplicados")).not.toBeInTheDocument();
  });

  it("names the section and says what it is for", () => {
    renderSection();

    expect(screen.getByRole("heading", { name: "Histórico de coeficientes" })).toBeInTheDocument();
  });

  it("excludes pending periods, which an admin of the supply's community does receive", () => {
    activeRole = CommunityRole.COMMUNITY_ADMIN;
    historyState = {
      data: [
        ...TWO_PLANTS,
        period({ id: "pending", validFrom: null, sharingAgreement: { id: "sa-draft", name: "Borrador 2026", status: "DRAFT" } }),
      ],
      isLoading: false,
      error: null,
    };
    renderSection();

    expect(screen.queryByText("Borrador 2026")).not.toBeInTheDocument();
  });

  it("marks each plant's active period independently", () => {
    renderSection();

    const norte = within(screen.getByRole("list", { name: "Periodos de Planta Solar Norte" })).getAllByRole("listitem");
    const sur = within(screen.getByRole("list", { name: "Periodos de Planta Solar Sur" })).getAllByRole("listitem");
    expect(within(norte[0]).getByText("En vigor")).toBeInTheDocument();
    expect(within(sur[0]).getByText("En vigor")).toBeInTheDocument();
  });
});
