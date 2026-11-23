import {
  SharingAgreementObservationSummaryResponseRecommendationsItem as Recommendation,
  SharingAnomalyResponseType,
  type SharingAgreementObservationSummaryResponse,
} from "../../../api/models";
import { ANOMALY_COUNT_ORDER } from "./observedSharingLabels";
import { agreementObservationPath, OBSERVED_ANOMALIES_ANCHOR } from "./observedSharingRoutes";
import { applicationDatesPath } from "../applicationDates/applicationDatesRoutes";

/** How a finding's icon reads: the dates in the accent, anomalies as a warning, the rest neutral. */
export type FindingTone = "accent" | "neutral" | "warning";

/** A recommendation stated as what the analysis found (#418). */
export interface RecommendationFinding {
  recommendation: Exclude<Recommendation, "NONE">;
  tone: FindingTone;
  title: string;
  /** Empty when there is nothing to detail. */
  detail: string;
  /** Where to act on it, worded apart from the title. */
  link?: { label: string; to: string };
}

const counted = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;

/** An anomaly type in a count: lowercase, agreeing with the number. */
const ANOMALY_TYPE_COUNTED: Record<SharingAnomalyResponseType, [singular: string, plural: string]> = {
  UNKNOWN_COEFFICIENT: ["coeficiente no registrado", "coeficientes no registrados"],
  REVERTED: ["vuelve a un coeficiente anterior", "vuelven a un coeficiente anterior"],
  ENERGY_OUTSIDE_AGREEMENT: ["recibe energía fuera del acuerdo", "reciben energía fuera del acuerdo"],
  NO_ENERGY_IN_AGREEMENT: ["no recibe energía en el acuerdo", "no reciben energía en el acuerdo"],
  APPLIED_BEFORE_SENT: ["aplicado antes del envío", "aplicados antes del envío"],
};

const joinNonEmpty = (parts: (string | false)[]) => parts.filter(Boolean).join(" · ");

/**
 * An agreement's recommendations as findings, in the order the analysis
 * returned them. "None" is no finding, so an agreement with nothing to review
 * has none. Figures come from the backend's counts; nothing proposes a value.
 */
export function recommendationFindings(
  plantId: string,
  summary: SharingAgreementObservationSummaryResponse,
): RecommendationFinding[] {
  const agreementId = summary.sharingAgreement.id;
  return summary.recommendations.flatMap((recommendation): RecommendationFinding[] => {
    switch (recommendation) {
      case Recommendation.SET_DATES: {
        const coefficients = summary.coefficientStatusCounts;
        const leaving = summary.leavingStatusCounts.appliedDifferentDate;
        return [
          {
            recommendation,
            tone: "accent",
            title: "Fechas distintas de las registradas",
            detail: joinNonEmpty([
              coefficients.appliedDifferentDate > 0 &&
                counted(coefficients.appliedDifferentDate, "aplicado en otra fecha", "aplicados en otra fecha"),
              coefficients.notDistinguishable > 0 &&
                counted(coefficients.notDistinguishable, "no distinguible", "no distinguibles"),
              leaving > 0 && counted(leaving, "salida en otra fecha", "salidas en otra fecha"),
            ]),
            // Opens the flow with the observed and proposed dates prefilled
            // (#419, UI-AGR-032). Like "Ir a desactivar", the link is not
            // gated here: these pages already require the plant's
            // canListSharingAgreements, and the flow itself sends home a
            // caller the agreement does not let manage it.
            link: { label: "Fijar fechas", to: applicationDatesPath(plantId, agreementId, { fromObserved: true }) },
          },
        ];
      }
      case Recommendation.DEACTIVATE:
        return [
          {
            recommendation,
            tone: "neutral",
            title: "Sin aplicación observada",
            detail: "No se observa ningún coeficiente y no consta fecha de envío.",
            link: { label: "Ir a desactivar", to: `/plants/${plantId}/sharing-agreements/${agreementId}` },
          },
        ];
      case Recommendation.REVIEW_ANOMALIES: {
        const byType = ANOMALY_COUNT_ORDER.filter(({ count }) => summary.anomalyCounts[count] > 0);
        const total = byType.reduce((sum, { count }) => sum + summary.anomalyCounts[count], 0);
        return [
          {
            recommendation,
            tone: "warning",
            title: counted(total, "anomalía", "anomalías"),
            detail: joinNonEmpty(
              byType.map(({ type, count }) => counted(summary.anomalyCounts[count], ...ANOMALY_TYPE_COUNTED[type])),
            ),
            link: {
              label: "Ver anomalías",
              to: `${agreementObservationPath(plantId, agreementId)}#${OBSERVED_ANOMALIES_ANCHOR}`,
            },
          },
        ];
      }
      case Recommendation.NONE:
        return [];
    }
  });
}
