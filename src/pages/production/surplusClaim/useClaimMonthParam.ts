import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router";
import { isClaimMonth } from "./surplusClaimFormat";

export const CLAIM_MONTH_PARAM = "month";

export interface ClaimMonthParam {
  /** The month in the address, when it is one; absent, the server picks the month. */
  month: string | undefined;
  select: (month: string) => void;
  /** Leaves the month to the server: for a month it refused. */
  drop: () => void;
}

/**
 * The month reviewed lives in `?month=` (UI-SCL-001), so a reload or a shared
 * link shows the same month. Every change replaces the entry: back leaves the
 * page rather than walking through the months seen. Something that is not a
 * month is dropped without being asked for.
 */
export function useClaimMonthParam(): ClaimMonthParam {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(CLAIM_MONTH_PARAM);
  const month = raw !== null && isClaimMonth(raw) ? raw : undefined;

  const drop = useCallback(
    () =>
      setSearchParams(
        (params) => {
          params.delete(CLAIM_MONTH_PARAM);
          return params;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  const isMalformed = raw !== null && month === undefined;
  useEffect(() => {
    if (isMalformed) drop();
  }, [isMalformed, drop]);

  const select = useCallback(
    (next: string) =>
      setSearchParams(
        (params) => {
          params.set(CLAIM_MONTH_PARAM, next);
          return params;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  return { month, select, drop };
}
