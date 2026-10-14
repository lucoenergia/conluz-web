import { expect } from "vitest";

/** The device time zone the `app-time-zone` Vitest project runs in (see vite.config.ts). */
export const DEVICE_TIME_ZONE = "America/New_York";

/**
 * Fails unless the spec really runs in DEVICE_TIME_ZONE. Without it, a spec
 * proving that labels ignore the device's zone would pass vacuously on a
 * machine already in Europe/Madrid, or if the project's env stopped applying.
 */
export function expectDeviceTimeZone(): void {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(DEVICE_TIME_ZONE);
}
