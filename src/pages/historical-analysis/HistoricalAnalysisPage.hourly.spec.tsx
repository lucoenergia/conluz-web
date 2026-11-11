import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import type {
  CurrentUserResponse,
  MembershipEnergyMetricsResponse,
  MembershipHourlyConsumptionBucketResponse,
  SupplyHourlyConsumptionBucketResponse,
  SupplyResponse,
} from "../../api/models";

// ApexCharts cannot lay out in jsdom, and the chart's drawing is not this spec's subject.
vi.mock("react-apexcharts", () => ({ default: () => null }));

vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
}));
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSupplyEnergyMetrics: vi.fn(),
  useGetSupplyHourlyConsumption: vi.fn(),
  useGetSupplyDailyConsumption: vi.fn(),
  useGetSupplyMonthlyConsumption: vi.fn(),
}));
vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMembershipEnergyMetrics: vi.fn(),
  useGetMembershipHourlyConsumption: vi.fn(),
  useGetMembershipDailyConsumption: vi.fn(),
  useGetMembershipMonthlyConsumption: vi.fn(),
}));

let mockLoggedUser: CurrentUserResponse;
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => mockLoggedUser,
}));

import { getSuppliesByUserId, useGetSuppliesByUserId } from "../../api/users/users";
import {
  getSupplyEnergyMetrics,
  getSupplyHourlyConsumption,
  useGetSupplyDailyConsumption,
  useGetSupplyEnergyMetrics,
  useGetSupplyHourlyConsumption,
  useGetSupplyMonthlyConsumption,
} from "../../api/supplies/supplies";
import {
  getMembershipEnergyMetrics,
  getMembershipHourlyConsumption,
  useGetMembershipDailyConsumption,
  useGetMembershipEnergyMetrics,
  useGetMembershipHourlyConsumption,
  useGetMembershipMonthlyConsumption,
} from "../../api/memberships/memberships";
import { HistoricalAnalysisPage } from "./HistoricalAnalysisPage";
import {
  HOME,
  hoursOf,
  membershipGapHour,
  membershipHour,
  supplyGapHour,
  supplyHour,
} from "../../components/evolution/consumptionSeries.testData";
import {
  COMMUNITY_ID,
  SEPTEMBER_2026,
  derivedMembershipFigures,
  derivedSupplyFigures,
  member,
  membershipLatest,
  supplyLatest,
} from "./historicalAnalysis.testData";

// A single day picked as a custom range, shown hour by hour (#378): which
// series is asked, and what the evolution card, the table and the CSV make of
// its hours. The hours' own states and words are consumptionSeries.spec.ts's.

const ONE_DAY = "?period=custom&from=2026-09-01&to=2026-09-01";
const ONE_DAY_BOUNDS = { startDate: "2026-09-01T00:00:00+02:00", endDate: "2026-09-02T00:00:00+02:00" };
const OCTOBER_2026 = { startDate: "2026-10-01T00:00:00+02:00", endDate: "2026-11-01T00:00:00+01:00" };
const OCTOBER_CHANGE_DAY = "?period=custom&from=2026-10-25&to=2026-10-25";
const TABLE = "Tus datos";
const DOWNLOAD = "Descargar CSV";

/**
 * Every hour 0.333 kWh and 0.38 €: the 24 rows add up to 7,992 kWh and
 * 9,12 €, while the day's energy metrics say 8 kWh and 9,13 €, as rounding per
 * hour and per day can. The totals row must show the second.
 */
const HOUR = { selfConsumptionKWh: 0.333, gridImportKWh: 1.25, surplusKWh: 0.5, savingsEur: 0.38 };
const DAY_FIGURES: MembershipEnergyMetricsResponse = derivedMembershipFigures({
  energy: { ...derivedMembershipFigures().energy, selfConsumptionKWh: 8, gridImportKWh: 30, surplusKWh: 12 },
  savings: { ...derivedMembershipFigures().savings, amountEur: 9.13, estimatedPrice: { eurPerKWh: 0.15 } },
});

