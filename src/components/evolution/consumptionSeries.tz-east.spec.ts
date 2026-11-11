import { describe, expect, it } from "vitest";
import { expectEastDeviceTimeZone } from "../../test/deviceTimeZone";
import { toConsumptionSeriesView } from "./consumptionSeries";
import { supplyBucket, supplyHour } from "./consumptionSeries.testData";

// Runs in the `app-time-zone-east` Vitest project, as a device in Kiritimati, fourteen hours ahead of UTC.
// A bucket's `date` is a calendar date in Madrid: read as the device's
// midnight, it would fall on another Madrid day in some zone, and every label
// and every bucket-to-slot match would move with it.

describe("UI-HIS-018 the evolution charts' labels and axis are Madrid's, wherever the device is (#250)", () => {
  it("runs in the project's device zone", () => {
    expectEastDeviceTimeZone();
  });

  it("UI-HIS-018 labels and names each day, and builds the axis, exactly as in Madrid", () => {
    const view = toConsumptionSeriesView(
      { startDate: "2026-07-01T00:00:00+02:00", endDate: "2026-07-04T00:00:00+02:00", granularity: "daily", label: "Del 1 al 3 de julio de 2026" },
      { kind: "supplyDaily", buckets: [supplyBucket("2026/07/01"), supplyBucket("2026/07/02"), supplyBucket("2026/07/03")] },
    );

    expect(view.slots.map((slot) => [slot.key, slot.axisLabel, slot.name, slot.state.kind])).toEqual([
      ["2026/07/01", "1 jul", "1 de julio de 2026", "complete"],
      ["2026/07/02", "", "2 de julio de 2026", "complete"],
      ["2026/07/03", "", "3 de julio de 2026", "complete"],
    ]);
  });

  it("UI-HIS-018 labels and names each month, and builds the axis, exactly as in Madrid", () => {
    const view = toConsumptionSeriesView(
      { startDate: "2025-12-01T00:00:00+01:00", endDate: "2026-02-01T00:00:00+01:00", granularity: "monthly", label: "De diciembre de 2025 a enero de 2026" },
      { kind: "supplyMonthly", buckets: [supplyBucket("2025/12/01"), supplyBucket("2026/01/01")] },
    );

    expect(view.slots.map((slot) => [slot.key, slot.axisLabel, slot.name])).toEqual([
      ["2025/12/01", "dic 25", "Diciembre de 2025"],
      ["2026/01/01", "ene 26", "Enero de 2026"],
    ]);
  });

  it("UI-HIS-028 AC6 -- builds the October change day's hours, keys them and names them exactly as in Madrid", () => {
    const view = toConsumptionSeriesView(
      { startDate: "2026-10-25T00:00:00+02:00", endDate: "2026-10-26T00:00:00+01:00", granularity: "hourly", label: "25 de octubre de 2026" },
      { kind: "supplyHourly", buckets: [supplyHour("2026-10-25T02:00:00+01:00"), supplyHour("2026-10-25T23:00:00+01:00")] },
    );

    expect(view.slots).toHaveLength(25);
    expect(view.slots.slice(0, 5).map((slot) => [slot.key, slot.rowLabel, slot.name, slot.state.kind])).toEqual([
      ["2026-10-25T00:00:00+02:00", "0 h", "De 00:00 a 01:00", "gap"],
      ["2026-10-25T01:00:00+02:00", "1 h", "De 01:00 a 02:00", "gap"],
      ["2026-10-25T02:00:00+02:00", "2 h", "De 02:00 a 03:00 (hora repetida por el cambio de hora)", "gap"],
      ["2026-10-25T02:00:00+01:00", "2 h", "De 02:00 a 03:00 (hora repetida por el cambio de hora)", "complete"],
      ["2026-10-25T03:00:00+01:00", "3 h", "De 03:00 a 04:00", "gap"],
    ]);
    expect(view.slots.map((slot) => slot.day)).toEqual(Array(25).fill({ year: 2026, month: 10, day: 25 }));
    expect(view.slots.map((slot) => slot.axisLabel).slice(0, 6)).toEqual(["0 h", "", "2 h", "", "3 h", ""]);
    expect(view.slots.map((slot) => slot.tableLabel).slice(2, 5)).toEqual([
      "02:00–03:00 (hora repetida por el cambio de hora)",
      "02:00–03:00 (hora repetida por el cambio de hora)",
      "03:00–04:00",
    ]);
    expect([view.slots[24].key, view.slots[24].name, view.slots[24].state.kind]).toEqual(["2026-10-25T23:00:00+01:00", "De 23:00 a 00:00", "complete"]);
  });
});
