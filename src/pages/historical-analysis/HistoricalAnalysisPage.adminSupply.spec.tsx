import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildCurrentUser,
  buildMemberRecord,
  buildSupplyCapabilities,
} from "../../test/fixtures";
import type { CurrentUserResponse, SupplyResponse } from "../../api/models";

// ApexCharts cannot lay out in jsdom, and the charts' drawing is not this spec's subject.
// String form: the typed one cannot express this module's default export.
vi.mock("react-apexcharts", () => ({ default: () => null }));

vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
}));
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSupply: vi.fn(),
  useGetSupplyEnergyMetrics: vi.fn(),
  useGetSupplyDailyConsumption: vi.fn(),
  useGetSupplyMonthlyConsumption: vi.fn(),
  useGetSupplyHourlyConsumption: vi.fn(),
}));
vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMembershipEnergyMetrics: vi.fn(),
  useGetMembershipDailyConsumption: vi.fn(),
  useGetMembershipMonthlyConsumption: vi.fn(),
  useGetMembershipHourlyConsumption: vi.fn(),
}));
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));

const mockErrorDispatch = vi.fn();
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

let mockLoggedUser: CurrentUserResponse;
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => mockLoggedUser,
}));

import { getSuppliesByUserId, useGetSuppliesByUserId } from "../../api/users/users";
import {
  getSupply,
  getSupplyDailyConsumption,
  getSupplyEnergyMetrics,
  useGetSupply,
  useGetSupplyDailyConsumption,
  useGetSupplyEnergyMetrics,
  useGetSupplyHourlyConsumption,
  useGetSupplyMonthlyConsumption,
} from "../../api/supplies/supplies";
import {
  getMembershipEnergyMetrics,
  useGetMembershipDailyConsumption,
  useGetMembershipEnergyMetrics,
  useGetMembershipHourlyConsumption,
  useGetMembershipMonthlyConsumption,
} from "../../api/memberships/memberships";
import { getCommunityById, useGetCommunityById } from "../../api/communities/communities";
import { HistoricalAnalysisPage } from "./HistoricalAnalysisPage";
import {
  COMMUNITY_ID,
  HOME,
  OWNER_ID,
  SEPTEMBER_2026,
  derivedMembershipFigures,
  derivedSupplyFigures,
  membershipLatest,
  supplyBucket,
  supplyLatest,
} from "./historicalAnalysis.testData";

const SELECTOR = /^Punto de suministro/;
const ALL = "Todos mis puntos";
const VIEWED_GROUP = "Punto que estás consultando";
const FOOTER = "Solo aparecen tus puntos activos en esta comunidad.";

/** Another member's enabled supply in the active community, which opens its figures to a community admin. */
const MEMBERS: SupplyResponse = {
  ...HOME,
  id: "members-supply",
  name: "Casa de Lucía",
  code: "ES0021000000000009AA",
  user: { id: "another-member" },
  ownerRecord: buildMemberRecord({ fullName: "Lucía Martínez Soler" }),
  capabilities: buildSupplyCapabilities({ canRead: true, canEdit: true }),
};
const MEMBERS_LABEL = "Casa de Lucía · ES0021000000000009AA · Lucía Martínez Soler";
const OTHER_COMMUNITY: SupplyResponse = { ...MEMBERS, id: "other-community", community: { id: "community-b", name: "Otra" } };
const DISABLED: SupplyResponse = { ...MEMBERS, id: "disabled", enabled: false };
const UNREADABLE: SupplyResponse = { ...MEMBERS, id: "unreadable", capabilities: buildSupplyCapabilities({}) };

const admin = () => buildCurrentUser({ id: OWNER_ID, memberships: { [COMMUNITY_ID]: "COMMUNITY_ADMIN" } });
const plainMember = () => buildCurrentUser({ id: OWNER_ID, memberships: { [COMMUNITY_ID]: "COMMUNITY_MEMBER" } });

type Lookup = ReturnType<typeof useGetSupply>;
type Options = { query?: { enabled?: boolean } } | undefined;
const isEnabled = (options: unknown) => (options as Options)?.query?.enabled !== false;
const isAnchorCall = (params: unknown) => typeof params === "object" && params !== null && "period" in params;

/** What GET /supplies/{id} answers in a test: the supply, a refusal, a failure, or nothing yet. */
let lookup: (supplyId: string) => Lookup;
let canManage: boolean | "pending";