type Options = { query?: { enabled?: boolean } } | undefined;
const isAnchorCall = (params: unknown) => typeof params === "object" && params !== null && "period" in params;
const disabledOr = <T,>(options: unknown, ready: () => T) => ((options as Options)?.query?.enabled === false ? query.disabled() : ready());

let anchor: { startDate: string; endDate: string };
let membershipHours: MembershipHourlyConsumptionBucketResponse[];
let supplyHours: SupplyHourlyConsumptionBucketResponse[];

function serve(supplies: SupplyResponse[]) {
  vi.mocked(useGetSuppliesByUserId).mockImplementation((_userId, options) =>
    disabledOr(options, () => query.success<typeof getSuppliesByUserId>(supplies)),
  );
  vi.mocked(useGetMembershipEnergyMetrics).mockImplementation((_c, _u, params, options) =>
    disabledOr(options, () => query.success<typeof getMembershipEnergyMetrics>(isAnchorCall(params) ? membershipLatest(anchor) : DAY_FIGURES)),
  );
  vi.mocked(useGetSupplyEnergyMetrics).mockImplementation((supplyId, params, options) =>
    disabledOr(options, () => {
      const supply = supplies.find(({ id }) => id === supplyId)!;
      return query.success<typeof getSupplyEnergyMetrics>(isAnchorCall(params) ? supplyLatest(supply, anchor) : derivedSupplyFigures(supply));
    }),
  );
  vi.mocked(useGetMembershipHourlyConsumption).mockImplementation((_c, _u, _p, options) =>
    disabledOr(options, () => query.success<typeof getMembershipHourlyConsumption>(membershipHours)),
  );
  vi.mocked(useGetSupplyHourlyConsumption).mockImplementation((_s, _p, options) =>
    disabledOr(options, () => query.success<typeof getSupplyHourlyConsumption>(supplyHours)),
  );
  // Never enabled for a single day: answering them as loading would show it.
  for (const hook of [useGetMembershipDailyConsumption, useGetMembershipMonthlyConsumption]) {
    vi.mocked(hook).mockImplementation((_c, _u, _p, options) => disabledOr(options, () => query.loading()));
  }
  for (const hook of [useGetSupplyDailyConsumption, useGetSupplyMonthlyConsumption]) {
    vi.mocked(hook).mockImplementation((_s, _p, options) => disabledOr(options, () => query.loading()));
  }
}

/** jsdom answers no media query, which reads as a phone; this answers every (min-width) query as a wide screen. */
function wideScreen() {
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
}

function renderPage(search: string) {
  return renderWithProviders(<HistoricalAnalysisPage />, { route: `/historical-analysis${search}`, activeCommunityId: COMMUNITY_ID });
}

/** Whether each series hook was last asked to run. */
function enabledSeries() {
  const enabled = (hook: { mock: { lastCall?: unknown[] } }) => (hook.mock.lastCall?.at(-1) as Options)?.query?.enabled;
  return {
    membershipHourly: enabled(vi.mocked(useGetMembershipHourlyConsumption)),
    membershipDaily: enabled(vi.mocked(useGetMembershipDailyConsumption)),
    membershipMonthly: enabled(vi.mocked(useGetMembershipMonthlyConsumption)),
    supplyHourly: enabled(vi.mocked(useGetSupplyHourlyConsumption)),
    supplyDaily: enabled(vi.mocked(useGetSupplyDailyConsumption)),
    supplyMonthly: enabled(vi.mocked(useGetSupplyMonthlyConsumption)),
  };
}
const NONE_ENABLED = {
  membershipHourly: false,
  membershipDaily: false,
  membershipMonthly: false,
  supplyHourly: false,
  supplyDaily: false,
  supplyMonthly: false,
};

const region = () => screen.getByRole("region", { name: TABLE });
const table = () => within(region()).getByRole("table");
const bodyRows = () =>
  within(within(table()).getAllByRole("rowgroup")[1])
    .getAllByRole("row")
    .map((row) => [...within(row).queryAllByRole("rowheader"), ...within(row).queryAllByRole("cell")].map((cell) => cell.textContent));
const totalsRow = () => within(table()).getByRole("row", { name: /Total del periodo/ });

