/**
 * What the app is allowed to do, as the backend answers it.
 *
 * Four states, because "not yet known", "no" and "could not find out" are three
 * different things and only one of them may redirect. Collapsing them is the
 * bug this module exists to prevent: deciding before the answer arrives bounces
 * a legitimate admin off a deep link, and treating a failed request as a denial
 * sends someone with access to the home page with no explanation.
 */
export type CapabilityOutcome =
  /** Not yet known. Wait — never render a decision on this. */
  | { state: "pending" }
  | { state: "allowed" }
  /** The capability is false, or the resource answered 403/404. */
  | { state: "denied" }
  /** The request failed. Not resolved and not denied: offer a retry. */
  | { state: "error"; error: unknown; retry: () => void };

export const PENDING: CapabilityOutcome = { state: "pending" };
export const DENIED: CapabilityOutcome = { state: "denied" };

/**
 * An absent, unknown or explicitly false capability all mean the same thing: no.
 *
 * `=== true` rather than a truthiness check. Absent already denies either way,
 * since undefined is falsy -- what this guards against is a value that is
 * truthy without being a grant. JSON has no opinion on what arrives in a
 * boolean field, and the string "false" is truthy.
 */
export function decide<T>(capabilities: T | undefined, key: keyof T): CapabilityOutcome {
  return capabilities?.[key] === true ? { state: "allowed" } : DENIED;
}

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null | undefined)?.response?.status;
}

/**
 * Whether a failed request is the backend saying "no" rather than failing to
 * answer. 403 is a denial by definition; 404 is one too, because the API hides
 * resources the caller may not see instead of admitting they exist.
 *
 * Anything else -- a 500, a timeout, an offline browser -- left the question
 * unanswered, and answering it "no" on the caller's behalf would be a guess.
 */
export function isDenial(error: unknown): boolean {
  const status = statusOf(error);
  return status === 403 || status === 404;
}

/**
 * The shared shape of every capability hook: resolve a query's state into an
 * outcome, then read the capability off the settled payload.
 *
 * `selectCapabilities` picks the capabilities object out of the response, so
 * `key` is checked against that object rather than against the response -- a
 * capability name that does not exist, or that belongs to a different kind of
 * resource, fails to compile.
 */
export function outcomeFromQuery<TData, TCapabilities>(
  query: { data: TData | undefined; isLoading: boolean; error: unknown; refetch: () => void },
  selectCapabilities: (data: TData) => TCapabilities | undefined,
  key: keyof TCapabilities,
): CapabilityOutcome {
  if (query.error) {
    return isDenial(query.error)
      ? DENIED
      : { state: "error", error: query.error, retry: () => query.refetch() };
  }
  if (query.isLoading || query.data === undefined) return PENDING;
  return decide(selectCapabilities(query.data), key);
}
