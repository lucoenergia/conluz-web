import {
  useLogin,
  useLogout,
  useRequestPasswordReset,
  useResetPassword,
} from "../../api/authentication/authentication";
import type { LoginRequest, PasswordResetBody, PasswordResetRequestBody } from "../../api/models";
import { type AuthFailure, classifyAuthError } from "../../errors/authErrors";
import { type Action, ungated } from "./action";

/**
 * A login either yields a token or says why it did not. The reason matters
 * since #196: a throttled caller (429) must be told to wait, and for how long,
 * rather than that their credentials are wrong.
 */
export type LoginResult = { token: string } | { failure: AuthFailure };

/** A password recovery request or reset (#233): done, or why not. */
export type PasswordRecoveryResult = { ok: true } | { ok: false; failure: AuthFailure };

/**
 * The operations that exist before a session does.
 *
 * These are the layer's permanent ungated escape, not a gate nobody has written
 * yet: a capability arrives on a resource fetched with a token, so no capability
 * can precede the request that obtains one. Logging out is the same question
 * backwards -- refusing it on a capability would strand the caller. Recovering
 * a forgotten password (#233) is for somebody who cannot sign in at all.
 *
 * They live here rather than being excluded from the lint rule, so that every
 * mutation in the app reaches a screen by one road and the ones with no answer
 * say so out loud. src/contracts/mutationHooks.spec.ts reads these
 * reasons and holds them to a shape.
 *
 * `logout` here is only the request that revokes the token. The app's logout is
 * `src/hooks/useLogout.ts`, which calls it, bounds the wait, and then ends the
 * session and navigates whatever the answer (#213).
 */
export interface SessionActions {
  actions: {
    login: Action<[LoginRequest], LoginResult>;
    logout: Action<[], boolean>;
    requestPasswordReset: Action<[PasswordResetRequestBody], PasswordRecoveryResult>;
    resetPassword: Action<[PasswordResetBody], PasswordRecoveryResult>;
  };
}

export function useSessionActions(): SessionActions {
  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const requestPasswordResetMutation = useRequestPasswordReset();
  const resetPasswordMutation = useResetPassword();

  return {
    actions: {
      login: ungated(
        "no session: a capability rides on a resource fetched with a token, so none can precede the request that obtains one",
        async (data: LoginRequest): Promise<LoginResult> => {
          try {
            const response = await loginMutation.mutateAsync({ data });
            // A 200 without a token is still a refused login.
            return response?.token ? { token: response.token } : { failure: { kind: "other", error: undefined } };
          } catch (error) {
            return { failure: classifyAuthError(error) };
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
      requestPasswordReset: ungated(
        "no session: a forgotten password is recovered by somebody who cannot sign in",
        async (data: PasswordResetRequestBody): Promise<PasswordRecoveryResult> => {
          try {
            await requestPasswordResetMutation.mutateAsync({ data });
            return { ok: true };
          } catch (error) {
            return { ok: false, failure: classifyAuthError(error) };
          }
        },
        requestPasswordResetMutation.isPending,
      ),
      resetPassword: ungated(
        "no session: the emailed token is the only credential, and it is checked by the backend",
        async (data: PasswordResetBody): Promise<PasswordRecoveryResult> => {
          try {
            await resetPasswordMutation.mutateAsync({ data });
            return { ok: true };
          } catch (error) {
            return { ok: false, failure: classifyAuthError(error) };
          }
        },
        resetPasswordMutation.isPending,
      ),
    },
  };
}
