import { describe, expect, it } from "vitest";
import { CUSTOM_SUMMARY } from "./PeriodSelector";
import { RANGE_RULE, RANGE_TOO_LONG } from "./CustomRangePicker";
import { DAILY_LIMIT_DAYS, HOURLY_DAYS, MAX_MONTHS } from "./historicalPeriod";

describe("UI-HIS-006 the custom range texts are read from the period's limits (#401)", () => {
  it("UI-HIS-006 the limits the texts are built from are a single day, 62 days and 24 months", () => {
    // RANGE_RULE says "Un solo día" for HOURLY_DAYS: a change to it must change that text too.
    expect([HOURLY_DAYS, DAILY_LIMIT_DAYS, MAX_MONTHS]).toEqual([1, 62, 24]);
  });

  it("UI-HIS-006 the custom option's summary names the longest range", () => {
    expect(CUSTOM_SUMMARY).toBe("Elige las fechas, hasta 24 meses");
  });

  it("UI-HIS-006 the picker's rule names each granularity's limit", () => {
    expect(RANGE_RULE).toBe(
      "Un solo día se ve por horas; hasta 62 días, por días; si eliges más, se ajusta a meses completos. Como máximo, 24 meses.",
    );
  });

  it("UI-HIS-007 a range over the cap is refused in words naming the cap", () => {
    expect(RANGE_TOO_LONG).toBe("El rango puede ser de 24 meses como máximo. Acorta las fechas.");
  });
});
