import { expect } from "vitest";

/** The device time zone the `app-time-zone` Vitest project runs in (see vite.config.ts). */
export const DEVICE_TIME_ZONE = "America/New_York";

/** The device time zone the `app-time-zone-east` Vitest project runs in (see vite.config.ts). */
export const EAST_DEVICE_TIME_ZONE = "Pacific/Kiritimati";

/**
 * Fails unless the spec really runs in DEVICE_TIME_ZONE. Without it, a spec
 * proving that labels ignore the device's zone would pass vacuously on a
 * machine already in Europe/Madrid, or if the project's env stopped applying.
 */
export function expectDeviceTimeZone(): void {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(DEVICE_TIME_ZONE);
}

/** The same guard for a `*.tz-east.spec` file: fails unless it really runs in EAST_DEVICE_TIME_ZONE. */
export function expectEastDeviceTimeZone(): void {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(EAST_DEVICE_TIME_ZONE);
}
