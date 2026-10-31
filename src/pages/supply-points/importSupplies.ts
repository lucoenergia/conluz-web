import type {
  ImportSuppliesResponse,
  ImportSuppliesRowErrorResponse,
  ImportSuppliesRowResponse,
  RestErrorDetailCode,
} from "../../api/models";
import { translateErrorDetail } from "../../errors/apiErrorCatalogue";
import { columnLabel, csvTemplate, downloadCsvTemplate, type CsvImportColumn } from "../../components/CsvImportDialog/csvImport";
import { pluralize } from "../../utils/pluralize";

/**
 * The supply import's columns (lucoenergia/conluz#532), in the order the
 * template lists them: the required ones first. The examples are invented.
 */
export const SUPPLY_IMPORT_COLUMNS: readonly CsvImportColumn[] = [
  {
    header: "code",
    label: "CUPS",
    meaning: "El CUPS del punto de suministro, de 20 o 22 caracteres.",
    required: true,
    example: "ES0031300119158001DL0F",
  },
  {
    header: "address",
    label: "Dirección",
    meaning: "La dirección del punto de suministro.",
    required: true,
    example: "Calle Mayor 1, Luco de Jiloca",
  },
  {
    header: "personalId",
    label: "DNI/NIE/NIF",
    meaning:
      "El DNI, NIE o NIF del titular, que tiene que ser miembro de la comunidad. Los espacios, puntos y guiones no cuentan.",
    required: true,
    example: "12345678Z",
  },
  {
    header: "addressRef",
    label: "Referencia catastral",
    meaning: "La referencia catastral del punto de suministro.",
    required: false,
    example: "9872023VH5797S0001WX",
  },
  {
    header: "name",
    label: "Nombre",
    meaning: "Un nombre para reconocer el punto. Si lo dejas vacío, se mostrará la dirección.",
    required: false,
    example: "Casa del pueblo",
  },
];

/** The most supplies one file may hold, as the backend enforces it. */
export const MAX_SUPPLY_IMPORT_ROWS = 1000;

export const SUPPLY_TEMPLATE_FILE_NAME = "plantilla-puntos-de-suministro.csv";

/** The template: the header line alone, in the member template's format (see csvTemplate). */
export const SUPPLY_TEMPLATE_CSV = csvTemplate(SUPPLY_IMPORT_COLUMNS);

export function downloadSupplyTemplate(): void {
  downloadCsvTemplate(SUPPLY_TEMPLATE_FILE_NAME, SUPPLY_IMPORT_COLUMNS);
}

/** The refusals that mean the file was refused as a whole and nothing was created. */
export const SUPPLY_WHOLE_FILE_CODES: readonly RestErrorDetailCode[] = [
  "SUPPLY_IMPORT_INVALID_ENCODING",
  "SUPPLY_IMPORT_AMBIGUOUS_SEPARATOR",
  "SUPPLY_IMPORT_MALFORMED_FILE",
  "SUPPLY_IMPORT_UNKNOWN_HEADERS",
  "SUPPLY_IMPORT_DUPLICATED_HEADERS",
  "SUPPLY_IMPORT_MISSING_HEADERS",
  "SUPPLY_IMPORT_TOO_MANY_ROWS",
];

/** Said when the server gives no message for a row this screen cannot word. */
const ROW_FALLBACK = "No se ha podido crear.";

/**
 * One broken rule of a row, in Spanish, or undefined for a constraint a newer
 * backend added, which the row then words from its `message`.
 */
export function supplyConstraintText({ column, constraint }: ImportSuppliesRowErrorResponse): string | undefined {
  switch (constraint) {
    case "REQUIRED":
      return `${columnLabel(SUPPLY_IMPORT_COLUMNS, column)}: es obligatorio.`;
    case "INVALID_CUPS":
      return "CUPS: tiene que tener 20 o 22 caracteres, sin espacios.";
    default:
      return undefined;
  }
}

/**
 * Why a row was not created, in Spanish. Built from the row's code and
 * `errors`, so the wording is this screen's; only a code or a constraint it
 * does not know falls back to the server's `message`.
 */
export function supplyRowReason(row: ImportSuppliesRowResponse): string {
  const fallback = row.message || ROW_FALLBACK;
  switch (row.code) {
    case "SUPPLY_IMPORT_ROW_INVALID": {
      const texts = row.errors.map(supplyConstraintText);
      if (texts.length === 0 || texts.some((text) => text === undefined)) return fallback;
      return texts.join(" ");
    }
    case "SUPPLY_IMPORT_ROW_MALFORMED":
      return "La fila no tiene el mismo número de columnas que la cabecera.";
    case "SUPPLY_ALREADY_EXISTS":
    case "SUPPLY_REGISTERED_IN_ANOTHER_COMMUNITY":
    case "SUPPLY_OWNER_NOT_FOUND":
      return translateErrorDetail({ code: row.code, message: "" }, fallback);
    default:
      return fallback;
  }
}

/** What the import did, in one sentence: shown as the result's note and announced. */
export function supplyImportSummaryOf({ created, failed }: ImportSuppliesResponse): string {
  const outcome =
    created === 0
      ? "No se ha creado ningún punto de suministro."
      : `Se ${pluralize(created, "ha", "han")} creado ${created} ${pluralize(created, "punto", "puntos")} de suministro.`;
  return failed > 0 ? `${outcome} ${failed} ${pluralize(failed, "fila tiene", "filas tienen")} errores.` : outcome;
}
