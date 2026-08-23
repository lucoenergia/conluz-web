import { RestErrorDetailCode } from "../api/models";
import type { RestError, RestErrorDetail } from "../api/models";

/**
 * code -> Spanish message template. Templates may reference `{paramName}`
 * placeholders, interpolated from the detail's `params` map.
 *
 * Seed for the coefficient-authoring issue to extend with the many more
 * codes it needs, not to replace.
 */
const API_ERROR_TEMPLATES: Partial<Record<RestErrorDetailCode, string>> = {
  [RestErrorDetailCode.SHARING_AGREEMENT_NOT_DRAFT]:
    "Este acuerdo ya no está en borrador, por lo que no se puede modificar ni eliminar.",
};

function interpolate(template: string, params?: Record<string, string>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => params[key] ?? match);
}

/**
 * Translates a single error detail to Spanish. Falls back to the server's
 * `message` when `code` is null or has no registered template — the contract
 * documents `code` as null for errors not yet migrated to the typed shape.
 */
export function translateErrorDetail(detail: RestErrorDetail | null | undefined, fallback: string): string {
  if (!detail) return fallback;
  const template = detail.code ? API_ERROR_TEMPLATES[detail.code] : undefined;
  if (template) return interpolate(template, detail.params);
  return detail.message || fallback;
}

function extractRestError(error: unknown): RestError | undefined {
  return (error as { response?: { data?: RestError } } | null | undefined)?.response?.data;
}

/**
 * Picks the first error detail off an API error response and translates it.
 * All this slice needs; a future multi-error consumer should call
 * `translateErrorDetail` directly per-detail instead of adding options here.
 */
export function getFirstApiErrorMessage(error: unknown, fallback: string): string {
  const firstDetail = extractRestError(error)?.errors?.[0];
  return translateErrorDetail(firstDetail, fallback);
}
