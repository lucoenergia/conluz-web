import type { RestErrorDetailCode } from "../api/models";
import { getFirstApiErrorCode, getFirstApiErrorMessage } from "../errors/apiErrorCatalogue";

/**
 * The credentials form an integration shares: a username, a write-only password
 * and the service's base URL. Whether the integration is on is not part of it:
 * that has its own enable and disable endpoints (lucoenergia/conluz#425).
 *
 * Provider-agnostic on purpose. Datadis uses it on the integrations page
 * (#245), and the Huawei form on plant detail (#192) has the same contract:
 * the password is never returned, only whether one is stored.
 */
export interface CredentialsValues {
  username: string;
  password: string;
  baseUrl: string;
}

export type CredentialsField = "username" | "password" | "baseUrl";

export type CredentialsErrors = Partial<Record<CredentialsField, string>>;

export const CREDENTIALS_FIELDS: readonly CredentialsField[] = ["username", "password", "baseUrl"];

export const PASSWORD_REQUIRED_MESSAGE = "Introduce la contraseña.";
export const USERNAME_REQUIRED_MESSAGE = "Introduce el usuario.";
export const BASE_URL_REQUIRED_MESSAGE = "Introduce la URL del servicio.";
export const BASE_URL_INVALID_MESSAGE = "Introduce una URL válida que empiece por http:// o https://.";

/** An absolute `http` or `https` URL. A bare host such as `datadis.es` is not one. */
export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value.trim());
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * The request body: the password only when one was typed.
 *
 * An absent password keeps the stored one; `""` and `null` are refused with a
 * 400 (lucoenergia/conluz#404). So an empty field omits the key rather than
 * sending it empty.
 */
export function buildCredentialsBody({ username, password, baseUrl }: CredentialsValues): {
  username: string;
  baseUrl: string;
  password?: string;
} {
  return { username, baseUrl, ...(password ? { password } : {}) };
}

/**
 * Every rule the values break, before any of them is shown.
 *
 * `passwordSet` has three answers: `true` (one is stored, so an empty field
 * keeps it), `false` (none is stored, so the field is required) and
 * `undefined` (the stored configuration could not be read, so the client
 * cannot tell and leaves the decision to the backend).
 */
export function validateCredentials(
  values: CredentialsValues,
  { passwordSet }: { passwordSet: boolean | undefined },
): CredentialsErrors {
  const errors: CredentialsErrors = {};
  // Blank counts as empty: the backend refuses a blank username or URL with a
  // 400 that carries no code, so the client is the only one that can say which.
  if (!values.username.trim()) errors.username = USERNAME_REQUIRED_MESSAGE;
  if (passwordSet === false && !values.password) errors.password = PASSWORD_REQUIRED_MESSAGE;
  if (!values.baseUrl.trim()) errors.baseUrl = BASE_URL_REQUIRED_MESSAGE;
  else if (!isHttpUrl(values.baseUrl)) errors.baseUrl = BASE_URL_INVALID_MESSAGE;
  return errors;
}

/**
 * The password-field message for a refused save, or `undefined` when the
 * refusal is about something else and keeps the screen's generic handling.
 *
 * `code` is the provider's own "password required" code, such as
 * DATADIS_CONFIG_PASSWORD_REQUIRED.
 */
export function passwordRequiredMessage(error: unknown, code: Exclude<RestErrorDetailCode, null>): string | undefined {
  return getFirstApiErrorCode(error) === code ? getFirstApiErrorMessage(error, PASSWORD_REQUIRED_MESSAGE) : undefined;
}

/**
 * Whether a password is stored, from the read of the stored configuration.
 *
 * A 404 is the answer "no configuration yet", so none is stored. Any other
 * failure says nothing about the password, so it stays unknown rather than
 * being taken for "none" and blocking a save the backend might accept.
 */
export function storedPasswordFrom(
  config: { passwordSet: boolean } | undefined,
  error: unknown,
): boolean | undefined {
  if (config) return config.passwordSet;
  return (error as { response?: { status?: number } } | null | undefined)?.response?.status === 404 ? false : undefined;
}
