import { afterEach, describe, expect, it, vi } from "vitest";
import { todayInAppTimeZone } from "./zonedTime";

describe("todayInAppTimeZone", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is Madrid's day, already the next one at 23:30 UTC", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-16T23:30:00Z"));

    expect(todayInAppTimeZone()).toBe("2026-11-17");
  });

  it("is still the same day at 22:30 UTC in summer, when Madrid is two hours ahead", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-01T21:30:00Z"));

    expect(todayInAppTimeZone()).toBe("2026-08-01");
  });
});
