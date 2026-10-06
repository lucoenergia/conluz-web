import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthDispatch } from "../context/auth.context";
import { markPasswordChanged, markSessionExpired } from "../utils/session";

/**
 * Why the session is ending. "expired" is the backend refusing a token the app
 * still held; "logout" is the user asking; "passwordChanged" is a successful
 * password change, which revokes the token (#196).
 */
export type SessionEndReason = "expired" | "logout" | "passwordChanged";

/**
 * Ends the session without navigating.
 *
 * No router dependency on purpose: `LoggedUserProvider` calls this from above
 * `BrowserRouter` when the current-user query answers 401, and `ProtectedRoute`
 * already renders `<Navigate replace to="login" />` the moment the token is
 * null. `useLogout` adds the navigation for the entry points that have a router.
 *
 * Clearing the auth state comes FIRST. `clear()` destroys the current-user
 * query while the provider's observer is still mounted, and that observer
 * re-subscribes to a fresh, empty query -- which would fetch again if `enabled`
 * were still true. Both updates batch into one render, so the order is only
 * about what that render sees.
 */
export function useEndSession(): (reason: SessionEndReason) => void {
  const queryClient = useQueryClient();
  const dispatchAuth = useAuthDispatch();

  return useCallback(
    (reason: SessionEndReason) => {
      if (reason === "expired") markSessionExpired();
      if (reason === "passwordChanged") markPasswordChanged();
      dispatchAuth(null);
      queryClient.clear();
    },
    [dispatchAuth, queryClient],
  );
}
