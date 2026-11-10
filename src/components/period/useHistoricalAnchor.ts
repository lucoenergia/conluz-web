import type { Anchor } from "./historicalPeriod";

export type HistoricalAnchor =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  /** Nothing published yet for this scope. */
  | { status: "none" }
  | { status: "ready"; anchor: Anchor };

/** The state of the query that loads a page's anchor: what a generated query hook returns. */
export interface AnchorQueryState<T> {
  isError: boolean;
  isSuccess: boolean;
  data: T | undefined;
  refetch: () => unknown;
}

/**
 * The latest published period of the selected scope, as the server resolves
 * it (UI-HIS-005, ADR-0005): every period on the page ends no later than it.
 * The anchor is never derived from the device clock, nor taken to be "the
 * previous month".
 *
 * Each page loads its anchor its own way: it runs the query of the selected
 * scope and passes its state here, with `read`, which takes the anchor from
 * the response, or null when nothing is published yet for the scope.
 */
export function useHistoricalAnchor<T>(query: AnchorQueryState<T>, read: (data: T) => Anchor | null): HistoricalAnchor {
  if (query.isError) return { status: "error", retry: () => void query.refetch() };
  if (!query.isSuccess || query.data === undefined) return { status: "loading" };
  const anchor = read(query.data);
  return anchor ? { status: "ready", anchor } : { status: "none" };
}
