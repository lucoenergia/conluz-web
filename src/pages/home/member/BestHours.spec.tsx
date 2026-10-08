import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ApexOptions } from "apexcharts";
import { useGetMembershipHourlyProfile, type getMembershipHourlyProfile } from "../../../api/memberships/memberships";
import {
  CommunityRole,
  type MembershipHourlyProfileBucketResponse,
  type MembershipHourlyProfileResponse,
} from "../../../api/models";
import { customInstance } from "../../../api/custom-instance";
import { useLoggedUser } from "../../../context/logged-user.context";
import {
  buildCurrentUser,
  buildMembershipHourlyProfile,
  buildMembershipHourlyProfileBucket,
} from "../../../test/fixtures";
import { query } from "../../../test/queryState";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { colors } from "../../../theme/tokens";
import { BestHours } from "./BestHours";
import { ENERGY_COLORS } from "./energyColors";
import { isPartialMonth } from "./memberHomeMessage";

/**
 * The acceptance criteria of #201 for the best-hours block.
 *
 * ApexCharts cannot lay out in jsdom, so the chart is replaced by a stub that
 * records what it is told to draw: its two series (null is a gap) and its
 * baseline markers. Each state is asserted there and in the table the block
 * renders from the same view, which is what a reader of the page perceives.
 */
const { Chart } = vi.hoisted(() => ({
  Chart: vi.fn<(props: { series: { name: string; data: (number | null)[] }[]; options: ApexOptions }) => null>(() => null),
}));
vi.mock("react-apexcharts", () => ({ default: Chart }));

