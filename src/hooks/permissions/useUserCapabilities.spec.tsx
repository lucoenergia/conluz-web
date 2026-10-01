import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildUser, buildUserCapabilities } from "../../test/fixtures";
import type { UserCapabilitiesResponse } from "../../api/models";

vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetUserById: vi.fn(),
}));

import { useGetUserById, type getUserById } from "../../api/users/users";
import { useUserCapabilities } from "./useUserCapabilities";

const USER_ID = "user-1";

function httpError(status: number) {
  return new AxiosError("failed", undefined, undefined, undefined, {
    status,
    statusText: "",
    data: undefined,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

function renderWith(
  capability: keyof UserCapabilitiesResponse = "canEdit",
  options: { enabled?: boolean; userId?: string | undefined } = {},
) {
  const { enabled = true } = options;
  // Not a destructuring default: `{ userId: undefined }` would fall back to it,
  // and the point of that case is to pass no user id at all.
  const userId = "userId" in options ? options.userId : USER_ID;
  return renderHookWithProviders(() => useUserCapabilities(userId, capability, { enabled }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useUserCapabilities", () => {
  it("allows when the capability is true", () => {
    vi.mocked(useGetUserById).mockReturnValue(
      query.success<typeof getUserById>(
        buildUser({ capabilities: buildUserCapabilities({ canEdit: true }) }),
      ),
    );
    expect(renderWith().result.current).toEqual({ state: "allowed" });
  });

  it("denies when the capability is false", () => {
    vi.mocked(useGetUserById).mockReturnValue(
      query.success<typeof getUserById>(
        buildUser({ capabilities: buildUserCapabilities({ canEdit: false }) }),
      ),
    );
    expect(renderWith().result.current).toEqual({ state: "denied" });
  });

  it("is pending while the user is being fetched", () => {
    vi.mocked(useGetUserById).mockReturnValue(query.loading());
    expect(renderWith().result.current).toEqual({ state: "pending" });
  });

  // The API hides accounts the caller may not see rather than admitting they
  // exist, so both statuses mean the same thing: no.
  it.each([403, 404])("denies on %i, which is the backend saying no", (status) => {
    vi.mocked(useGetUserById).mockReturnValue(query.error(httpError(status)));
    expect(renderWith().result.current).toEqual({ state: "denied" });
  });

  it("reports an error, not a denial, when the user fails to load", () => {
    vi.mocked(useGetUserById).mockReturnValue(query.error(httpError(500)));
    expect(renderWith().result.current).toMatchObject({ state: "error" });
  });

  it("offers a retry that refetches", () => {
    const state = query.error(httpError(500));
    vi.mocked(useGetUserById).mockReturnValue(state);

    const outcome = renderWith().result.current;
    if (outcome.state !== "error") throw new Error(`expected an error outcome, got ${outcome.state}`);

    outcome.retry();
    expect(state.refetch).toHaveBeenCalledOnce();
  });

  // A route guard resolves every scope on every render to keep the hook order
  // stable, so this runs on routes that have no user. It must not fire a
  // request for one -- an empty id with the query disabled is how that is said.
  it("denies and fetches nothing when disabled", () => {
    vi.mocked(useGetUserById).mockReturnValue(query.disabled());
    expect(renderWith("canEdit", { enabled: false }).result.current).toEqual({ state: "denied" });
    expect(vi.mocked(useGetUserById)).toHaveBeenCalledWith("", { query: { enabled: false } });
  });

  it("denies and fetches nothing when there is no user id", () => {
    vi.mocked(useGetUserById).mockReturnValue(query.disabled());
    expect(renderWith("canEdit", { userId: undefined }).result.current).toEqual({ state: "denied" });
    expect(vi.mocked(useGetUserById)).toHaveBeenCalledWith("", { query: { enabled: false } });
  });

  it("reads the capability it was asked for, not another one", () => {
    vi.mocked(useGetUserById).mockReturnValue(
      query.success<typeof getUserById>(
        buildUser({ capabilities: buildUserCapabilities({ canEdit: true, canDelete: false }) }),
      ),
    );
    expect(renderWith("canDelete").result.current).toEqual({ state: "denied" });
  });
});
