import type { RestError, RestErrorDetail, RestErrorDetailCode } from "../api/models";
import { isPasswordRule, PASSWORD_RULE_MESSAGES } from "../utils/passwordPolicy";
import { PASSWORD_UNCHANGED_MESSAGE, throttledMessage } from "./authErrors";
import { LAST_ACTIVE_ADMIN_EXPLANATION, resendLimitMessage } from "./membershipErrorMessages";
import { MISSING_CAU_MESSAGE } from "./sharingAgreementFileCopy";
import { incompleteText, labelsForMissingFields, missingFieldNamesFrom } from "../utils/integrationStatus";
import { CONTACT_CHANNEL_MESSAGES } from "../utils/contactChannelRules";

/**
 * code -> Spanish message template. Templates may reference `{paramName}`
 * placeholders, interpolated from the detail's `params` map.
 *
 * Scoped to the codes reachable from the endpoints this app actually calls
 * today. File generation (#149) reaches PLANT_MISSING_REGULATORY_CODE, worded
 * by the same constant the file panel and the next step show before the call.
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
/** A refused enable, naming the fields in `params.missingFields`, or none when it is absent. */
const incompleteConfig: ApiErrorTemplate = (params) =>
  incompleteText(labelsForMissingFields(missingFieldNamesFrom(params?.missingFields)));

/** `params.n` as a length, or undefined when it is absent or not a count. */
function lengthParam(params: Record<string, string> | undefined): number | undefined {
  const n = Number(params?.n);
  return params?.n !== undefined && Number.isInteger(n) && n >= 0 ? n : undefined;
}

function withOptionalCups(full: (cups: string) => string, generic: string): ApiErrorTemplate {
  return (params) => {
    const cups = params?.cups;
    return cups ? full(cups) : generic;
  };
}

/** `full` gets `params.headers` (comma-separated) as «a», «b»; without any, `generic`. */
function withHeaders(full: (headers: string) => string, generic: string): ApiErrorTemplate {
  return (params) => {
    const headers = (params?.headers ?? "")
      .split(",")
      .map((header) => header.trim())
      .filter(Boolean);
    return headers.length > 0 ? full(headers.map((header) => `«${header}»`).join(", ")) : generic;
  };
}

// A CSV import refused as a whole. Function templates where the code carries
// params, so an absent one degrades to a sentence without the list or the
// limit rather than a literal placeholder.
const IMPORT_INVALID_ENCODING =
  "No se ha podido leer el archivo. Guárdalo desde Excel como «CSV UTF-8» o «CSV (delimitado por punto y coma)»; «Texto Unicode» no sirve.";
const IMPORT_AMBIGUOUS_SEPARATOR =
  "No se ha podido saber si las columnas se separan con «;» o con «,». Usa un solo separador, como en la plantilla.";
