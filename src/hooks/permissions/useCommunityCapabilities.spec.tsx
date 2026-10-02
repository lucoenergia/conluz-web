import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildCommunity, buildCommunityCapabilities } from "../../test/fixtures";
import type { CommunityCapabilitiesResponse } from "../../api/models";

vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));

import { useGetCommunityById, type getCommunityById } from "../../api/communities/communities";
import { useCommunityCapabilities } from "./useCommunityCapabilities";

const COMMUNITY_ID = "community-B";

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
  capability: keyof CommunityCapabilitiesResponse = "canUpdate",
  options: { enabled?: boolean; communityId?: string | undefined } = {},
) {
  const { enabled = true } = options;
  // Not a destructuring default: `{ communityId: undefined }` would fall back
  // to it, and the point of that case is to pass no community id at all.
  const communityId = "communityId" in options ? options.communityId : COMMUNITY_ID;
  return renderHookWithProviders(() => useCommunityCapabilities(communityId, capability, { enabled }), {
    // A different community is active on purpose: this hook answers about the
    // one it was named, and must not fall back to the active one.
    activeCommunityId: "community-A",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useCommunityCapabilities", () => {
  it("allows when the capability is true", () => {
    vi.mocked(useGetCommunityById).mockReturnValue(
      query.success<typeof getCommunityById>(
        buildCommunity({ capabilities: buildCommunityCapabilities({ canUpdate: true }) }),
      ),
    );
    expect(renderWith().result.current).toEqual({ state: "allowed" });
  });

  it("denies when the capability is false", () => {
    vi.mocked(useGetCommunityById).mockReturnValue(
      query.success<typeof getCommunityById>(
        buildCommunity({ capabilities: buildCommunityCapabilities({ canUpdate: false }) }),
      ),
    );
    expect(renderWith().result.current).toEqual({ state: "denied" });
  });

  it("is pending while the community is being fetched", () => {
    vi.mocked(useGetCommunityById).mockReturnValue(query.loading());
    expect(renderWith().result.current).toEqual({ state: "pending" });
  });

  // The API hides communities the caller may not see rather than admitting they
  // exist, so both statuses mean the same thing: no.
  it.each([403, 404])("denies on %i, which is the backend saying no", (status) => {
    vi.mocked(useGetCommunityById).mockReturnValue(query.error(httpError(status)));
    expect(renderWith().result.current).toEqual({ state: "denied" });
  });

  it("reports an error, not a denial, when the community fails to load", () => {
    vi.mocked(useGetCommunityById).mockReturnValue(query.error(httpError(500)));
    expect(renderWith().result.current).toMatchObject({ state: "error" });
  });

  it("offers a retry that refetches", () => {
    const state = query.error(httpError(500));
    vi.mocked(useGetCommunityById).mockReturnValue(state);

    const outcome = renderWith().result.current;
    if (outcome.state !== "error") throw new Error(`expected an error outcome, got ${outcome.state}`);

    outcome.retry();
    expect(state.refetch).toHaveBeenCalledOnce();
  });

  // The whole reason this is not useActiveCommunityCapabilities: a platform
  // admin administering a community is not a member of it, so the active
  // community would answer about the wrong resource, or about none.
  it("asks about the community it was named, not the active one", () => {
    vi.mocked(useGetCommunityById).mockReturnValue(query.loading());
    renderWith();
    expect(vi.mocked(useGetCommunityById)).toHaveBeenCalledWith(COMMUNITY_ID, {
      query: { enabled: true },
    });
  });

  // A route guard resolves every scope on every render to keep the hook order
  // stable, so this runs on routes that name no community.
  it("denies and fetches nothing when disabled", () => {
    vi.mocked(useGetCommunityById).mockReturnValue(query.disabled());
    expect(renderWith("canUpdate", { enabled: false }).result.current).toEqual({ state: "denied" });
    expect(vi.mocked(useGetCommunityById)).toHaveBeenCalledWith("", { query: { enabled: false } });
  });

  it("denies and fetches nothing when there is no community id", () => {
    vi.mocked(useGetCommunityById).mockReturnValue(query.disabled());
    expect(renderWith("canUpdate", { communityId: undefined }).result.current).toEqual({
      state: "denied",
    });
    expect(vi.mocked(useGetCommunityById)).toHaveBeenCalledWith("", { query: { enabled: false } });
  });

  it("reads the capability it was asked for, not another one", () => {
    vi.mocked(useGetCommunityById).mockReturnValue(
      query.success<typeof getCommunityById>(
        buildCommunity({
          capabilities: buildCommunityCapabilities({ canUpdate: true, canManageMemberships: false }),
        }),
      ),
    );
    expect(renderWith("canManageMemberships").result.current).toEqual({ state: "denied" });
  });
});
