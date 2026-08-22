import { SharingAgreementPartitionCoefficientResponseApplicationState } from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import { normalizeForSearch } from "./sharingAgreementFilters";

export type SharingAgreementCoefficientApplicationStateFilter =
  | SharingAgreementPartitionCoefficientResponseApplicationState
  | "all";

/**
 * Pure filter over the already-fetched, unfiltered coefficient list. Search
 * matches the supply's name and code (CUPS) only — the payload carries no
 * member/owner data. Never filters by `coefficient` value: a 0 row is
 * meaningful (marks a supply that left distribution) and must stay reachable.
 */
export function filterSharingAgreementCoefficients(
  coefficients: SharingAgreementPartitionCoefficientResponse[],
  searchText: string,
  applicationStateFilter: SharingAgreementCoefficientApplicationStateFilter,
): SharingAgreementPartitionCoefficientResponse[] {
  let items = coefficients;

  const trimmedSearch = searchText.trim();
  if (trimmedSearch) {
    const normalizedQuery = normalizeForSearch(trimmedSearch);
    items = items.filter((item) => {
      const name = item.supply?.name ? normalizeForSearch(item.supply.name) : "";
      const code = item.supply?.code ? normalizeForSearch(item.supply.code) : "";
      return name.includes(normalizedQuery) || code.includes(normalizedQuery);
    });
  }

  if (applicationStateFilter !== "all") {
    items = items.filter((item) => item.applicationState === applicationStateFilter);
  }

  return items;
}
