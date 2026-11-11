import { describe, expect, it } from "vitest";
import { axisTime, gapsPhrase, inverterCurve } from "./inverterCurve";
import { NOW, WITH_GAP, available, points } from "./inverterToday.testData";

const now = Date.parse(NOW);
const at = (time: string) => Date.parse(`2026-11-12T${time}:00+01:00`);

describe("UI-PLT-012 today's power curve (#406)", () => {
  it("UI-PLT-012 runs from today's local midnight to tomorrow's", () => {
    const curve = inverterCurve(available().powerCurve!, now);
    expect(curve.dayStart).toBe(Date.parse("2026-11-12T00:00:00+01:00"));
    expect(curve.dayEnd).toBe(Date.parse("2026-11-13T00:00:00+01:00"));
    expect(curve.now).toBe(now);
  });

  it("UI-PLT-012 AC11 keeps a null point null, so the line breaks, and covers the stretch with one gap from the snapshot before", () => {
    const curve = inverterCurve(WITH_GAP.powerCurve!, now);

    expect(curve.points.filter(([, y]) => y === null).map(([x]) => x)).toEqual([at("10:50"), at("11:05")]);
    expect(curve.gaps).toEqual([{ from: at("10:20"), to: at("11:05") }]);
  });

  it("UI-PLT-012 keeps two separate stretches apart", () => {
    const curve = inverterCurve(
      [...points("08:00", "08:10", 5), { endsAt: "2026-11-12T08:40:00+01:00", powerKW: null }, ...points("08:45", "09:00", 6), { endsAt: "2026-11-12T09:30:00+01:00", powerKW: null }, ...points("09:35", "09:40", 7)],
      now,
    );
    expect(curve.gaps).toEqual([
      { from: at("08:10"), to: at("08:40") },
      { from: at("09:00"), to: at("09:30") },
    ]);
    expect(gapsPhrase(curve.gaps, curve.dayEnd)).toBe("de 08:10 a 08:40 y de 09:00 a 09:30");
  });

  it("UI-PLT-012 AC11 draws nothing after now", () => {
    const curve = inverterCurve([...points("13:30", "13:40", 9), ...points("13:45", "14:00", 9)], now);
    expect(curve.points.map(([x]) => x)).toEqual([at("13:30"), at("13:35"), at("13:40")]);
    expect(Math.max(...curve.points.map(([x]) => x))).toBeLessThanOrEqual(now);
  });

  it("UI-PLT-012 a first point that is a gap starts its stretch at midnight", () => {
    const curve = inverterCurve([{ endsAt: "2026-11-12T07:00:00+01:00", powerKW: null }, ...points("07:05", "07:10", 1)], now);
    expect(curve.gaps).toEqual([{ from: at("00:00"), to: at("07:00") }]);
  });

  it("UI-PLT-012 names the end of the day 24:00, not the next day's 00:00", () => {
    const { dayEnd } = inverterCurve([], now);
    expect(axisTime(dayEnd, dayEnd)).toBe("24:00");
    expect(axisTime(at("13:42"), dayEnd)).toBe("13:42");
  });
});