/** Records what the browser is handed to save. jsdom has no object URLs. */
function captureDownloads() {
  const blobs: Blob[] = [];
  Object.assign(URL, {
    createObjectURL: vi.fn((blob: Blob) => {
      blobs.push(blob);
      return "blob:conluz-test";
    }),
    revokeObjectURL: vi.fn(),
  });
  const names: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    names.push(this.download);
  });
  return { blobs, names };
}

/** jsdom's Blob has no text(); its FileReader reads it. */
function textOf(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(blob);
  });
}

/** The CSV's data lines, without the BOM, the header and the trailing empty line, each split into cells. */
const csvRows = (csv: string) =>
  csv
    .replace(/^\uFEFF/, "")
    .split("\r\n")
    .slice(1, -1)
    .map((line) => line.split(";"));

beforeEach(() => {
  vi.clearAllMocks();
  mockLoggedUser = member();
  anchor = SEPTEMBER_2026;
  membershipHours = hoursOf(ONE_DAY_BOUNDS.startDate, ONE_DAY_BOUNDS.endDate).map((startsAt) => membershipHour(startsAt, HOUR));
  supplyHours = hoursOf(ONE_DAY_BOUNDS.startDate, ONE_DAY_BOUNDS.endDate).map((startsAt) => supplyHour(startsAt));
  serve([HOME]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Object.assign(URL, { createObjectURL: undefined, revokeObjectURL: undefined });
});

describe("UI-HIS-019 a single day asks the hourly series of the selected scope (#378)", () => {
  it("UI-HIS-019 AC2 -- \"Todos mis puntos\" asks the membership hourly series by the day's bounds, and no other series", () => {
    renderPage(ONE_DAY);

    expect(useGetMembershipHourlyConsumption).toHaveBeenLastCalledWith(COMMUNITY_ID, mockLoggedUser.id, ONE_DAY_BOUNDS, {
      query: { enabled: true },
    });
    expect(enabledSeries()).toEqual({ ...NONE_ENABLED, membershipHourly: true });
  });

  it("UI-HIS-019 AC2 -- a supply asks its own hourly series by the day's bounds, and no other series", () => {
    renderPage(`${ONE_DAY}&supplyId=${HOME.id}`);

    expect(useGetSupplyHourlyConsumption).toHaveBeenLastCalledWith(HOME.id, ONE_DAY_BOUNDS, { query: { enabled: true } });
    expect(enabledSeries()).toEqual({ ...NONE_ENABLED, supplyHourly: true });
  });
});

describe("UI-HIS-025 below sm, a single day is a row per hour (#378)", () => {
  it("UI-HIS-025 the evolution card is hour by hour, a row per hour, and a supply gap's 0.00 € is no saving", () => {
    supplyHours = supplyHours.map((bucket, index) => (index === 1 ? supplyGapHour(bucket.startsAt) : bucket));
    renderPage(`${ONE_DAY}&supplyId=${HOME.id}`);

    const card = screen.getByRole("region", { name: "Tu energía hora a hora" });
    expect(card).toHaveTextContent("1 de septiembre de 2026: 23 de 24 horas con datos; falta 1.");
    expect(card).toHaveTextContent("Faltan datos de 01:00 a 02:00. Los totales suman solo las horas con datos.");
    const energyRows = within(within(card).getByRole("list", { name: "Tu energía por hora" })).getAllByRole("button");
    expect(energyRows).toHaveLength(24);
    expect(energyRows[1]).toHaveAccessibleName("De 01:00 a 02:00: sin datos");
    const savingsRows = within(within(card).getByRole("list", { name: "Tu ahorro estimado por hora" })).getAllByRole("listitem");
    expect(savingsRows[1]).toHaveAccessibleName("De 01:00 a 02:00: sin datos");
    expect(savingsRows[1]).not.toHaveTextContent("0,00");
    expect(savingsRows[0]).toHaveAccessibleName(/^De 00:00 a 01:00: 0,83\s€$/);
  });
});

describe("UI-HIS-021 the table has one row per hour (#378)", () => {
  beforeEach(wideScreen);

  it("UI-HIS-021 AC5 -- 24 rows headed \"Hora\", each named by its hour, seven before \"Ver todos\"", async () => {
    renderPage(ONE_DAY);

    expect(table().querySelector("caption")).toHaveTextContent("Tus datos: 1 de septiembre de 2026, por horas");
    expect(within(table()).getAllByRole("columnheader")[0]).toHaveTextContent("Hora");
    expect(bodyRows()).toHaveLength(7);
    expect(region()).toHaveTextContent("Mostrando 7 de 24 horas.");
    await userEvent.click(within(region()).getByRole("button", { name: "Ver todos" }));
    expect(bodyRows()).toHaveLength(24);
    expect(bodyRows()[0]).toEqual(["00:00–01:00", "0,33", "1,25", "0,5", "0,38", "Completo"]);
    expect(bodyRows()[14][0]).toBe("14:00–15:00");
    expect(bodyRows()[23][0]).toBe("23:00–00:00");
  });

  it("UI-HIS-022 AC5 -- the totals row is the day's energy metrics, not the rows' sum", () => {
    renderPage(ONE_DAY);

    expect(within(totalsRow()).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["8", "30", "12", "9,13", "24 de 24 horas completas"]);
    // What the 24 rows add up to: 7,992 kWh and 9,12 €.
    expect(totalsRow()).not.toHaveTextContent("7,992");
    expect(totalsRow()).not.toHaveTextContent("9,12");
  });

  it("UI-HIS-021 a gap hour shows no value, and the totals say how many hours they cover", () => {
    membershipHours = membershipHours.map((bucket, index) => (index === 3 ? membershipGapHour(bucket.startsAt) : bucket));
    renderPage(ONE_DAY);

    expect(bodyRows()[3]).toEqual(["03:00–04:00", "—", "—", "—", "—", "Sin datos"]);
    expect(within(totalsRow()).getAllByRole("cell").at(-1)).toHaveTextContent("Suma 23 de 24 horas con datos");
  });

  it("UI-HIS-028 the October change day has 25 rows, both 02:00 named as the repeated hour", async () => {
    anchor = OCTOBER_2026;
    membershipHours = [];
    renderPage(OCTOBER_CHANGE_DAY);

    await userEvent.click(within(region()).getByRole("button", { name: "Ver todos" }));
    expect(bodyRows()).toHaveLength(25);
    expect(bodyRows().map((row) => row[0]).slice(1, 5)).toEqual([
      "01:00–02:00",
      "02:00–03:00 (hora repetida por el cambio de hora)",
      "02:00–03:00 (hora repetida por el cambio de hora)",
      "03:00–04:00",
    ]);
  });
});

describe("UI-HIS-023 the CSV has one line per hour (#378)", () => {
  beforeEach(wideScreen);

  it("UI-HIS-023 AC5 -- 24 lines, fecha the hour's local start with its offset, named by the day twice", async () => {
    const downloads = captureDownloads();
    renderPage(ONE_DAY);

    await userEvent.click(within(region()).getByRole("button", { name: DOWNLOAD }));

    const rows = csvRows(await textOf(downloads.blobs[0]));
    expect(rows).toHaveLength(24);
    expect(rows.map((row) => row[0])).toEqual(
      Array.from({ length: 24 }, (_, hour) => `2026-09-01T${String(hour).padStart(2, "0")}:00+02:00`),
    );
    expect(rows[14].slice(1, 5)).toEqual(["0,333", "1,25", "0,5", "0,38"]);
    expect(downloads.names).toEqual(["conluz-consumo-todos-2026-09-01-2026-09-01.csv"]);
  });

  it("UI-HIS-023 AC5 -- the October change day has 25 lines, its two 02:00 told apart by their offsets", async () => {
    anchor = OCTOBER_2026;
    membershipHours = [];
    const downloads = captureDownloads();
    renderPage(OCTOBER_CHANGE_DAY);

    await userEvent.click(within(region()).getByRole("button", { name: DOWNLOAD }));

    const fechas = csvRows(await textOf(downloads.blobs[0])).map((row) => row[0]);
    expect(fechas).toHaveLength(25);
    expect(fechas.filter((fecha) => fecha.startsWith("2026-10-25T02:00"))).toEqual(["2026-10-25T02:00+02:00", "2026-10-25T02:00+01:00"]);
  });
});
