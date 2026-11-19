import { describe, expect, test } from "vitest";
import {
  SharingAgreementObservationSummaryResponseRecommendationsItem as Recommendation,
} from "../../../api/models";
import {
  buildObservationStatusCounts,
  buildObservationSummary,
  buildSharingAgreementReference,
  buildSharingAnomalyCounts,
} from "../../../test/fixtures";
import { recommendationFindings } from "./recommendationFindings";

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
      recommendation: Recommendation.SET_DATES,
      tone: "accent",
      title: "Fechas distintas de las registradas",
      detail: "1 aplicado en otra fecha · 1 salida en otra fecha",
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
      "2 coeficientes desconocidos · 2 vuelven a un coeficiente anterior · 2 reciben energía fuera del acuerdo · " +
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
});
