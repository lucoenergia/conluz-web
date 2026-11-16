import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import {
  useGetMembershipEnergyMetrics,
  useGetMembershipMonthlyConsumption,
  type getMembershipEnergyMetrics,
  type getMembershipMonthlyConsumption,
} from "../../../api/memberships/memberships";
import { type MembershipMonthlyConsumptionBucketResponse } from "../../../api/models";
import { CommunityRole } from "../../../hooks/permissions";
import { customInstance } from "../../../http/custom-instance";
import { useLoggedUser } from "../../../context/logged-user.context";
import {
  buildCurrentUser,
  buildMembershipEnergyMetrics,
  buildMembershipMonthlyConsumptionBucket,
} from "../../../test/fixtures";
import { query } from "../../../test/queryState";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { declaredStyles, stubViewport } from "../../../test/overlay";
import { formatEuros } from "../../../utils/formatEnergyFigures";
import { TwelveMonthSeries } from "./TwelveMonthSeries";

/**
 * The twelve-month block below sm (#425): rows, never a chart. The chart is
 * stubbed so a spec can prove it is not mounted at all.
 */
const { Chart } = vi.hoisted(() => ({ Chart: vi.fn(() => null) }));
vi.mock("react-apexcharts", () => ({ default: Chart }));

vi.mock(import("../../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: vi.fn(),
}));
vi.mock(import("../../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMembershipEnergyMetrics: vi.fn(),
  useGetMembershipMonthlyConsumption: vi.fn(),
}));
vi.mock(import("../../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: vi.fn(),
}));

const USER_ID = "member-user";
const COMMUNITY_ID = "member-community";

/** August 2026 in Europe/Madrid, as the backend bounds it. */
const AUGUST = { startDate: "2026-07-31T22:00:00Z", endDate: "2026-08-31T22:00:00Z" };

