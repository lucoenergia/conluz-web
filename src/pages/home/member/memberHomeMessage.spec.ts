import { describe, expect, it } from "vitest";
import type { MembershipEnergyMetricsCoverageResponse } from "../../../api/models";
import { chooseMemberHomeMessage, isPartialMonth } from "./memberHomeMessage";

const COMPLETE: MembershipEnergyMetricsCoverageResponse = {
  hoursWithData: 1488,
  expectedHours: 1488,
  supplyCount: 2,
  suppliesWithData: 2,
};

// Intl puts a no-break space between a number and its unit or % sign.
const normalise = (text: string) => text.replace(/\u00a0/g, " ");

function messageFor(selfConsumptionRatio: number, coverage = COMPLETE, surplusKWh = 120) {
  const message = chooseMemberHomeMessage({ coverage, selfConsumptionRatio, surplusKWh });
  return { ...message, text: normalise(message.text) };
}

describe("chooseMemberHomeMessage (#199)", () => {
  describe("a month with gaps gets no advice at all", () => {
    it("when hours are missing", () => {
      const message = messageFor(0.1, { ...COMPLETE, hoursWithData: 1400 });

      expect(message.kind).toBe("partial-month");
      expect(message.text).toContain("Este mes está incompleto");
      expect(message.text).not.toMatch(/electrodomésticos|Aprovechaste/);
    });

    it("when a supply has no data, naming how many", () => {
      const message = messageFor(0.9, { ...COMPLETE, suppliesWithData: 1 });

      expect(message.kind).toBe("partial-month");
      expect(message.text).toContain("no hay datos de 1 de tus 2 puntos de suministro");
    });
  });

  it("below 30 % states the exported energy and offers the action without assuming it is possible", () => {
    expect(messageFor(0.2, COMPLETE, 120)).toEqual({
      kind: "advice",
      text: "De la energía que se te asignó, 120 kWh se fueron a la red sin que los usaras. Si puedes usar los electrodomésticos de más consumo en las horas centrales del día, aprovecharás más.",
    });
  });

  it("above 60 % only acknowledges it", () => {
    expect(messageFor(0.75)).toEqual({
      kind: "advice",
      text: "Aprovechaste el 75 % de la energía que se te asignó. Vas muy bien.",
    });
  });

  it("between the two states the share used and what went to the grid", () => {
    expect(messageFor(0.45, COMPLETE, 80)).toEqual({
      kind: "advice",
      text: "Aprovechaste el 45 % de la energía que se te asignó. Los 80 kWh restantes se fueron a la red; usar los electrodomésticos de más consumo en las horas centrales del día sube ese porcentaje.",
    });
  });

  // Moving a threshold must be a deliberate edit: each boundary is pinned.
  describe("thresholds", () => {
    it("just under 30 % is the low case", () => {
      expect(messageFor(0.2999).text).toMatch(/^De la energía que se te asignó/);
    });

    it("exactly 30 % is no longer the low case", () => {
      expect(messageFor(0.3).text).toMatch(/^Aprovechaste el 30 %.*restantes se fueron a la red/);
    });

    it("exactly 60 % is still the middle case", () => {
      expect(messageFor(0.6).text).toMatch(/^Aprovechaste el 60 %.*restantes se fueron a la red/);
    });

    it("just over 60 % is the high case", () => {
      expect(messageFor(0.6001).text).toMatch(/Vas muy bien\.$/);
    });
  });

  it("never prices the advice in euros", () => {
    for (const ratio of [0.1, 0.45, 0.9]) expect(messageFor(ratio).text).not.toContain("€");
  });
});

describe("isPartialMonth", () => {
  it("is false for a complete month", () => {
    expect(isPartialMonth(COMPLETE)).toBe(false);
  });

  it("is true when hours or supplies are missing", () => {
    expect(isPartialMonth({ ...COMPLETE, hoursWithData: 1 })).toBe(true);
    expect(isPartialMonth({ ...COMPLETE, suppliesWithData: 1 })).toBe(true);
  });
});
