import type { SharingAgreementCounts } from "../useSharingAgreementsData";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The agreements row of the plant summary: what is in force and what is being
 * prepared. Superseded agreements are history and never counted, and with
 * nothing in force or in draft the row says so rather than showing a zero.
 */
export function agreementsSummaryText({ vigentes, drafts }: SharingAgreementCounts): string {
  const parts = [
    ...(vigentes > 0 ? [count(vigentes, "vigente", "vigentes")] : []),
    ...(drafts > 0 ? [count(drafts, "borrador", "borradores")] : []),
  ];
  return parts.length > 0 ? parts.join(" · ") : "Ninguno en vigor";
}