/** September 2025 to August 2026, in order: the twelve months ending at AUGUST. */
const MONTHS = [
  "2025/09/01", "2025/10/01", "2025/11/01", "2025/12/01", "2026/01/01", "2026/02/01",
  "2026/03/01", "2026/04/01", "2026/05/01", "2026/06/01", "2026/07/01", "2026/08/01",
];
const LABELS = ["sept", "oct", "nov", "dic", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago"];
const MEASURED_ZERO_INDEX = 2;
const GAP_INDEX = 3;
const INCOMPLETE_INDEX = 5;

/** A stored, complete month of two supplies: 100 kWh from the community and 200 kWh from the grid, the last month the most. */
function storedMonth(date: string, index: number): MembershipMonthlyConsumptionBucketResponse {
  return buildMembershipMonthlyConsumptionBucket({
    date,
    selfConsumptionKWh: index === 11 ? 150 : 100,
    gridImportKWh: index === 11 ? 280 : 200,
    savingsEur: index === 11 ? 18.5 : 12.25,
    tariffSource: "REAL_TARIFF",
    supplyCount: 2,
    suppliesWithData: 2,
  });
}

/** Twelve months: a measured zero in November, nothing stored in December, and February with one of two supplies. */
const MIXED_YEAR = MONTHS.map((date, index) => {
  if (index === MEASURED_ZERO_INDEX) {
    return buildMembershipMonthlyConsumptionBucket({
      date,
      selfConsumptionKWh: 0,
      gridImportKWh: 0,
      savingsEur: 0,
      tariffSource: "REAL_TARIFF",
      supplyCount: 2,
      suppliesWithData: 2,
    });
  }
  if (index === GAP_INDEX) {
    return buildMembershipMonthlyConsumptionBucket({ date, savingsEur: null, tariffSource: null, supplyCount: 2, suppliesWithData: 0 });
  }
  if (index === INCOMPLETE_INDEX) {
    return buildMembershipMonthlyConsumptionBucket({ ...storedMonth(date, index), selfConsumptionKWh: 40, gridImportKWh: 60, savingsEur: 5.1, suppliesWithData: 1 });
  }
  return storedMonth(date, index);
});

function answer(monthly = MIXED_YEAR) {
  vi.mocked(useGetMembershipEnergyMetrics).mockReturnValue(
    query.success<typeof getMembershipEnergyMetrics>(buildMembershipEnergyMetrics({ period: AUGUST })),
  );
  vi.mocked(useGetMembershipMonthlyConsumption).mockReturnValue(query.success<typeof getMembershipMonthlyConsumption>(monthly));
}

function open() {
  return renderWithProviders(<TwelveMonthSeries />, { activeCommunityId: COMMUNITY_ID });
}

// Intl separates figures from their unit with a no-break space.
const text = (element: Element) => (element.textContent ?? "").replace(/\u00a0/g, " ");

const energyList = () => screen.getByRole("list", { name: "Tu energía por mes" });
const energyRows = () => within(energyList()).getAllByRole("button");
const savingsRows = () => within(screen.getByRole("list", { name: "Tu ahorro por mes" })).getAllByRole("listitem");
const labelOf = (row: HTMLElement) => text(row.firstElementChild!);
const figureOf = (row: HTMLElement) => text(row.lastElementChild!);

/**
 * The state marks drawn in a row, by kind. Structural: a mark is a decorative
 * shape hidden from assistive technology, with no role or text, so it is told
 * apart by the round shape it declares.
 */
function marksIn(row: HTMLElement): string[] {
  return [...row.querySelectorAll("div")].flatMap((element) => {
    const css = declaredStyles(element);
    if (!css.includes("border-radius:50%")) return [];
    return [css.includes("border:2px solid") ? "ring" : "dot"];
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  stubViewport(390);
  vi.mocked(useLoggedUser).mockReturnValue(
    buildCurrentUser({ id: USER_ID, memberships: { [COMMUNITY_ID]: CommunityRole.COMMUNITY_MEMBER } }),
  );
  answer();
});

afterEach(() => {
  vi.unstubAllGlobals();
  expect(customInstance).not.toHaveBeenCalled();
});

describe("UI-CHT-001 below sm, the twelve-month block is rows (#425)", () => {
  it("UI-CHT-001 a row per month, in axis order, in each list, and no chart is mounted", () => {
    open();

    expect(Chart).not.toHaveBeenCalled();
    expect(energyRows().map(labelOf)).toEqual(LABELS);
    expect(savingsRows().map(labelOf)).toEqual(LABELS);
  });

  it("UI-CHT-001 the energy rows sit on one scale, ending on a round figure at or above the longest bar", () => {
    open();

    // August's bar is the longest: 150 kWh and 280 kWh stacked, 430 kWh. The scale ends at 500 kWh.
    expect(text(energyList().previousElementSibling!)).toBe("0 kWh250 kWh500 kWhDe la comunidad");
    expect(energyList().previousElementSibling).toHaveAttribute("aria-hidden", "true");
  });

  it("UI-CHT-001 a month with nothing stored reads \"Sin datos\" with its mark and no figure, in both lists", () => {
    open();

    const gap = energyRows()[GAP_INDEX];
    expect(gap).toHaveAccessibleName("diciembre de 2025: sin datos");
    expect(text(gap)).toBe("dicSin datos—");
    expect(marksIn(gap)).toEqual(["ring"]);
    const savingsGap = savingsRows()[GAP_INDEX];
    expect(savingsGap).toHaveAccessibleName("diciembre de 2025: sin datos");
    expect(text(savingsGap)).toBe("dicSin datos—");
    expect(marksIn(savingsGap)).toEqual(["ring"]);
  });

  it("UI-CHT-001 a measured zero keeps its dot and its 0; a complete month has no mark", () => {
    open();

    const zero = energyRows()[MEASURED_ZERO_INDEX];
    expect(marksIn(zero)).toEqual(["dot"]);
    expect(figureOf(zero)).toBe("0");
    expect(marksIn(savingsRows()[MEASURED_ZERO_INDEX])).toEqual(["dot"]);
    expect(marksIn(energyRows()[0])).toEqual([]);
    expect(marksIn(savingsRows()[0])).toEqual([]);
  });

  it("UI-CHT-001 an incomplete month keeps its «1 de 2» mark, and its name says so in words", () => {
    open();

    const incomplete = energyRows()[INCOMPLETE_INDEX];
    expect(text(incomplete)).toBe("feb1 de 240");
    expect(incomplete).toHaveAccessibleName("febrero de 2026: De la comunidad 40 kWh, Incompleto: 1 de 2 suministros");
    expect(text(savingsRows()[INCOMPLETE_INDEX])).toBe("feb1 de 25,10 €");
  });
});

describe("UI-HOM-015 below sm, the twelve-month rows (#425)", () => {
  it("UI-HOM-015 an energy row's figure is the month's community energy, under that heading", () => {
    open();

    const september = energyRows()[0];
    expect(figureOf(september)).toBe("100");
    expect(september).toHaveAccessibleName("septiembre de 2025: De la comunidad 100 kWh");
    expect(savingsRows()[0]).toHaveAccessibleName(`septiembre de 2025: ${formatEuros(12.25)}`);
  });

  it("UI-HOM-015 activating an energy row opens what the chart's tooltip says beneath it, and again closes it", async () => {
    const user = userEvent.setup();
    open();

    const february = energyRows()[INCOMPLETE_INDEX];
    expect(february).toHaveAttribute("aria-expanded", "false");
    await user.click(february);

    expect(february).toHaveAttribute("aria-expanded", "true");
    const detail = document.getElementById(february.getAttribute("aria-controls")!)!;
    expect(text(detail)).toBe("febrero de 2026Incompleto: 1 de 2 suministrosDe la comunidad40 kWhDe la red60 kWhAhorro5,10 €");

    await user.click(february);
    expect(february).toHaveAttribute("aria-expanded", "false");
    expect(february).not.toHaveAttribute("aria-controls");
  });
});
