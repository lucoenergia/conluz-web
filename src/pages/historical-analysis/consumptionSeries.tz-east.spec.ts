import { describe, expect, it } from "vitest";
import { expectEastDeviceTimeZone } from "../../test/deviceTimeZone";
import { toConsumptionSeriesView } from "./consumptionSeries";
import { supplyBucket } from "./historicalAnalysis.testData";

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
});
