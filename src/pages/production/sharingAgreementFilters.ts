import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse } from "../../api/models";

export type SharingAgreementStatusFilter = SharingAgreementResponseStatus | "all";

/**
 * Case- and accent-insensitive normalization for search matching
 * ("histórico" and "historico" must match).
 */
export function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Pure filter over the already-fetched, unfiltered agreement list. Search
 * matches the agreement name and notes; status matches the raw enum, never
 * the Spanish display label.
 */
export function filterSharingAgreements(
  agreements: SharingAgreementResponse[],
  searchText: string,
  statusFilter: SharingAgreementStatusFilter,
): SharingAgreementResponse[] {
  let items = agreements;

  const trimmedSearch = searchText.trim();
  if (trimmedSearch) {
    const normalizedQuery = normalizeForSearch(trimmedSearch);
    items = items.filter((item) => {
      const name = item.name ? normalizeForSearch(item.name) : "";
      const notes = item.notes ? normalizeForSearch(item.notes) : "";
      return name.includes(normalizedQuery) || notes.includes(normalizedQuery);
    });
  }

  if (statusFilter !== "all") {
    items = items.filter((item) => item.status === statusFilter);
  }

  return items;
}
