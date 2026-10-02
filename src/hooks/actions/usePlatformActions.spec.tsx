import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getGetAllCommunitiesQueryKey,
  useCreateCommunity,
} from "../../api/communities/communities";
import {
  getGetAllUsersQueryKey,
  useCreateUser,
  useGetCurrentUser,
  type getCurrentUser,
} from "../../api/users/users";
import { buildCurrentUser, buildPlatformCapabilities } from "../../test/fixtures";
import { mutation, query } from "../../test/queryState";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { usePlatformActions } from "./usePlatformActions";
import type { PlatformCapabilitiesResponse } from "../../api/models";

/** Complete bodies: a cast would hide a field the screen must supply. */
const CREATE_COMMUNITY_BODY = { name: "TEST-COMMUNITY-NAME", code: "TEST-CODE" };
const CREATE_USER_BODY = {
  personalId: "TEST-PERSONAL-ID",
  number: 90001,
  fullName: "TEST-FULL-NAME",
  email: "test@example.invalid",
  password: "TEST-PASSWORD",
};

vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreateCommunity: vi.fn(),
}));
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreateUser: vi.fn(),
  useGetCurrentUser: vi.fn(),
}));

/**
 * The logged-in user is the GET /users/current query (#203), so this answers
 * that query -- the idiom usePlatformCapabilities' own spec establishes. A
 * query that has not answered is how "the capabilities have not arrived yet" is
 * expressed here, rather than an empty provider.
 */
function renderWith(platformCapabilities: PlatformCapabilitiesResponse | undefined) {
  vi.mocked(useGetCurrentUser).mockReturnValue(
    platformCapabilities === undefined
      ? query.disabled()
      : query.success<typeof getCurrentUser>(buildCurrentUser({ platformCapabilities })),
  );
  return renderHookWithProviders(() => usePlatformActions());
}

let mutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mutateAsync = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useCreateCommunity).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useCreateUser).mockReturnValue(mutation.idle({ mutateAsync }));
});

describe("usePlatformActions", () => {
  it("withholds both actions when the platform permits neither", () => {
    const { result } = renderWith(buildPlatformCapabilities({}));

    expect(result.current.actions.createCommunity).toBeUndefined();
    expect(result.current.actions.createUser).toBeUndefined();
    expect(result.current.outcomes.createCommunity).toEqual({ state: "denied" });
  });

  // No signed-in user yet is not a denial: deciding before the answer arrives is
  // what the four-state model exists to prevent.
  it("withholds both actions and reports pending before the signed-in user has loaded", () => {
    const { result } = renderWith(undefined);

    expect(result.current.actions.createCommunity).toBeUndefined();
    expect(result.current.outcomes.createCommunity).toEqual({ state: "pending" });
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("hands back only the action its own flag permits", () => {
    const { result } = renderWith(buildPlatformCapabilities({ canCreateCommunity: true }));

    expect(result.current.actions.createCommunity).toBeDefined();
    expect(result.current.actions.createUser).toBeUndefined();
  });

  it("creates a community and returns it, refreshing the list it appears in", async () => {
    mutateAsync.mockResolvedValue({ id: "TEST-COMMUNITY-ID" });
    const { result, queryClient } = renderWith(
      buildPlatformCapabilities({ canCreateCommunity: true }),
    );
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(
      result.current.actions.createCommunity?.run(CREATE_COMMUNITY_BODY),
    ).resolves.toEqual({ id: "TEST-COMMUNITY-ID" });

    expect(mutateAsync).toHaveBeenCalledWith({ data: CREATE_COMMUNITY_BODY });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllCommunitiesQueryKey() });
  });

  it("creates a user and refreshes the user list", async () => {
    const { result, queryClient } = renderWith(buildPlatformCapabilities({ canCreateUsers: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await result.current.actions.createUser?.run(CREATE_USER_BODY);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllUsersQueryKey() });
  });

  it("reports failure as undefined and leaves the cache alone", async () => {
    mutateAsync.mockRejectedValue(new Error("boom"));
    const { result, queryClient } = renderWith(
      buildPlatformCapabilities({ canCreateCommunity: true }),
    );
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(
      result.current.actions.createCommunity?.run(CREATE_COMMUNITY_BODY),
    ).resolves.toBeUndefined();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
