import { describe, expect, it } from "vitest";
import type { SupplyResponse } from "../../api/models";
import { toConsumptionSeriesView } from "../../components/evolution/consumptionSeries";
import type { HistoricalPeriod } from "../../components/period/historicalPeriod";
import { CSV_MIME_TYPE, csvDecimal, csvField, periodCsv, periodCsvFileName } from "./periodCsv";
import { slotStateText } from "../../components/evolution/slotStateText";
import {
  HOME,
  hoursOf,
  membershipDay,
  membershipGapHour,
  membershipHour,
  supplyGapHour,
  supplyHour,
  membershipGapDay,
  membershipMonth,
  membershipPartialDay,
  supplyBucket,
  supplyGapDay,
  supplyMeasuredZeroDay,
} from "../../components/evolution/consumptionSeries.testData";

const period = (startDate: string, endDate: string, granularity: HistoricalPeriod["granularity"]): HistoricalPeriod => ({
  startDate,
  endDate,
  granularity,
  label: "Periodo",
});

/** 1-3 July 2026, by days. */
const THREE_JULY_DAYS = period("2026-07-01T00:00:00+02:00", "2026-07-04T00:00:00+02:00", "daily");
/** November 2025 to February 2026, by months: crosses a year and both sides of the daylight-saving change. */
const FOUR_MONTHS = period("2025-11-01T00:00:00+01:00", "2026-03-01T00:00:00+01:00", "monthly");

const HEADER =
  "fecha;de_la_comunidad_autoconsumo_kwh;de_la_red_kwh;se_fue_a_la_red_excedentes_kwh;ahorro_estimado_eur;precio_referencia_eur_kwh;nota_ahorro;datos";
const PRICE = { eurPerKWh: 0.1234 };
const NOTE = "Estimado con un precio de 0,1234 €/kWh para la energía, sin impuestos.";

/** The CSV's lines without the BOM, split on CRLF, the trailing empty one dropped. */
const linesOf = (csv: string) => csv.slice(1).split("\r\n").slice(0, -1);
const cellsOf = (line: string) => line.split(";");

function supplyDays(buckets: ReturnType<typeof supplyBucket>[]) {
  return toConsumptionSeriesView(THREE_JULY_DAYS, { kind: "supplyDaily", buckets }).slots;
}

