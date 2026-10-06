import { describe, expect, it } from "vitest";
import type { MembershipEnergyMetricsResponse } from "../../../api/models";
import { buildMembershipEnergyMetrics } from "../../../test/fixtures";
import { MIN_COMPARABLE_COVERAGE } from "./memberHomeMessage";
import { compareWithPreviousMonth, type FigureComparison, type MonthComparison } from "./monthComparison";

const CURRENT_MONTH = "agosto de 2026";
const PREVIOUS_MONTH = "julio de 2026";

/** Two supplies over a 31-day month. */
const EXPECTED_HOURS = 1488;
const COMPLETE = { hoursWithData: EXPECTED_HOURS, expectedHours: EXPECTED_HOURS, supplyCount: 2, suppliesWithData: 2 };

function month(overrides: Partial<MembershipEnergyMetricsResponse> = {}): MembershipEnergyMetricsResponse {
  return buildMembershipEnergyMetrics({
    period: { startDate: "2026-08-01T00:00:00+02:00", endDate: "2026-08-31T23:00:00+02:00" },
    coverage: COMPLETE,
    savings: { amountEur: 18.15, tariffSource: "REAL_TARIFF", estimatedPrice: null },
    selfConsumptionRatio: 0.45,
    selfSufficiencyRatio: 0.29,
    ...overrides,
  });
}

function compare(current: MembershipEnergyMetricsResponse, previous: MembershipEnergyMetricsResponse): MonthComparison {
  return compareWithPreviousMonth({ current, previous, currentMonth: CURRENT_MONTH, previousMonth: PREVIOUS_MONTH });
}

// Intl separates figures from their unit with a no-break space.
const plain = (value: string) => value.replace(/\u00a0/g, " ");

function figure(comparison: MonthComparison, label: string): FigureComparison {
  if (comparison.kind !== "available") throw new Error(`expected an available comparison, got ${comparison.kind}`);
  const found = comparison.figures.find((candidate) => candidate.label === label);
  if (!found) throw new Error(`no figure labelled ${label}`);
  return found.kind === "compared"
    ? { ...found, current: plain(found.current), previous: plain(found.previous), change: plain(found.change) }
    : found;
}

const SAVINGS = "Tu ahorro";
const SELF_CONSUMPTION = "Energía asignada que usaste";
const SELF_SUFFICIENCY = "Consumo cubierto por la comunidad";

