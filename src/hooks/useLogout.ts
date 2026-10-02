import { useNavigate } from "react-router";
import { useEndSession } from "./useEndSession";

/**
 * Shared logout routine used by every logout entry point that has a router.
 *
 * Clearing the React Query cache is what empties the signed-in user: the user
 * IS the `getCurrentUser` query now (#203), so nothing else has to be reset --
 * and nothing else can be. The clear is also still what stops the previous
 * user's response, whose query key is user-independent, from leaking into the
 * next session and driving the landing redirect off the wrong memberships.
 */
export function useLogout() {
  const endSession = useEndSession();
  const navigate = useNavigate();

  return () => {
    // "logout", not "expired": the user asked. Claiming an expiry on the login
    // page would be a lie on every deliberate logout.
    endSession("logout");
    navigate("/login");
  };
}
