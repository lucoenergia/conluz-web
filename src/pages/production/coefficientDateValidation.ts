import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

/**
 * Whether a coefficient date field holds a usable value: present, a valid
 * date, not in the future, and free of any picker-reported error. The
 * `dateValidationError` check exists because typed text can momentarily
 * satisfy `isValid()`/`isAfter()` while MUI's own `onError` still flags it —
 * `maxDate` alone isn't trusted to catch everything a user can type.
 */
export function isCoefficientDateValid(date: Dayjs | null, dateValidationError: string | null): boolean {
  return date !== null && date.isValid() && !date.isAfter(dayjs(), "day") && dateValidationError === null;
}

/**
 * The visible reason a confirm/apply control stays disabled, or null once
 * the date is valid and nothing is pending. `pendingReason` is the caller's
 * own in-flight copy ("Guardando…", "Aplicando la fecha…", …) — everything
 * else about the rule is shared and must not drift between the batch bar and
 * the row-level date dialogs.
 */
export function getCoefficientDateDisabledReason(
  date: Dayjs | null,
  dateValidationError: string | null,
  isPending: boolean,
  pendingReason: string,
): string | null {
  if (!date) return "Selecciona una fecha";
  if (!isCoefficientDateValid(date, dateValidationError)) return "La fecha no puede ser futura ni inválida";
  if (isPending) return pendingReason;
  return null;
}