function serve() {
  vi.mocked(useGetSuppliesByUserId).mockImplementation((_userId, options) =>
    isEnabled(options) ? query.success<typeof getSuppliesByUserId>([HOME]) : query.disabled(),
  );
  vi.mocked(useGetCommunityById).mockImplementation((_id, options) => {
    if (!isEnabled(options)) return query.disabled();
    if (canManage === "pending") return query.loading();
    return query.success<typeof getCommunityById>(
      buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities({ canRead: true, canManage }) }),
    );
  });
  vi.mocked(useGetSupply).mockImplementation((supplyId, options) =>
    isEnabled(options) && supplyId ? lookup(supplyId) : query.disabled(),
  );
  vi.mocked(useGetSupplyEnergyMetrics).mockImplementation((supplyId, params, options) => {
    if (!isEnabled(options)) return query.disabled();
    const supply = [HOME, MEMBERS].find(({ id }) => id === supplyId)!;
    return query.success<typeof getSupplyEnergyMetrics>(
      isAnchorCall(params) ? supplyLatest(supply, SEPTEMBER_2026) : derivedSupplyFigures(supply),
    );
  });
  vi.mocked(useGetSupplyDailyConsumption).mockImplementation((_supplyId, _params, options) =>
    isEnabled(options)
      ? query.success<typeof getSupplyDailyConsumption>(
          Array.from({ length: 30 }, (_, index) => supplyBucket(`2026/09/${String(index + 1).padStart(2, "0")}`)),
        )
      : query.disabled(),
  );
  vi.mocked(useGetSupplyMonthlyConsumption).mockReturnValue(query.disabled());
  vi.mocked(useGetSupplyHourlyConsumption).mockReturnValue(query.disabled());
  vi.mocked(useGetMembershipEnergyMetrics).mockImplementation((_c, _u, params, options) => {
    if (!isEnabled(options)) return query.disabled();
    return query.success<typeof getMembershipEnergyMetrics>(
      isAnchorCall(params) ? membershipLatest(SEPTEMBER_2026) : derivedMembershipFigures(),
    );
  });
  vi.mocked(useGetMembershipDailyConsumption).mockReturnValue(query.loading());
  vi.mocked(useGetMembershipMonthlyConsumption).mockReturnValue(query.disabled());
  vi.mocked(useGetMembershipHourlyConsumption).mockReturnValue(query.disabled());
}

const found = (supply: SupplyResponse) => query.success<typeof getSupply>(supply);

function CurrentLocation() {
  const { search } = useLocation();
  return <div data-testid="location">{search}</div>;
}
const currentSearch = () => screen.getByTestId("location").textContent;

// A new element each time, so a rerender reaches the page's hooks.
const page = () => (
  <>
    <HistoricalAnalysisPage />
    <CurrentLocation />
  </>
);

function renderPage(search = `?supplyId=${MEMBERS.id}`) {
  return renderWithProviders(page(), { route: `/historical-analysis${search}`, activeCommunityId: COMMUNITY_ID });
}

/** Opens the selector (a bottom sheet in jsdom, which answers no media query). */
async function openSheet() {
  await userEvent.click(screen.getByRole("button", { name: SELECTOR }));
  return screen.getByRole("dialog", { name: "Punto de suministro" });
}
const optionLabels = (sheet: HTMLElement) => within(sheet).getAllByRole("radio").map((radio) => radio.closest("label")!.textContent);

