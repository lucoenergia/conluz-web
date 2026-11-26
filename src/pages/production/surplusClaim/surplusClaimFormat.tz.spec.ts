import { describe, expect, it } from "vitest";
import { expectDeviceTimeZone } from "../../../test/deviceTimeZone";
import { buildPlantSurplusClaimDay } from "../../../test/fixtures";
import { clockChangeLabel, dayLabel, hourLabels, monthLabel, shortDayLabel } from "./surplusClaimFormat";

// Runs in the `app-time-zone` Vitest project: the device is in New York, whose
// clocks change on other days than Madrid's (8 March and 1 November 2026), so
// a label read on the device's clock would move the hours of the wrong days.

/** The hours of a day as the contract writes them: each start with Madrid's offset at that instant. */
const starts = (...instants: string[]) => instants.map((startsAt) => ({ startsAt }));

describe("the surplus claim's labels are Madrid's, wherever the device is (#455)", () => {
  it("runs as a device in New York", () => {
    expectDeviceTimeZone();
  });

  it("UI-SCL-007 labels the 25 hours of 25 October 2026, the repeated one as (1.ª) and (2.ª)", () => {
    const hours = starts(
      "2026-10-25T00:00:00+02:00",
      "2026-10-25T01:00:00+02:00",
      "2026-10-25T02:00:00+02:00",
      "2026-10-25T02:00:00+01:00",
      "2026-10-25T03:00:00+01:00",
      ...Array.from({ length: 20 }, (_, index) => `2026-10-25T${String(index + 4).padStart(2, "0")}:00:00+01:00`),
    );

    const labels = hourLabels(hours);

    expect(labels).toHaveLength(25);
    expect(labels.slice(0, 5)).toEqual(["00–01 h", "01–02 h", "02–03 h (1.ª)", "02–03 h (2.ª)", "03–04 h"]);
    expect(labels.at(-1)).toBe("23–24 h");
    expect(clockChangeLabel(buildPlantSurplusClaimDay({ hours: hours.map((hour) => ({ ...hour, surplusKWh: 1 })) }))).toBe(
      "Cambio de hora: 25 horas",
    );
  });

  it("UI-SCL-007 labels the 23 hours of 29 March 2026, the hour the clocks go forward running to 03", () => {
    const hours = starts(
      "2026-03-29T00:00:00+01:00",
      "2026-03-29T01:00:00+01:00",
      ...Array.from({ length: 21 }, (_, index) => `2026-03-29T${String(index + 3).padStart(2, "0")}:00:00+02:00`),
    );

    const labels = hourLabels(hours);

    expect(labels).toHaveLength(23);
    expect(labels.slice(0, 3)).toEqual(["00–01 h", "01–03 h", "03–04 h"]);
    expect(labels.at(-1)).toBe("23–24 h");
    expect(clockChangeLabel(buildPlantSurplusClaimDay({ hours: hours.map((hour) => ({ ...hour, surplusKWh: 1 })) }))).toBe(
      "Cambio de hora: 23 horas",
    );
  });

  it("UI-SCL-007 labels an ordinary day's hours on Madrid's clock, and gives it no clock-change label", () => {
    const hours = starts(...Array.from({ length: 24 }, (_, index) => `2026-11-01T${String(index).padStart(2, "0")}:00:00+01:00`));

    expect(hourLabels(hours).slice(12, 14)).toEqual(["12–13 h", "13–14 h"]);
    expect(clockChangeLabel(buildPlantSurplusClaimDay({ hours: hours.map((hour) => ({ ...hour, surplusKWh: 1 })) }))).toBeNull();
  });

  it("UI-SCL-006 names the days and the months as the calendar does, not the device's day before", () => {
    expect(dayLabel("2026-06-01")).toBe("lun 01/06/2026");
    expect(shortDayLabel("2026-10-07")).toBe("mié 07/10");
    expect(monthLabel("2026-10")).toBe("Octubre de 2026");
  });
});
