import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import type {
  CurrentUserResponse,
  MembershipEnergyMetricsResponse,
  SupplyEnergyMetricsResponse,
  SupplyResponse,
} from "../../api/models";

vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
}));
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSupplyEnergyMetrics: vi.fn(),
}));
vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMembershipEnergyMetrics: vi.fn(),
}));

let mockLoggedUser: CurrentUserResponse;
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => mockLoggedUser,
}));

import { getSuppliesByUserId, useGetSuppliesByUserId } from "../../api/users/users";
import { getSupplyEnergyMetrics, useGetSupplyEnergyMetrics } from "../../api/supplies/supplies";
import { getMembershipEnergyMetrics, useGetMembershipEnergyMetrics } from "../../api/memberships/memberships";
import { HistoricalAnalysisPage } from "./HistoricalAnalysisPage";
import {
  COMMUNITY_ID,
  GARAGE,
  HOME,
  NOTHING_PUBLISHED,
  OWNER_ID,
  PLANT_SUPPLY,
  SEPTEMBER_2026,
  derivedMembershipFigures,
  derivedSupplyFigures,
  member,
  membershipLatest,
  supplyLatest,
} from "./historicalAnalysis.testData";

const CARD = "De la energía que te tocó";
const TECHNICAL_TERMS =
  "En términos técnicos, la primera cifra es tu porcentaje de autoconsumo y la segunda, tu porcentaje de autosuficiencia.";
const LOAD_ERROR = "No se pudieron cargar tus datos de energía. Comprueba tu conexión e inténtalo de nuevo.";
const INCOMPLETE = "Faltan datos de parte de este periodo: las cifras suman solo los datos disponibles.";
const JULY_2026 = { startDate: "2026-07-01T00:00:00+02:00", endDate: "2026-08-01T00:00:00+02:00" };

type MembershipQuery = ReturnType<typeof useGetMembershipEnergyMetrics>;
type SupplyQuery = ReturnType<typeof useGetSupplyEnergyMetrics>;
type Options = { query?: { enabled?: boolean } } | undefined;

/** The anchor asks by `period`; the figures by explicit bounds. */
const isAnchorCall = (params: unknown) => typeof params === "object" && params !== null && "period" in params;

let membershipFigures: () => MembershipQuery;
let supplyFigures: (supplyId: string) => SupplyQuery;

function serve(supplies: SupplyResponse[]) {
  vi.mocked(useGetSuppliesByUserId).mockImplementation((_userId, options) =>
    options?.query?.enabled === false ? query.disabled() : query.success<typeof getSuppliesByUserId>(supplies),
  );
  vi.mocked(useGetMembershipEnergyMetrics).mockImplementation((_c, _u, params, options) => {
    if (options?.query?.enabled === false) return query.disabled();
    return isAnchorCall(params) ? query.success<typeof getMembershipEnergyMetrics>(membershipLatest(SEPTEMBER_2026)) : membershipFigures();
  });
  vi.mocked(useGetSupplyEnergyMetrics).mockImplementation((supplyId, params, options) => {
    if (options?.query?.enabled === false) return query.disabled();
    if (!isAnchorCall(params)) return supplyFigures(supplyId);
    const supply = supplies.find(({ id }) => id === supplyId)!;
    return query.success<typeof getSupplyEnergyMetrics>(supplyLatest(supply, SEPTEMBER_2026));
  });
}

const membershipAnswers = (figures: MembershipEnergyMetricsResponse) => {
  membershipFigures = () => query.success<typeof getMembershipEnergyMetrics>(figures);
};
const supplyAnswers = (figures: SupplyEnergyMetricsResponse) => {
  supplyFigures = () => query.success<typeof getSupplyEnergyMetrics>(figures);
};

const enabledFigureCalls = <T extends unknown[]>(calls: T[], paramsAt: number) =>
  calls.filter((call) => (call[paramsAt + 1] as Options)?.query?.enabled !== false && !isAnchorCall(call[paramsAt]));

function renderPage(search = "") {
  return renderWithProviders(<HistoricalAnalysisPage />, { route: `/historical-analysis${search}`, activeCommunityId: COMMUNITY_ID });
}

const card = () => screen.getByRole("region", { name: CARD });

beforeEach(() => {
  vi.clearAllMocks();
  mockLoggedUser = member();
  serve([HOME, GARAGE, PLANT_SUPPLY]);
  membershipAnswers(derivedMembershipFigures());
  supplyFigures = (supplyId) => {
    const supply = [HOME, GARAGE, PLANT_SUPPLY].find(({ id }) => id === supplyId)!;
    return query.success<typeof getSupplyEnergyMetrics>(derivedSupplyFigures(supply));
  };
});