/** The supply ids every enabled call of a hook asked for. */
const enabledSupplyIds = (hook: typeof useGetSupplyEnergyMetrics | typeof useGetSupplyDailyConsumption | typeof useGetSupply) =>
  new Set(
    (vi.mocked(hook).mock.calls as unknown[][])
      .filter((call) => isEnabled(call[call.length - 1]) && call[0])
      .map((call) => call[0]),
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockLoggedUser = admin();
  canManage = true;
  lookup = (supplyId) => (supplyId === MEMBERS.id ? found(MEMBERS) : query.error(apiError(404)));
  serve();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UI-HIS-001 a community admin may open any enabled supply of the active community (#252)", () => {
  it("UI-HIS-001 AC6 selects another member's supply from the address, in its own group above the caller's own", async () => {
    renderPage();

    expect(screen.getByRole("button", { name: SELECTOR })).toHaveTextContent(MEMBERS_LABEL);
    const sheet = await openSheet();
    const headings = within(sheet).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(headings[0]).toBe(VIEWED_GROUP);
    expect(optionLabels(sheet)).toEqual([MEMBERS_LABEL, ALL, `${HOME.name} · ${HOME.code}`]);
    expect(within(sheet).getByRole("radio", { name: MEMBERS_LABEL })).toBeChecked();
    expect(screen.getByText(FOOTER)).toBeInTheDocument();
    expect(currentSearch()).toBe(`?supplyId=${MEMBERS.id}`);
  });

  it("UI-HIS-001 AC6 labels it by name and CUPS alone when the response carries no owner record", async () => {
    lookup = () => found({ ...MEMBERS, ownerRecord: null });
    renderPage();

    const sheet = await openSheet();
    expect(optionLabels(sheet)[0]).toBe("Casa de Lucía · ES0021000000000009AA");
  });

  it("UI-HIS-001 AC6 asks the anchor, the figures and the series -- which the charts, the table and the CSV read -- for that supply alone", async () => {
    const blobs: Blob[] = [];
    const names: string[] = [];
    Object.assign(URL, { createObjectURL: (blob: Blob) => (blobs.push(blob), "blob:conluz-test"), revokeObjectURL: () => {} });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    renderPage();

    const metricsCalls = vi.mocked(useGetSupplyEnergyMetrics).mock.calls.filter(([, , options]) => isEnabled(options));
    expect(metricsCalls.some(([id, params]) => id === MEMBERS.id && isAnchorCall(params))).toBe(true);
    expect(metricsCalls.some(([id, params]) => id === MEMBERS.id && !isAnchorCall(params))).toBe(true);
    expect(enabledSupplyIds(useGetSupplyEnergyMetrics)).toEqual(new Set([MEMBERS.id]));
    expect(enabledSupplyIds(useGetSupplyDailyConsumption)).toEqual(new Set([MEMBERS.id]));
    expect(vi.mocked(useGetMembershipEnergyMetrics).mock.calls.filter(([, , , options]) => isEnabled(options))).toHaveLength(0);

    expect(screen.getByRole("heading", { name: "Datos de septiembre de 2026" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "De la energía que te tocó" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Totales del periodo" })).toBeInTheDocument();
    const table = screen.getByRole("region", { name: "Tus datos" });
    await userEvent.click(within(table).getByRole("button", { name: "Descargar CSV" }));
    expect(names).toEqual(["conluz-consumo-casa-de-lucia-2026-09-01-2026-09-30.csv"]);
    expect(blobs).toHaveLength(1);
    Object.assign(URL, { createObjectURL: undefined, revokeObjectURL: undefined });
  });

  it("UI-HIS-001 AC6 choosing one of the caller's own supplies removes the viewed supply from the selector", async () => {
    renderPage();

    await userEvent.click(within(await openSheet()).getByRole("radio", { name: `${HOME.name} · ${HOME.code}` }));

    expect(currentSearch()).toBe(`?supplyId=${HOME.id}`);
    const sheet = await openSheet();
    expect(within(sheet).queryByRole("heading", { name: VIEWED_GROUP })).not.toBeInTheDocument();
    expect(optionLabels(sheet)).toEqual([ALL, `${HOME.name} · ${HOME.code}`]);
  });

  it("UI-HIS-001 AC9 with another member's supply on screen, Todos mis puntos still asks the admin's own membership", async () => {
    renderPage();

    await userEvent.click(within(await openSheet()).getByRole("radio", { name: ALL }));

    expect(currentSearch()).toBe("");
    const membershipCalls = vi.mocked(useGetMembershipEnergyMetrics).mock.calls.filter(([, , , options]) => isEnabled(options));
    expect(membershipCalls.length).toBeGreaterThan(0);
    for (const [communityId, userId] of membershipCalls) {
      expect(communityId).toBe(COMMUNITY_ID);
      expect(userId).toBe(OWNER_ID);
    }
    expect(optionLabels(await openSheet())).toEqual([ALL, `${HOME.name} · ${HOME.code}`]);
  });
});

describe("UI-HIS-002 an id the caller cannot select falls back to Todos mis puntos once it is resolved (#252)", () => {
  it("UI-HIS-002 AC7 a member following the same link falls back without an error, and never looks the supply up", async () => {
    mockLoggedUser = plainMember();
    canManage = false;
    renderPage();

    expect(screen.getByRole("button", { name: SELECTOR })).toHaveTextContent(ALL);
    expect(currentSearch()).toBe("");
    expect(enabledSupplyIds(useGetSupply).size).toBe(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  it.each([
    ["a supply of another community", () => found(OTHER_COMMUNITY)],
    ["a disabled supply", () => found(DISABLED)],
    ["a supply that does not open its figures to the admin", () => found(UNREADABLE)],
    ["a supply that does not exist (404)", () => query.error(apiError(404))],
    ["a lookup that failed", () => query.error(apiError(500))],
  ])("UI-HIS-002 AC8 an admin with %s falls back without an error", async (_case, answer) => {
    lookup = answer as () => Lookup;
    renderPage();

    expect(screen.getByRole("button", { name: SELECTOR })).toHaveTextContent(ALL);
    expect(currentSearch()).toBe("");
    expect(screen.queryByRole("heading", { name: VIEWED_GROUP })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  it("UI-HIS-002 AC8 while the lookup is pending, the address is left as it is", () => {
    lookup = () => query.loading();
    renderPage();

    expect(currentSearch()).toBe(`?supplyId=${MEMBERS.id}`);
    expect(enabledSupplyIds(useGetSupply)).toEqual(new Set([MEMBERS.id]));
  });

  it("UI-HIS-002 AC8 while the community's canManage is pending, the address is left as it is and nothing is looked up", () => {
    canManage = "pending";
    renderPage();

    expect(currentSearch()).toBe(`?supplyId=${MEMBERS.id}`);
    expect(enabledSupplyIds(useGetSupply).size).toBe(0);
  });

  it("UI-HIS-002 asks no community capability for one of the caller's own supplies", () => {
    renderPage(`?supplyId=${HOME.id}`);

    expect(vi.mocked(useGetCommunityById).mock.calls.filter(([, options]) => isEnabled(options))).toHaveLength(0);
    expect(currentSearch()).toBe(`?supplyId=${HOME.id}`);
  });
});

const EMPTY = "No tienes puntos de suministro en esta comunidad";

/** Every call of the membership's "Todos mis puntos" hooks -- anchor, figures and series -- that was enabled. */
const enabledMembershipCalls = () =>
  [useGetMembershipEnergyMetrics, useGetMembershipHourlyConsumption, useGetMembershipDailyConsumption, useGetMembershipMonthlyConsumption]
    .flatMap((hook) => vi.mocked(hook).mock.calls as unknown[][])
    .filter((call) => isEnabled(call[call.length - 1]));

describe("a community admin who owns no supplies here opens a supply of the community (#385)", () => {
  beforeEach(() => {
    vi.mocked(useGetSuppliesByUserId).mockImplementation((_userId, options) =>
      isEnabled(options) ? query.success<typeof getSuppliesByUserId>([]) : query.disabled(),
    );
  });

  it("UI-HIS-001 AC1 shows that supply's period, card, totals, charts, table and CSV", async () => {
    const names: string[] = [];
    Object.assign(URL, { createObjectURL: () => "blob:conluz-test", revokeObjectURL: () => {} });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    renderPage();

    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Datos de septiembre de 2026" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "De la energía que te tocó" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Totales del periodo" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Tu energía día a día" })).toBeInTheDocument();
    const table = screen.getByRole("region", { name: "Tus datos" });
    await userEvent.click(within(table).getByRole("button", { name: "Descargar CSV" }));
    expect(names).toEqual(["conluz-consumo-casa-de-lucia-2026-09-01-2026-09-30.csv"]);
    expect(currentSearch()).toBe(`?supplyId=${MEMBERS.id}`);
    Object.assign(URL, { createObjectURL: undefined, revokeObjectURL: undefined });
  });

  it("UI-HIS-001 AC1 the sheet lists only that supply, under Punto que estás consultando, with no Todos mis puntos and no footer", async () => {
    renderPage();

    expect(screen.getByRole("button", { name: SELECTOR })).toHaveTextContent(MEMBERS_LABEL);
    expect(screen.queryByText(FOOTER)).not.toBeInTheDocument();
    const sheet = await openSheet();
    expect(within(sheet).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([VIEWED_GROUP]);
    expect(optionLabels(sheet)).toEqual([MEMBERS_LABEL]);
    expect(within(sheet).getByRole("radio", { name: MEMBERS_LABEL })).toBeChecked();
    expect(within(sheet).queryByRole("radio", { name: ALL })).not.toBeInTheDocument();
  });

  describe("from sm up", () => {
    beforeEach(() => {
      // jsdom has no layout: answer every (min-width) query as a wide screen would.
      vi.stubGlobal(
        "matchMedia",
        (mediaQuery: string) =>
          ({
            matches: mediaQuery.includes("min-width"),
            media: mediaQuery,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          }) as MediaQueryList,
      );
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("UI-HIS-001 AC1 the dropdown lists only that supply, under Punto que estás consultando, with no Todos mis puntos and no footer", async () => {
      renderPage();

      expect(screen.queryByText(FOOTER)).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("combobox", { name: "Punto de suministro" }));
      const listbox = screen.getByRole("listbox");
      // MUI's Select gives every child the option role, its subheaders too.
      expect(within(listbox).getAllByRole("option").map((option) => option.textContent)).toEqual([VIEWED_GROUP, MEMBERS_LABEL]);
      expect(within(listbox).getByRole("option", { name: MEMBERS_LABEL })).toHaveAttribute("aria-selected", "true");
    });
  });

  it.each([
    ["the community's canManage", () => (canManage = "pending")],
    ["the supply's lookup", () => (lookup = () => query.loading())],
  ])("UI-HIS-003 AC2 while %s is pending, shows a placeholder, never the neutral state, and leaves the address alone", (_case, pend) => {
    pend();
    const { container } = renderPage();

    expect(container.querySelector(".MuiSkeleton-root")).not.toBeNull();
    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: SELECTOR })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(currentSearch()).toBe(`?supplyId=${MEMBERS.id}`);
  });

  it.each([
    ["a supply of another community", () => found(OTHER_COMMUNITY)],
    ["a disabled supply", () => found(DISABLED)],
    ["a supply that does not open its figures to the admin", () => found(UNREADABLE)],
    ["a supply that does not exist (404)", () => query.error(apiError(404))],
  ])("UI-HIS-003 AC3 with %s, shows the neutral state and removes the id", (_case, answer) => {
    lookup = answer as () => Lookup;
    const { container } = renderPage();

    expect(screen.getByRole("note")).toHaveTextContent(EMPTY);
    expect(screen.queryByRole("button", { name: SELECTOR })).not.toBeInTheDocument();
    expect(container.querySelector(".MuiSkeleton-root")).toBeNull();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(currentSearch()).toBe("");
  });

  it("UI-HIS-003 AC3 removes the id only once the lookup has answered", () => {
    lookup = () => query.loading();
    const { rerender } = renderPage();
    expect(currentSearch()).toBe(`?supplyId=${MEMBERS.id}`);

    lookup = () => query.error(apiError(404));
    rerender(page());

    expect(screen.getByRole("note")).toHaveTextContent(EMPTY);
    expect(currentSearch()).toBe("");
  });

  it("UI-HIS-003 a lookup that failed is an error with a retry, not the neutral state, and keeps the id", async () => {
    const failed = query.error(apiError(500));
    lookup = () => failed as unknown as Lookup;
    renderPage();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("No se pudo cargar el punto de suministro");
    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: SELECTOR })).not.toBeInTheDocument();
    expect(currentSearch()).toBe(`?supplyId=${MEMBERS.id}`);

    await userEvent.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(failed.refetch).toHaveBeenCalledTimes(1);
    expect(currentSearch()).toBe(`?supplyId=${MEMBERS.id}`);
  });

  it("UI-HIS-001 AC4 asks no membership anchor, figures or series, neither while the supply resolves nor once it is shown", () => {
    canManage = "pending";
    const { rerender } = renderPage();
    canManage = true;
    lookup = () => query.loading();
    rerender(page());
    lookup = (supplyId) => (supplyId === MEMBERS.id ? found(MEMBERS) : query.error(apiError(404)));
    rerender(page());

    expect(screen.getByRole("heading", { name: "Datos de septiembre de 2026" })).toBeInTheDocument();
    expect(enabledSupplyIds(useGetSupplyEnergyMetrics)).toEqual(new Set([MEMBERS.id]));
    expect(enabledMembershipCalls()).toHaveLength(0);
  });

  it("UI-HIS-003 AC5 a member following the same link sees the neutral state, and the supply is never looked up", () => {
    mockLoggedUser = plainMember();
    canManage = false;
    renderPage();

    expect(screen.getByRole("note")).toHaveTextContent(EMPTY);
    expect(screen.queryByRole("button", { name: SELECTOR })).not.toBeInTheDocument();
    expect(enabledSupplyIds(useGetSupply).size).toBe(0);
    expect(currentSearch()).toBe("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
