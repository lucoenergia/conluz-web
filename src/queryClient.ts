import { QueryClient } from "@tanstack/react-query";

/**
 * The app's query defaults, in one place so a spec whose subject is how the app
 * reacts to an error can run against the real ones instead of a hand-made
 * client that happens to differ.
 *
 * `refetchOnWindowFocus: false` is about the heavy queries -- consumption,
 * production, supply and plant lists -- which cost a round trip each and do not
 * change while somebody is looking at another tab. One query opts back in:
 * `LoggedUserProvider`'s current user, which gates routes and the menu and can
 * be changed by another administrator. The reasoning is at that call site.
 *
 * `throwOnError` on 401 hands an expired token to the nearest error boundary,
 * which is `AuthErrorBoundry` inside `AuthenticatedLayout`; it reports the
 * expiry and logs out. A query that sits ABOVE every boundary cannot use that
 * route and must handle its own 401 -- again, the current user.
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        throwOnError: (error: unknown) => (error as { response?: { status?: number } }).response?.status === 401,
      },
    },
  });
}
