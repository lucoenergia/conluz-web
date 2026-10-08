import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ApexOptions } from "apexcharts";
import {
  useGetMembershipEnergyMetrics,
  useGetMembershipMonthlyConsumption,
  type getMembershipEnergyMetrics,
  type getMembershipMonthlyConsumption,
} from "../../../api/memberships/memberships";
import { CommunityRole, type MembershipMonthlyConsumptionBucketResponse } from "../../../api/models";
import { customInstance } from "../../../api/custom-instance";
import { useLoggedUser } from "../../../context/logged-user.context";
import { CAPTURED_MEMBERSHIP_MONTHLY_CONSUMPTION, wireShapeOf } from "../../../test/capturedResponses";
import {
  buildCurrentUser,
  buildMembershipEnergyMetrics,
  buildMembershipMonthlyConsumptionBucket,
} from "../../../test/fixtures";
import { query } from "../../../test/queryState";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { ENERGY_COLORS, SAVINGS_COLOR } from "./energyColors";
import { TwelveMonthSeries } from "./TwelveMonthSeries";

/**
 * The acceptance criteria of #201 for the twelve-month block.
 *
 * ApexCharts cannot lay out in jsdom, so the chart is replaced by a stub that
 * records what it is told to draw: its series (null is a gap) and its
 * annotations. Each state is asserted there and in the table the block renders
 * from the same view, which is what a reader of the page perceives.
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
const AUGUST = { startDate: "2026-07-31T22:00:00Z", endDate: "2026-08-31T21:00:00Z" };

/** September 2025 to August 2026, in order: the twelve months ending at AUGUST. */
const MONTHS = [
  "2025/09/01", "2025/10/01", "2025/11/01", "2025/12/01", "2026/01/01", "2026/02/01",
  "2026/03/01", "2026/04/01", "2026/05/01", "2026/06/01", "2026/07/01", "2026/08/01",
];
const LABELS = ["sept", "oct", "nov", "dic", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago"];
const MARCH = 6;

/** A stored, complete month of two supplies. */
function storedMonth(date: string, index: number): MembershipMonthlyConsumptionBucketResponse {
  return buildMembershipMonthlyConsumptionBucket({
    date,
    consumptionKWh: 200.4 + index,
    selfConsumptionEnergyKWh: 150.6 + index,
    savingsEur: 20.15 + index,
    tariffSource: "REAL_TARIFF",
    supplyCount: 2,
    suppliesWithData: 2,
  });
}

/** Twelve stored, complete months, with one replaced. */
function twelveMonthsWith(index?: number, month?: Partial<MembershipMonthlyConsumptionBucketResponse>) {
  return MONTHS.map((date, i) =>
    i === index ? buildMembershipMonthlyConsumptionBucket({ ...storedMonth(date, i), ...month }) : storedMonth(date, i),
  );
}

/** What a month with nothing stored looks like on the wire: zero energy, null savings and tariff. */
const NOTHING_STORED: Partial<MembershipMonthlyConsumptionBucketResponse> = {
  consumptionKWh: 0,
  selfConsumptionEnergyKWh: 0,
  surplusEnergyKWh: 0,
  generationEnergyKWh: 0,
  savingsEur: null,
  tariffSource: null,
  suppliesWithData: 0,
};

/** A stored month whose records carry zero energy: a measured zero. */
const MEASURED_ZERO: Partial<MembershipMonthlyConsumptionBucketResponse> = {
  consumptionKWh: 0,
  selfConsumptionEnergyKWh: 0,
  surplusEnergyKWh: 0,
  generationEnergyKWh: 0,
  savingsEur: 0,
  tariffSource: "REAL_TARIFF",
  suppliesWithData: 2,
};

function answer(monthly: MembershipMonthlyConsumptionBucketResponse[] | "error" | "loading" = twelveMonthsWith()) {
  vi.mocked(useGetMembershipEnergyMetrics).mockReturnValue(
    query.success<typeof getMembershipEnergyMetrics>(buildMembershipEnergyMetrics({ period: AUGUST })),
  );
  vi.mocked(useGetMembershipMonthlyConsumption).mockReturnValue(
    monthly === "error"
      ? query.error(new Error("monthly series failed"))
      : monthly === "loading"
        ? query.loading()
        : query.success<typeof getMembershipMonthlyConsumption>(monthly),
  );
}

function open() {
  return renderWithProviders(<TwelveMonthSeries />, { activeCommunityId: COMMUNITY_ID });
}

// Intl separates figures from their unit with a no-break space.
const text = (element: HTMLElement) => (element.textContent ?? "").replace(/\u00a0/g, " ");

/** The props of the last chart drawn with a series of that name. */
function chartWith(seriesName: string) {
  const props = Chart.mock.calls.map(([call]) => call).filter((call) => call.series.some((s) => s.name === seriesName));
  return props.at(-1)!;
}
const energyChart = () => chartWith("De la comunidad");
const savingsChart = () => chartWith("Ahorro");
const seriesData = (chart: ReturnType<typeof chartWith>, name: string) => chart.series.find((s) => s.name === name)!.data;
const xAnnotationsAt = (chart: ReturnType<typeof chartWith>, label: string) =>
  (chart.options.annotations?.xaxis ?? []).filter((annotation) => annotation.x === label).map((annotation) => annotation.label?.text);
const zeroMarkersAt = (chart: ReturnType<typeof chartWith>, label: string) =>
  (chart.options.annotations?.points ?? []).filter((annotation) => annotation.x === label);

const table = () => screen.getByRole("table", { name: /Datos del gráfico/ });
const tableRow = (monthName: string) => text(within(table()).getByRole("rowheader", { name: monthName }).closest("tr")!);

describe("TwelveMonthSeries (#201)", () => {
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

  it("asks for the twelve months ending at the resolved month, by bounds derived from it", () => {
    open();

    expect(vi.mocked(useGetMembershipMonthlyConsumption)).toHaveBeenCalledWith(
      COMMUNITY_ID,
      USER_ID,
      { startDate: "2025-09-01T00:00:00+02:00", endDate: AUGUST.endDate },
      { query: { enabled: true } },
    );
  });

  describe("AC1 -- every month in the range occupies its slot, in order", () => {
    it("draws twelve slots from the first month to the resolved one, including months with nothing stored", () => {
      answer(twelveMonthsWith(MARCH, NOTHING_STORED));
      open();

      expect(energyChart().options.xaxis?.categories).toEqual(LABELS);
      expect(savingsChart().options.xaxis?.categories).toEqual(LABELS);
      for (const chart of [energyChart(), savingsChart()]) {
        for (const series of chart.series) expect(series.data).toHaveLength(12);
      }
      const rowHeaders = within(table()).getAllByRole("rowheader").map((cell) => cell.textContent);
      expect(rowHeaders).toEqual([
        "septiembre de 2025", "octubre de 2025", "noviembre de 2025", "diciembre de 2025",
        "enero de 2026", "febrero de 2026", "marzo de 2026", "abril de 2026",
        "mayo de 2026", "junio de 2026", "julio de 2026", "agosto de 2026",
      ]);
    });

    it("names the range and how many of its months carry data", () => {
      answer(twelveMonthsWith(MARCH, NOTHING_STORED));
      open();

      expect(text(screen.getByRole("region", { name: "Tus últimos 12 meses" }))).toContain(
        "De septiembre de 2025 a agosto de 2026: 11 de 12 meses con datos.",
      );
    });

    it("draws each figure as the response gives it, without recomputing it", () => {
      open();

      expect(seriesData(energyChart(), "De la comunidad")[0]).toBe(150.6);
      expect(seriesData(energyChart(), "De la red")[0]).toBe(200.4);
      expect(seriesData(savingsChart(), "Ahorro")[0]).toBe(20.15);
      expect(tableRow("septiembre de 2025")).toContain("20,15 €");
    });
  });

  describe("AC2 -- a month with nothing stored is a gap, never a zero", () => {
    beforeEach(() => answer(twelveMonthsWith(MARCH, NOTHING_STORED)));

    it("leaves the savings series empty at that month and says so on the chart", () => {
      open();

      expect(seriesData(savingsChart(), "Ahorro")[MARCH]).toBeNull();
      expect(xAnnotationsAt(savingsChart(), "mar")).toEqual(["Sin datos"]);
      expect(zeroMarkersAt(savingsChart(), "mar")).toHaveLength(0);
    });

    it("leaves the energy empty at that month too, though the response reads 0 there", () => {
      open();

      expect(seriesData(energyChart(), "De la comunidad")[MARCH]).toBeNull();
      expect(seriesData(energyChart(), "De la red")[MARCH]).toBeNull();
      expect(xAnnotationsAt(energyChart(), "mar")).toEqual(["Sin datos"]);
      expect(zeroMarkersAt(energyChart(), "mar")).toHaveLength(0);
    });

    it("reads as no data in the table, with no zero and no incomplete marker", () => {
      open();

      const row = tableRow("marzo de 2026");
      expect(row).toContain("Sin datos");
      expect(row).not.toMatch(/\b0 kWh|0,00 €/);
      expect(row).not.toContain("Incompleto");
    });
  });

  describe("AC3 -- a month whose records carry zero energy is a measured zero, distinct from the gap", () => {
    beforeEach(() => answer(twelveMonthsWith(MARCH, MEASURED_ZERO)));

    it("draws zero in every series and marks the baseline, with no gap label", () => {
      open();

      expect(seriesData(energyChart(), "De la comunidad")[MARCH]).toBe(0);
      expect(seriesData(energyChart(), "De la red")[MARCH]).toBe(0);
      expect(seriesData(savingsChart(), "Ahorro")[MARCH]).toBe(0);
      expect(zeroMarkersAt(energyChart(), "mar")).toEqual([expect.objectContaining({ y: 0, label: expect.objectContaining({ text: "0" }) })]);
      expect(zeroMarkersAt(savingsChart(), "mar")).toEqual([expect.objectContaining({ y: 0, label: expect.objectContaining({ text: "0" }) })]);
      expect(xAnnotationsAt(energyChart(), "mar")).toEqual([]);
      expect(xAnnotationsAt(savingsChart(), "mar")).toEqual([]);
    });

    it("reads as zero in the table, never as no data", () => {
      open();

      const row = tableRow("marzo de 2026");
      expect(row).toContain("0 kWh");
      expect(row).toContain("0,00 €");
      expect(row).not.toContain("Sin datos");
    });

    it("counts as a month with data", () => {
      open();

      expect(text(screen.getByRole("region", { name: "Tus últimos 12 meses" }))).toContain("12 de 12 meses con datos.");
    });
  });

  describe("AC4 -- a month with fewer reporting supplies than the member has is marked incomplete", () => {
    beforeEach(() => answer(twelveMonthsWith(MARCH, { suppliesWithData: 1, supplyCount: 2 })));

    it("marks that month on both charts with how many supplies reported, and no other month", () => {
      open();

      expect(xAnnotationsAt(energyChart(), "mar")).toEqual(["1 de 2"]);
      expect(xAnnotationsAt(savingsChart(), "mar")).toEqual(["1 de 2"]);
      expect(energyChart().options.annotations?.xaxis).toHaveLength(1);
      expect(seriesData(energyChart(), "De la red")[MARCH]).toBe(200.4 + MARCH);
    });

    it("says it in the table and explains the marker in the caption", () => {
      open();

      expect(tableRow("marzo de 2026")).toContain("Incompleto: 1 de 2 suministros");
      expect(tableRow("abril de 2026")).toContain("Completos");
      expect(text(screen.getByRole("region", { name: "Tus últimos 12 meses" }))).toContain(
        "una barra más baja no significa que consumieras menos",
      );
    });

    it("does not explain a marker when every month is complete", () => {
      answer(twelveMonthsWith());
      open();

      expect(text(screen.getByRole("region", { name: "Tus últimos 12 meses" }))).not.toContain("1 de 2");
    });
  });

  describe("AC8 -- nothing to show yet", () => {
    it("explains it neutrally when no month in the range has anything stored", () => {
      answer(MONTHS.map((date) => buildMembershipMonthlyConsumptionBucket({ date, ...NOTHING_STORED, supplyCount: 2 })));
      open();

      expect(screen.getByRole("note")).toHaveTextContent("Todavía no hay meses que mostrar");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(Chart).not.toHaveBeenCalled();
    });

    it("draws a single month with data beside eleven gaps, and says how many carry data", () => {
      answer(MONTHS.map((date, i) => (i === 11 ? storedMonth(date, i) : buildMembershipMonthlyConsumptionBucket({ date, ...NOTHING_STORED }))));
      open();

      expect(seriesData(savingsChart(), "Ahorro").filter((value) => value === null)).toHaveLength(11);
      expect(text(screen.getByRole("region", { name: "Tus últimos 12 meses" }))).toContain("1 de 12 meses con datos.");
    });
  });

  it("loads on its own, behind a labelled placeholder", () => {
    answer("loading");
    open();

    expect(screen.getByLabelText("Cargando tus últimos 12 meses")).toBeInTheDocument();
  });

  describe("#219 -- the months of the response the API actually returns", () => {
    // October 2022 to September 2023, captured from the running backend: a
    // bucket's date reads "2022/10/01", and the first seven months have
    // nothing stored.
    const CAPTURED_LABELS = ["oct", "nov", "dic", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept"];
    const CAPTURED_NAMES = [
      "octubre de 2022", "noviembre de 2022", "diciembre de 2022", "enero de 2023",
      "febrero de 2023", "marzo de 2023", "abril de 2023", "mayo de 2023",
      "junio de 2023", "julio de 2023", "agosto de 2023", "septiembre de 2023",
    ];
    const CAPTURED_CAPTION = "De octubre de 2022 a septiembre de 2023: 5 de 12 meses con datos.";
    const block = () => screen.getByRole("region", { name: "Tus últimos 12 meses" });

    beforeEach(() => answer(CAPTURED_MEMBERSHIP_MONTHLY_CONSUMPTION));

    it("AC2 -- this spec's own months carry the date and time as the API writes them", () => {
      const [captured] = CAPTURED_MEMBERSHIP_MONTHLY_CONSUMPTION;
      for (const bucket of [...twelveMonthsWith(), buildMembershipMonthlyConsumptionBucket({ ...NOTHING_STORED })]) {
        expect(bucket.date).toMatch(wireShapeOf(captured.date));
        expect(bucket.time).toMatch(wireShapeOf(captured.time));
      }
    });

    it("AC1 -- every column carries its month name and the caption states the range", () => {
      open();

      expect(energyChart().options.xaxis?.categories).toEqual(CAPTURED_LABELS);
      expect(savingsChart().options.xaxis?.categories).toEqual(CAPTURED_LABELS);
      expect(within(table()).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(CAPTURED_NAMES);
      expect(text(block())).toContain(CAPTURED_CAPTION);
      expect(text(block())).not.toContain("Invalid Date");
    });

    it("AC3 -- labels a month with nothing stored by its name too", () => {
      open();

      expect(xAnnotationsAt(energyChart(), "oct")).toEqual(["Sin datos"]);
      expect(xAnnotationsAt(savingsChart(), "oct")).toEqual(["Sin datos"]);
      expect(tableRow("octubre de 2022")).toContain("Sin datos");
    });

    describe.each(["Pacific/Kiritimati", "America/Los_Angeles"])(
      "AC4 -- on a device in %s, on the first day of a month",
      (deviceTimeZone) => {
        const originalTz = process.env.TZ;
        beforeEach(() => {
          process.env.TZ = deviceTimeZone;
          // Midnight on 1 October on the device: the hour at which an offset
          // reading the date as an instant would swallow the whole month.
          vi.useFakeTimers({ toFake: ["Date"] });
          vi.setSystemTime(new Date(2023, 9, 1, 0, 0, 0));
        });
        afterEach(() => {
          vi.useRealTimers();
          process.env.TZ = originalTz;
        });

        it("names each bucket's own month, never the one before", () => {
          open();

          expect(energyChart().options.xaxis?.categories).toEqual(CAPTURED_LABELS);
          expect(within(table()).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(CAPTURED_NAMES);
          expect(text(block())).toContain(CAPTURED_CAPTION);
        });
      },
    );
  });

  describe("#231 AC4 -- community and grid energy keep the colours they have everywhere else", () => {
    it("colours each series by its concept, and the savings as a gain", () => {
      open();

      expect(chartWith("De la comunidad").options.colors).toEqual([ENERGY_COLORS.community, ENERGY_COLORS.grid]);
      expect(chartWith("Ahorro").options.colors).toEqual([SAVINGS_COLOR]);
    });

    it("leaves the legend to the block, naming the series the charts draw", () => {
      open();
      const legend = within(screen.getByRole("region", { name: "Tus últimos 12 meses" })).getByRole("list");

      expect(chartWith("De la comunidad").options.legend?.show).toBe(false);
      expect(chartWith("Ahorro").options.legend?.show).toBe(false);
      expect(within(legend).getAllByRole("listitem").map(text)).toEqual(["De la comunidad", "De la red", "Ahorro"]);
    });
  });
});
