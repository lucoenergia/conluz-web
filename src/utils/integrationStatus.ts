import type { RestError } from "../api/models";
import type { CredentialsField } from "./integrationCredentials";

/**
 * What an integration's switch says about its state, for any provider: the
 * text while it is off, the fields a refused enable names as missing, and
 * whether a configuration read's 404 means "not configured yet".
 *
 * Shared by the plant's Huawei card (#192) and the community's Datadis card
 * (#256). It imports nothing at runtime, so the error catalogue can word the
 * same refusal without an import cycle.
 */

export const DISABLED_TEXT = "La integración está desactivada. Actívala para empezar a sincronizar.";

/** The Spanish name of each credentials field, as a refusal lists them. */
export const MISSING_FIELD_LABELS: Record<CredentialsField, string> = {
  username: "usuario",
  baseUrl: "URL del servicio",
  password: "contraseña",
};

/** "usuario", "usuario y contraseña", "usuario, URL del servicio y contraseña". */
export function formatFieldList(labels: string[]): string {
  return new Intl.ListFormat("es", { type: "conjunction" }).format(labels);
}

/** The field names of a `params.missingFields` value (`"username,password"`), in the order sent. */
export function missingFieldNamesFrom(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
}

/** Each name in Spanish. A name with no label is shown as sent rather than dropped. */
export function labelsForMissingFields(names: string[]): string[] {
  return names.map((field) => MISSING_FIELD_LABELS[field as CredentialsField] ?? field);
}

/**
 * The fields a refused enable says are missing, in the order the backend lists
 * them.
 *
 * Read from the first error's `params.missingFields`, a comma-separated list of
 * field names (`"username,password"`), as the enable endpoints document their
 * `*_CONFIG_INCOMPLETE` refusal.
 */
export function missingFieldNames(error: unknown): string[] {
  return missingFieldNamesFrom(
    (error as { response?: { data?: RestError } } | null | undefined)?.response?.data?.errors?.[0]?.params
      ?.missingFields,
  );
}

/** {@link missingFieldNames}, in Spanish. */
export function missingFieldLabels(error: unknown): string[] {
  return labelsForMissingFields(missingFieldNames(error));
}

/** The visible message for a refused enable, naming what is missing. */
export const incompleteText = (labels: string[]) =>
  labels.length > 0
    ? `Faltan datos para activar la integración: ${formatFieldList(labels)}.`
    : "Faltan datos para activar la integración.";

export function isNotFound(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null | undefined)?.response?.status === 404;
}

/**
 * A 404 on an integration's configuration read is "not configured yet", the
 * normal state of a new plant or community, so it is answered at once rather
 * than retried like a failure. Anything else keeps the app's default of three
 * attempts.
 */
export const retryUnlessNotFound = (failureCount: number, error: unknown) => !isNotFound(error) && failureCount < 3;
