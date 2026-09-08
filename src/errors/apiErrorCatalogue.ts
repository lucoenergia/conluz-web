import type { RestError, RestErrorDetail, RestErrorDetailCode } from "../api/models";

/**
 * code -> Spanish message template. Templates may reference `{paramName}`
 * placeholders, interpolated from the detail's `params` map.
 *
 * Scoped to the codes reachable from the endpoints this app actually calls
 * today. Codes belonging to file generation (e.g. PLANT_MISSING_REGULATORY_CODE)
 * are deliberately absent — add them when the issue that reaches them lands.
 *
 * SHARING_AGREEMENT_COEFFICIENT_SUM_INVALID was added ahead of the
 * publish/file-validate flow that surfaces it, so the catalogue didn't need
 * touching again once that flow landed (it has, via publish — see below). It
 * is unrelated to the save-success `coefficientSumWarning` string (a
 * different, code-less field — see useSharingAgreementCoefficientMutations's
 * replaceCoefficients).
 *
 * The publish/revert-to-draft lifecycle (see useSharingAgreementMutations)
 * added SHARING_AGREEMENT_HAS_NO_COEFFICIENTS, SHARING_AGREEMENT_NOT_PUBLISHED,
 * SHARING_AGREEMENT_NOT_REVERTIBLE, and SHARING_AGREEMENT_HAS_APPLIED_COEFFICIENTS.
 * The revert-to-draft 409 for "not in PUBLISHED status" could plausibly come
 * back as either SHARING_AGREEMENT_NOT_PUBLISHED or SHARING_AGREEMENT_NOT_REVERTIBLE
 * — the API description doesn't bind one specifically to that case — so both
 * are mapped rather than guessing.
 */
const API_ERROR_TEMPLATES: Partial<Record<Exclude<RestErrorDetailCode, null>, string>> = {
  SHARING_AGREEMENT_NOT_DRAFT: "Este acuerdo ya no está en borrador, así que esta acción no está disponible.",
  SHARING_AGREEMENT_HAS_NO_COEFFICIENTS:
    "Este acuerdo todavía no tiene coeficientes, así que no se puede poner en vigor.",
  SHARING_AGREEMENT_NOT_PUBLISHED: "Este acuerdo no está vigente, por lo que no se puede volver a borrador.",
  SHARING_AGREEMENT_NOT_REVERTIBLE: "Este acuerdo no se puede volver a borrador.",
  SHARING_AGREEMENT_HAS_APPLIED_COEFFICIENTS:
    "Este acuerdo ya tiene coeficientes aplicados por la distribuidora, por lo que no se puede volver a borrador.",

  // Line-level distributor-file errors (carry params.line, and usually params.cups).
  DISTRIBUTOR_FILE_LINE_MALFORMED: "Línea {line}: el formato de la línea no es válido.",
  DISTRIBUTOR_FILE_CUPS_UNKNOWN: "Línea {line}: el CUPS {cups} no pertenece a ningún suministro de la comunidad.",
  DISTRIBUTOR_FILE_CUPS_LENGTH_INVALID: "Línea {line}: el CUPS {cups} no tiene una longitud válida.",
  DISTRIBUTOR_FILE_CUPS_DUPLICATE: "El CUPS {cups} aparece más de una vez en el fichero.",
  DISTRIBUTOR_FILE_VALUE_DECIMAL_SEPARATOR_INVALID:
    "Línea {line}: el separador decimal del coeficiente no es válido, es obligatorio usar la coma.",
  DISTRIBUTOR_FILE_VALUE_SCALE_INVALID: "Línea {line}: el coeficiente tiene más decimales de los seis permitidos.",

  // File-level distributor-file errors (no params.line).
  DISTRIBUTOR_FILE_COEFFICIENT_SUM_INVALID: "La suma de los coeficientes del fichero no es válida.",
  DISTRIBUTOR_FILE_FILENAME_SHAPE_INVALID:
    "El nombre del fichero «{filename}» no sigue el formato esperado: CAU_AAAA.txt. Reemplaza CAU por el código de la planta y AAAA por el año con cuatro dígitos.",
  DISTRIBUTOR_FILE_FILENAME_REGULATORY_CODE_MISMATCH:
    "El CAU del nombre del fichero no coincide con el de esta planta (esperado «{expected}», recibido «{actual}»).",
  DISTRIBUTOR_FILE_PLANT_REGULATORY_CODE_MISSING:
    "Esta planta no tiene código regulatorio asignado, por lo que no se puede validar el fichero. Añádelo desde la ficha de la planta.",

  // Manual-authoring duplicate, keyed by supplyId — distinct from the
  // file-path DISTRIBUTOR_FILE_CUPS_DUPLICATE (keyed by CUPS) above.
  SHARING_AGREEMENT_DUPLICATE_SUPPLY: "Hay un suministro repetido en el conjunto de coeficientes.",

  SHARING_AGREEMENT_COEFFICIENT_SUM_INVALID: "La suma de los coeficientes del acuerdo no es válida.",
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
  if (template) return interpolate(template, detail.params ?? undefined);
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

export interface GroupedApiErrorLine {
  /** Null when params.line was present but unparseable — rendered last, never dropped. */
  line: number | null;
  message: string;
}

export interface GroupedApiErrors {
  fileLevel: string[];
  lineLevel: GroupedApiErrorLine[];
}

/**
 * Parses params.line defensively: absent -> undefined (caller treats the
 * detail as file-level); present but not a finite number -> null (caller
 * keeps it in the line-level group, sorted to the end) rather than throwing
 * or silently dropping the entry.
 */
function parseLine(raw: string | undefined): number | null | undefined {
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Translates every error detail in a RestError response and partitions them
 * by the presence of params.line, for the rejected-lines screen. Line-level
 * entries are ordered numerically (line 10 after line 9), with unparseable
 * line numbers grouped at the end rather than sorted lexicographically or
 * dropped.
 */
export function getGroupedApiErrorDetails(error: unknown): GroupedApiErrors {
  const details = extractRestError(error)?.errors ?? [];
  const fileLevel: string[] = [];
  const lineLevel: GroupedApiErrorLine[] = [];

  for (const detail of details) {
    const message = translateErrorDetail(detail, detail.message);
    const line = parseLine(detail.params?.line);
    if (line === undefined) {
      fileLevel.push(message);
    } else {
      lineLevel.push({ line, message });
    }
  }

  lineLevel.sort((a, b) => {
    if (a.line === null) return b.line === null ? 0 : 1;
    if (b.line === null) return -1;
    return a.line - b.line;
  });

  return { fileLevel, lineLevel };
}