describe("compareWithPreviousMonth (#200)", () => {
  it("compares savings, self-consumption and self-sufficiency, in that order", () => {
    const comparison = compare(month(), month());

    expect(comparison.kind === "available" && comparison.figures.map(({ label }) => label)).toEqual([
      SAVINGS,
      SELF_CONSUMPTION,
      SELF_SUFFICIENCY,
    ]);
  });

  describe("a ratio changes in percentage points, never as a relative percentage", () => {
    it("20 % to 30 % is 10 points more, not a 50 % rise", () => {
      const comparison = compare(month({ selfSufficiencyRatio: 0.3 }), month({ selfSufficiencyRatio: 0.2 }));

      expect(figure(comparison, SELF_SUFFICIENCY)).toEqual({
        label: SELF_SUFFICIENCY,
        kind: "compared",
        current: "30 %",
        previous: "20 %",
        direction: "up",
        change: "10 puntos porcentuales más",
      });
    });

    it("40 % to 30 % is 10 points less, not a 25 % fall", () => {
      const comparison = compare(month({ selfConsumptionRatio: 0.3 }), month({ selfConsumptionRatio: 0.4 }));

      expect(figure(comparison, SELF_CONSUMPTION)).toMatchObject({ direction: "down", change: "10 puntos porcentuales menos" });
    });

    it("counts the points between the whole percents shown, so the figures on screen add up", () => {
      // 0.4549 - 0.3051 is 14.98 points, but the screen shows 45 % and 31 %.
      const comparison = compare(month({ selfConsumptionRatio: 0.4549 }), month({ selfConsumptionRatio: 0.3051 }));

      expect(figure(comparison, SELF_CONSUMPTION)).toMatchObject({
        current: "45 %",
        previous: "31 %",
        change: "14 puntos porcentuales más",
      });
    });

    it("says one point in the singular", () => {
      const comparison = compare(month({ selfConsumptionRatio: 0.46 }), month({ selfConsumptionRatio: 0.45 }));

      expect(figure(comparison, SELF_CONSUMPTION)).toMatchObject({ change: "1 punto porcentual más" });
    });

    it("an unchanged share says so instead of a zero", () => {
      const comparison = compare(month(), month());

      expect(figure(comparison, SELF_CONSUMPTION)).toMatchObject({ direction: "same", change: "Igual que en julio de 2026" });
    });
  });

  describe("savings change in euros", () => {
    it("a rise", () => {
      const comparison = compare(month(), month({ savings: { amountEur: 14.88, tariffSource: "REAL_TARIFF", estimatedPrice: null } }));

      expect(figure(comparison, SAVINGS)).toEqual({
        label: SAVINGS,
        kind: "compared",
        current: "18,15 €",
        previous: "14,88 €",
        direction: "up",
        change: "3,27 € más",
      });
    });

    it("a fall", () => {
      const comparison = compare(month(), month({ savings: { amountEur: 20.5, tariffSource: "REAL_TARIFF", estimatedPrice: null } }));

      expect(figure(comparison, SAVINGS)).toMatchObject({ direction: "down", change: "2,35 € menos" });
    });

    it("against a month that saved nothing, the whole amount is the change", () => {
      const comparison = compare(month(), month({ savings: { amountEur: 0, tariffSource: "REAL_TARIFF", estimatedPrice: null } }));

      expect(figure(comparison, SAVINGS)).toMatchObject({ previous: "0,00 €", direction: "up", change: "18,15 € más" });
    });
  });

  describe("a figure null in either month is not compared", () => {
    it("null in the month before", () => {
      const comparison = compare(month(), month({ selfConsumptionRatio: null }));

      expect(figure(comparison, SELF_CONSUMPTION)).toEqual({
        label: SELF_CONSUMPTION,
        kind: "not-compared",
        reason: "Sin comparación: no hay dato de julio de 2026.",
      });
    });

    it("null in the reference month", () => {
      const comparison = compare(month({ selfSufficiencyRatio: null }), month());

      expect(figure(comparison, SELF_SUFFICIENCY)).toMatchObject({
        kind: "not-compared",
        reason: "Sin comparación: no hay dato de agosto de 2026.",
      });
    });

    it("null in both", () => {
      const comparison = compare(month({ selfConsumptionRatio: null }), month({ selfConsumptionRatio: null }));

      expect(figure(comparison, SELF_CONSUMPTION)).toMatchObject({
        kind: "not-compared",
        reason: "Sin comparación: no hay dato de julio de 2026 y agosto de 2026.",
      });
    });

    it("a month with consumption but nothing assigned compares its self-sufficiency, which is a real 0 %, and not its self-consumption", () => {
      const nothingAssigned = month({
        savings: { amountEur: 0, tariffSource: "REAL_TARIFF", estimatedPrice: null },
        selfConsumptionRatio: null,
        selfSufficiencyRatio: 0,
      });
      const comparison = compare(month(), nothingAssigned);

      expect(figure(comparison, SAVINGS)).toMatchObject({ kind: "compared", previous: "0,00 €" });
      expect(figure(comparison, SELF_CONSUMPTION)).toMatchObject({ kind: "not-compared" });
      expect(figure(comparison, SELF_SUFFICIENCY)).toMatchObject({ kind: "compared", previous: "0 %", change: "29 puntos porcentuales más" });
    });
  });

  describe(`a month with less than ${MIN_COMPARABLE_COVERAGE * 100} % of its hours recorded is not compared`, () => {
    const threshold = MIN_COMPARABLE_COVERAGE * EXPECTED_HOURS;
    const covering = (hoursWithData: number) => ({ ...COMPLETE, hoursWithData });

    it("exactly at the threshold, the comparison is shown, said to be affected", () => {
      const comparison = compare(month(), month({ coverage: covering(threshold) }));

      expect(comparison.kind).toBe("available");
      expect(comparison.kind === "available" && comparison.affectedBy).toContain("julio de 2026");
    });

    it("one hour below it in the month before, the comparison is not available yet", () => {
      expect(compare(month(), month({ coverage: covering(threshold - 1) }))).toEqual({
        kind: "unavailable",
        title: "Todavía no se puede comparar con el mes anterior",
        text: "No hay datos suficientes de julio de 2026. La comparación aparecerá cuando los dos meses tengan datos.",
      });
    });

    it("one hour below it in the reference month, the same, naming that month", () => {
      const comparison = compare(month({ coverage: covering(threshold - 1) }), month());

      expect(comparison).toMatchObject({ kind: "unavailable", text: expect.stringContaining("de agosto de 2026.") });
    });

    it("a month before with nothing recorded at all, as for an unpublished month or a brand-new member", () => {
      const nothingRecorded = buildMembershipEnergyMetrics({
        period: { startDate: "2026-07-01T00:00:00+02:00", endDate: "2026-07-31T23:00:00+02:00" },
        coverage: { ...COMPLETE, hoursWithData: 0, suppliesWithData: 0 },
        savings: { amountEur: 0, tariffSource: "REAL_TARIFF", estimatedPrice: null },
      });

      expect(compare(month(), nothingRecorded).kind).toBe("unavailable");
    });

    it("a fully recorded month in which nothing was consumed is data, and is compared", () => {
      const emptyHouse = month({
        energy: { totalConsumptionKWh: 0, gridImportKWh: 0, selfConsumptionKWh: 0, surplusKWh: 120, assignedProductionKWh: 120 },
        savings: { amountEur: 0, tariffSource: "REAL_TARIFF", estimatedPrice: null },
        selfConsumptionRatio: 0,
        selfSufficiencyRatio: null,
      });
      const comparison = compare(month(), emptyHouse);

      expect(comparison).toMatchObject({ kind: "available", affectedBy: null });
      expect(figure(comparison, SELF_CONSUMPTION)).toMatchObject({ kind: "compared", change: "45 puntos porcentuales más" });
    });
  });

  describe("partial coverage in either month makes the comparison affected", () => {
    it("both complete: not affected", () => {
      expect(compare(month(), month())).toMatchObject({ kind: "available", affectedBy: null });
    });

    it("the month before missing hours", () => {
      const comparison = compare(month(), month({ coverage: { ...COMPLETE, hoursWithData: 1400 } }));

      expect(comparison).toMatchObject({
        kind: "available",
        affectedBy:
          "La comparación está afectada: faltan datos de julio de 2026, así que parte del cambio puede deberse a esos datos que faltan y no a tu consumo.",
      });
    });

    it("the reference month with a silent supply", () => {
      const comparison = compare(month({ coverage: { ...COMPLETE, hoursWithData: 744, suppliesWithData: 1 } }), month());

      expect(comparison).toMatchObject({ kind: "available", affectedBy: expect.stringContaining("faltan datos de agosto de 2026,") });
    });

    it("both, naming both", () => {
      const partial = { ...COMPLETE, hoursWithData: 1400 };
      const comparison = compare(month({ coverage: partial }), month({ coverage: partial }));

      expect(comparison).toMatchObject({ affectedBy: expect.stringContaining("faltan datos de julio de 2026 y agosto de 2026,") });
    });
  });
});
