import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import type { CurrentUserResponse, SupplyResponse } from "../../api/models";

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
  AUGUST_2026,
  COMMUNITY_ID,
  GARAGE,
  HOME,
  NOTHING_PUBLISHED,
  OWNER_ID,
  SEPTEMBER_2026,
  member,
  membershipLatest,
  supplyLatest,
} from "./historicalAnalysis.testData";

const LATEST = { period: "LATEST_PUBLISHED_MONTH" };
const NO_DATA_TITLE = "Todavía no hay datos publicados";
const NO_DATA_BODY =
  "La distribuidora publica los datos de cada mes hacia el día 10 del mes siguiente. Los verás aquí en cuanto se publique tu primer mes.";
const ANCHOR_ERROR = "No se pudieron cargar tus datos de energía. Comprueba tu conexión e inténtalo de nuevo.";

type MembershipQuery = ReturnType<typeof useGetMembershipEnergyMetrics>;
type SupplyQuery = ReturnType<typeof useGetSupplyEnergyMetrics>;

function serveSupplies(supplies: SupplyResponse[]) {
  vi.mocked(useGetSuppliesByUserId).mockImplementation((_userId, options) =>
    options?.query?.enabled === false ? query.disabled() : query.success<typeof getSuppliesByUserId>(supplies),
  );
}

function serveMembership(answer: MembershipQuery) {
  vi.mocked(useGetMembershipEnergyMetrics).mockImplementation((_c, _u, _p, options) =>
    options?.query?.enabled === false ? query.disabled() : answer,
  );
}

function serveSupply(answer: (supplyId: string) => SupplyQuery) {
  vi.mocked(useGetSupplyEnergyMetrics).mockImplementation((supplyId, _p, options) =>
    options?.query?.enabled === false ? query.disabled() : answer(supplyId),
  );
}

const enabledCalls = <T extends unknown[]>(calls: T[], optionsAt: number) =>
  calls.filter((call) => (call[optionsAt] as { query?: { enabled?: boolean } } | undefined)?.query?.enabled !== false);

function renderPage(search = "") {
  return renderWithProviders(<HistoricalAnalysisPage />, { route: `/historical-analysis${search}`, activeCommunityId: COMMUNITY_ID });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLoggedUser = member();
  serveSupplies([HOME, GARAGE]);
  serveMembership(query.success<typeof getMembershipEnergyMetrics>(membershipLatest(SEPTEMBER_2026)));
  serveSupply((supplyId) =>
    query.success<typeof getSupplyEnergyMetrics>(supplyLatest(supplyId === HOME.id ? HOME : GARAGE, AUGUST_2026)),
  );
});

describe("UI-HIS-005 the period is anchored to the latest month published for the selected scope (#248)", () => {
  it("UI-HIS-005 'Todos mis puntos' asks the caller's membership for its latest published month, and no supply", () => {
    renderPage();

    const membershipCalls = enabledCalls(vi.mocked(useGetMembershipEnergyMetrics).mock.calls, 3);
    expect(membershipCalls.length).toBeGreaterThan(0);
    expect(membershipCalls.every(([communityId, userId, params]) => communityId === COMMUNITY_ID && userId === OWNER_ID && JSON.stringify(params) === JSON.stringify(LATEST))).toBe(true);
    expect(enabledCalls(vi.mocked(useGetSupplyEnergyMetrics).mock.calls, 2)).toEqual([]);
  });

  it("UI-HIS-005 a single supply asks that supply for its own latest published month, never the membership", () => {
    renderPage(`?supplyId=${HOME.id}`);

    const supplyCalls = enabledCalls(vi.mocked(useGetSupplyEnergyMetrics).mock.calls, 2);
    expect(supplyCalls.length).toBeGreaterThan(0);
    expect(supplyCalls.every(([supplyId, params]) => supplyId === HOME.id && JSON.stringify(params) === JSON.stringify(LATEST))).toBe(true);
    expect(enabledCalls(vi.mocked(useGetMembershipEnergyMetrics).mock.calls, 3)).toEqual([]);
  });

  it("UI-HIS-005 null bounds are a neutral 'nothing published yet', not a failure", () => {
    serveMembership(query.success<typeof getMembershipEnergyMetrics>(membershipLatest(NOTHING_PUBLISHED)));
    renderPage();

    const note = screen.getByRole("note");
    expect(note).toHaveTextContent(NO_DATA_TITLE);
    expect(note).toHaveTextContent(NO_DATA_BODY);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("UI-HIS-005 a supply with nothing published gets the same neutral state", () => {
    serveSupply((supplyId) => query.success<typeof getSupplyEnergyMetrics>(supplyLatest(supplyId === HOME.id ? HOME : GARAGE, NOTHING_PUBLISHED)));
    renderPage(`?supplyId=${GARAGE.id}`);

    expect(screen.getByRole("note")).toHaveTextContent(NO_DATA_TITLE);
  });

  it("UI-HIS-005 a failed anchor is an error with a retry, not 'nothing published'", async () => {
    const failed = query.error(apiError(500));
    serveMembership(failed);
    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(ANCHOR_ERROR);
    expect(screen.queryByText(NO_DATA_TITLE)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(failed.refetch).toHaveBeenCalled();
  });

  it("UI-HIS-005 while the anchor is pending, neither the neutral state nor an error shows", () => {
    serveMembership(query.loading());
    renderPage();

    expect(screen.queryByText(NO_DATA_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
