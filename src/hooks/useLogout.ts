import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthDispatch } from "../context/auth.context";
import { useLoggedUserDispatch } from "../context/logged-user.context";

/**
 * Shared logout routine used by every logout entry point.
 *
 * Clearing the React Query cache is essential: `getCurrentUser`'s query key is
 * user-independent, so without a clear the previous user's response leaks into the next
 * session and can drive the landing redirect off the wrong user's memberships.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const dispatchAuth = useAuthDispatch();
  const dispatchLoggedUser = useLoggedUserDispatch();
  const navigate = useNavigate();

  return () => {
    queryClient.clear();
    dispatchAuth(null);
    dispatchLoggedUser(null);
    navigate("/login");
  };
}
