import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { useGetMemberships, type getMemberships } from "../../api/memberships/memberships";
import { useGetAllPlants, type getAllPlants } from "../../api/plants/plants";
import { useGetSharingAgreements, type getSharingAgreements } from "../../api/sharing-agreements/sharing-agreements";
import { useGetAllSupplies, type getAllSupplies } from "../../api/supplies/supplies";
import { useGetSuppliesByUserId, type getSuppliesByUserId } from "../../api/users/users";
import {
  CommunityRole,
  SharingAgreementResponseStatus,
  type MembershipResponse,
  type PlantResponse,
  type SharingAgreementResponse,
} from "../../api/models";
import { useLoggedUser } from "../../context/logged-user.context";
import { buildMembership, buildPlant, buildSharingAgreement, buildSupply } from "../../test/fixtures";
import { query } from "../../test/queryState";
import { renderWithProviders } from "../../test/renderWithProviders";
import { CommunityManagementPage } from "./CommunityManagementPage";
import { COMMUNITY_A, answerCommunities, currentUser, ownSupply } from "./homeViews.mocks";

vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMemberships: vi.fn(),
}));
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllSupplies: vi.fn(),
}));
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllPlants: vi.fn(),
}));
vi.mock(import("../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSharingAgreements: vi.fn(),
}));
// The view switch asks the active community what the caller may do there, and
// whether the caller owns supplies in it.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
}));
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: vi.fn(),
}));

const { DRAFT, PUBLISHED, SUPERSEDED } = SharingAgreementResponseStatus;

const failure = () => query.error(new Error("read failed"));

function members(enabled: number, disabled = 0): MembershipResponse[] {
  return [
    ...Array.from({ length: enabled }, (_, i) => buildMembership({ id: `on-${i}`, communityId: COMMUNITY_A, enabled: true })),
    ...Array.from({ length: disabled }, (_, i) => buildMembership({ id: `off-${i}`, communityId: COMMUNITY_A, enabled: false })),
  ];
}

/** A page of one supply whose total says how many the community has. */
function supplyPage(totalElements: number) {
  return {
    items: totalElements > 0 ? [buildSupply({ id: "supply-1" })] : [],
    size: 1,
    totalElements,
    totalPages: totalElements,
    number: 0,
  };
}

function plant(id: string, name: string): PlantResponse {
  return buildPlant({ id, name, community: { id: COMMUNITY_A } });
}

function plantPage(plants: PlantResponse[]) {
  return { items: plants, size: 10000, totalElements: plants.length, totalPages: 1, number: 0 };
}

const agreement = (id: string, plantId: string, status: SharingAgreementResponseStatus, name = `Acuerdo ${id}`) =>
  buildSharingAgreement({ id, plantId, status, name });

const SOLAR = plant("plant-solar", "Planta Solar Norte");
const ROOF = plant("plant-roof", "Cubierta del polideportivo");

function answer({
  memberships = query.success<typeof getMemberships>(members(12)),
  supplies = query.success<typeof getAllSupplies>(supplyPage(31)),
  plants = query.success<typeof getAllPlants>(plantPage([SOLAR])),
  agreements = { [SOLAR.id]: [agreement("a1", SOLAR.id, PUBLISHED, "Reparto 2026")] },
}: {
  memberships?: ReturnType<typeof useGetMemberships>;
  supplies?: ReturnType<typeof useGetAllSupplies>;
  plants?: ReturnType<typeof useGetAllPlants>;
  agreements?: Record<string, SharingAgreementResponse[] | "error" | "loading">;
} = {}) {
  vi.mocked(useGetMemberships).mockReturnValue(memberships);
  vi.mocked(useGetAllSupplies).mockReturnValue(supplies);
  vi.mocked(useGetAllPlants).mockReturnValue(plants);
  vi.mocked(useGetSharingAgreements).mockImplementation((plantId) => {
    const answerFor = agreements[plantId];
    if (answerFor === "error") return failure();
    if (answerFor === "loading" || answerFor === undefined) return query.loading();
    return query.success<typeof getSharingAgreements>(answerFor);
  });
}

function ownsSupplies(owns: boolean) {
  vi.mocked(useGetSuppliesByUserId).mockReturnValue(
    query.success<typeof getSuppliesByUserId>(owns ? [ownSupply(COMMUNITY_A)] : []),
  );
}

