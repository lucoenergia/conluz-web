import { describe, expect, it } from "vitest";
import { expectEastDeviceTimeZone } from "./deviceTimeZone";

// Runs in the `app-time-zone-east` Vitest project. If the project's env
// stopped applying, every *.tz-east.spec would pass vacuously on a machine in
// Madrid; this file fails instead.
describe("the east-of-Madrid device-zone project (#250)", () => {
  it("runs as a device in Pacific/Kiritimati", () => {
    expectEastDeviceTimeZone();
  });

  it("puts the device's midnight on the day before in Madrid", () => {
    // Why the project exists: a calendar date read as the device's midnight
    // lands on the previous Madrid day, which a zone behind Madrid never shows.
    const deviceMidnight = new Date(2026, 6, 1);
    expect(deviceMidnight.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })).toBe("30/6/2026");
  });
});
