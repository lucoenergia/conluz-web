import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { buildCurrentUser, buildPlatformCapabilities } from "../../test/fixtures";
import { query } from "../../test/queryState";
import { useGetCurrentUser, type getCurrentUser } from "../../api/users/users";
import { usePlatformCapabilities } from "./usePlatformCapabilities";
import type { PlatformCapabilitiesResponse } from "../../api/models";

/**
 * The logged-in user is the GET /users/current query (#203), so these name the
 * state the hook reads -- a resolved response, or a query that has not answered
 * -- instead of dispatching a value into a provider that held it in state.
 */
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCurrentUser: vi.fn(),
}));

function renderWith(
  platformCapabilities: PlatformCapabilitiesResponse | undefined,
  capability: keyof PlatformCapabilitiesResponse = "canListUsers",
) {
  vi.mocked(useGetCurrentUser).mockReturnValue(
    platformCapabilities === undefined
      ? query.disabled()
      : query.success<typeof getCurrentUser>(buildCurrentUser({ platformCapabilities })),
  );
  return renderHookWithProviders(() => usePlatformCapabilities(capability));
}

describe("usePlatformCapabilities", () => {
  beforeEach(() => {
    vi.mocked(useGetCurrentUser).mockReset();
  });

  it("allows when the capability is true", () => {
    const { result } = renderWith(buildPlatformCapabilities({ canListUsers: true }));
    expect(result.current).toEqual({ state: "allowed" });
  });

  it("denies when the capability is false", () => {
    const { result } = renderWith(buildPlatformCapabilities({ canListUsers: false }));
    expect(result.current).toEqual({ state: "denied" });
  });

  // An older backend, or a field renamed underneath us: unknown is not a grant.
  it("denies when the capability is absent from the payload", () => {
    const { result } = renderWith({} as PlatformCapabilitiesResponse);
    expect(result.current).toEqual({ state: "denied" });
  });

  it("is pending until the current user has been fetched", () => {
    const { result } = renderWith(undefined);
    expect(result.current).toEqual({ state: "pending" });
  });

  it("reads the capability it was asked for, not another one", () => {
    const { result } = renderWith(
      buildPlatformCapabilities({ canListUsers: true, canAdministerPlatform: false }),
      "canAdministerPlatform",
    );
    expect(result.current).toEqual({ state: "denied" });
  });
});
