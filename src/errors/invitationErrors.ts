import type { RestError } from "../api/models";
import type { PasswordRule } from "../utils/passwordPolicy";
import { classifyAuthError } from "./authErrors";

/**
 * Why inspecting or accepting an invitation was refused, in the terms the
 * accept-invitation screen acts on (#274). Like `classifyAuthError`, only the
 * status and the error code are read: never the request, so neither the token
 * nor a password can travel through here.
 */
export type InvitationFailure =
  /** Unknown, expired, used, revoked or another account's: one code for all. */
  | { kind: "tokenInvalid" }
  /** The account already has a password: accept it signed in instead. */
  | { kind: "loginRequired" }
  /** The caller must change their password before anything else. */
  | { kind: "passwordChangeRequired" }
  | { kind: "policyViolation"; rule: PasswordRule | null }
  | { kind: "throttled"; retryAfterSeconds: number | null }
  | { kind: "unauthorized" }
  | { kind: "other"; error: unknown };

function codeOf(error: unknown) {
  return (error as { response?: { data?: RestError } } | null | undefined)?.response?.data?.errors?.[0]?.code;
}

export function classifyInvitationError(error: unknown): InvitationFailure {
  const code = codeOf(error);
  if (code === "MEMBERSHIP_INVITATION_TOKEN_INVALID") return { kind: "tokenInvalid" };
  if (code === "MEMBERSHIP_INVITATION_LOGIN_REQUIRED") return { kind: "loginRequired" };
  if (code === "USER_PASSWORD_CHANGE_REQUIRED") return { kind: "passwordChangeRequired" };

  const failure = classifyAuthError(error);
  switch (failure.kind) {
    case "policyViolation":
    case "throttled":
    case "unauthorized":
    case "other":
      return failure;
    default:
      return { kind: "other", error };
  }
}
