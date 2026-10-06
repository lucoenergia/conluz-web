import { SharingAgreementResponseStatus, type SharingAgreementResponse } from "../../../api/models";
import { computeSharingAgreementCounts } from "../../production/useSharingAgreementsData";

/**
 * Where a plant stands with its sharing agreements, as the management home
 * shows it (#198):
 *
 * - `in-force`: at least one agreement is PUBLISHED; `names` lists them.
 * - `draft`: none is in force, and one is being prepared.
 * - `ended`: none is in force or being prepared, and earlier ones have all
 *   been superseded -- every coefficient they held is closed.
 * - `none`: the plant has never had one.
 *
 * Each state outranks the ones below it: an agreement in force is what
 * matters, whatever drafts or past agreements sit beside it.
 */
export type PlantAgreementStatus =
  | { kind: "in-force"; names: string[] }
  | { kind: "draft" }
  | { kind: "ended" }
  | { kind: "none" };

export function plantAgreementStatus(agreements: SharingAgreementResponse[]): PlantAgreementStatus {
  const { vigentes, drafts, historicos } = computeSharingAgreementCounts(agreements);
  if (vigentes > 0) {
    return {
      kind: "in-force",
      names: agreements
        .filter((agreement) => agreement.status === SharingAgreementResponseStatus.PUBLISHED)
        .map((agreement) => agreement.name),
    };
  }
  if (drafts > 0) return { kind: "draft" };
  if (historicos > 0) return { kind: "ended" };
  return { kind: "none" };
}
