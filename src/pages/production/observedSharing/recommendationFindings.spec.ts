import { describe, expect, test } from "vitest";
import {
  SharingAgreementObservationSummaryResponseRecommendationsItem as Recommendation,
} from "../../../api/models";
import {
  buildObservationStatusCounts,
  buildObservationSummary,
  buildSharingAgreementReference,
  buildSharingAnomaly,
  buildSharingAnomalyCounts,
} from "../../../test/fixtures";
import { recommendationFindings } from "./recommendationFindings";

/** The agreement's applied window, which a share's figures are computed over. */
const APPLIED_WINDOW = { from: "2025-03-01", to: "2026-04-26" };

const summary = (overrides: Parameters<typeof buildObservationSummary>[0]) =>
  buildObservationSummary({ sharingAgreement: buildSharingAgreementReference({ id: "agreement-a" }), ...overrides });

describe("recommendationFindings", () => {
  test("UI-AGR-023: states the different dates in the singular, leaving out the counts that are zero", () => {
    const [finding] = recommendationFindings(
      "plant-a",
      summary({
        recommendations: [Recommendation.SET_DATES],
        coefficientStatusCounts: buildObservationStatusCounts({ appliedDifferentDate: 1 }),
        leavingStatusCounts: buildObservationStatusCounts({ appliedDifferentDate: 1 }),
      }),
    );

    expect(finding).toEqual({
      kind: Recommendation.SET_DATES,
      tone: "accent",
      title: "Fechas distintas de las registradas",
      detail: "1 aplicado en otra fecha · 1 salida en otra fecha",
      link: {
        label: "Fijar fechas",
        to: "/plants/plant-a/sharing-agreements/agreement-a/application-dates?desde=reparto-observado",
      },
    });
  });

  test("UI-AGR-023: states the different dates in the plural", () => {
    const [finding] = recommendationFindings(
      "plant-a",
      summary({
        recommendations: [Recommendation.SET_DATES],
        coefficientStatusCounts: buildObservationStatusCounts({ appliedDifferentDate: 2, notDistinguishable: 3 }),
        leavingStatusCounts: buildObservationStatusCounts({ appliedDifferentDate: 4 }),
      }),
    );

    expect(finding.detail).toBe("2 aplicados en otra fecha · 3 no distinguibles · 4 salidas en otra fecha");
  });

  test("UI-AGR-023: counts the anomalies by type, singular and plural, in the card's order", () => {
    const [one] = recommendationFindings(
      "plant-a",
      summary({ recommendations: [Recommendation.REVIEW_ANOMALIES], anomalyCounts: buildSharingAnomalyCounts({ reverted: 1 }) }),
    );
    const [many] = recommendationFindings(
      "plant-a",
      summary({
        recommendations: [Recommendation.REVIEW_ANOMALIES],
        anomalyCounts: buildSharingAnomalyCounts({
          unknownCoefficient: 2,
          reverted: 2,
          energyOutsideAgreement: 2,
          noEnergyInAgreement: 2,
          appliedBeforeSent: 2,
        }),
      }),
    );

    expect([one.title, one.detail]).toEqual(["1 anomalía", "1 vuelve a un coeficiente anterior"]);
    expect([many.title, many.detail]).toEqual([
      "10 anomalías",
      "2 coeficientes no registrados · 2 vuelven a un coeficiente anterior · 2 reciben energía fuera del acuerdo · " +
        "2 no reciben energía en el acuerdo · 2 aplicados antes del envío",
    ]);
    expect(many.link).toEqual({ label: "Ver anomalías", to: "/plants/plant-a/sharing-agreements/observed/agreement-a#anomalias" });
  });

  test("UI-AGR-023: keeps the backend's order and turns 'none' into no finding", () => {
    const findings = recommendationFindings(
      "plant-a",
      summary({
        recommendations: [Recommendation.REVIEW_ANOMALIES, Recommendation.DEACTIVATE, Recommendation.SET_DATES],
        anomalyCounts: buildSharingAnomalyCounts({ unknownCoefficient: 1 }),
      }),
    );

    expect(findings.map((finding) => finding.title)).toEqual([
      "1 anomalía",
      "Sin aplicación observada",
      "Fechas distintas de las registradas",
    ]);
    expect(findings[1].link).toEqual({ label: "Ir a desactivar", to: "/plants/plant-a/sharing-agreements/agreement-a" });
    expect(recommendationFindings("plant-a", summary({ recommendations: [Recommendation.NONE] }))).toEqual([]);
  });

  describe("UI-AGR-039: an impossible unattributed production share", () => {
    const withUnattributed = (unallocated: number, overrides: Parameters<typeof buildObservationSummary>[0] = {}) =>
      summary({ unallocatedShare: { days: 200, unallocated, registeredShareWithoutData: 0, ...APPLIED_WINDOW }, ...overrides });

    test("UI-AGR-039: below −0,1 points it is the first finding, stating by how much, with the agreement's anomalies", () => {
      const findings = recommendationFindings(
        "plant-a",
        withUnattributed(-0.4748, {
          anomalies: [buildSharingAnomaly()],
          recommendations: [Recommendation.REVIEW_ANOMALIES],
        }),
      );

      expect(findings.map((finding) => finding.kind)).toEqual(["IMPOSSIBLE_SHARE", Recommendation.REVIEW_ANOMALIES]);
      expect(findings[0]).toEqual({
        kind: "IMPOSSIBLE_SHARE",
        tone: "warning",
        title: "Reparto mayor que la producción",
        // The percentage's space is the non-breaking one the formatter writes.
        detail: "Los puntos reciben un 47,5\u00a0% más de lo que produce la planta.",
        link: { label: "Ver anomalías", to: "/plants/plant-a/sharing-agreements/observed/agreement-a#anomalias" },
      });
    });

    test("UI-AGR-039: with no anomaly in the agreement, the finding has no link", () => {
      const [finding] = recommendationFindings("plant-a", withUnattributed(-0.4748, { recommendations: [Recommendation.NONE] }));

      expect(finding.kind).toBe("IMPOSSIBLE_SHARE");
      expect(finding.link).toBeUndefined();
    });

    test.each([-0.0005, -0.001, 0, 0.0574])("UI-AGR-039: %s is no finding", (unallocated) => {
      expect(recommendationFindings("plant-a", withUnattributed(unallocated, { recommendations: [Recommendation.NONE] }))).toEqual([]);
    });

    test("UI-AGR-039: an agreement without an unattributed production share has no such finding", () => {
      expect(recommendationFindings("plant-a", summary({ unallocatedShare: null, recommendations: [Recommendation.NONE] }))).toEqual([]);
    });
  });
});