const IMPORT_MALFORMED_FILE = "El archivo no es un CSV válido. Revisa que no haya comillas sin cerrar.";
const IMPORT_UNKNOWN_HEADERS = withHeaders(
  (headers) => `Estas columnas no se reconocen: ${headers}. Usa las cabeceras de la plantilla, con las mismas mayúsculas.`,
  "Hay columnas que no se reconocen. Usa las cabeceras de la plantilla, con las mismas mayúsculas.",
);
const IMPORT_DUPLICATED_HEADERS = withHeaders(
  (headers) => `Estas columnas aparecen más de una vez: ${headers}. Deja cada una solo una vez.`,
  "Hay columnas que aparecen más de una vez. Deja cada una solo una vez.",
);
const IMPORT_MISSING_HEADERS = withHeaders(
  (headers) => `Faltan estas columnas obligatorias: ${headers}.`,
  "Faltan columnas obligatorias. Usa las cabeceras de la plantilla.",
);
const IMPORT_TOO_MANY_ROWS: ApiErrorTemplate = (params) =>
  params?.maxRows
    ? `El archivo tiene más de ${params.maxRows} filas. Divídelo en varios archivos.`
    : "El archivo tiene demasiadas filas. Divídelo en varios archivos.";

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

  // Generating the distributor file for a plant with no CAU (#149). Not the
  // agreement's fault: the sentence sends the user to the plant.
  PLANT_MISSING_REGULATORY_CODE: MISSING_CAU_MESSAGE,

  // Generating the distributor file when supply codes are not valid CUPS
  // (#232). params.codes lists them, comma-separated, whenever the code fires.
  SUPPLY_CUPS_NOT_NORMALIZABLE:
    "El código de estos suministros no es un CUPS válido: {codes}. Un CUPS tiene 22 caracteres, o 20 si se completa con 0F, y no lleva espacios. Corrígelos y vuelve a intentarlo.",

  // Several of the community's supply codes normalize to the same CUPS
  // (#232). Refused by file generation and by the file upload, so it names
  // neither; params.cups is the CUPS, params.codes the supply codes.
  SUPPLY_CUPS_COLLISION:
    "Los suministros {codes} tienen el mismo CUPS ({cups}). Corrígelos para que cada uno tenga uno distinto.",

  // Deleting a plant that holds the community's sharing history
  // (lucoenergia/conluz#437; #290). A plant cannot be disabled, so neither
  // offers a way round it, nor a retry.
  PLANT_HAS_SHARING_AGREEMENTS:
    "No puedes eliminar esta planta porque tiene acuerdos de reparto: guarda el historial de reparto de la comunidad y hay que conservarla.",
  PLANT_HAS_PARTITION_COEFFICIENTS:
    "No puedes eliminar esta planta porque tiene coeficientes de reparto: guarda el historial de reparto de la comunidad y hay que conservarla.",

  // Deleting a supply that a plant or a sharing agreement still references
  // (lucoenergia/conluz#412; #290). Disabling is what stops using it.
  SUPPLY_HAS_PLANTS:
    "No puedes eliminar este punto de suministro porque tiene una planta asociada. Si quieres dejar de usarlo, deshabilítalo con «Deshabilitar» en su menú de la lista de puntos de suministro.",
  SUPPLY_HAS_PARTITION_COEFFICIENTS:
    "No puedes eliminar este punto de suministro porque forma parte de un acuerdo de reparto. Si quieres dejar de usarlo, deshabilítalo con «Deshabilitar» en su menú de la lista de puntos de suministro.",

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

  // Password change and login throttling (#196). Function templates, like the
  // coefficient codes above, so an absent or unknown param degrades to a
  // generic sentence instead of a literal placeholder. The wait in the 429 is
  // only the body's here; src/errors/authErrors.ts also falls back to the
  // Retry-After header, which a screen handling the 429 itself should use.
  USER_CURRENT_PASSWORD_INCORRECT: "La contraseña actual no es correcta.",
  USER_PASSWORD_POLICY_VIOLATION: (params) => {
    const rule = params?.rule;
    return isPasswordRule(rule) ? PASSWORD_RULE_MESSAGES[rule] : "La contraseña no cumple los requisitos.";
  },
  AUTH_TOO_MANY_FAILED_ATTEMPTS: (params) => {
    const seconds = Number(params?.retryAfterSeconds);
    return throttledMessage(Number.isFinite(seconds) && seconds > 0 ? seconds : null);
  },

  // lucoenergia/conluz#342 (#211). The forced-change redirect never reads
  // USER_PASSWORD_CHANGE_REQUIRED: it follows mustChangePassword on the current
  // user. This is only the sentence a screen shows if a request is refused.
  USER_PASSWORD_UNCHANGED: PASSWORD_UNCHANGED_MESSAGE,
  USER_PASSWORD_CHANGE_REQUIRED: "Por seguridad, debes cambiar tu contraseña antes de continuar.",

  // A DNI/NIE/NIF whose format or control letter is wrong
  // (lucoenergia/conluz#398). The member registration and the admin invitation
  // show it on the DNI field (#276).
  USER_PERSONAL_ID_INVALID: "El DNI/NIE/NIF no es válido. Revisa los números y la letra.",

  // A Datadis save that omits the password when none is stored
  // (lucoenergia/conluz#404). The form shows it on the password field (#245).
  DATADIS_CONFIG_PASSWORD_REQUIRED:
    "No hay ninguna contraseña guardada. Introdúcela para guardar la configuración.",

  // The same refusal for a plant's Huawei configuration (lucoenergia/conluz#399).
  // The form on plant detail shows it on the password field (#192).
  HUAWEI_CONFIG_PASSWORD_REQUIRED:
    "No hay ninguna contraseña guardada. Introdúcela para guardar la configuración.",

  // An enable refused because the configuration lacks data
  // (lucoenergia/conluz#414). The cards word it the same way through
  // incompleteText, with an action to complete it (#192, #256).
  DATADIS_CONFIG_INCOMPLETE: incompleteConfig,
  HUAWEI_CONFIG_INCOMPLETE: incompleteConfig,

  // A refused channel in a list of contact channels (lucoenergia/conluz#462).
  // The channel editor (#296) shows it on the field it names, worded as its
  // own check of the same rule. The backend sends the limit but not the current
  // length, nor the channel's type: the editor adds both, as `n` and `type`,
  // from the channel it sent (getIndexedApiErrorDetails). CONTACT_CHANNELS_MISSING,
  // CONTACT_CHANNELS_TOO_MANY and CONTACT_CHANNEL_TYPE_INVALID cannot be reached
  // from it, so they have no entry.
  CONTACT_CHANNEL_LABEL_BLANK: CONTACT_CHANNEL_MESSAGES.labelBlank,
  CONTACT_CHANNEL_LABEL_TOO_LONG: (params) => CONTACT_CHANNEL_MESSAGES.labelTooLong(lengthParam(params)),
  CONTACT_CHANNEL_VALUE_BLANK: (params) => {
    const type = params?.type;
    return type === "PHONE" || type === "EMAIL" || type === "ADDRESS"
      ? CONTACT_CHANNEL_MESSAGES.valueBlank(type)
      : "Escribe el teléfono, el email o la dirección del canal.";
  },
  CONTACT_CHANNEL_VALUE_TOO_LONG: (params) => CONTACT_CHANNEL_MESSAGES.valueTooLong(lengthParam(params)),
  CONTACT_CHANNEL_SCHEDULE_TOO_LONG: (params) => CONTACT_CHANNEL_MESSAGES.scheduleTooLong(lengthParam(params)),
  CONTACT_CHANNEL_NOTES_TOO_LONG: (params) => CONTACT_CHANNEL_MESSAGES.notesTooLong(lengthParam(params)),
  CONTACT_CHANNEL_EMAIL_INVALID: CONTACT_CHANNEL_MESSAGES.emailInvalid,
  CONTACT_CHANNEL_PHONE_CHARACTERS_INVALID: CONTACT_CHANNEL_MESSAGES.phoneInvalid,
  CONTACT_CHANNEL_PHONE_TOO_FEW_DIGITS: CONTACT_CHANNEL_MESSAGES.phoneInvalid,

  // A member record saved without a contact email on a COMMUNITY_ADMIN
  // membership (lucoenergia/conluz#416). The record form shows it on the email
  // field (#272).
  MEMBERSHIP_WITHOUT_CONTACT_EMAIL:
    "Un administrador de la comunidad tiene que tener un email de contacto. Para quitárselo, cámbiale antes el rol a miembro.",

  // Registering and inviting members (lucoenergia/conluz#392, #393; #275).
  // Worded for registering a member and inviting a community admin who is
  // already in the community, whether a person, a local entity or a company
  // (#232). From a member invitation write it means the member accepted
  // meanwhile, which src/errors/membershipErrors.ts words itself, as it does
  // the invite case of MEMBERSHIP_WITHOUT_CONTACT_EMAIL above.
  MEMBERSHIP_ALREADY_EXISTS: "Ya forma parte de esta comunidad.",
  MEMBERSHIP_ALREADY_INVITED: "Este miembro ya tenía una invitación enviada.",
  MEMBERSHIP_NOT_INVITED: "Este miembro todavía no tiene ninguna invitación que reenviar.",
  MEMBERSHIP_DISABLED: "Este miembro está suspendido, así que no se le puede invitar.",
  MEMBERSHIP_INVITATION_UNAVAILABLE: "Ahora mismo no se pueden enviar invitaciones. Inténtalo más tarde.",
  // The wait from the body only, like AUTH_TOO_MANY_FAILED_ATTEMPTS; the
  // members page reads the Retry-After header as well.
  MEMBERSHIP_INVITATION_RESEND_LIMIT_REACHED: (params) => {
    const seconds = Number(params?.retryAfterSeconds);
    return resendLimitMessage(Number.isFinite(seconds) && seconds > 0 ? seconds : null);
  },

  // Sending or resending to a selection of members (lucoenergia/conluz#527,
  // #328). The selection codes refuse the whole request, before anything is
  // sent; MEMBERSHIP_NOT_FOUND comes only as one person's result.
  MEMBERSHIP_INVITATION_SELECTION_EMPTY: "No has seleccionado a nadie. Selecciona al menos un miembro.",
  MEMBERSHIP_INVITATION_SELECTION_TOO_LARGE: (params) =>
    `Puedes enviar hasta ${params?.maxUserIds ?? "50"} invitaciones a la vez. Quita a alguien de la selección.`,
  MEMBERSHIP_INVITATION_SELECTION_DUPLICATED: "La selección repite a algún miembro. Vuelve a seleccionarlos.",
  MEMBERSHIP_NOT_FOUND: "Ya no forma parte de esta comunidad.",

  // Removing a member who owns supplies in the community (lucoenergia/conluz#412).
  MEMBERSHIP_OWNS_SUPPLIES:
    "Este miembro es titular de suministros en esta comunidad. Si quieres que deje de tener acceso, suspéndelo; para eliminarlo, antes hay que eliminar sus suministros.",
  // Demoting or removing the community's last active admin
  // (lucoenergia/conluz#449, #309).
  MEMBERSHIP_LAST_ACTIVE_ADMIN: LAST_ACTIVE_ADMIN_EXPLANATION,

  // A member import refused as a whole (lucoenergia/conluz#397; #284), and a
  // supply import (lucoenergia/conluz#532). The two refuse a file for the same
  // reasons, so they word them the same way.
  MEMBERSHIP_IMPORT_INVALID_ENCODING: IMPORT_INVALID_ENCODING,
  MEMBERSHIP_IMPORT_AMBIGUOUS_SEPARATOR: IMPORT_AMBIGUOUS_SEPARATOR,
  MEMBERSHIP_IMPORT_MALFORMED_FILE: IMPORT_MALFORMED_FILE,
  MEMBERSHIP_IMPORT_UNKNOWN_HEADERS: IMPORT_UNKNOWN_HEADERS,
  MEMBERSHIP_IMPORT_DUPLICATED_HEADERS: IMPORT_DUPLICATED_HEADERS,
  MEMBERSHIP_IMPORT_MISSING_HEADERS: IMPORT_MISSING_HEADERS,
  MEMBERSHIP_IMPORT_TOO_MANY_ROWS: IMPORT_TOO_MANY_ROWS,
  SUPPLY_IMPORT_INVALID_ENCODING: IMPORT_INVALID_ENCODING,
  SUPPLY_IMPORT_AMBIGUOUS_SEPARATOR: IMPORT_AMBIGUOUS_SEPARATOR,
  SUPPLY_IMPORT_MALFORMED_FILE: IMPORT_MALFORMED_FILE,
  SUPPLY_IMPORT_UNKNOWN_HEADERS: IMPORT_UNKNOWN_HEADERS,
  SUPPLY_IMPORT_DUPLICATED_HEADERS: IMPORT_DUPLICATED_HEADERS,
  SUPPLY_IMPORT_MISSING_HEADERS: IMPORT_MISSING_HEADERS,
  SUPPLY_IMPORT_TOO_MANY_ROWS: IMPORT_TOO_MANY_ROWS,

  // A supply refused for its CUPS or its owner (lucoenergia/conluz#532), by
  // its create, its edit or a row of the import. None echoes the value sent.
  SUPPLY_CUPS_INVALID: "El CUPS tiene que tener 20 o 22 caracteres, sin espacios.",
  SUPPLY_ALREADY_EXISTS: "Ya hay un punto de suministro con este CUPS en la comunidad.",
  SUPPLY_REGISTERED_IN_ANOTHER_COMMUNITY: "Este CUPS ya está registrado en otra comunidad.",
  SUPPLY_OWNER_NOT_FOUND: "No hay ningún miembro de la comunidad con ese DNI/NIE/NIF.",

  // A refused energy metrics or consumption period (#324). The server sends
  // no params. CONFLICTING and INCOMPLETE come from how a screen built the
  // request, never from anything the user did, so they tell the user nothing to do.
  ENERGY_METRICS_PERIOD_CONFLICTING: "No se ha podido interpretar el periodo.",
  ENERGY_METRICS_PERIOD_INCOMPLETE: "No se ha podido interpretar el periodo: falta una de sus fechas.",
  ENERGY_METRICS_PERIOD_START_AFTER_END: "La fecha de inicio del periodo debe ser anterior a la de fin.",
  ENERGY_METRICS_PERIOD_START_IN_FUTURE: "Este periodo todavía no ha empezado.",
  ENERGY_METRICS_PERIOD_TOO_LONG: "El periodo puede abarcar como máximo 24 meses.",

  // Creating or editing a community whose code or NIF another community
  // already has (#232). params.field names which: `code` or `legalId`. A
  // function template, so a missing or other value words both.
  COMMUNITY_ALREADY_EXISTS: (params) => {
    if (params?.field === "code") return "Ya hay otra comunidad con ese código.";
    if (params?.field === "legalId") return "Ya hay otra comunidad con ese NIF.";
    return "Ya hay otra comunidad con ese código o ese NIF.";
  },
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
 * The code of the first error detail, for a screen that places one refusal
 * somewhere other than its generic error slot. `undefined` when the response
 * carries no detail or the detail no code.
 */
