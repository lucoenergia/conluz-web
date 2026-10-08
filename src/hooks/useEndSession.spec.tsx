import { describe, expect, it } from "vitest";
import { act } from "@testing-library/react";
import { renderHookWithProviders } from "../test/renderWithProviders";
import { hasPasswordReset, markSessionExpired, takeSessionExpired } from "../utils/session";
import { useEndSession } from "./useEndSession";

describe("useEndSession", () => {
  // #233: the login page should say one thing after a reset, not also that a
  // session the reset revoked anyway had expired.
  it("drops a pending expiry notice when a password reset ends the session", () => {
    const { result } = renderHookWithProviders(() => useEndSession());
    markSessionExpired();

    act(() => result.current("passwordReset"));

    expect(takeSessionExpired()).toBe(false);
    expect(hasPasswordReset()).toBe(true);
  });

  it("leaves a pending expiry notice to every other reason", () => {
    const { result } = renderHookWithProviders(() => useEndSession());
    markSessionExpired();

    act(() => result.current("logout"));

    expect(takeSessionExpired()).toBe(true);
    expect(hasPasswordReset()).toBe(false);
  });
});
