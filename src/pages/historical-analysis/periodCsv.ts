import type { EstimatedPriceResponse, SupplyResponse } from "../../api/models";
import { supplyDisplayLabel } from "../../utils/supplyDisplayLabel";
import { estimatedPriceText } from "../../components/EnergyFigures/estimatedPriceText";
import type { SlotView } from "./consumptionSeries";
import { formatDayParam, lastDayOf, type Granularity } from "./historicalPeriod";
import { slotStateText } from "./slotStateText";

export const CSV_MIME_TYPE = "text/csv;charset=utf-8";

const BOM = "\uFEFF";
const SEPARATOR = ";";
const LINE_END = "\r\n";

const HEADER = [
  "fecha",
  // The technical terms ride in the column names, after their home terms (UI-HIS-027).
  "de_la_comunidad_autoconsumo_kwh",
  "de_la_red_kwh",
  "se_fue_a_la_red_excedentes_kwh",
  "ahorro_estimado_eur",
  "precio_referencia_eur_kwh",
  "nota_ahorro",
  "datos",
];

/**
 * A number exactly as the API sent it, with a decimal comma: every decimal
 * kept, no thousands separator, never in exponential notation. 12.345 is
 * "12,345", 1e-7 is "0,0000001".
 */
export function csvDecimal(value: number): string {
  const text = String(value);
  const exponential = /^(-?)(\d+)(?:\.(\d+))?e([+-]\d+)$/.exec(text);
  if (!exponential) return text.replace(".", ",");
  const [, sign, whole, fraction = "", exponent] = exponential;
  const digits = whole + fraction;
  const point = whole.length + Number(exponent);
  if (point <= 0) return `${sign}0,${"0".repeat(-point)}${digits}`;
  if (point >= digits.length) return `${sign}${digits}${"0".repeat(point - digits.length)}`;
  return `${sign}${digits.slice(0, point)},${digits.slice(point)}`;
}

/** Quoted when it holds the separator, a quote or a line break, with inner quotes doubled. */
export function csvField(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** A gap's figure is empty, never 0; a measured zero is 0. */
const figure = (value: number | null) => (value === null ? "" : csvDecimal(value));

/**
 * The slot's calendar date: "2026-07-15" for a day, "2026-07" for a month. An
 * hour's local start with its offset, "2026-09-01T14:00+02:00", so the two
 * October 02:00 hours stay apart (#378).
 */
function csvDate(slot: SlotView, granularity: Granularity): string {
  if (slot.hour) return withoutSeconds(slot.hour.startsAt);
  const day = formatDayParam(slot.day);
  return granularity === "daily" ? day : day.slice(0, 7);
}

/** "2026-09-01T14:00:00+02:00" as "2026-09-01T14:00+02:00": an hour starts on the minute. */
const withoutSeconds = (iso: string) => iso.slice(0, 16) + iso.slice(19);

/**
 * The period's data as a CSV for a spreadsheet in Spanish (#251): one line per
 * slot of the evolution charts, in axis order, and no totals line. The values
 * are the buckets' own, unrounded. The estimated price and its note repeat on
 * every line when the energy metrics carry one, and are empty otherwise.
 */
export function periodCsv(slots: SlotView[], granularity: Granularity, estimatedPrice: EstimatedPriceResponse | null): string {
  const price = estimatedPrice ? csvDecimal(estimatedPrice.eurPerKWh) : "";
  const note = estimatedPrice ? estimatedPriceText(estimatedPrice) : "";
  const lines = slots.map((slot) =>
    [
      csvDate(slot, granularity),
      figure(slot.selfConsumptionKWh),
      figure(slot.gridImportKWh),
      figure(slot.surplusKWh),
      figure(slot.savingsEur),
      price,
      note,
      slotStateText(slot.state, granularity).short,
    ]
      .map(csvField)
      .join(SEPARATOR),
  );
  return BOM + [HEADER.join(SEPARATOR), ...lines].map((line) => line + LINE_END).join("");
}

/** Lowercase ASCII: accents removed, every other run of non-alphanumerics a single "-", none at either end. */
export function asciiSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * "conluz-consumo-{punto}-{desde}-{hasta}.csv": `todos` for "Todos mis puntos",
 * otherwise the supply's label as a slug (its CUPS when the label leaves
 * nothing); the first and the last calendar day shown, the last included: the
 * same day twice for an hourly period.
 */
export function periodCsvFileName(selected: SupplyResponse | null, slots: SlotView[], granularity: Granularity): string {
  const scope = selected === null ? "todos" : asciiSlug(supplyDisplayLabel(selected)) || asciiSlug(selected.code);
  const first = slots[0].day;
  const last = slots[slots.length - 1].day;
  const lastDay = granularity === "monthly" ? lastDayOf(last) : last;
  return `conluz-consumo-${scope}-${formatDayParam(first)}-${formatDayParam(lastDay)}.csv`;
}