vi.mock(import("../../../api/custom-instance"), async (importOriginal) => ({
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
const AUGUST = { startDate: "2026-07-31T22:00:00Z", endDate: "2026-08-31T21:00:00Z" };

/** A full day: consumption every hour, assigned production from 8 h to 19 h, each over 62 samples. */
function fullDay(): MembershipHourlyProfileBucketResponse[] {
  return Array.from({ length: 24 }, (_, hour) =>
    buildMembershipHourlyProfileBucket({
      hour,
      averageConsumptionKWh: 0.25 + hour / 100,
      consumptionSampleCount: 62,
      ...(hour >= 8 && hour <= 19
        ? { averageAssignedProductionKWh: 0.4 + hour / 100, assignedProductionSampleCount: 62 }
        : { averageAssignedProductionKWh: 0, assignedProductionSampleCount: 62 }),
    }),
  );
}

/** A full day with some hours replaced. */
function profileWith(hours: Record<number, Partial<MembershipHourlyProfileBucketResponse>> = {}): MembershipHourlyProfileResponse {
  return buildMembershipHourlyProfile({
    period: AUGUST,
    coverage: { hoursWithData: 1488, expectedHours: 1488, supplyCount: 2, suppliesWithData: 2 },
    buckets: fullDay().map((bucket) => ({ ...bucket, ...hours[bucket.hour] })),
  });
}

function answer(profile: MembershipHourlyProfileResponse | "error" | "loading" = profileWith()) {
  vi.mocked(useGetMembershipHourlyProfile).mockReturnValue(
    profile === "error"
      ? query.error(new Error("hourly profile failed"))
      : profile === "loading"
        ? query.loading()
        : query.success<typeof getMembershipHourlyProfile>(profile),
  );
}

function open() {
  return renderWithProviders(<BestHours />, { activeCommunityId: COMMUNITY_ID });
}

// Intl separates figures from their unit with a no-break space.
const text = (element: HTMLElement) => (element.textContent ?? "").replace(/\u00a0/g, " ");

const chart = () => Chart.mock.calls.at(-1)![0];
const consumption = () => chart().series.find((s) => s.name === "Tu consumo")!.data;
const production = () => chart().series.find((s) => s.name === "Energía asignada")!.data;
/** The baseline markers the chart is told to draw at an hour, by series: 0 consumption, 1 assigned production. */
const markersAt = (hour: number, seriesIndex: number) =>
  (chart().options.annotations?.points ?? []).filter(
    (point) => point.x === `${hour} h` && point.seriesIndex === seriesIndex,
  );
/** A hollow marker: filled with the surface, outlined in the series colour. */
const hollow = { marker: expect.objectContaining({ fillColor: colors.background.paper }) };

const table = () => screen.getByRole("table", { name: /Datos del gráfico/ });
const cells = (hour: number) =>
  within(within(table()).getByRole("rowheader", { name: `${hour} h` }).closest("tr")!)
    .getAllByRole("cell")
    .map(text);

describe("BestHours (#201)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLoggedUser).mockReturnValue(
      buildCurrentUser({ id: USER_ID, memberships: { [COMMUNITY_ID]: CommunityRole.COMMUNITY_MEMBER } }),
    );
    answer();
  });

  afterEach(() => {
    expect(customInstance).not.toHaveBeenCalled();
  });

  it("asks the active community for the caller's own profile", () => {
    open();

    expect(vi.mocked(useGetMembershipHourlyProfile)).toHaveBeenCalledWith(COMMUNITY_ID, USER_ID, { query: { enabled: true } });
  });

  it("names the month it covers as the latest published one, without implying the member chose it", () => {
    open();

    const caption = text(screen.getByRole("region", { name: "Tus mejores horas" }));
    expect(caption).toContain("Media de cada hora en agosto de 2026, el último mes que ha publicado la distribuidora.");
    expect(caption).not.toMatch(/elegid|seleccion|escog/i);
  });

  describe("AC5 -- the twenty-four hours in order, with hours that have no sample drawn as gaps", () => {
    it("draws 0 h to 23 h in order, in both series", () => {
      open();

      expect(chart().options.xaxis?.categories).toEqual(Array.from({ length: 24 }, (_, hour) => `${hour} h`));
      expect(consumption()).toHaveLength(24);
      expect(production()).toHaveLength(24);
      expect(within(table()).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(
        Array.from({ length: 24 }, (_, hour) => `${hour} h`),
      );
    });

    it("leaves an hour without any sample empty in both series, marks it hollow, and never as zero", () => {
      answer(
        profileWith({
          3: { averageConsumptionKWh: null, consumptionSampleCount: 0, averageAssignedProductionKWh: null, assignedProductionSampleCount: 0 },
        }),
      );
      open();

      expect(consumption()[3]).toBeNull();
      expect(production()[3]).toBeNull();
      expect(markersAt(3, 0)).toEqual([expect.objectContaining({ id: "no-sample-0-3", y: 0, ...hollow })]);
      expect(markersAt(3, 1)).toEqual([expect.objectContaining({ id: "no-sample-1-3", y: 0, ...hollow })]);
      expect(cells(3)).toEqual(["Sin registros", "Sin registros"]);
    });
  });

  describe("AC6 -- an hour whose assigned production has samples but averages zero is drawn as zero", () => {
    it("draws zero, marks it filled on the baseline, and says it is a measured average", () => {
      open();

      expect(production()[2]).toBe(0);
      expect(markersAt(2, 1)).toEqual([expect.objectContaining({ id: "zero-1-2", y: 0 })]);
      expect(cells(2)[1]).toBe("0 kWh (media de 62 registros)");
    });

    it("draws a zero and a gap differently", () => {
      answer(profileWith({ 3: { averageAssignedProductionKWh: null, assignedProductionSampleCount: 0 } }));
      open();

      const [zero] = markersAt(2, 1);
      const [gap] = markersAt(3, 1);
      expect(zero.marker?.fillColor).not.toBe(gap.marker?.fillColor);
      expect(zero.marker?.fillColor).toBe(zero.marker?.strokeColor);
      expect(cells(2)[1]).not.toBe(cells(3)[1]);
    });

    it("puts no marker on an hour with a positive average", () => {
      open();

      expect(markersAt(12, 0)).toEqual([]);
      expect(markersAt(12, 1)).toEqual([]);
    });
  });

  describe("AC7 -- the two series rest on their own sample counts", () => {
    it("an hour with consumption samples and none of assigned production draws consumption and leaves production a gap", () => {
      answer(profileWith({ 21: { averageConsumptionKWh: 0.46, averageAssignedProductionKWh: null, assignedProductionSampleCount: 0 } }));
      open();

      expect(consumption()[21]).toBe(0.46);
      expect(production()[21]).toBeNull();
      expect(markersAt(21, 0)).toEqual([]);
      expect(markersAt(21, 1)).toEqual([expect.objectContaining({ id: "no-sample-1-21" })]);
      expect(cells(21)).toEqual(["0,46 kWh (media de 62 registros)", "Sin registros"]);
    });

    it("an hour with assigned production samples and none of consumption draws production and leaves consumption a gap", () => {
      answer(profileWith({ 12: { averageConsumptionKWh: null, consumptionSampleCount: 0, averageAssignedProductionKWh: 0.52 } }));
      open();

      expect(consumption()[12]).toBeNull();
      expect(production()[12]).toBe(0.52);
      expect(markersAt(12, 0)).toEqual([expect.objectContaining({ id: "no-sample-0-12" })]);
      expect(cells(12)).toEqual(["Sin registros", "0,52 kWh (media de 62 registros)"]);
    });

    it("each series states its own count when both have samples, in different numbers", () => {
      // The October transition day gives one local hour two samples of that day.
      answer(profileWith({ 2: { averageConsumptionKWh: 0.27, consumptionSampleCount: 63, averageAssignedProductionKWh: 0, assignedProductionSampleCount: 31 } }));
      open();

      expect(cells(2)).toEqual(["0,27 kWh (media de 63 registros)", "0 kWh (media de 31 registros)"]);
    });
  });

  describe("AC8 -- nothing to show yet", () => {
    it("explains it neutrally when no month resolves", () => {
      answer(buildMembershipHourlyProfile());
      open();

      expect(screen.getByRole("note")).toHaveTextContent("Todavía no hay horas que mostrar");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(Chart).not.toHaveBeenCalled();
    });

    it("explains it neutrally when the month resolves but no hour has a sample in either series", () => {
      answer(buildMembershipHourlyProfile({ period: AUGUST }));
      open();

      expect(screen.getByRole("note")).toHaveTextContent("Todavía no hay horas que mostrar");
      expect(Chart).not.toHaveBeenCalled();
    });
  });

  it("loads on its own, behind a labelled placeholder", () => {
    answer("loading");
    open();

    expect(screen.getByLabelText("Cargando tus mejores horas")).toBeInTheDocument();
  });

  describe("#231 AC4 -- consumption and assigned energy each keep their own colour", () => {
    it("draws both series solid, each in its own colour", () => {
      open();
      const { options } = chart();

      expect(options.colors).toEqual([ENERGY_COLORS.consumption, ENERGY_COLORS.assigned]);
      expect(options.fill?.colors).toBeUndefined();
      expect(options.stroke?.colors).toEqual([colors.background.paper]);
    });

    it("leaves the legend to the block, where it reads without scrolling the chart", () => {
      open();
      const legend = within(screen.getByRole("region", { name: "Tus mejores horas" })).getByRole("list");

      expect(chart().options.legend?.show).toBe(false);
      expect(within(legend).getAllByRole("listitem").map(text)).toEqual(["Tu consumo", "Energía asignada", "Mejores horas"]);
    });

    it("marks a gap and a measured zero in the series' own colour", () => {
      answer(profileWith({ 2: { averageAssignedProductionKWh: 0, assignedProductionSampleCount: 62 } }));
      open();
      const [zero] = markersAt(2, 1);

      expect(zero.marker?.strokeColor).toBe(ENERGY_COLORS.assigned);
    });
  });

  describe("#231 -- leads with which hours are best", () => {
    const lead = () => screen.getByText(/^Mejores horas:/);
    const low = { averageAssignedProductionKWh: 0.1, assignedProductionSampleCount: 62 };

    it("names the hours when assigned energy exceeds consumption, from the first to the end of the last", () => {
      open();

      expect(text(lead())).toBe("Mejores horas: de 8 h a 20 h");
    });

    it("states it before the caption and the chart: the block answers first", () => {
      open();
      const caption = screen.getByText(/^Media de cada hora en/);

      expect(lead().compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("lists each run of consecutive best hours", () => {
      answer(profileWith({ 12: low }));
      open();

      expect(text(lead())).toBe("Mejores horas: de 8 h a 12 h y de 13 h a 20 h");
    });

    it("joins three runs or more as a list", () => {
      answer(profileWith({ 10: low, 14: low }));
      open();

      expect(text(lead())).toBe("Mejores horas: de 8 h a 10 h, de 11 h a 14 h y de 15 h a 20 h");
    });

    it.each([
      ["no consumption sample", { averageConsumptionKWh: null, consumptionSampleCount: 0 }],
      ["no assigned production sample", { averageAssignedProductionKWh: null, assignedProductionSampleCount: 0 }],
      ["assigned energy equal to consumption", { averageConsumptionKWh: 0.52, averageAssignedProductionKWh: 0.52 }],
    ])("never counts an hour with %s as best", (_, hour) => {
      answer(profileWith({ 12: hour }));
      open();

      expect(text(lead())).toBe("Mejores horas: de 8 h a 12 h y de 13 h a 20 h");
    });

    it.each([
      ["fewer hours with data than the month has", { hoursWithData: 1300, expectedHours: 1488, supplyCount: 2, suppliesWithData: 2 }],
      ["fewer supplies with data than the member has", { hoursWithData: 1488, expectedHours: 1488, supplyCount: 2, suppliesWithData: 1 }],
    ])("with %s, says the best hours cannot be worked out, and names and shades none", (_, coverage) => {
      answer({ ...profileWith(), coverage });
      open();

      expect(text(lead())).toBe("Mejores horas: no se pueden calcular, porque faltan datos de este mes.");
      expect(chart().options.grid?.column?.colors).toEqual(Array(24).fill("transparent"));
    });

    it("keys the gap on the advice's own rule: a month the advice speaks for names its hours", () => {
      const coverage = { hoursWithData: 1488, expectedHours: 1488, supplyCount: 2, suppliesWithData: 2 };
      answer({ ...profileWith(), coverage });
      open();

      expect(isPartialMonth(coverage)).toBe(false);
      expect(text(lead())).toBe("Mejores horas: de 8 h a 20 h");
    });

    it("says so in words when no hour qualifies", () => {
      answer(profileWith(Object.fromEntries(Array.from({ length: 24 }, (_, hour) => [hour, low]))));
      open();

      expect(text(lead())).toBe("Mejores horas: ninguna este mes");
      expect(chart().options.grid?.column?.colors).toEqual(Array(24).fill("transparent"));
    });

    it("shades exactly the best hours' columns, in the colour the legend names", () => {
      answer(profileWith({ 12: low }));
      open();
      const shaded = (chart().options.grid?.column?.colors as string[]).flatMap((color, hour) =>
        color === ENERGY_COLORS.bestHours ? [hour] : [],
      );
      const legend = within(screen.getByRole("region", { name: "Tus mejores horas" })).getByRole("list");

      expect(shaded).toEqual([8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19]);
      expect(within(legend).getByText("Mejores horas")).toBeInTheDocument();
    });

    it("leaves the table as the chart's data, series by series", () => {
      open();

      expect(within(table()).getAllByRole("columnheader").map(text)).toEqual(["Hora", "Tu consumo", "Energía asignada"]);
    });
  });
});
