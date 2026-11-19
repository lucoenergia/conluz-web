import { describe, expect, test } from "vitest";
import { CoefficientObservationResponseStatus, LeavingObservationResponseStatus } from "../../../api/models";
import {
  buildCoefficientObservation,
  buildLeavingObservation,
  buildObservationSummary,
  buildSharingAgreementObservation,
  buildSharingAnomaly,
} from "../../../test/fixtures";
import { filterObservationRows } from "./observationFilter";

const supply = (id: string) => ({ id, code: `ES0031${id}`, name: `Punto ${id}` });

const coefficient = (id: string, status: CoefficientObservationResponseStatus) =>
  buildCoefficientObservation({ coefficientId: `c-${id}`, supply: supply(id), status });

const leaving = (id: string, status: LeavingObservationResponseStatus) =>
  buildLeavingObservation({ previousCoefficientId: `l-${id}`, supply: supply(id), status });

// One row of each status, and an anomaly on a supply applied on its date.
const observation = buildSharingAgreementObservation({
  coefficients: [
    coefficient("same", CoefficientObservationResponseStatus.APPLIED_SAME_DATE),
    coefficient("different", CoefficientObservationResponseStatus.APPLIED_DIFFERENT_DATE),
    coefficient("pending", CoefficientObservationResponseStatus.PENDING_APPLICATION),
    coefficient("indistinct", CoefficientObservationResponseStatus.NOT_DISTINGUISHABLE),
    coefficient("unobserved", CoefficientObservationResponseStatus.NOT_OBSERVED),
    coefficient("nodata", CoefficientObservationResponseStatus.NO_DATA),
    coefficient("anomalous", CoefficientObservationResponseStatus.APPLIED_SAME_DATE),
  ],
  leavingRows: [
    leaving("left-same", LeavingObservationResponseStatus.APPLIED_SAME_DATE),
    leaving("left-different", LeavingObservationResponseStatus.APPLIED_DIFFERENT_DATE),
    leaving("left-unobserved", LeavingObservationResponseStatus.NOT_OBSERVED),
  ],
  summary: buildObservationSummary({ anomalies: [buildSharingAnomaly({ supply: supply("anomalous") })] }),
});

describe("filterObservationRows", () => {
  test("UI-AGR-023: 'Todos' keeps every row, of both kinds, in the order the analysis returned them", () => {
    const all = filterObservationRows(observation, "all");

    expect(all.coefficients).toEqual(observation.coefficients);
    expect(all.leavingRows).toEqual(observation.leavingRows);
    expect(all.count).toBe(10);
  });

  test("UI-AGR-023: 'Con avisos' keeps rows applied on another date, not distinguishable, or of a supply with an anomaly", () => {
    const warnings = filterObservationRows(observation, "warnings");

    expect(warnings.coefficients.map((row) => row.supply.id)).toEqual(["different", "indistinct", "anomalous"]);
  });

  test("UI-AGR-030: 'Con avisos' keeps a leaving row that left on another date, and its count is every row it keeps", () => {
    const warnings = filterObservationRows(observation, "warnings");

    expect(warnings.leavingRows.map((row) => row.supply.id)).toEqual(["left-different"]);
    expect(warnings.count).toBe(4);
  });
});
