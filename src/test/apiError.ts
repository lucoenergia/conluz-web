import type { RestErrorDetail } from "../api/models";

/**
 * An error shaped like the one Axios rejects with for an API error response:
 * `status` on the error itself (what `AuthErrorBoundry` reads), and the
 * response's status, headers and `RestError` body. Mock-free, so any spec may
 * import it.
 *
 * Header names are lower-case, as Axios reports them.
 */
export function apiError(
  status: number,
  detail?: Partial<RestErrorDetail>,
  headers: Record<string, string> = {},
): Error & { status: number; response: { status: number; headers: Record<string, string>; data: unknown } } {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    status,
    response: {
      status,
      headers,
      data: { status, errors: detail ? [{ message: "raw backend message", ...detail }] : [] },
    },
  });
}