describe("UI-HIS-010 the figures come from the energy metrics of the resolved period and scope (#249)", () => {
  it("UI-HIS-010 'Todos mis puntos' asks the caller's membership by the period's explicit bounds, and no supply", () => {
    renderPage();

    const calls = enabledFigureCalls(vi.mocked(useGetMembershipEnergyMetrics).mock.calls, 2);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every(([communityId, userId, params]) => communityId === COMMUNITY_ID && userId === OWNER_ID && JSON.stringify(params) === JSON.stringify(SEPTEMBER_2026))).toBe(true);
    expect(enabledFigureCalls(vi.mocked(useGetSupplyEnergyMetrics).mock.calls, 1)).toEqual([]);
  });

  it("UI-HIS-010 a single supply asks that supply by the period's explicit bounds, and never the membership", () => {
    renderPage(`?supplyId=${HOME.id}`);

    const calls = enabledFigureCalls(vi.mocked(useGetSupplyEnergyMetrics).mock.calls, 1);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every(([supplyId, params]) => supplyId === HOME.id && JSON.stringify(params) === JSON.stringify(SEPTEMBER_2026))).toBe(true);
    expect(enabledFigureCalls(vi.mocked(useGetMembershipEnergyMetrics).mock.calls, 2)).toEqual([]);
  });

  it("UI-HIS-010 a chosen period is asked by its own bounds, not by the anchor month", () => {
    renderPage("?period=custom&from=2026-07-01&to=2026-07-31");

    const calls = enabledFigureCalls(vi.mocked(useGetMembershipEnergyMetrics).mock.calls, 2);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every(([, , params]) => JSON.stringify(params) === JSON.stringify(JULY_2026))).toBe(true);
  });

  it.each([
    ["the anchor is pending", () => query.loading()],
    ["nothing is published", () => query.success<typeof getMembershipEnergyMetrics>(membershipLatest(NOTHING_PUBLISHED))],
  ])("UI-HIS-010 nothing is fetched for the figures while the period is unknown: %s", (_case, anchor) => {
    vi.mocked(useGetMembershipEnergyMetrics).mockImplementation((_c, _u, params, options) => {
      if (options?.query?.enabled === false) return query.disabled();
      return isAnchorCall(params) ? (anchor() as MembershipQuery) : membershipFigures();
    });
    renderPage();

    expect(enabledFigureCalls(vi.mocked(useGetMembershipEnergyMetrics).mock.calls, 2)).toEqual([]);
    expect(enabledFigureCalls(vi.mocked(useGetSupplyEnergyMetrics).mock.calls, 1)).toEqual([]);
    expect(screen.queryByRole("region", { name: CARD })).not.toBeInTheDocument();
  });

  it("UI-HIS-010 the headline is selfConsumptionRatio, not the ratio of its basis", () => {
    // Derived: the basis (485 of 724 kWh) would round to 67 %; the field says 50 %.
    membershipAnswers(derivedMembershipFigures({ selfConsumptionRatio: 0.5 }));
    renderPage();

    expect(within(card()).getByText("Usaste el 50 %")).toBeInTheDocument();
    expect(card()).not.toHaveTextContent("67 %");
  });

  it("UI-HIS-010 the coverage is selfSufficiencyRatio, not the ratio of the energy totals", () => {
    // Derived: the totals (485 of 1155 kWh) would round to 42 % and "4 de cada 10"; the field says 15 %.
    membershipAnswers(derivedMembershipFigures({ selfSufficiencyRatio: 0.15 }));
    renderPage();

    expect(card()).toHaveTextContent("Eso cubrió 2 de cada 10 kWh de tu consumo");
    expect(card()).toHaveTextContent("485 de 1155 kWh · 15 % · el resto lo compraste a la red");
    expect(card()).not.toHaveTextContent("42 %");
  });

  it("UI-HIS-010 while the figures are pending, a placeholder stands in the card's place", () => {
    membershipFigures = () => query.loading();
    renderPage();

    expect(screen.getByRole("progressbar", { name: "Cargando tus datos…" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: CARD })).not.toBeInTheDocument();
  });

  it("UI-HIS-010 a failed request is an error with a retry, and no card", async () => {
    const failed = query.error(apiError(500));
    membershipFigures = () => failed as MembershipQuery;
    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(LOAD_ERROR);
    expect(screen.queryByRole("region", { name: CARD })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(failed.refetch).toHaveBeenCalled();
  });
});

