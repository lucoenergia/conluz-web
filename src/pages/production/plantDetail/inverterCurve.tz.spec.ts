import { describe, expect, it } from "vitest";
import { expectDeviceTimeZone } from "../../../test/deviceTimeZone";
import { axisTime, inverterCurve } from "./inverterCurve";

// The curve runs on the instant line, in Madrid, whatever the device's zone
// (UI-PLT-012, as UI-HIS-028 lays out an hourly axis). This file runs as a
// device in New York, behind Madrid.

const HOUR_MS = 3_600_000;

describe("UI-PLT-012 today's power curve, on a device in another time zone (#406)", () => {
  it("runs as a device in New York", () => {
    expectDeviceTimeZone();
  });

  it("UI-PLT-012 reads today, and labels its instants, in Madrid: 00:30 in Madrid is still the day before in New York", () => {
    const now = Date.parse("2026-11-12T00:30:00+01:00");
    const curve = inverterCurve([{ endsAt: "2026-11-12T00:25:00+01:00", powerKW: 0 }], now);

    expect(curve.dayStart).toBe(Date.parse("2026-11-12T00:00:00+01:00"));
    expect(curve.points).toHaveLength(1);
    expect(axisTime(curve.now, curve.dayEnd)).toBe("00:30");
  });

  it("UI-PLT-012 on 25 October 2026 the axis spans 25 hours, and the repeated 02:00-03:00 keeps going forwards", () => {
    // 02:00 to 03:00 happens twice: first at +02:00, then at +01:00.
    const curve = inverterCurve(
      [
        { endsAt: "2026-10-25T02:30:00+02:00", powerKW: 0 },
        { endsAt: "2026-10-25T02:55:00+02:00", powerKW: 0 },
        { endsAt: "2026-10-25T02:10:00+01:00", powerKW: 0 },
        { endsAt: "2026-10-25T02:40:00+01:00", powerKW: 0 },
        { endsAt: "2026-10-25T03:05:00+01:00", powerKW: 0 },
      ],
      Date.parse("2026-10-25T12:00:00+01:00"),
    );

    expect(curve.dayEnd - curve.dayStart).toBe(25 * HOUR_MS);
    const xs = curve.points.map(([x]) => x);
    expect(xs.every((x, index) => index === 0 || x > xs[index - 1])).toBe(true);
    expect(xs.map((x) => axisTime(x, curve.dayEnd))).toEqual(["02:30", "02:55", "02:10", "02:40", "03:05"]);
  });

  it("UI-PLT-012 on 29 March 2026 the axis spans 23 hours", () => {
    const curve = inverterCurve([], Date.parse("2026-03-29T12:00:00+02:00"));

    expect(curve.dayStart).toBe(Date.parse("2026-03-29T00:00:00+01:00"));
    expect(curve.dayEnd).toBe(Date.parse("2026-03-30T00:00:00+02:00"));
    expect(curve.dayEnd - curve.dayStart).toBe(23 * HOUR_MS);
  });
});
