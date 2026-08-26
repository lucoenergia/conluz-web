import { RestErrorDetailCode } from "../api/models";
import type { RestError, RestErrorDetail } from "../api/models";

/**
 * code -> Spanish message template. Templates may reference `{paramName}`
 * placeholders, interpolated from the detail's `params` map.
 *
 * Scoped to the codes reachable from the endpoints this app actually calls
 * today. Codes belonging to publishing, reverting, or file generation
 * (e.g. SHARING_AGREEMENT_COEFFICIENT_SUM_INVALID, PLANT_MISSING_REGULATORY_CODE)
 * are deliberately absent — add them when the issue that reaches them lands.
 */
const API_ERROR_TEMPLATES: Partial<Record<RestErrorDetailCode, string>> = {
  [RestErrorDetailCode.SHARING_AGREEMENT_NOT_DRAFT]:
    "Este acuerdo ya no está en borrador, por lo que no se puede modificar ni eliminar.",

  // Line-level distributor-file errors (carry params.line, and usually params.cups).
  [RestErrorDetailCode.DISTRIBUTOR_FILE_LINE_MALFORMED]: "Línea {line}: el formato de la línea no es válido.",
  [RestErrorDetailCode.DISTRIBUTOR_FILE_CUPS_UNKNOWN]:
    "Línea {line}: el CUPS {cups} no pertenece a ningún suministro de la comunidad.",
  [RestErrorDetailCode.DISTRIBUTOR_FILE_CUPS_LENGTH_INVALID]:
    "Línea {line}: el CUPS {cups} no tiene una longitud válida.",
  [RestErrorDetailCode.DISTRIBUTOR_FILE_CUPS_DUPLICATE]:
    "Línea {line}: el CUPS {cups} aparece más de una vez en el fichero.",
  [RestErrorDetailCode.DISTRIBUTOR_FILE_VALUE_DECIMAL_SEPARATOR_INVALID]:
    "Línea {line}: el separador decimal del coeficiente no es válido.",
  [RestErrorDetailCode.DISTRIBUTOR_FILE_VALUE_SCALE_INVALID]:
    "Línea {line}: el coeficiente tiene más decimales de los permitidos.",

  // File-level distributor-file errors (no params.line).
  [RestErrorDetailCode.DISTRIBUTOR_FILE_COEFFICIENT_SUM_INVALID]:
    "La suma de los coeficientes del fichero no es válida.",
  [RestErrorDetailCode.DISTRIBUTOR_FILE_FILENAME_SHAPE_INVALID]:
    "El nombre del fichero no sigue el formato esperado: {regulatoryCode}_AAAA.txt.",
  [RestErrorDetailCode.DISTRIBUTOR_FILE_FILENAME_REGULATORY_CODE_MISMATCH]:
    "El nombre del fichero no corresponde al código regulatorio de esta planta ({regulatoryCode}).",
  [RestErrorDetailCode.DISTRIBUTOR_FILE_PLANT_REGULATORY_CODE_MISSING]:
    "Esta planta no tiene código regulatorio asignado, por lo que no se puede validar el fichero. Añádelo desde la ficha de la planta.",

  // Manual-authoring duplicate, keyed by supplyId — distinct from the
  // file-path DISTRIBUTOR_FILE_CUPS_DUPLICATE (keyed by CUPS) above.
  [RestErrorDetailCode.SHARING_AGREEMENT_DUPLICATE_SUPPLY]:
    "Hay un suministro repetido en el conjunto de coeficientes.",
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
