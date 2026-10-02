import { createContext, type ReactNode, useContext, useEffect, useRef } from "react";
import type { CurrentUserResponse } from "../api/models";
import { useGetCurrentUser } from "../api/users/users";
import { useAuth } from "./auth.context";
import { useEndSession } from "../hooks/useEndSession";

type LoggedUserProviderProps = { children: ReactNode };

const LoggedUserContext = createContext<CurrentUserResponse | null>(null);

/**
 * Thirty seconds, and the only query in the app that refetches on window focus
 * -- the global default is `false` (src/queryClient.ts), for the heavy
 * consumption and production queries.
 *
 * A deliberate deviation, not an oversight: do not "fix" it for consistency.
 * The caller's platform capabilities gate routes, the side menu and the landing
 * route, and the only way their own flag changes is another platform admin
 * revoking it in another session -- the backend refuses self-revocation
 * (#203). So the moment a stale answer would mislead somebody is when they come
 * back to the tab, which reconnect alone never catches on a stable connection
 * and polling would pay for every minute of a rare administrative event. This
 * response is one small row.
 */
const CURRENT_USER_STALE_TIME_MS = 30 * 1000;

function isUnauthorized(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null | undefined)?.response?.status === 401;
}

/**
 * The signed-in user, as a live query rather than a session snapshot.
 *
 * It used to be `useState`, filled once by AuthenticatedLayout from a query
 * that disabled itself as soon as it answered. Since capabilities gate the
 * routes and the menu, that froze what the app believed about the caller for
 * the whole session: a revoked platform admin kept being offered the
 * administration surface, with every call behind it answering 403 (#203).
 *
 * Serving the query result directly is what makes
 * `invalidateQueries(getGetCurrentUserQueryKey())` mean what it says, so a
 * screen that changes the caller's own record -- their memberships, their
 * contact details -- can make it visible without a reload.
 */
const LoggedUserProvider = ({ children }: LoggedUserProviderProps) => {
  const token = useAuth();
  const endSession = useEndSession();

  const { data, error } = useGetCurrentUser({
    query: {
      // No session, no request. This is stricter than the gate it replaces:
      // `enabled: loggedUser === null` was true precisely when there was no
      // user, including when there was no token at all, and ProtectedRoute
      // renders below the hook -- so a logged-out visit to a protected URL used
      // to fire this request before being redirected away.
      enabled: !!token,
      staleTime: CURRENT_USER_STALE_TIME_MS,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      // This provider sits above every error boundary, so the global 401
      // `throwOnError` would take down the whole tree instead of reporting an
      // expiry. It ends the session itself, below.
      throwOnError: false,
    },
  });

  // Only 401, and only once. A 500 or an offline browser is an unanswered
  // question, not an expiry, and ending the session on either would log people
  // out over a backend blip. The ref matters because `endSession` clears the
  // cache, which re-renders this provider with the same error still in hand.
  const hasEndedRef = useRef(false);
  useEffect(() => {
    if (hasEndedRef.current || !isUnauthorized(error)) return;
    hasEndedRef.current = true;
    endSession("expired");
  }, [error, endSession]);

  // `data`, never a copy and never gated on `isFetching`: React Query keeps the
  // last successful response across a refetch, and structural sharing returns
  // the identical object when the payload has not changed -- so a refetch that
  // changes nothing re-renders nothing and re-runs no effect, and one that does
  // change something never passes through null on the way.
  return <LoggedUserContext.Provider value={data ?? null}>{children}</LoggedUserContext.Provider>;
};

const useLoggedUser = (): CurrentUserResponse | null => {
  return useContext<CurrentUserResponse | null>(LoggedUserContext);
};

// eslint-disable-next-line react-refresh/only-export-components -- the hook belongs beside the provider that owns it
export { LoggedUserProvider, useLoggedUser };
