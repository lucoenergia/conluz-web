import { positiveCount } from "../../errors/apiErrorCatalogue";
import { triggerBrowserDownload } from "../../utils/triggerBrowserDownload";

/**
 * One column of a CSV import, as its guide lists it. The header is the
 * parser's name for the column, so it is shown as it is, in English and with
 * its case; the rest is for the guide and the row reasons.
 */
export interface CsvImportColumn {
  header: string;
  /** How the guide and the row reasons name the column. */
  label: string;
  meaning: string;
  required: boolean;
  example: string;
}

/**
 * A template: the header line alone, so that no example row is ever imported
 * by a file sent without removing it. The byte order mark makes Excel open it
 * as UTF-8, so accented text typed into it survives.
 */
export function csvTemplate(columns: readonly CsvImportColumn[]): string {
  return `\uFEFF${columns.map((column) => column.header).join(";")}\r\n`;
}

export function downloadCsvTemplate(fileName: string, columns: readonly CsvImportColumn[]): void {
  triggerBrowserDownload(new Blob([csvTemplate(columns)], { type: "text/csv;charset=utf-8" }), fileName);
}

/** How a row reason names a column: by its label, or by its header when the guide does not list it. */
export function columnLabel(columns: readonly CsvImportColumn[], header: string): string {
  return columns.find((column) => column.header === header)?.label ?? header;
}

/**
 * A row's value longer than its column takes (FIELD_TOO_LONG, #411), worded
 * the same by every import: the column, the limit and the length from
 * `params`. Without readable params, the column and that the text is too long.
 */
export function fieldTooLongText(label: string, params: Record<string, string> | null | undefined): string {
  const raw = params as Record<string, unknown> | null | undefined;
  const maxLength = positiveCount(raw?.maxLength);
  const length = positiveCount(raw?.n);
  if (maxLength === undefined || length === undefined) return `${label}: el texto es demasiado largo.`;
  return `${label}: puede tener como máximo ${maxLength} caracteres; tiene ${length}.`;
}
