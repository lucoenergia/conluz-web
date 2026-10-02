import { useLogin, useLogout } from "../../api/authentication/authentication";
import type { LoginRequest, Token } from "../../api/models";
import { type Action, ungated } from "./action";

/**
 * The operations that exist before a session does.
 *
 * These are the layer's permanent ungated escape, not a gate nobody has written
 * yet: a capability arrives on a resource fetched with a token, so no capability
 * can precede the request that obtains one. Logging out is the same question
 * backwards -- refusing it on a capability would strand the caller.
 *
 * They live here rather than being excluded from the lint rule, so that every
 * mutation in the app reaches a screen by one road and the ones with no answer
 * say so out loud. src/contracts/mutationHooks.spec.ts reads these
 * reasons and holds them to a shape.
 *
 * Note this is NOT the app's logout. `src/hooks/useLogout.ts` is hand-written,
 * clears the cache and navigates, and never calls POST /logout -- it only shares
 * the name. The generated hook below has no caller today.
 */
export interface SessionActions {
  actions: {
    login: Action<[LoginRequest], Token | undefined>;
    logout: Action<[], boolean>;
  };
}

export function useSessionActions(): SessionActions {
  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  return {
    actions: {
      login: ungated(
        "no session: a capability rides on a resource fetched with a token, so none can precede the request that obtains one",
        async (data: LoginRequest) => {
          try {
            return await loginMutation.mutateAsync({ data });
          } catch {
            return undefined;
          }
        },
        loginMutation.isPending,
      ),
      logout: ungated(
        "no session: refusing to end a session on a capability would strand the caller in it",
        async () => {
          try {
            await logoutMutation.mutateAsync();
            return true;
          } catch {
            return false;
          }
        },
        logoutMutation.isPending,
      ),
    },
  };
}
