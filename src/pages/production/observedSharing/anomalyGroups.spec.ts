import { describe, expect, test } from "vitest";
import { SharingAnomalyResponseType } from "../../../api/models";
import {
  buildObservationSummary,
  buildSharingAgreementReference,
  buildSharingAnomaly,
} from "../../../test/fixtures";
import { groupAnomalies, groupBySupply } from "./anomalyGroups";

const supply = (id: string) => ({ id, code: `ES0031${id}`, name: `Punto ${id}` });
const anomaly = (id: string, supplyId: string, type: SharingAnomalyResponseType = SharingAnomalyResponseType.REVERTED) =>
  buildSharingAnomaly({ id, supply: supply(supplyId), type });

describe("anomaly grouping", () => {
  test("UI-AGR-024: supplies come in the order they first appear, each supply's anomalies in the order returned", () => {
    const groups = groupBySupply([anomaly("a1", "B"), anomaly("a2", "A"), anomaly("a3", "B"), anomaly("a4", "A")]);

    expect(groups.map((group) => group.supply.id)).toEqual(["B", "A"]);
    expect(groups.map((group) => group.anomalies.map((item) => item.id))).toEqual([
      ["a1", "a3"],
      ["a2", "a4"],
    ]);
  });

  test("UI-AGR-024: an anomaly about the whole agreement still sits under the supply it names", () => {
    const groups = groupBySupply([
      anomaly("a1", "A", SharingAnomalyResponseType.APPLIED_BEFORE_SENT),
      anomaly("a2", "B", SharingAnomalyResponseType.APPLIED_BEFORE_SENT),
    ]);

    expect(groups.map((group) => group.supply.id)).toEqual(["A", "B"]);
  });

  test("UI-AGR-024: agreements keep the analysis order, those without anomalies have no group, and unattributed ones come last", () => {
    const groups = groupAnomalies(
      [
        buildObservationSummary({
          sharingAgreement: buildSharingAgreementReference({ id: "second", name: "Reparto 2025" }),
          anomalies: [anomaly("a1", "A")],
        }),
        buildObservationSummary({ sharingAgreement: buildSharingAgreementReference({ id: "quiet" }) }),
        buildObservationSummary({
          sharingAgreement: buildSharingAgreementReference({ id: "first", name: "Reparto inicial" }),
          anomalies: [anomaly("a2", "B"), anomaly("a3", "C")],
        }),
      ],
      [anomaly("a4", "D")],
    );

    expect(groups.map((group) => group.agreement?.id)).toEqual(["second", "first", undefined]);
    expect(groups.map((group) => group.count)).toEqual([1, 2, 1]);
  });
});
