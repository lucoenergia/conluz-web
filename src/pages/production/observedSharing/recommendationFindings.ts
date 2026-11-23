import {
  SharingAgreementObservationSummaryResponseRecommendationsItem as Recommendation,
  SharingAnomalyResponseType,
  type SharingAgreementObservationSummaryResponse,
} from "../../../api/models";
import { ANOMALY_COUNT_ORDER } from "./observedSharingLabels";
import { formatPercentageOrNone, isImpossibleUnattributedShare } from "./observedSharingFormat";
import { agreementObservationPath, OBSERVED_ANOMALIES_ANCHOR } from "./observedSharingRoutes";
import { applicationDatesPath } from "../applicationDates/applicationDatesRoutes";

/** How a finding's icon reads: the dates in the accent, anomalies as a warning, the rest neutral. */
export type FindingTone = "accent" | "neutral" | "warning";

/**
 * What the analysis found (#418): a recommendation, or an impossible
 * unattributed production share, which is a value the analysis returned and not one of its
 * recommendations (UI-AGR-039).
 */
export interface RecommendationFinding {
  kind: Exclude<Recommendation, "NONE"> | "IMPOSSIBLE_SHARE";
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

/** Where an agreement's anomalies are listed. */
const anomaliesLink = (plantId: string, agreementId: string) => ({
  label: "Ver anomalías",
  to: `${agreementObservationPath(plantId, agreementId)}#${OBSERVED_ANOMALIES_ANCHOR}`,
});

/**
 * An impossible unattributed production share as a finding (UI-AGR-039): by how much the
 * supplies received more than the plant produced, read from the share itself
 * and nothing else, with the agreement's anomalies when it has any.
 */
function impossibleShareFinding(
  plantId: string,
  summary: SharingAgreementObservationSummaryResponse,
): RecommendationFinding[] {
  const unallocated = summary.unallocatedShare?.unallocated;
  if (!isImpossibleUnattributedShare(unallocated)) return [];
  return [
    {
      kind: "IMPOSSIBLE_SHARE",
      tone: "warning",
      title: "Reparto mayor que la producción",
      detail: `Los puntos reciben un ${formatPercentageOrNone(-unallocated, 1)} más de lo que produce la planta.`,
      link: summary.anomalies.length > 0 ? anomaliesLink(plantId, summary.sharingAgreement.id) : undefined,
    },
  ];
}

/**
 * An agreement's findings: an impossible unattributed production share first, as it puts
 * every other figure in doubt, then its recommendations in the order the
 * analysis returned them. "None" is no finding, so an agreement with nothing to
 * review has none. Figures come from the backend; nothing proposes a value.
 */
export function recommendationFindings(
  plantId: string,
  summary: SharingAgreementObservationSummaryResponse,
): RecommendationFinding[] {
  const agreementId = summary.sharingAgreement.id;
  const recommended = summary.recommendations.flatMap((recommendation): RecommendationFinding[] => {
    switch (recommendation) {
      case Recommendation.SET_DATES: {
        const coefficients = summary.coefficientStatusCounts;
        const leaving = summary.leavingStatusCounts.appliedDifferentDate;
        return [
          {
            kind: recommendation,
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
            kind: recommendation,
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
            kind: recommendation,
            tone: "warning",
            title: counted(total, "anomalía", "anomalías"),
            detail: joinNonEmpty(
              byType.map(({ type, count }) => counted(summary.anomalyCounts[count], ...ANOMALY_TYPE_COUNTED[type])),
            ),
            link: anomaliesLink(plantId, agreementId),
          },
        ];
      }
      case Recommendation.NONE:
        return [];
    }
  });
  return [...impossibleShareFinding(plantId, summary), ...recommended];
}
