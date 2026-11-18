import type {
  CoefficientObservationResponse,
  LeavingObservationResponse,
  PlantSharingObservationResponse,
  SharingAgreementObservationResponse,
  SharingAgreementObservationSummaryResponse,
  SharingAnomalyResponse,
} from "../../../api/models";

// PLACEHOLDER until the client is regenerated after conluz#597.
//
// conluz#597 adds the evidence behind each conclusion of the analysis: the
// observed β and the valid days it rests on, for every coefficient row, leaving
// row and anomaly, and the stored end of every coefficient row. The view binds
// to them through the types below, so the regenerated client replaces this file
// and nothing else has to change. They are optional here only because the
// current client does not carry them yet: the page renders "—" for a value it
// was not given, and never computes one (#418).

/** What conluz#597 adds to a coefficient row, a leaving row and an anomaly. */
export interface ObservedEvidence {
  /** Median of the supply's daily β over the window, on a 0-1 scale. Null when there is no valid day. */
  observedBeta?: number | null;
  /** Number of valid days the median rests on. */
  observedValidDays?: number;
}

export type ObservedCoefficientRow = CoefficientObservationResponse &
  ObservedEvidence & {
    /** Local day the coefficient is stored to stop applying (exclusive end). Null when open. */
    storedValidTo?: string | null;
  };

export type ObservedLeavingRow = LeavingObservationResponse & ObservedEvidence;

export type ObservedAnomaly = SharingAnomalyResponse & ObservedEvidence;

export type ObservedAgreementSummary = Omit<SharingAgreementObservationSummaryResponse, "anomalies"> & {
  anomalies: ObservedAnomaly[];
};

export type PlantSharingObservation = Omit<
  PlantSharingObservationResponse,
  "sharingAgreements" | "unattributedAnomalies"
> & {
  sharingAgreements: ObservedAgreementSummary[];
  unattributedAnomalies: ObservedAnomaly[];
};

export type AgreementObservation = Omit<SharingAgreementObservationResponse, "summary" | "coefficients" | "leavingRows"> & {
  summary: ObservedAgreementSummary;
  coefficients: ObservedCoefficientRow[];
  leavingRows: ObservedLeavingRow[];
};
