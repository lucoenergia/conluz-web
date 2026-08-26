import { useEffect, useState } from "react";
import { getAllSupplies } from "../../api/supplies/supplies";
import type { SupplyResponse } from "../../api/models";

const PAGE_SIZE = 200;
// Backstop against a response whose pagination fields (`number`/`totalPages`)
// come back undefined — every field on PagedResultSupplyResponse is optional,
// so the page-progress condition alone can't be trusted to terminate the loop.
const MAX_PAGES = 50;

export interface CommunitySuppliesCatalogue {
  supplies: SupplyResponse[];
  isLoading: boolean;
  error: unknown;
}

/**
 * Loads a community's full supply catalogue by paginating to the end, once,
 * only while `enabled` is true (the picker is open) — never on page load,
 * never behind the read-mode coefficient table.
 */
export function useCommunitySuppliesCatalogue(communityId: string | null, enabled: boolean): CommunitySuppliesCatalogue {
  const [supplies, setSupplies] = useState<SupplyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!enabled || !communityId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      const accumulated: SupplyResponse[] = [];
      try {
        for (let page = 0; page < MAX_PAGES; page++) {
          const response = await getAllSupplies(communityId, { page, size: PAGE_SIZE });
          const items = response.items ?? [];
          if (items.length === 0) break;
          accumulated.push(...items);

          const isLastPage = response.number !== undefined && response.totalPages !== undefined && response.number >= response.totalPages - 1;
          if (isLastPage) break;
        }
        if (!cancelled) setSupplies(accumulated);
      } catch (fetchError) {
        if (!cancelled) setError(fetchError);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [communityId, enabled]);

  return { supplies, isLoading, error };
}
