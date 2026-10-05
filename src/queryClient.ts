import { MutationCache, QueryCache, QueryClient, type QueryKey } from "@tanstack/react-query";
import { getGetCurrentUserQueryKey } from "./api/users/users";

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null | undefined)?.response?.status;
}

function isCurrentUserKey(queryKey: QueryKey): boolean {
  const currentUserKey = getGetCurrentUserQueryKey();
  return queryKey.length === currentUserKey.length && queryKey.every((part, index) => part === currentUserKey[index]);
}

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
 *
 * Any 403, from a query or a mutation, re-asks for the current user (#196). A
 * caller who must change their password is refused everywhere until they do,
 * and the refreshed `mustChangePassword` is what sends them to
 * /change-password (`resolveForcedPasswordChangeTarget`, in the layout). The
 * 403 is not inspected for an error code on purpose: none is defined for that
 * case yet. When the flag is false nothing changes, and the 403 keeps meaning
 * what it meant -- a denial. The current user's own 403 is excluded so it
 * cannot re-trigger itself, and `cancelRefetch: false` folds a burst of 403s
 * into the one refetch already in flight.
 */
export function createAppQueryClient(): QueryClient {
  const recheckCurrentUserOn403 = (error: unknown, queryKey?: QueryKey) => {
    if (statusOf(error) !== 403) return;
    if (queryKey && isCurrentUserKey(queryKey)) return;
    void queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() }, { cancelRefetch: false });
  };

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => recheckCurrentUserOn403(error, query.queryKey),
    }),
    mutationCache: new MutationCache({
      onError: (error) => recheckCurrentUserOn403(error),
    }),
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        throwOnError: (error: unknown) => statusOf(error) === 401,
      },
    },
  });

  return queryClient;
}
