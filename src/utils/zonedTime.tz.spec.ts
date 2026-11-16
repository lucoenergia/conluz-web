import { describe, expect, it } from "vitest";
import { expectDeviceTimeZone } from "../test/deviceTimeZone";
import { appToday } from "./zonedTime";

// Runs in the `app-time-zone` Vitest project, as a device in New York, behind Madrid.

describe("appToday is Madrid's calendar date, wherever the device is (#423)", () => {
  it("runs in the project's device zone", () => {
    expectDeviceTimeZone();
  });

  it("UI-SUP-027 is already tomorrow in Madrid while it is still today in New York", () => {
    // 00:30 on 15 March in Madrid, 19:30 on 14 March in New York.
    expect(appToday(Date.parse("2026-03-14T23:30:00Z"))).toBe("2026-03-15");
  });

  it("UI-SUP-027 crosses a year the same way", () => {
    expect(appToday(Date.parse("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });
});
