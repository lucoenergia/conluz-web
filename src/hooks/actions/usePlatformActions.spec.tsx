import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import {
  getGetAllCommunitiesQueryKey,
  useCreateCommunity,
} from "../../api/communities/communities";
import { getGetAllUsersQueryKey, useCreateUser } from "../../api/users/users";
import { useLoggedUserDispatch } from "../../context/logged-user.context";
import { buildCurrentUser, buildPlatformCapabilities } from "../../test/fixtures";
import { mutation } from "../../test/queryState";
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
}));

/**
 * The logged-in user lives in React state, not the query cache, so this renders
 * the real provider and dispatches into it -- the idiom usePlatformCapabilities'
 * own spec established. Passing `undefined` leaves the provider empty, which is
 * how "the answer has not arrived yet" is expressed here.
 */
function renderWith(platformCapabilities: PlatformCapabilitiesResponse | undefined) {
  const view = renderHookWithProviders(() => ({
    ...usePlatformActions(),
    setLoggedUser: useLoggedUserDispatch(),
  }));

  if (platformCapabilities !== undefined) {
    act(() => {
      view.result.current.setLoggedUser(buildCurrentUser({ platformCapabilities }));
    });
  }
  return view;
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
