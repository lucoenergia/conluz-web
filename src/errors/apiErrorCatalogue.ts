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
 *
 * The 8 SHARING_AGREEMENT_* coefficient-lifecycle codes below (activate/
 * deactivate/close/reopen) use a function template instead of a plain string.
 * `interpolate` (below) silently renders a literal `{key}` when a referenced
 * param is absent — acceptable for the older codes above, whose params are
 * always present when the code fires, but not for these: the params key that
 * would name the affected supply is unconfirmed (`cups`, by report — never
 * verified against a real 409). A function template sidesteps `interpolate`
 * entirely and degrades to a generic, supply-less sentence if `cups` is
 * missing or the key guess is wrong — silently, by design, never a literal
 * placeholder. Check this against a real 409 the next time the backend is
 * running; if `cups` isn't the actual key, every one of these messages is
 * quietly generic today.
 *
 * SHARING_AGREEMENT_COEFFICIENT_OVERLAP_CONFLICT is a residual, batch-wide
 * guard (surfaces once a whole batch's cascading splices conflict, not a
 * single coefficient's own two neighbouring dates) and never names a single
 * CUPS, so it stays a plain string rather than joining withOptionalCups.
 */
type ApiErrorTemplate = string | ((params: Record<string, string> | undefined) => string);

/** `full` runs only when params.cups is present and non-empty; otherwise `generic`. */
function withOptionalCups(full: (cups: string) => string, generic: string): ApiErrorTemplate {
  return (params) => {
    const cups = params?.cups;
    return cups ? full(cups) : generic;
  };
}

const API_ERROR_TEMPLATES: Partial<Record<Exclude<RestErrorDetailCode, null>, ApiErrorTemplate>> = {
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

  // Coefficient date-lifecycle codes (activate/deactivate/close/reopen). See
  // the file-level doc comment above for why these use withOptionalCups
  // instead of a plain interpolated string.
  SHARING_AGREEMENT_DATE_IN_FUTURE: withOptionalCups(
    (cups) => `La fecha indicada no puede ser una fecha futura (afecta a ${cups}).`,
    "La fecha indicada no puede ser una fecha futura.",
  ),
  SHARING_AGREEMENT_ACTIVATION_DATE_NOT_AFTER_PREDECESSOR: withOptionalCups(
    (cups) => `La fecha de activación debe ser posterior a la del coeficiente anterior de ${cups}.`,
    "La fecha de activación debe ser posterior a la del coeficiente anterior de este suministro.",
  ),
  SHARING_AGREEMENT_ACTIVATION_DATE_NOT_BEFORE_SUCCESSOR: withOptionalCups(
    (cups) => `La fecha de activación debe ser anterior a la del siguiente coeficiente de ${cups}.`,
    "La fecha de activación debe ser anterior a la del siguiente coeficiente de este suministro.",
  ),
  SHARING_AGREEMENT_CLOSURE_DATE_NOT_AFTER_ACTIVATION: withOptionalCups(
    (cups) => `La fecha de cierre debe ser posterior a la fecha de activación del coeficiente de ${cups}.`,
    "La fecha de cierre debe ser posterior a la fecha de activación de este coeficiente.",
  ),
  SHARING_AGREEMENT_COEFFICIENT_NOT_ACTIVE: withOptionalCups(
    (cups) => `El coeficiente de ${cups} no está activo, así que no se puede cerrar.`,
    "Este coeficiente no está activo, así que no se puede cerrar.",
  ),
  SHARING_AGREEMENT_COEFFICIENT_HAS_SUCCESSOR: withOptionalCups(
    (cups) =>
      `El coeficiente de ${cups} no se puede reabrir porque su cierre se generó automáticamente al activar otro coeficiente.`,
    "Este coeficiente no se puede reabrir porque su cierre se generó automáticamente al activar otro coeficiente.",
  ),
  SHARING_AGREEMENT_COEFFICIENT_NOT_IN_AGREEMENT: withOptionalCups(
    (cups) => `El coeficiente de ${cups} no pertenece a este acuerdo de reparto.`,
    "Uno de los coeficientes seleccionados no pertenece a este acuerdo de reparto.",
  ),
  SHARING_AGREEMENT_COEFFICIENT_PERIOD_OVERLAP: withOptionalCups(
    (cups) => `CUPS ${cups}: con esa fecha, su periodo se solaparía con otro coeficiente del mismo suministro.`,
    "Con esa fecha, el periodo de un coeficiente se solaparía con otro del mismo suministro.",
  ),
  SHARING_AGREEMENT_COEFFICIENT_OVERLAP_CONFLICT:
    "No se ha podido guardar: el cambio haría que se solapen dos periodos de un mismo suministro. Recarga la página y revisa las fechas.",
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
  if (typeof template === "function") return template(detail.params ?? undefined);
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
