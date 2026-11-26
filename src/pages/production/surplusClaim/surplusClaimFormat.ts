import type {
  PlantSurplusClaimAvailableMonthsResponse,
  PlantSurplusClaimDayResponse,
  PlantSurplusClaimResponse,
} from "../../../api/models";
import { formatLocalDate, formatTimeOfDay } from "../../../utils/formatCalendarDate";
import { formatKilowattHours } from "../../../utils/formatEnergyFigures";
import { formatKilowatts } from "../../../utils/formatKilowatts";
import { formatCoefficientPercentage } from "../sharingAgreementCoefficientSums";

/** A claim month as the contract writes it (`GetPlantSurplusClaimParams.month`): "2026-10". */
export const CLAIM_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const isClaimMonth = (value: string): boolean => CLAIM_MONTH_PATTERN.test(value);

const monthIndex = (month: string) => {
  const [year, monthOfYear] = month.split("-").map(Number);
  return year * 12 + monthOfYear - 1;
};

const monthFromIndex = (index: number) =>
  `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;

/**
 * The months the selector offers, newest first: from the earlier of the
 * plant's first month and the month shown, to the later of the latest
 * published month and the month shown. A missing bound is the month shown, so
 * the month shown is always one of them (UI-SCL-002).
 */
export function claimMonthOptions(
  month: string,
  { firstMonth, latestPublishedMonth }: PlantSurplusClaimAvailableMonthsResponse,
): string[] {
  const shown = monthIndex(month);
  const earliest = Math.min(shown, monthIndex(firstMonth ?? month));
  const latest = Math.max(shown, monthIndex(latestPublishedMonth ?? month));
  const options: string[] = [];
  for (let index = latest; index >= earliest; index--) options.push(monthFromIndex(index));
  return options;
}

/** A month in a sentence: "octubre de 2026". Calendar text, so no time zone moves it. */
export const monthPhrase = (month: string): string =>
  formatLocalDate(`${month}-01`, { day: undefined, month: "long", year: "numeric" });

/** A month as an option of the selector: "Octubre de 2026". */
export const monthLabel = (month: string): string => {
  const phrase = monthPhrase(month);
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
};

const WEEKDAY = new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: "UTC" });

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function dayParts(localDate: string) {
  const match = LOCAL_DATE.exec(localDate);
  if (!match) return null;
  const [, year, month, day] = match;
  return { year, month, day, weekday: WEEKDAY.format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))) };
}

/** A day in a warning: "mié 07/10". */
export function shortDayLabel(localDate: string): string {
  const parts = dayParts(localDate);
  return parts ? `${parts.weekday} ${parts.day}/${parts.month}` : "-";
}

/** A day of the daily table: "lun 01/06/2026". */
export function dayLabel(localDate: string): string {
  const parts = dayParts(localDate);
  return parts ? `${parts.weekday} ${parts.day}/${parts.month}/${parts.year}` : "-";
}

const HOUR_MS = 60 * 60 * 1000;

/** The hour of an instant on Madrid's clock, "00" to "23". */
const clockHour = (instant: number) => formatTimeOfDay(new Date(instant).toISOString()).slice(0, 2);

const twoDigits = (hour: number) => String(hour).padStart(2, "0");

/**
 * The labels of a day's hours, on Madrid's clock whatever the device's zone:
 * "13–14 h". An hour runs to the clock time it ends at, so the hour the
 * clocks go forward reads "01–03 h", and the last one "23–24 h". The hour the
 * clocks go back, lived twice, reads "02–03 h (1.ª)" and "02–03 h (2.ª)": the
 * clock turns back to 02:00 at the end of the first, which still reads as
 * ending at 03.
 */
export function hourLabels(hours: readonly { startsAt: string }[]): string[] {
  const plain = hours.map(({ startsAt }) => {
    const start = Date.parse(startsAt);
    const startHour = Number(clockHour(start));
    const clockEnd = Number(clockHour(start + HOUR_MS)) || 24;
    const endHour = clockEnd > startHour ? clockEnd : startHour + 1;
    return `${twoDigits(startHour)}–${twoDigits(endHour)} h`;
  });
  const seen = new Map<string, number>();
  return plain.map((label) => {
    if (plain.indexOf(label) === plain.lastIndexOf(label)) return label;
    const occurrence = (seen.get(label) ?? 0) + 1;
    seen.set(label, occurrence);
    return `${label} (${occurrence}.ª)`;
  });
}

/** "Cambio de hora: 25 horas" on the days the clocks change, nothing on the others. */
export const clockChangeLabel = (day: PlantSurplusClaimDayResponse): string | null =>
  day.hours.length === 24 ? null : `Cambio de hora: ${day.hours.length} horas`;

/** Where each hour of the month sits, by its instant: its day and its label in that day. */
export interface HourPlace {
  date: string;
  label: string;
}

export function hourPlaces(days: readonly PlantSurplusClaimDayResponse[]): Map<number, HourPlace> {
  const places = new Map<number, HourPlace>();
  for (const day of days) {
    hourLabels(day.hours).forEach((label, index) => places.set(Date.parse(day.hours[index].startsAt), { date: day.date, label }));
  }
  return places;
}

/** The label of an hour of the month, falling back to its own reading when no day lists it. */
export const hourLabelOf = (places: Map<number, HourPlace>, startsAt: string): string =>
  places.get(Date.parse(startsAt))?.label ?? hourLabels([{ startsAt }])[0];

const DAY_MS = 24 * HOUR_MS;

const dayNumber = (localDate: string) => Date.parse(`${localDate}T00:00:00Z`) / DAY_MS;

const dayOfMonth = (localDate: string) => formatLocalDate(localDate, { year: undefined, month: undefined, day: "numeric" });

const dayAndMonth = (localDate: string) => formatLocalDate(localDate, { year: undefined });

const dayCount = (count: number) => (count === 1 ? "1 día" : `${count} días`);

/** Consecutive days as ranges: "Del 1 al 12 de octubre (12 días)", "El 3 de octubre (1 día)". */
export function dayRanges(days: readonly string[]): string[] {
  const sorted = [...days].sort();
  const runs: string[][] = [];
  for (const day of sorted) {
    const run = runs.at(-1);
    if (run && dayNumber(day) - dayNumber(run[run.length - 1]) === 1) run.push(day);
    else runs.push([day]);
  }
  return runs.map((run) => {
    const first = run[0];
    const last = run[run.length - 1];
    if (run.length === 1) return `El ${dayAndMonth(first)} (${dayCount(1)})`;
    const from = first.slice(0, 7) === last.slice(0, 7) ? dayOfMonth(first) : dayAndMonth(first);
    return `Del ${from} al ${dayAndMonth(last)} (${dayCount(run.length)})`;
  });
}

const LIST = new Intl.ListFormat("es", { type: "conjunction" });

/** One warning the month raises: its sentence, and what it lists, each entry as its parts. */
export interface RaisedWarning {
  key: string;
  title: string;
  entries: string[][];
}

const supplyParts = ({ name, code }: { name: string | null; code: string }) => (name ? [name, code] : [code]);

/**
 * The warnings the month raises, in the order they are shown: a list that is
 * not empty, an object that is not null, or no applied coefficients
 * (UI-SCL-005).
 */
export function raisedWarnings(claim: PlantSurplusClaimResponse, nominalPowerKW: number): RaisedWarning[] {
  const { warnings } = claim;
  const raised: RaisedWarning[] = [];

  const withoutData = warnings.suppliesWithoutData;
  if (withoutData.length > 0) {
    raised.push({
      key: "suppliesWithoutData",
      title:
        withoutData.length === 1
          ? "1 punto de suministro no tiene datos este mes. Su excedente no se incluye."
          : `${withoutData.length} puntos de suministro no tienen datos este mes. Su excedente no se incluye.`,
      entries: withoutData.map(({ supply, coefficient }) => [...supplyParts(supply), formatCoefficientPercentage(coefficient)]),
    });
  }

  const withGaps = warnings.suppliesWithGaps;
  if (withGaps.length > 0) {
    raised.push({
      key: "suppliesWithGaps",
      title:
        withGaps.length === 1
          ? "1 punto tiene horas sin datos. Esos días van como estimados (E)."
          : `${withGaps.length} puntos tienen horas sin datos. Esos días van como estimados (E).`,
      entries: withGaps.map(({ supply, days }) => [...supplyParts(supply), LIST.format(days.map(shortDayLabel))]),
    });
  }

  if (warnings.uncoveredShare) {
    raised.push({
      key: "uncoveredShare",
      title: `Hasta un ${formatCoefficientPercentage(warnings.uncoveredShare.largestShare)} del reparto no tiene punto de suministro en Conluz. Ese excedente no se reclama.`,
      entries: dayRanges(warnings.uncoveredShare.days).map((range) => [range]),
    });
  }

  if (warnings.plantSupplyShare !== null) {
    raised.push({
      key: "plantSupplyShare",
      title: `El punto de la planta tiene un ${formatCoefficientPercentage(warnings.plantSupplyShare)} del reparto. Esa parte no se reclama.`,
      entries: [],
    });
  }

  if (warnings.noAppliedCoefficients) {
    raised.push({
      key: "noAppliedCoefficients",
      title: "La planta no tiene coeficientes aplicados en este mes. El fichero saldrá vacío.",
      entries: [],
    });
  }

  if (warnings.hoursAboveNominalPower.length > 0) {
    const places = hourPlaces(claim.days);
    raised.push({
      key: "hoursAboveNominalPower",
      title: `Hay horas con más excedente que la potencia nominal de la planta (${formatKilowatts(nominalPowerKW)}). Puede haber datos duplicados.`,
      entries: warnings.hoursAboveNominalPower.map(({ startsAt, surplusKWh }) => {
        const place = places.get(Date.parse(startsAt));
        return [
          place ? shortDayLabel(place.date) : "-",
          hourLabelOf(places, startsAt),
          formatKilowattHours(surplusKWh),
        ];
      }),
    });
  }

  return raised;
}

/** "Este mes tiene 5 avisos", or "1 aviso". */
export const warningCountText = (count: number): string =>
  `Este mes tiene ${count === 1 ? "1 aviso" : `${count} avisos`}`;
