import dayjs, { type Dayjs } from "dayjs";
import type { CalendarDay } from "./historicalPeriod";

// The only bridge between the date picker and the period module. The picker
// hands out dayjs values at midnight in the device's time zone; only their
// calendar fields are read, never the instant, so no device offset can reach
// a bound. Built from calendar fields the same way, and read back unchanged
// whatever zone the device is in.

export const toCalendarDay = (value: Dayjs): CalendarDay => ({ year: value.year(), month: value.month() + 1, day: value.date() });

export const toDayjs = ({ year, month, day }: CalendarDay): Dayjs => dayjs(new Date(year, month - 1, day));
