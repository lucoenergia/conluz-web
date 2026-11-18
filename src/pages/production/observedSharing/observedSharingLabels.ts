import {
  CoefficientObservationResponseStatus,
  SharingAgreementObservationSummaryResponseRecommendationsItem as Recommendation,
  SharingAnomalyResponseType,
  type LeavingObservationResponseStatus,
  type ObservationStatusCountsResponse,
  type SharingAnomalyCountsResponse,
} from "../../../api/models";
import { colors } from "../../../theme/tokens";

type ObservationStatus = CoefficientObservationResponseStatus;

/**
 * How a chip reads. None is the error hue: an observation that differs from
 * the registered agreement is something to look at, not a failure, and the
 * warning tone is the app's style for an anomaly.
 */
export type ObservationTone = "applied" | "dates" | "pending" | "neutral" | "warning";

export const TONE_SX: Record<ObservationTone, { bgcolor: string; color: string; border?: string }> = {
  applied: { bgcolor: colors.success.surface, color: colors.success.main },
  dates: { bgcolor: colors.info.surface, color: colors.info.main },
  pending: { bgcolor: colors.brand.surface, color: colors.brand.main },
  neutral: { bgcolor: colors.background.surface, color: colors.secondary.main, border: `1px solid ${colors.border.light}` },
  warning: { bgcolor: colors.warning.surface, color: colors.warning.main },
};

export const COEFFICIENT_STATUS_LABEL: Record<ObservationStatus, string> = {
  APPLIED_SAME_DATE: "Aplicado · misma fecha",
  APPLIED_DIFFERENT_DATE: "Aplicado · otra fecha",
  PENDING_APPLICATION: "Pendiente",
  NOT_DISTINGUISHABLE: "No distinguible",
  NOT_OBSERVED: "Sin observar",
  NO_DATA: "Sin datos de Datadis",
};

/** A leaving row says "Salida" where it was applied; its other statuses read as a coefficient's. */
export const LEAVING_STATUS_LABEL: Record<LeavingObservationResponseStatus, string> = {
  ...COEFFICIENT_STATUS_LABEL,
  APPLIED_SAME_DATE: "Salida · misma fecha",
  APPLIED_DIFFERENT_DATE: "Salida · otra fecha",
};

export const STATUS_TONE: Record<ObservationStatus, ObservationTone> = {
  APPLIED_SAME_DATE: "applied",
  APPLIED_DIFFERENT_DATE: "dates",
  PENDING_APPLICATION: "pending",
  NOT_DISTINGUISHABLE: "neutral",
  NOT_OBSERVED: "warning",
  NO_DATA: "neutral",
};

/** The status counts in the order the card lists them, with the field each reads. */
export const STATUS_COUNT_ORDER: { status: ObservationStatus; count: keyof ObservationStatusCountsResponse }[] = [
  { status: CoefficientObservationResponseStatus.APPLIED_SAME_DATE, count: "appliedSameDate" },
  { status: CoefficientObservationResponseStatus.APPLIED_DIFFERENT_DATE, count: "appliedDifferentDate" },
  { status: CoefficientObservationResponseStatus.PENDING_APPLICATION, count: "pendingApplication" },
  { status: CoefficientObservationResponseStatus.NOT_DISTINGUISHABLE, count: "notDistinguishable" },
  { status: CoefficientObservationResponseStatus.NOT_OBSERVED, count: "notObserved" },
  { status: CoefficientObservationResponseStatus.NO_DATA, count: "noData" },
];

export const ANOMALY_TYPE_LABEL: Record<SharingAnomalyResponseType, string> = {
  UNKNOWN_COEFFICIENT: "Coeficiente desconocido",
  REVERTED: "Vuelve a un coeficiente anterior",
  ENERGY_OUTSIDE_AGREEMENT: "Recibe energía fuera del acuerdo",
  NO_ENERGY_IN_AGREEMENT: "No recibe energía en el acuerdo",
  APPLIED_BEFORE_SENT: "Aplicado antes del envío",
};

/** The anomaly counts in the order the card lists them, with the field each reads. */
export const ANOMALY_COUNT_ORDER: { type: SharingAnomalyResponseType; count: keyof SharingAnomalyCountsResponse }[] = [
  { type: SharingAnomalyResponseType.UNKNOWN_COEFFICIENT, count: "unknownCoefficient" },
  { type: SharingAnomalyResponseType.REVERTED, count: "reverted" },
  { type: SharingAnomalyResponseType.ENERGY_OUTSIDE_AGREEMENT, count: "energyOutsideAgreement" },
  { type: SharingAnomalyResponseType.NO_ENERGY_IN_AGREEMENT, count: "noEnergyInAgreement" },
  { type: SharingAnomalyResponseType.APPLIED_BEFORE_SENT, count: "appliedBeforeSent" },
];

/** A recommendation the analysis can make, other than "none". */
export type ActionableRecommendation = Exclude<Recommendation, "NONE">;

/**
 * What each recommendation says (#418). Fixed sentences, with no figure: the
 * agreement stays the source of truth and the view never proposes a value.
 */
export const RECOMMENDATION_COPY: Record<ActionableRecommendation, { label: string; sentence: string; tone: ObservationTone }> = {
  SET_DATES: {
    label: "Fijar fechas",
    sentence: "En algunos puntos, Datadis observa fechas distintas de las registradas.",
    tone: "pending",
  },
  DEACTIVATE: {
    label: "Desactivar",
    sentence: "No se observa ningún coeficiente de este acuerdo y no consta fecha de envío.",
    tone: "warning",
  },
  REVIEW_ANOMALIES: {
    label: "Revisar anomalías",
    sentence: "Hay anomalías atribuidas a este acuerdo. Conluz no corrige coeficientes.",
    tone: "warning",
  },
};

/** The recommendations that ask for something, in the order the analysis returned them. */
export const actionableRecommendations = (recommendations: Recommendation[]): ActionableRecommendation[] =>
  recommendations.filter((item): item is ActionableRecommendation => item !== Recommendation.NONE);
