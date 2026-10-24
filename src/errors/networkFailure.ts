/**
 * Whether a request failed without any answer from the server: no connection,
 * or a timeout (#296). A refusal always carries a response with a status; a
 * request cancelled on purpose is not a failure at all.
 */
export function isNetworkFailure(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { response, code, isAxiosError } = error as { response?: unknown; code?: unknown; isAxiosError?: unknown };
  return isAxiosError === true && response === undefined && code !== "ERR_CANCELED";
}