export function getFirstApiErrorCode(error: unknown): RestErrorDetailCode | undefined {
  return extractRestError(error)?.errors?.[0]?.code ?? undefined;
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

export interface IndexedApiErrorDetail {
  /** The 0-based position, in the submitted list, of the item the detail is about. */
  index: number;
  code: RestErrorDetailCode | undefined;
  message: string;
}

export interface IndexedApiErrors {
  formLevel: string[];
  indexed: IndexedApiErrorDetail[];
}

/**
 * Translates every error detail in a RestError response and partitions them by
 * params.index, for a form that submits a list and places each refusal on the
 * item it names (the contact channels, #296). A detail with no index, or one
 * that is not a non-negative integer, is about the whole form: it is kept there
 * rather than dropped or put on the wrong item.
 *
 * `paramsFor` adds params the response does not carry but the form knows, from
 * the item it sent at that index (the contact channel's current length and
 * type). The response's own params win.
 */
export function getIndexedApiErrorDetails(
  error: unknown,
  paramsFor?: (index: number, code: RestErrorDetailCode | undefined) => Record<string, string>,
): IndexedApiErrors {
  const details = extractRestError(error)?.errors ?? [];
  const formLevel: string[] = [];
  const indexed: IndexedApiErrorDetail[] = [];

  for (const detail of details) {
    const raw = detail.params?.index;
    const index = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
    if (Number.isInteger(index) && index >= 0) {
      const code = detail.code ?? undefined;
      const params = { ...paramsFor?.(index, code), ...detail.params };
      indexed.push({ index, code, message: translateErrorDetail({ ...detail, params }, detail.message) });
    } else {
      formLevel.push(translateErrorDetail(detail, detail.message));
    }
  }

  return { formLevel, indexed };
}