describe("periodCsv (#251)", () => {
  it("UI-HIS-023 the header is exact, there is one line per slot in axis order, and no totals line", () => {
    const slots = supplyDays([
      supplyBucket("2026/07/01", { selfConsumptionKWh: 1.5 }),
      supplyBucket("2026/07/02", { selfConsumptionKWh: 2.5 }),
      supplyBucket("2026/07/03", { selfConsumptionKWh: 3.5 }),
    ]);

    const lines = linesOf(periodCsv(slots, "daily", null));

    expect(lines[0]).toBe(HEADER);
    expect(lines.slice(1).map((line) => cellsOf(line).slice(0, 2))).toEqual([
      ["2026-07-01", "1,5"],
      ["2026-07-02", "2,5"],
      ["2026-07-03", "3,5"],
    ]);
    expect(lines).toHaveLength(1 + slots.length);
  });

  it("UI-HIS-023 a gap line has empty value cells; a measured zero writes 0", () => {
    const slots = supplyDays([supplyGapDay("2026/07/01"), supplyMeasuredZeroDay("2026/07/02"), supplyBucket("2026/07/03")]);

    const [, gap, zero] = linesOf(periodCsv(slots, "daily", null));

    expect(cellsOf(gap)).toEqual(["2026-07-01", "", "", "", "", "", "", "Sin datos"]);
    expect(cellsOf(zero)).toEqual(["2026-07-02", "0", "0", "0", "0", "", "", "Cero medido"]);
  });

  it("UI-HIS-023 a slot that the series omits is a gap line too", () => {
    const slots = supplyDays([supplyBucket("2026/07/01"), supplyBucket("2026/07/03")]);

    const [, , omitted] = linesOf(periodCsv(slots, "daily", null));

    expect(cellsOf(omitted).slice(1, 5)).toEqual(["", "", "", ""]);
  });

  it("UI-HIS-023 a partial line's datos gives how many supplies reported, and names no supply", () => {
    const slots = toConsumptionSeriesView(THREE_JULY_DAYS, {
      kind: "membershipDaily",
      buckets: [membershipDay("2026/07/01"), membershipPartialDay("2026/07/02", 1, 2), membershipGapDay("2026/07/03")],
    }).slots;

    const csv = periodCsv(slots, "daily", null);
    const [, complete, partial] = linesOf(csv);

    expect(cellsOf(complete).at(-1)).toBe("Completo");
    expect(cellsOf(partial).at(-1)).toBe("Parcial: 1 de 2 puntos con datos");
    expect(csv).not.toContain(HOME.name!);
  });

  it("UI-HIS-023 the values are the API's, unrounded, with a decimal comma", () => {
    const slots = supplyDays([
      supplyBucket("2026/07/01", { selfConsumptionKWh: 12.345, gridImportKWh: 0.001, surplusKWh: 0.0001, savingsEur: 12345.678 }),
      supplyBucket("2026/07/02", { selfConsumptionKWh: 1e-7, gridImportKWh: 7, surplusKWh: 3.25, savingsEur: 0.83 }),
    ]);

    const [, first, second] = linesOf(periodCsv(slots, "daily", null));

    expect(cellsOf(first).slice(1, 5)).toEqual(["12,345", "0,001", "0,0001", "12345,678"]);
    expect(cellsOf(second).slice(1, 5)).toEqual(["0,0000001", "7", "3,25", "0,83"]);
  });

  it.each([
    [0.001, "0,001"],
    [0.0001, "0,0001"],
    [12345.678, "12345,678"],
    [1e-7, "0,0000001"],
    [1.5e-7, "0,00000015"],
    [1e21, "1000000000000000000000"],
    [-0.5, "-0,5"],
    [0, "0"],
  ])("UI-HIS-023 csvDecimal writes %s as %s: no exponent, no thousands separator, every decimal kept", (value, expected) => {
    expect(csvDecimal(value)).toBe(expected);
  });

  it("UI-HIS-023 with estimatedPrice, the price and the note are on every line", () => {
    const slots = supplyDays([supplyBucket("2026/07/01"), supplyGapDay("2026/07/02"), supplyBucket("2026/07/03")]);

    const lines = linesOf(periodCsv(slots, "daily", PRICE)).slice(1);

    expect(lines.map((line) => cellsOf(line).slice(5, 7))).toEqual([
      ["0,1234", NOTE],
      ["0,1234", NOTE],
      ["0,1234", NOTE],
    ]);
  });

  it("UI-HIS-023 without estimatedPrice, both price columns are empty on every line", () => {
    const slots = supplyDays([supplyBucket("2026/07/01"), supplyBucket("2026/07/02"), supplyBucket("2026/07/03")]);

    const lines = linesOf(periodCsv(slots, "daily", null)).slice(1);

    expect(lines.map((line) => cellsOf(line).slice(5, 7))).toEqual([
      ["", ""],
      ["", ""],
      ["", ""],
    ]);
  });

  it("UI-HIS-023 the file starts with the UTF-8 BOM, every line ends with CRLF, and the MIME type is text/csv in UTF-8", () => {
    const csv = periodCsv(supplyDays([supplyBucket("2026/07/01")]), "daily", PRICE);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.slice(1).split("\r\n")).toHaveLength(1 + 3 + 1);
    expect(csv.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(CSV_MIME_TYPE).toBe("text/csv;charset=utf-8");
  });

  it.each([
    ["Casa; garaje", '"Casa; garaje"'],
    ['Taller "Moreño"', '"Taller ""Moreño"""'],
    ["Dos\r\nlíneas", '"Dos\r\nlíneas"'],
    ["Estimado con un precio de 0,15 €/kWh.", "Estimado con un precio de 0,15 €/kWh."],
  ])("UI-HIS-023 csvField writes %j as %j: quoted when it holds a separator, a quote or a line break, inner quotes doubled", (value, expected) => {
    expect(csvField(value)).toBe(expected);
  });

  it("UI-HIS-023 the fecha is yyyy-MM for a month and yyyy-MM-dd for a day", () => {
    const months = toConsumptionSeriesView(FOUR_MONTHS, {
      kind: "membershipMonthly",
      buckets: ["2025/11/01", "2025/12/01", "2026/01/01", "2026/02/01"].map((date) => membershipMonth(date)),
    }).slots;

    const monthly = linesOf(periodCsv(months, "monthly", null)).slice(1);
    const daily = linesOf(periodCsv(supplyDays([supplyBucket("2026/07/01")]), "daily", null)).slice(1);

    expect(monthly.map((line) => cellsOf(line)[0])).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(daily.map((line) => cellsOf(line)[0])).toEqual(["2026-07-01", "2026-07-02", "2026-07-03"]);
  });

  it("UI-HIS-021 every state's short and long words come from the same entry the tooltips read", () => {
    const view = toConsumptionSeriesView(THREE_JULY_DAYS, {
      kind: "membershipDaily",
      buckets: [
        membershipDay("2026/07/01"),
        membershipPartialDay("2026/07/02", 1, 2),
        membershipDay("2026/07/03", { selfConsumptionKWh: 0, gridImportKWh: 0, surplusKWh: 0 }),
      ],
    });
    const gapView = toConsumptionSeriesView(THREE_JULY_DAYS, { kind: "supplyDaily", buckets: [supplyGapDay("2026/07/01")] });
    const slots = [...view.slots, gapView.slots[0]];

    const datos = linesOf(periodCsv(slots, "daily", null))
      .slice(1)
      .map((line) => cellsOf(line).at(-1));

    expect(slots.map((slot) => slot.state.kind)).toEqual(["complete", "partial", "measuredZero", "gap"]);
    slots.forEach((slot, index) => {
      const words = slotStateText(slot.state, "daily");
      expect(slot.stateText).toBe(words.long);
      expect(datos[index]).toBe(words.short);
    });
    expect(datos).toEqual(["Completo", "Parcial: 1 de 2 puntos con datos", "Cero medido", "Sin datos"]);
  });
});

