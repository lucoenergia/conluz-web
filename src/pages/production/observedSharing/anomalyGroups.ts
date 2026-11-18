import type { SupplyReferenceResponse } from "../../../api/models";
import type { ObservedAgreementSummary, ObservedAnomaly } from "./pendingObservationFields";

export interface SupplyAnomalies {
  supply: SupplyReferenceResponse;
  /** In the order the analysis returned them. */
  anomalies: ObservedAnomaly[];
}

export interface AgreementAnomalies {
  /** The agreement the anomalies are attributed to; undefined for those attributed to none. */
  agreement?: ObservedAgreementSummary["sharingAgreement"];
  supplies: SupplyAnomalies[];
  count: number;
}

/**
 * One agreement's anomalies by supply: supplies in the order they first
 * appear, each supply's anomalies in the order the analysis returned them. An
 * anomaly about every supply (APPLIED_BEFORE_SENT) still sits under the supply
 * it names.
 */
export function groupBySupply(anomalies: ObservedAnomaly[]): SupplyAnomalies[] {
  const bySupply = new Map<string, SupplyAnomalies>();
  for (const anomaly of anomalies) {
    const group = bySupply.get(anomaly.supply.id);
    if (group) group.anomalies.push(anomaly);
    else bySupply.set(anomaly.supply.id, { supply: anomaly.supply, anomalies: [anomaly] });
  }
  return [...bySupply.values()];
}

/**
 * The plant's anomalies by agreement, in the order the analysis returned the
 * agreements, then those attributed to none, last (UI-AGR-024). An agreement
 * without anomalies has no group.
 */
export function groupAnomalies(
  agreements: ObservedAgreementSummary[],
  unattributed: ObservedAnomaly[],
): AgreementAnomalies[] {
  const groups: AgreementAnomalies[] = agreements
    .filter((summary) => summary.anomalies.length > 0)
    .map((summary) => ({
      agreement: summary.sharingAgreement,
      supplies: groupBySupply(summary.anomalies),
      count: summary.anomalies.length,
    }));
  if (unattributed.length > 0) {
    groups.push({ supplies: groupBySupply(unattributed), count: unattributed.length });
  }
  return groups;
}
