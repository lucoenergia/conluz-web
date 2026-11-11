import { describe, expect, it } from "vitest";
import { inverterChartOptions } from "./inverterChartOptions";
import { inverterCurve } from "./inverterCurve";
import { NOW } from "./inverterToday.testData";

const HOUR_MS = 3_600_000;
const curve = inverterCurve([], Date.parse(NOW));
const labelAt = (hours: number, wide: boolean, noise = 0) => {
  const xaxis = inverterChartOptions(curve, wide).xaxis!;
  const formatter = xaxis.labels!.formatter as (value: string) => string;
  return formatter(String(curve.dayStart + hours * HOUR_MS + noise));
};

describe("UI-PLT-012 the power curve's time axis (#406)", () => {
  it("UI-PLT-012 has one tick per hour of the day, from midnight to midnight", () => {
    expect(inverterChartOptions(curve, true).xaxis).toMatchObject({ min: curve.dayStart, max: curve.dayEnd, tickAmount: 24 });
  });

  it("UI-PLT-012 labels every 3 hours on a wide screen, the end of the day as 24:00", () => {
    expect([0, 1, 3, 12, 21, 24].map((hours) => labelAt(hours, true))).toEqual(["00:00", "", "03:00", "12:00", "21:00", "24:00"]);
  });

  it("UI-PLT-012 labels every 6 hours on a phone", () => {
    expect([0, 3, 6, 12, 18, 24].map((hours) => labelAt(hours, false))).toEqual(["00:00", "", "06:00", "12:00", "18:00", "24:00"]);
  });

  it("UI-PLT-012 reads a tick a few milliseconds off as its minute, never as 23:59", () => {
    expect(labelAt(24, true, -7)).toBe("24:00");
    expect(labelAt(3, true, 4)).toBe("03:00");
  });
});