function openManagement() {
  return renderWithProviders(<CommunityManagementPage />, { activeCommunityId: COMMUNITY_A });
}

const card = (name: string) => screen.getByRole("region", { name });
const membersCard = () => card("Miembros");
const suppliesCard = () => card("Puntos de suministro");
const agreementsCard = () => card("Acuerdos de reparto");
const plantRow = (name: string) => within(agreementsCard()).getByRole("listitem", { name });

describe("CommunityManagementPage (#198)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLoggedUser).mockReturnValue(currentUser({ [COMMUNITY_A]: CommunityRole.COMMUNITY_ADMIN }));
    answerCommunities({ adminOf: [COMMUNITY_A] });
    ownsSupplies(false);
    answer();
  });

  describe("AC1: the community's members and supply points", () => {
    it("counts the enabled members of the selected community", () => {
      answer({ memberships: query.success<typeof getMemberships>(members(2, 1)) });
      openManagement();

      expect(within(membersCard()).getByText("2")).toBeInTheDocument();
      expect(vi.mocked(useGetMemberships).mock.lastCall?.[0]).toBe(COMMUNITY_A);
    });

    it("counts every supply point of the community, not the rows of the page it reads", () => {
      answer({ supplies: query.success<typeof getAllSupplies>(supplyPage(57)) });
      openManagement();

      expect(within(suppliesCard()).getByText("57")).toBeInTheDocument();
      expect(vi.mocked(useGetAllSupplies).mock.lastCall?.slice(0, 2)).toEqual([COMMUNITY_A, { size: 1 }]);
    });
  });

  describe("AC2: each plant's sharing agreement status", () => {
    it("shows the agreement in force of one plant and the draft of another", () => {
      answer({
        plants: query.success<typeof getAllPlants>(plantPage([SOLAR, ROOF])),
        agreements: {
          [SOLAR.id]: [agreement("a1", SOLAR.id, SUPERSEDED, "Reparto 2025"), agreement("a2", SOLAR.id, PUBLISHED, "Reparto 2026")],
          [ROOF.id]: [agreement("a3", ROOF.id, DRAFT, "Reparto cubierta")],
        },
      });
      openManagement();

      expect(within(plantRow("Planta Solar Norte")).getByText("Vigente")).toBeInTheDocument();
      expect(within(plantRow("Planta Solar Norte")).getByText("Reparto 2026")).toBeInTheDocument();
      expect(within(plantRow("Planta Solar Norte")).queryByText("Reparto 2025")).not.toBeInTheDocument();
      expect(within(plantRow("Cubierta del polideportivo")).getByRole("note")).toHaveTextContent(
        "Su acuerdo de reparto está en preparación",
      );
    });
  });

  describe("AC3: no plant, or a plant without an agreement, explained neutrally", () => {
    it("explains a community with no plant, with no alert", () => {
      answer({ plants: query.success<typeof getAllPlants>(plantPage([])) });
      openManagement();

      expect(within(agreementsCard()).getByRole("note")).toHaveTextContent("La comunidad todavía no tiene plantas");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("explains a plant that has no agreement yet, with no alert", () => {
      answer({ agreements: { [SOLAR.id]: [] } });
      openManagement();

      expect(within(plantRow("Planta Solar Norte")).getByRole("note")).toHaveTextContent(
        "Todavía no tiene acuerdo de reparto.",
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("explains a plant whose agreements have all ended, with no alert", () => {
      answer({ agreements: { [SOLAR.id]: [agreement("a1", SOLAR.id, SUPERSEDED)] } });
      openManagement();

      expect(within(plantRow("Planta Solar Norte")).getByRole("note")).toHaveTextContent(
        "No tiene ningún acuerdo de reparto en vigor",
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("AC4 and AC5: the route to the admin's member view", () => {
    it("offers the member view to an admin who owns supplies in the community", () => {
      ownsSupplies(true);
      openManagement();

      expect(screen.getByRole("tablist", { name: "Vistas de inicio" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Tu energía" })).toHaveAttribute("href", "/home/member");
    });

    it("offers no route to a member view anywhere to an admin who owns none", () => {
      openManagement();

      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
      expect(screen.queryByRole("tab", { name: "Tu energía" })).not.toBeInTheDocument();
      expect(document.querySelector('a[href="/home/member"]')).toBeNull();
    });
  });

  describe("AC6: loading and failed reads never show a misleading zero", () => {
    it("shows zero supply points when the community has none", () => {
      answer({ supplies: query.success<typeof getAllSupplies>(supplyPage(0)) });
      openManagement();

      expect(suppliesCard()).toHaveTextContent(/^Puntos de suministro0$/);
      expect(within(suppliesCard()).queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows a supply count that could not be read as a failure, never as zero", () => {
      answer({ supplies: failure() });
      openManagement();

      expect(within(suppliesCard()).getByRole("alert")).toHaveTextContent("No se pudo cargar el número de puntos de suministro.");
      expect(within(suppliesCard()).queryByText("0")).not.toBeInTheDocument();
    });

    it("shows zero members when the community has none enabled", () => {
      answer({ memberships: query.success<typeof getMemberships>(members(0, 2)) });
      openManagement();

      expect(membersCard()).toHaveTextContent(/^Miembros0$/);
      expect(within(membersCard()).queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows a member count that could not be read as a failure, never as zero", () => {
      answer({ memberships: failure() });
      openManagement();

      expect(within(membersCard()).getByRole("alert")).toHaveTextContent("No se pudo cargar el número de miembros.");
      expect(within(membersCard()).queryByText("0")).not.toBeInTheDocument();
    });

    it("shows no figure at all while everything is loading", () => {
      answer({ memberships: query.loading(), supplies: query.loading(), plants: query.loading() });
      openManagement();

      expect(screen.getByLabelText("Cargando el número de miembros")).toBeInTheDocument();
      expect(screen.getByLabelText("Cargando el número de puntos de suministro")).toBeInTheDocument();
      expect(screen.getByLabelText("Cargando las plantas de la comunidad")).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/\d/);
    });

    it("shows no status for a plant whose agreements are still loading", () => {
      answer({ agreements: { [SOLAR.id]: "loading" } });
      openManagement();

      expect(screen.getByLabelText("Cargando el acuerdo de reparto de Planta Solar Norte")).toBeInTheDocument();
      expect(within(plantRow("Planta Solar Norte")).queryByRole("note")).not.toBeInTheDocument();
      expect(within(plantRow("Planta Solar Norte")).queryByText("Vigente")).not.toBeInTheDocument();
    });
  });

  describe("one failed read leaves the rest of the view in place", () => {
    it("keeps the supply count and the plants when the members fail", () => {
      answer({ memberships: failure() });
      openManagement();

      expect(within(suppliesCard()).getByText("31")).toBeInTheDocument();
      expect(within(plantRow("Planta Solar Norte")).getByText("Vigente")).toBeInTheDocument();
    });

    it("keeps the member count and the plants when the supplies fail", () => {
      answer({ supplies: failure() });
      openManagement();

      expect(within(membersCard()).getByText("12")).toBeInTheDocument();
      expect(within(plantRow("Planta Solar Norte")).getByText("Vigente")).toBeInTheDocument();
    });

    it("keeps both counts when the plants fail", () => {
      answer({ plants: failure() });
      openManagement();

      expect(within(agreementsCard()).getByRole("alert")).toHaveTextContent(
        "No se pudieron cargar las plantas de la comunidad.",
      );
      expect(within(membersCard()).getByText("12")).toBeInTheDocument();
      expect(within(suppliesCard()).getByText("31")).toBeInTheDocument();
    });

    it("keeps the other plants' status when one plant's agreements fail", () => {
      answer({
        plants: query.success<typeof getAllPlants>(plantPage([SOLAR, ROOF])),
        agreements: { [SOLAR.id]: "error", [ROOF.id]: [agreement("a3", ROOF.id, PUBLISHED, "Reparto cubierta")] },
      });
      openManagement();

      expect(within(plantRow("Planta Solar Norte")).getByRole("alert")).toHaveTextContent(
        "No se pudo cargar el acuerdo de reparto de Planta Solar Norte.",
      );
      expect(within(plantRow("Cubierta del polideportivo")).getByText("Reparto cubierta")).toBeInTheDocument();
      expect(within(membersCard()).getByText("12")).toBeInTheDocument();
    });

    it("retries the read that failed", async () => {
      const failedSupplies = failure();
      answer({ supplies: failedSupplies });
      openManagement();

      await userEvent.click(within(suppliesCard()).getByRole("button", { name: "Reintentar" }));

      expect(failedSupplies.refetch).toHaveBeenCalledTimes(1);
    });
  });
});
