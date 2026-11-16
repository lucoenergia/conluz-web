import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { useGetMembershipHourlyProfile, type getMembershipHourlyProfile } from "../../../api/memberships/memberships";
import { type MembershipHourlyProfileBucketResponse, type MembershipHourlyProfileResponse } from "../../../api/models";
import { CommunityRole } from "../../../hooks/permissions";
import { customInstance } from "../../../http/custom-instance";
import { useLoggedUser } from "../../../context/logged-user.context";
import { buildCurrentUser, buildMembershipHourlyProfile, buildMembershipHourlyProfileBucket } from "../../../test/fixtures";
import { query } from "../../../test/queryState";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { declaredStyles, stubViewport } from "../../../test/overlay";
import { BestHours } from "./BestHours";
import { BEST_HOURS_COUNT } from "./hourlyProfile";

/**
 * The best-hours block below sm (#425): rows, never a chart. The chart is
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
  useGetMembershipHourlyProfile: vi.fn(),
}));
vi.mock(import("../../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: vi.fn(),
}));

const USER_ID = "member-user";
const COMMUNITY_ID = "member-community";

/** August 2026 in Europe/Madrid, as the backend bounds it. */
const AUGUST = { startDate: "2026-07-31T22:00:00Z", endDate: "2026-08-31T22:00:00Z" };
const COMPLETE = { hoursWithData: 1488, expectedHours: 1488, supplyCount: 2, suppliesWithData: 2 };

const GAP_HOUR = 3;
const MEASURED_ZERO_HOUR = 2;
const NO_CONSUMPTION_HOUR = 21;
const TINY_HOUR = 5;
/** The four hours with the most assigned energy: 16 h to 19 h. */
const BEST = [16, 17, 18, 19];

const noConsumption = { averageTotalConsumptionKWh: null, totalConsumptionSampleCount: 0 };
const noAssigned = { averageAssignedProductionKWh: null, assignedProductionSampleCount: 0 };

/**
 * A day of 62 samples an hour: consumption every hour, assigned energy from
 * 8 h to 19 h, more each hour. 3 h has no sample in either series, 21 h has
 * assigned energy and no consumption sample, 2 h is a measured zero in both,
 * and 5 h's consumption is too small to show.
 */
function day(): MembershipHourlyProfileBucketResponse[] {
  return Array.from({ length: 24 }, (_, hour) => {
    const bucket = buildMembershipHourlyProfileBucket({
      hour,
      averageTotalConsumptionKWh: 0.25 + hour / 100,
      totalConsumptionSampleCount: 62,
      averageAssignedProductionKWh: hour >= 8 && hour <= 19 ? 0.4 + hour / 100 : 0,
      assignedProductionSampleCount: 62,
    });
    if (hour === GAP_HOUR) return { ...bucket, ...noConsumption, ...noAssigned };
    if (hour === NO_CONSUMPTION_HOUR) return { ...bucket, ...noConsumption, averageAssignedProductionKWh: 0.3 };
    if (hour === MEASURED_ZERO_HOUR) return { ...bucket, averageTotalConsumptionKWh: 0 };
    if (hour === TINY_HOUR) return { ...bucket, averageTotalConsumptionKWh: 0.004 };
    return bucket;
  });
}

function answer(profile: MembershipHourlyProfileResponse = buildMembershipHourlyProfile({ period: AUGUST, coverage: COMPLETE, buckets: day() })) {
  vi.mocked(useGetMembershipHourlyProfile).mockReturnValue(query.success<typeof getMembershipHourlyProfile>(profile));
}

function open() {
  return renderWithProviders(<BestHours />, { activeCommunityId: COMMUNITY_ID });
}

// Intl separates figures from their unit with a no-break space.
const text = (element: Element) => (element.textContent ?? "").replace(/\u00a0/g, " ");

const list = () => screen.getByRole("list", { name: "Tu consumo por hora" });
const rows = () => within(list()).getAllByRole("button");
const row = (hour: number) => rows()[hour];
const labelOf = (element: HTMLElement) => text(element.firstElementChild!);
const figureOf = (element: HTMLElement) => text(element.lastElementChild!);

/**
 * The state marks drawn in a row, by kind, in order: the consumption bar's,
 * then the assigned energy's. Structural: a mark is a decorative shape hidden
 * from assistive technology, with no role or text, so it is told apart by the
 * round shape it declares.
 */
function marksIn(element: HTMLElement): string[] {
  return [...element.querySelectorAll("div")].flatMap((candidate) => {
    const css = declaredStyles(candidate);
    if (!css.includes("border-radius:50%")) return [];
    return [css.includes("border:2px solid") ? "ring" : "dot"];
  });
}

/**
 * The best-hour icon. Structural: it is the row's only SVG, decorative and
 * hidden from assistive technology, which reads the row's name instead.
 */
