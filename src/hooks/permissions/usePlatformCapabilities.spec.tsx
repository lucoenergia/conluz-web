import { describe, expect, it } from "vitest";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { buildCurrentUser, buildPlatformCapabilities } from "../../test/fixtures";
import { useLoggedUserDispatch } from "../../context/logged-user.context";
import { usePlatformCapabilities } from "./usePlatformCapabilities";
import type { PlatformCapabilitiesResponse } from "../../api/models";
import { act } from "@testing-library/react";

/**
 * The logged-in user lives in React state, not the query cache, so these render
 * the real provider and dispatch into it rather than mocking a query.
 */
function renderWith(
  platformCapabilities: PlatformCapabilitiesResponse | undefined,
  capability: keyof PlatformCapabilitiesResponse = "canListUsers",
) {
  const view = renderHookWithProviders(() => ({
    outcome: usePlatformCapabilities(capability),
    setLoggedUser: useLoggedUserDispatch(),
  }));

  if (platformCapabilities !== undefined) {
    act(() => {
      view.result.current.setLoggedUser(buildCurrentUser({ platformCapabilities }));
    });
  }
  return view;
}

describe("usePlatformCapabilities", () => {
  it("allows when the capability is true", () => {
    const { result } = renderWith(buildPlatformCapabilities({ canListUsers: true }));
    expect(result.current.outcome).toEqual({ state: "allowed" });
  });

  it("denies when the capability is false", () => {
    const { result } = renderWith(buildPlatformCapabilities({ canListUsers: false }));
    expect(result.current.outcome).toEqual({ state: "denied" });
  });

  // An older backend, or a field renamed underneath us: unknown is not a grant.
  it("denies when the capability is absent from the payload", () => {
    const { result } = renderWith({} as PlatformCapabilitiesResponse);
    expect(result.current.outcome).toEqual({ state: "denied" });
  });

  it("is pending until the current user has been fetched", () => {
    const { result } = renderWith(undefined);
    expect(result.current.outcome).toEqual({ state: "pending" });
  });

  it("reads the capability it was asked for, not another one", () => {
    const { result } = renderWith(
      buildPlatformCapabilities({ canListUsers: true, canAdministerPlatform: false }),
      "canAdministerPlatform",
    );
    expect(result.current.outcome).toEqual({ state: "denied" });
  });
});