describe("UI-HIS-011 one headline, and the coverage as a sentence (#249)", () => {
  it("UI-HIS-011 the card leads with the share used and its basis, then the coverage of the consumption", () => {
    renderPage();

    const region = card();
    expect(within(region).getByText("Usaste el 67 %")).toBeInTheDocument();
    expect(region).toHaveTextContent("485 de 724 kWh · el resto se fue a la red");
    expect(region).toHaveTextContent("Eso cubrió 4 de cada 10 kWh de tu consumo");
    expect(region).toHaveTextContent("485 de 1155 kWh · 42 % · el resto lo compraste a la red");
    // Only the fraction is set apart, at body size.
    expect(within(region).getByText("4 de cada 10 kWh").tagName).toBe("SPAN");
  });

  it("UI-HIS-011 the technical names of the ratios appear only in the caption's tooltip", async () => {
    renderPage();

    expect(card().textContent).not.toMatch(/autoconsumo|autosuficiencia|÷/);
    await userEvent.hover(within(card()).getByRole("button", { name: "Qué significan estas cifras" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(TECHNICAL_TERMS);
  });

  it("UI-HIS-011 nothing left to the grid and nothing bought from it are stated as such", () => {
    membershipAnswers(derivedMembershipFigures({ selfConsumptionRatio: 1, selfSufficiencyRatio: 0 }));
    renderPage();

    expect(card()).toHaveTextContent("485 de 724 kWh · no se fue nada a la red");
    expect(card()).toHaveTextContent("Tu consumo no se cubrió con energía de la comunidad");
    expect(card()).toHaveTextContent("485 de 1155 kWh · 0 % · todo lo compraste a la red");
  });
});

describe("UI-HIS-013 the card's states follow selfConsumptionRatioStatus (#249)", () => {
  const NOT_APPLICABLE = derivedSupplyFigures(PLANT_SUPPLY, { selfConsumptionRatioStatus: "NOT_APPLICABLE", selfConsumptionRatio: null });

  it("UI-HIS-013 a plant's own supply is not applicable: a neutral headline, no bar or detail, and the coverage stays", () => {
    supplyAnswers(NOT_APPLICABLE);
    renderPage(`?supplyId=${PLANT_SUPPLY.id}`);

    const region = card();
    expect(region).toHaveTextContent("No aplica al punto de la planta");
    expect(region).toHaveTextContent("En el punto de la planta, «se fue a la red» siempre es 0 kWh.");
    expect(region).not.toHaveTextContent("Usaste");
    expect(region).not.toHaveTextContent("de 724 kWh");
    expect(region).toHaveTextContent("Eso cubrió 4 de cada 10 kWh de tu consumo");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("UI-HIS-013 a plant's own supply is introduced by a notice naming its plant", () => {
    supplyAnswers(NOT_APPLICABLE);
    renderPage(`?supplyId=${PLANT_SUPPLY.id}`);

    expect(screen.getByRole("note")).toHaveTextContent(
      "Cubierta del polideportivo es el punto de suministro de la planta 21088 Luco de Jiloca: «se fue a la red» siempre es 0 kWh.",
    );
  });

  it("UI-HIS-013 no notice introduces a supply that is no plant's", () => {
    supplyAnswers(derivedSupplyFigures(HOME));
    renderPage(`?supplyId=${HOME.id}`);

    expect(card()).toBeInTheDocument();
    expect(screen.queryByText(/es el punto de suministro de la planta/)).not.toBeInTheDocument();
  });

  it("UI-HIS-013 the status decides, not the null ratio: nothing assigned never reads as 'No aplica'", () => {
    membershipAnswers(derivedMembershipFigures({ selfConsumptionRatioStatus: "NOTHING_ASSIGNED", selfConsumptionRatio: null }));
    renderPage();

    expect(card()).toHaveTextContent("En este periodo no se te asignó energía");
    expect(card()).not.toHaveTextContent("No aplica");
  });

  it("UI-HIS-013 nothing assigned: a neutral headline, no bar or detail, and the coverage follows its rule", () => {
    membershipAnswers(
      derivedMembershipFigures({ selfConsumptionRatioStatus: "NOTHING_ASSIGNED", selfConsumptionRatio: null, selfSufficiencyRatio: 0 }),
    );
    renderPage();

    const region = card();
    expect(region).toHaveTextContent("En este periodo no se te asignó energía");
    expect(region).not.toHaveTextContent("Usaste");
    expect(region).not.toHaveTextContent("de 724 kWh");
    expect(region).toHaveTextContent("Tu consumo no se cubrió con energía de la comunidad");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    [1, "No incluye 1 punto de planta"],
    [2, "No incluye 2 puntos de planta"],
  ])("UI-HIS-013 %s excluded plant supply is stated: %j", (count, text) => {
    const base = derivedMembershipFigures();
    membershipAnswers({ ...base, selfConsumptionRatioBasis: { ...base.selfConsumptionRatioBasis, excludedPlantSupplyCount: count } });
    renderPage();

    expect(card()).toHaveTextContent(text);
  });

  it("UI-HIS-013 with no plant supply excluded, none is mentioned", () => {
    renderPage();

    expect(card()).not.toHaveTextContent("No incluye");
  });

  it("UI-HIS-013 with nothing consumed, the coverage row is not shown", () => {
    membershipAnswers(derivedMembershipFigures({ selfSufficiencyRatio: null }));
    renderPage();

    expect(within(card()).getByText("Usaste el 67 %")).toBeInTheDocument();
    expect(card()).not.toHaveTextContent("Eso cubrió");
    expect(card()).not.toHaveTextContent("lo compraste a la red");
  });
});

describe("UI-HIS-014 incomplete coverage is stated in words (#249)", () => {
  it("UI-HIS-014 fewer hours with data than expected is stated under the card", () => {
    const complete = derivedMembershipFigures();
    membershipAnswers({ ...complete, coverage: { ...complete.coverage, hoursWithData: complete.coverage.expectedHours - 1 } });
    renderPage();

    expect(screen.getByRole("note")).toHaveTextContent(INCOMPLETE);
  });

  it("UI-HIS-014 complete coverage states nothing", () => {
    renderPage();

    expect(card()).toBeInTheDocument();
    expect(screen.queryByText(INCOMPLETE)).not.toBeInTheDocument();
  });
});

describe("UI-HIS-010 the totals are fields of the same response (#249)", () => {
  const totals = () => screen.getByRole("list", { name: "Totales del periodo" });
  const tile = (label: string) => within(totals()).getAllByRole("listitem").find((item) => item.textContent?.startsWith(label))!;
  const ESTIMATE_LABEL = "Estimado con un precio de 0,15 €/kWh para la energía, sin impuestos.";

  it("UI-HIS-010 four tiles: from the community, from the grid, to the grid and the estimated savings", () => {
    renderPage();

    expect(within(totals()).getAllByRole("listitem")).toHaveLength(4);
    expect(tile("De la comunidad")).toHaveTextContent("485 kWh");
    expect(tile("De la comunidad")).toHaveTextContent("Energía asignada que usaste");
    expect(tile("De la red")).toHaveTextContent("670 kWh");
    expect(tile("De la red")).toHaveTextContent("Comprada a tu comercializadora");
    expect(tile("Se fue a la red")).toHaveTextContent("239 kWh");
    expect(tile("Se fue a la red")).toHaveTextContent("Se te asignó y no la usaste");
    expect(tile("Ahorro estimado")).toHaveTextContent("72,75 €");
  });

  it("UI-HIS-010 the estimate label shows the price the response carries", () => {
    renderPage();

    expect(tile("Ahorro estimado")).toHaveTextContent(ESTIMATE_LABEL);
  });

  it("UI-HIS-010 without an estimated price there is no estimate label, even when tariffSource says ESTIMATE", () => {
    const base = derivedMembershipFigures();
    membershipAnswers({ ...base, savings: { ...base.savings, tariffSource: "ESTIMATE", estimatedPrice: null } });
    renderPage();

    expect(tile("Ahorro estimado")).toHaveTextContent("72,75 €");
    expect(tile("Ahorro estimado")).not.toHaveTextContent("Estimado con");
  });

  it("UI-HIS-013 for a plant's own supply, the surplus tile says it is always 0 there", () => {
    supplyAnswers(derivedSupplyFigures(PLANT_SUPPLY, { selfConsumptionRatioStatus: "NOT_APPLICABLE", selfConsumptionRatio: null }));
    renderPage(`?supplyId=${PLANT_SUPPLY.id}`);

    expect(tile("Se fue a la red")).toHaveTextContent("Siempre 0 en el punto de la planta");
    expect(tile("Se fue a la red")).not.toHaveTextContent("Se te asignó y no la usaste");
  });

  it("UI-HIS-011 neither the card nor the totals name the technical terms outside the tooltip", () => {
    renderPage();

    expect(card()).toBeInTheDocument();
    expect(totals()).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/autoconsumo|autosuficiencia|excedentes|÷/);
  });
});
