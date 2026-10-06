import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ApexOptions } from "apexcharts";
import { useGetMembershipHourlyProfile, type getMembershipHourlyProfile } from "../../../api/memberships/memberships";
import {
  CommunityRole,
  type MembershipHourlyProfileBucketResponse,
  type MembershipHourlyProfileResponse,
} from "../../../api/models";
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
});
