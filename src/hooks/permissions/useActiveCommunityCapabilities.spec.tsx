import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { buildCommunity, buildCommunityCapabilities } from "../../test/fixtures";
import { query } from "../../test/queryState";
import type { CommunityCapabilitiesResponse } from "../../api/models";

vi.mock(import("../../api/communities/communities"), () => ({
  useGetCommunityById: vi.fn(),
}));

import { getCommunityById, useGetCommunityById } from "../../api/communities/communities";
import { useActiveCommunityCapabilities } from "./useActiveCommunityCapabilities";

const COMMUNITY_ID = "community-A";

/** An axios error carrying a status, the shape the denial check reads. */
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
  options: { activeCommunityId?: string | null } = {},
  capability: keyof CommunityCapabilitiesResponse = "canManage",
) {
  return renderHookWithProviders(() => useActiveCommunityCapabilities(capability), {
    activeCommunityId: COMMUNITY_ID,
    ...options,
  });
}

function respondWith(capabilities: Partial<CommunityCapabilitiesResponse>) {
  vi.mocked(useGetCommunityById).mockReturnValue(
    query.success<typeof getCommunityById>(
      buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities(capabilities) }),
    ),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useActiveCommunityCapabilities", () => {
  it("allows when the capability is true", () => {
    respondWith({ canManage: true });
    expect(renderWith().result.current).toEqual({ state: "allowed" });
  });

  it("denies when the capability is false", () => {
    respondWith({ canManage: false });
    expect(renderWith().result.current).toEqual({ state: "denied" });
  });

  it("denies when the capability is absent from the payload", () => {
    vi.mocked(useGetCommunityById).mockReturnValue(
      query.success<typeof getCommunityById>(
        buildCommunity({ id: COMMUNITY_ID, capabilities: {} as CommunityCapabilitiesResponse }),
      ),
    );
    expect(renderWith().result.current).toEqual({ state: "denied" });
  });

  it("is pending while the community is being fetched", () => {
    vi.mocked(useGetCommunityById).mockReturnValue(query.loading());
    expect(renderWith().result.current).toEqual({ state: "pending" });
  });

  // The distinction the whole module turns on: no community selected is an
  // answer, so it denies rather than waiting for one that is never coming.
  it("denies once the selection is settled and there is no community", () => {
    vi.mocked(useGetCommunityById).mockReturnValue(query.disabled());
    expect(renderWith({ activeCommunityId: null }).result.current).toEqual({ state: "denied" });
  });

  // A 403 or a 404 is the backend saying no -- 404 included, because the API
  // hides what the caller may not see rather than admitting it exists.
  it.each([403, 404])("denies on %i", (status) => {
    vi.mocked(useGetCommunityById).mockReturnValue(query.error(httpError(status)));
    expect(renderWith().result.current).toEqual({ state: "denied" });
  });

  // The case that must never redirect: the question went unanswered.
  it.each([500, 502, 0])("reports an error, not a denial, on %i", (status) => {
    vi.mocked(useGetCommunityById).mockReturnValue(query.error(httpError(status)));
    expect(renderWith().result.current).toMatchObject({ state: "error" });
  });

  it("offers a retry that refetches", () => {
    const failed = query.error(httpError(500));
    vi.mocked(useGetCommunityById).mockReturnValue(failed);

    const outcome = renderWith().result.current;
    if (outcome.state !== "error") throw new Error(`expected an error outcome, got ${outcome.state}`);

    outcome.retry();
    expect(failed.refetch).toHaveBeenCalledOnce();
  });

  it("reads the capability it was asked for, not another one", () => {
    respondWith({ canManage: true, canManageMemberships: false });
    expect(renderWith({}, "canManageMemberships").result.current).toEqual({ state: "denied" });
  });
});
