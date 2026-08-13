import { useMemo } from "react";
import { useGetSharingAgreements } from "../../api/sharing-agreements/sharing-agreements";
import { useGetPlantById } from "../../api/plants/plants";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { PlantResponse, SharingAgreementResponse } from "../../api/models";

export interface SharingAgreementCounts {
  vigentes: number;
  drafts: number;
  historicos: number;
}

/**
 * Pure reducer over the unfiltered agreement list — used for the header
 * counts, which never move when a status filter chip is active.
 */
export function computeSharingAgreementCounts(agreements: SharingAgreementResponse[]): SharingAgreementCounts {
  let vigentes = 0;
  let drafts = 0;
  let historicos = 0;

  for (const agreement of agreements) {
    if (agreement.status === SharingAgreementResponseStatus.PUBLISHED) vigentes += 1;
    if (agreement.status === SharingAgreementResponseStatus.DRAFT) drafts += 1;
    if (agreement.status === SharingAgreementResponseStatus.SUPERSEDED) historicos += 1;
  }

  return { vigentes, drafts, historicos };
}

/**
 * A 404 from either the agreements or plant request means the plant doesn't
 * exist or the caller isn't a member of its community — rendered as a
 * dedicated in-page state, not the generic error toast.
 */
export function isNotFoundError(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null | undefined)?.response?.status === 404;
}

export interface SharingAgreementsData {
  agreements: SharingAgreementResponse[];
  plant?: PlantResponse;
  counts: SharingAgreementCounts;
  isLoading: boolean;
  isNotFound: boolean;
  error: unknown;
}

export function useSharingAgreementsData(plantId: string): SharingAgreementsData {
  const {
    data: agreements = [],
    isLoading: isLoadingAgreements,
    error: agreementsError,
  } = useGetSharingAgreements(plantId);

  const {
    data: plant,
    isLoading: isLoadingPlant,
    error: plantError,
  } = useGetPlantById(plantId);

  const counts = useMemo(() => computeSharingAgreementCounts(agreements), [agreements]);

  const notFound = isNotFoundError(agreementsError) || isNotFoundError(plantError);

  return {
    agreements,
    plant,
    counts,
    isLoading: isLoadingAgreements || isLoadingPlant,
    isNotFound: notFound,
    error: notFound ? null : (agreementsError ?? plantError),
  };
}
