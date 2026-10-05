import type { RestError } from "../api/models";
import { isPasswordRule, type PasswordRule } from "../utils/passwordPolicy";
import { pluralize } from "../utils/pluralize";

/**
 * Why a login or a password change was refused, in the terms the screens act
 * on (#196). Only the status and the error code are read: never the request,
 * so no password can travel through here.
 *
 * A 400 or a 429 is never a session problem. Only `unauthorized` is.
 */
export type AuthFailure =
  | { kind: "currentPasswordIncorrect" }
  | { kind: "policyViolation"; rule: PasswordRule | null }
  | { kind: "throttled"; retryAfterSeconds: number | null }
  | { kind: "unauthorized" }
  | { kind: "other"; error: unknown };

interface ErrorResponseShape {
  status?: number;
  data?: RestError;
  headers?: Record<string, unknown> & { get?: (name: string) => unknown };
}

function responseOf(error: unknown): ErrorResponseShape | undefined {
  return (error as { response?: ErrorResponseShape } | null | undefined)?.response;
}

function toPositiveSeconds(raw: unknown): number | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  if (typeof raw === "string" && !/^\s*\d+\s*$/.test(raw)) return null;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/**
 * The wait the backend asks for, in seconds, or null when it gave none.
 *
 * The body comes first: `params.retryAfterSeconds` is always readable, while
 * the `Retry-After` header is invisible to scripts on a cross-origin response
 * unless the API exposes it -- which is the case in local development, where
 * the app and the API are served from different origins.
 */
export function getRetryAfterSeconds(error: unknown): number | null {
  const response = responseOf(error);
  const fromBody = toPositiveSeconds(response?.data?.errors?.[0]?.params?.retryAfterSeconds);
  if (fromBody !== null) return fromBody;

  const headers = response?.headers;
  const fromHeader = typeof headers?.get === "function" ? headers.get("retry-after") : headers?.["retry-after"];
  return toPositiveSeconds(fromHeader);
}

/** The wait in whole minutes, rounded up: 840 s is 14 minutes, 841 s is 15. */
export function retryAfterMinutes(seconds: number): number {
  return Math.ceil(seconds / 60);
}

export function throttledMessage(retryAfterSeconds: number | null): string {
  if (retryAfterSeconds === null) {
    return "Demasiados intentos fallidos. Vuelve a intentarlo más tarde.";
  }
  const minutes = retryAfterMinutes(retryAfterSeconds);
  return `Demasiados intentos fallidos. Vuelve a intentarlo dentro de ${minutes} ${pluralize(minutes, "minuto", "minutos")}.`;
}

export function classifyAuthError(error: unknown): AuthFailure {
  const response = responseOf(error);
  const detail = response?.data?.errors?.[0];

  if (response?.status === 401) return { kind: "unauthorized" };
  if (response?.status === 429 || detail?.code === "AUTH_TOO_MANY_FAILED_ATTEMPTS") {
    return { kind: "throttled", retryAfterSeconds: getRetryAfterSeconds(error) };
  }
  if (detail?.code === "USER_CURRENT_PASSWORD_INCORRECT") return { kind: "currentPasswordIncorrect" };
  if (detail?.code === "USER_PASSWORD_POLICY_VIOLATION") {
    const rule = detail.params?.rule;
    return { kind: "policyViolation", rule: isPasswordRule(rule) ? rule : null };
  }
  return { kind: "other", error };
}
