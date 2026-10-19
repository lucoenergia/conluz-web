import type { ImportMembersRowErrorResponse, ImportMembersRowResponse } from "../../api/models";
import { translateErrorDetail } from "../../errors/apiErrorCatalogue";
import { triggerBrowserDownload } from "../../components/SharingAgreementFilePanel/downloadSharingAgreementFile";

/**
 * The member import's columns (lucoenergia/conluz#397; #284), in the order the
 * template lists them. The header is the parser's name for the column, so it
 * is shown as it is, in English and with its case; the rest is for the guide.
 * The examples are invented.
 */
export interface ImportColumn {
  header: string;
  /** How the guide and the row reasons name the column. */
  label: string;
  meaning: string;
  required: boolean;
  example: string;
}

export const IMPORT_COLUMNS: readonly ImportColumn[] = [
  {
    header: "personalId",
    label: "DNI/NIE/NIF",
    meaning: "El DNI, NIE o NIF del miembro. Los espacios, puntos y guiones no cuentan.",
    required: true,
    example: "12345678Z",
  },
  {
    header: "fullName",
    label: "Nombre completo",
    meaning: "El nombre y los apellidos del miembro.",
    required: true,
    example: "Ana García López",
  },
  {
    header: "memberNumber",
    label: "Número de socio",
    meaning: "Su número de socio en la comunidad: un número entero, 0 o mayor.",
    required: false,
    example: "42",
  },
  {
    header: "contactEmail",
    label: "Email de contacto",
    meaning: "El email al que le llegará la invitación cuando la envíes.",
    required: false,
    example: "ana@ejemplo.com",
  },
  {
    header: "address",
    label: "Dirección",
    meaning: "Su dirección postal.",
    required: false,
    example: "Calle Mayor 1, Luco de Jiloca",
  },
  {
    header: "phoneNumber",
    label: "Teléfono",
    meaning: "Su teléfono de contacto.",
    required: false,
    example: "600123456",
  },
];

/** The most members one file may hold, as the backend enforces it. */
export const MAX_IMPORT_ROWS = 1000;

export const MEMBER_TEMPLATE_FILE_NAME = "plantilla-miembros.csv";

/**
 * The template: the header line alone, so that no example row is ever
 * registered by a file sent without removing it. The byte order mark makes
 * Excel open it as UTF-8, so accented names typed into it survive.
 */
export const MEMBER_TEMPLATE_CSV = `\uFEFF${IMPORT_COLUMNS.map((column) => column.header).join(";")}\r\n`;

export function downloadMemberTemplate(): void {
  triggerBrowserDownload(
    new Blob([MEMBER_TEMPLATE_CSV], { type: "text/csv;charset=utf-8" }),
    MEMBER_TEMPLATE_FILE_NAME,
  );
}

const labelOf = (column: string) => IMPORT_COLUMNS.find((c) => c.header === column)?.label ?? column;

/**
 * One broken rule of a row, in Spanish, from its column and constraint. A
 * newer backend may add constraints, so an unknown one still names the column.
 */
export function constraintText({ column, constraint, params }: ImportMembersRowErrorResponse): string {
  const label = labelOf(column);
  switch (constraint) {
    case "REQUIRED":
      return `${label}: es obligatorio.`;
    case "NOT_EMPTY_ONCE_NORMALISED":
      return `${label}: solo tiene espacios, puntos o guiones.`;
    case "INVALID_PERSONAL_ID":
      return `${label}: no es un DNI, NIE o NIF válido.`;
    case "MIN":
      return params?.min ? `${label}: tiene que ser ${params.min} o mayor.` : `${label}: es demasiado pequeño.`;
    case "EMAIL":
      return `${label}: no es un email válido.`;
    case "NOT_AN_INTEGER":
      return `${label}: tiene que ser un número entero.`;
    default:
      return `${label}: no es válido.`;
  }
}

/**
 * Why a row was not registered, in Spanish. Built from the row's code and
 * `errors`, never from the server's `message`, which is in whatever language
 * the request asked for and words things its own way.
 */
export function rowReason(row: ImportMembersRowResponse): string {
  switch (row.code) {
    case "MEMBERSHIP_IMPORT_ROW_INVALID":
    case "USER_PERSONAL_ID_INVALID":
      if (row.errors.length > 0) return row.errors.map(constraintText).join(" ");
      return row.code === "USER_PERSONAL_ID_INVALID"
        ? translateErrorDetail({ code: row.code, message: "" }, "")
        : "Algún valor de la fila no es válido.";
    case "MEMBERSHIP_ALREADY_EXISTS":
      return "Ya es miembro de la comunidad.";
    case "MEMBERSHIP_IMPORT_ROW_MALFORMED":
      return "La fila no tiene el mismo número de columnas que la cabecera.";
    default:
      return "No se ha podido registrar.";
  }
}