describe("periodCsvFileName (#251)", () => {
  const supply = (name: string): SupplyResponse => ({ ...HOME, name });
  const days = supplyDays([supplyBucket("2026/07/01")]);

  it.each([
    ["Todos mis puntos", "todos", null],
    ["Taller Moreño", "taller-moreno", supply("Taller Moreño")],
    ["Casa / Garaje", "casa-garaje", supply("Casa / Garaje")],
    ["  ¡Ático Nº 3!  ", "atico-n-3", supply("  ¡Ático Nº 3!  ")],
  ])("UI-HIS-024 the scope %j is written as %j", (_label, slug, selected) => {
    expect(periodCsvFileName(selected, days, "daily")).toBe(`conluz-consumo-${slug}-2026-07-01-2026-07-03.csv`);
  });

  it("UI-HIS-024 a supply whose label leaves nothing as ASCII is named by its CUPS", () => {
    expect(periodCsvFileName(supply("東京"), days, "daily")).toBe("conluz-consumo-es0021000000000001aa-2026-07-01-2026-07-03.csv");
  });

  it("UI-HIS-024 the dates are the first and the last day shown: the half-open end minus one day", () => {
    const months = toConsumptionSeriesView(FOUR_MONTHS, { kind: "membershipMonthly", buckets: [] }).slots;

    expect(periodCsvFileName(null, days, "daily")).toBe("conluz-consumo-todos-2026-07-01-2026-07-03.csv");
    expect(periodCsvFileName(null, months, "monthly")).toBe("conluz-consumo-todos-2025-11-01-2026-02-28.csv");
  });
});

describe("periodCsv, hourly (#378)", () => {
  const SEPTEMBER_1 = period("2026-09-01T00:00:00+02:00", "2026-09-02T00:00:00+02:00", "hourly");
  const OCTOBER_25 = period("2026-10-25T00:00:00+02:00", "2026-10-26T00:00:00+01:00", "hourly");

  it("UI-HIS-023 AC5 -- one line per hour in axis order, fecha the hour's local start with its offset", () => {
    const hours = hoursOf(SEPTEMBER_1.startDate, SEPTEMBER_1.endDate);
    const slots = toConsumptionSeriesView(SEPTEMBER_1, {
      kind: "membershipHourly",
      buckets: hours.map((startsAt, index) => membershipHour(startsAt, { selfConsumptionKWh: index / 10 })),
    }).slots;

    const lines = linesOf(periodCsv(slots, "hourly", null));

    expect(lines[0]).toBe(HEADER);
    expect(lines).toHaveLength(1 + 24);
    expect(cellsOf(lines[1]).slice(0, 2)).toEqual(["2026-09-01T00:00+02:00", "0"]);
    expect(cellsOf(lines[15]).slice(0, 2)).toEqual(["2026-09-01T14:00+02:00", "1,4"]);
    expect(cellsOf(lines[24]).slice(0, 2)).toEqual(["2026-09-01T23:00+02:00", "2,3"]);
  });

  it("UI-HIS-023 AC5 -- the October change day has 25 lines, its two 02:00 told apart by their offsets", () => {
    const slots = toConsumptionSeriesView(OCTOBER_25, { kind: "membershipHourly", buckets: [] }).slots;

    const fechas = linesOf(periodCsv(slots, "hourly", null))
      .slice(1)
      .map((line) => cellsOf(line)[0]);

    expect(fechas).toHaveLength(25);
    expect(fechas.slice(1, 5)).toEqual(["2026-10-25T01:00+02:00", "2026-10-25T02:00+02:00", "2026-10-25T02:00+01:00", "2026-10-25T03:00+01:00"]);
  });

  it("UI-HIS-023 a gap hour has empty cells, even a supply's reporting 0.00 €, and its state in words", () => {
    const [first, second] = hoursOf(SEPTEMBER_1.startDate, SEPTEMBER_1.endDate);
    const supplySlots = toConsumptionSeriesView(SEPTEMBER_1, { kind: "supplyHourly", buckets: [supplyHour(first), supplyGapHour(second)] }).slots;
    const membershipSlots = toConsumptionSeriesView(SEPTEMBER_1, { kind: "membershipHourly", buckets: [membershipGapHour(first)] }).slots;

    expect(cellsOf(linesOf(periodCsv(supplySlots, "hourly", null))[2])).toEqual(["2026-09-01T01:00+02:00", "", "", "", "", "", "", "Sin datos"]);
    expect(cellsOf(linesOf(periodCsv(membershipSlots, "hourly", null))[1])).toEqual(["2026-09-01T00:00+02:00", "", "", "", "", "", "", "Sin datos"]);
  });

  it("UI-HIS-024 an hourly period's file is named by its day, twice", () => {
    const slots = toConsumptionSeriesView(SEPTEMBER_1, { kind: "membershipHourly", buckets: [] }).slots;

    expect(periodCsvFileName(null, slots, "hourly")).toBe("conluz-consumo-todos-2026-09-01-2026-09-01.csv");
  });
});
