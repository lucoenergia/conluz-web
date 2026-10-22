import { describe, expect, it } from "vitest";
import type { DatadisConsumption, SupplyConsumptionBucketResponse } from "../../api/models";
import { toConsumptionRows } from "./consumptionRows";

const datadisRow = (overrides: Partial<DatadisConsumption> = {}): DatadisConsumption => ({
  cups: "ES0021000000000000AA",
  date: "2026/08/01",
  time: "09:00",
  consumptionKWh: 5.9,
  selfConsumptionEnergyKWh: 3.006,
  surplusEnergyKWh: 1.5,
  generationEnergyKWh: 4.506,
  ...overrides,
});

const bucketRow = (overrides: Partial<SupplyConsumptionBucketResponse> = {}): SupplyConsumptionBucketResponse => ({
  cups: "ES0021000000000000AA",
  date: "2026/08/01",
  time: "09:00",
  gridImportKWh: 5.9,
  selfConsumptionKWh: 3.006,
  surplusKWh: 1.5,
  assignedProductionKWh: 4.506,
  obtainMethod: "REAL",
  savingsEur: 0.42,
  tariffSource: "ESTIMATE",
  ...overrides,
});

describe("toConsumptionRows", () => {
  it("maps a Datadis record and a bucket carrying the same figures to the same row", () => {
    const expected = [{ date: "2026/08/01", time: "09:00", gridImportKWh: 5.9, selfConsumptionKWh: 3.006, surplusKWh: 1.5 }];

    expect(toConsumptionRows({ source: "datadis", rows: [datadisRow()] })).toEqual(expected);
    expect(toConsumptionRows({ source: "bucket", rows: [bucketRow()] })).toEqual(expected);
  });

  it("counts a missing figure as 0", () => {
    const datadis = datadisRow({ consumptionKWh: undefined, selfConsumptionEnergyKWh: undefined, surplusEnergyKWh: undefined });
    // The bucket's figures are never absent by contract; a null on the wire still reads as 0.
    const bucket = bucketRow({
      gridImportKWh: null as unknown as number,
      selfConsumptionKWh: null as unknown as number,
      surplusKWh: null as unknown as number,
    });
    const zero = { gridImportKWh: 0, selfConsumptionKWh: 0, surplusKWh: 0 };

    expect(toConsumptionRows({ source: "datadis", rows: [datadis] })).toEqual([expect.objectContaining(zero)]);
    expect(toConsumptionRows({ source: "bucket", rows: [bucket] })).toEqual([expect.objectContaining(zero)]);
  });

  it("stays undefined while the series has not arrived", () => {
    expect(toConsumptionRows({ source: "datadis", rows: undefined })).toBeUndefined();
    expect(toConsumptionRows({ source: "bucket", rows: undefined })).toBeUndefined();
  });

  it("maps every row of a series, in the order served", () => {
    const rows = toConsumptionRows({
      source: "bucket",
      rows: [
        bucketRow({ date: "2026/08/02", gridImportKWh: 2, selfConsumptionKWh: 1, surplusKWh: 0.5 }),
        bucketRow({ date: "2026/08/01", gridImportKWh: 4, selfConsumptionKWh: 3, surplusKWh: 0 }),
      ],
    });

    expect(rows).toEqual([
      { date: "2026/08/02", time: "09:00", gridImportKWh: 2, selfConsumptionKWh: 1, surplusKWh: 0.5 },
      { date: "2026/08/01", time: "09:00", gridImportKWh: 4, selfConsumptionKWh: 3, surplusKWh: 0 },
    ]);
  });
});