const iconIn = (element: HTMLElement) => element.querySelector("svg");

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

describe("UI-CHT-001 below sm, the best-hours block is rows (#425)", () => {
  it("UI-CHT-001 a row per hour, in axis order, and no chart is mounted", () => {
    open();

    expect(Chart).not.toHaveBeenCalled();
    expect(rows().map(labelOf)).toEqual(Array.from({ length: 24 }, (_, hour) => `${hour} h`));
  });

  it("UI-CHT-001 both bars sit on one scale, ending on a round figure at or above the longest one", () => {
    open();

    // 19 h's assigned energy, 0,59 kWh, is the longest bar: the scale ends at 1 kWh.
    expect(text(list().previousElementSibling!)).toBe("0 kWh0,5 kWh1 kWhTu consumo");
  });

  it("UI-CHT-001 an hour with no sample in either series reads \"Sin registros\" with its ring and no figure", () => {
    open();

    const gap = row(GAP_HOUR);
    expect(text(gap)).toBe("3 hSin registros—");
    expect(marksIn(gap)).toEqual(["ring"]);
    expect(gap).toHaveAccessibleName("3 h: Tu consumo Sin registros, Energía asignada Sin registros");
  });

  it("UI-CHT-001 an hour with assigned energy and no consumption sample shows no figure, and a ring on its consumption bar", () => {
    open();

    const hour = row(NO_CONSUMPTION_HOUR);
    expect(figureOf(hour)).toBe("");
    expect(marksIn(hour)).toEqual(["ring"]);
    expect(text(hour)).not.toContain("Sin registros");
    expect(hour).toHaveAccessibleName("21 h: Tu consumo Sin registros, Energía asignada 0,3 kWh (media de 62 registros)");
  });

  it("UI-CHT-001 a measured zero keeps its dot on each bar it applies to, and its 0; an hour with both figures has no mark", () => {
    open();

    // 2 h: no consumption and no assigned energy, both measured.
    expect(marksIn(row(MEASURED_ZERO_HOUR))).toEqual(["dot", "dot"]);
    expect(figureOf(row(MEASURED_ZERO_HOUR))).toBe("0");
    // 0 h: consumption, and a measured zero of assigned energy beneath it.
    expect(marksIn(row(0))).toEqual(["dot"]);
    expect(marksIn(row(12))).toEqual([]);
  });
});

describe("UI-HOM-015 below sm, the best-hours rows (#425)", () => {
  it("UI-HOM-015 each best hour carries the sun and says so in its name; no other hour does", () => {
    open();

    const marked = rows().filter((element) => iconIn(element) !== null);
    expect(BEST).toHaveLength(BEST_HOURS_COUNT);
    expect(marked.map(labelOf)).toEqual(BEST.map((hour) => `${hour} h`));
    for (const element of marked) {
      expect(iconIn(element)!.closest("[aria-hidden='true']")).not.toBeNull();
      expect(element).toHaveAccessibleName(expect.stringMatching(/, mejor hora$/));
    }
    expect(row(18)).toHaveAccessibleName(
      "18 h: Tu consumo 0,43 kWh (media de 62 registros), Energía asignada 0,58 kWh (media de 62 registros), mejor hora",
    );
    expect(rows().filter((element) => /mejor hora/.test(element.getAttribute("aria-label")!))).toHaveLength(BEST.length);
  });

  it.each([
    ["fewer hours with data than the month has", { ...COMPLETE, hoursWithData: 1300 }],
    ["fewer supplies with data than the member has", { ...COMPLETE, suppliesWithData: 1 }],
  ])("UI-HOM-015 in a month whose best hours cannot be worked out (UI-HOM-006), with %s, no row is marked", (_, coverage) => {
    answer(buildMembershipHourlyProfile({ period: AUGUST, coverage, buckets: day() }));
    open();

    expect(rows()).toHaveLength(24);
    expect(rows().filter((element) => iconIn(element) !== null)).toEqual([]);
    expect(rows().filter((element) => /mejor hora/.test(element.getAttribute("aria-label")!))).toEqual([]);
  });

  it("UI-HOM-015 the figure is the hour's average consumption; one too small to show is not passed off as zero", () => {
    open();

    expect(figureOf(row(12))).toBe("0,37");
    expect(figureOf(row(TINY_HOUR))).toBe("<0,01");
  });

  it("UI-HOM-015 activating an hour opens what the chart's tooltip says beneath it", async () => {
    const user = userEvent.setup();
    open();

    const noon = row(12);
    await user.click(noon);

    expect(noon).toHaveAttribute("aria-expanded", "true");
    const detail = document.getElementById(noon.getAttribute("aria-controls")!)!;
    expect(text(detail)).toBe("12 hTu consumo0,37 kWh (media de 62 registros)Energía asignada0,52 kWh (media de 62 registros)");
  });
});
