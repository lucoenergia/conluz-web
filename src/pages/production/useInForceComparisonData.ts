import { useCallback, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  getGetSharingAgreementByIdQueryKey,
  getSharingAgreementById,
  useGetPlantActivePartitionCoefficients,
} from "../../api/sharing-agreements/sharing-agreements";
import type { PartitionCoefficientResponse } from "../../api/models";
import type { InForceAgreementPower } from "./sharingAgreementComparison";

export interface PlantActiveCoefficients {
  /** `undefined` until loaded, and whenever the query is disabled or failed. */
  active: PartitionCoefficientResponse[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * The coefficients currently in force in the plant, whichever agreement
 * authored them. Only a DRAFT is compared against them, so the request is not
 * made for any other status.
 *
 * No role gate is needed: the endpoint answers 403 to plain members, but the
 * only page that renders the comparison sits behind CommunityAdminRoute.
 */
export function usePlantActiveCoefficients(plantId: string, enabled: boolean): PlantActiveCoefficients {
  const { data, isLoading, isError, refetch } = useGetPlantActivePartitionCoefficients(plantId, {
    query: { enabled: enabled && !!plantId },
  });
  return {
    active: enabled && !isError ? data : undefined,
    isLoading: enabled && isLoading,
    isError: enabled && isError,
    refetch: () => void refetch(),
  };
}

/**
 * The installed power of each agreement an in-force coefficient comes from,
 * one GET per distinct agreement. The queries share their keys with
 * useGetSharingAgreementById, so an agreement already in the cache is not
 * fetched again. There are normally one or two.
 */
export function useInForceAgreementPower(
  plantId: string,
  agreementIds: readonly string[],
  enabled: boolean,
): ReadonlyMap<string, InForceAgreementPower> {
  // Keyed on the joined ids, so a caller passing a new array with the same
  // agreements keeps the queries (and the returned map) where they are.
  const idsKey = [...new Set(agreementIds)].sort().join("\n");
  const distinctIds = useMemo(() => (idsKey ? idsKey.split("\n") : []), [idsKey]);

  // `combine` is re-run only when a query's result changes, so the map keeps
  // its identity across unrelated renders.
  const combine = useCallback(
    (results: { data?: { installedPowerKw: number }; isError: boolean }[]) => {
      const power = new Map<string, InForceAgreementPower>();
      distinctIds.forEach((id, index) => {
        const result = results[index];
        if (result?.isError) power.set(id, { status: "error" });
        else if (result?.data) power.set(id, { status: "success", installedPowerKw: result.data.installedPowerKw });
        else power.set(id, { status: "loading" });
      });
      return power as ReadonlyMap<string, InForceAgreementPower>;
    },
    [distinctIds],
  );

  return useQueries({
    queries: distinctIds.map((id) => ({
      queryKey: getGetSharingAgreementByIdQueryKey(plantId, id),
      queryFn: ({ signal }: { signal: AbortSignal }) => getSharingAgreementById(plantId, id, signal),
      enabled,
    })),
    combine,
  });
}
