/**
 * How long a dry run of a dates write waits after the last change of a date it
 * depends on: a closing date edited on the preview, or the activation dialog's
 * date. Typing a date passes through valid days on its way ("0202" before
 * "2026"); only the day the field rests on is asked about.
 */
export const DRY_RUN_DELAY_MS = 500;
