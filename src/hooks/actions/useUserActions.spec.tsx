import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getGetAllUsersQueryKey,
  getGetCurrentUserQueryKey,
  getGetUserByIdQueryKey,
  useDeleteUser,
  useDisableUser,
  useEnableUser,
  useGrantPlatformAdmin,
  useRevokePlatformAdmin,
  useUpdateUser,
} from "../../api/users/users";
import { buildUser, buildUserCapabilities } from "../../test/fixtures";
import { mutation } from "../../test/queryState";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { useUserActions } from "./useUserActions";

/** A complete body: a partial would hide a field the screen must supply. */
const UPDATE_USER_BODY = {
  number: 90001,
  personalId: "TEST-PERSONAL-ID",
  fullName: "TEST-FULL-NAME",
  email: "test@example.invalid",
};

vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useUpdateUser: vi.fn(),
  useDeleteUser: vi.fn(),
  useEnableUser: vi.fn(),
  useDisableUser: vi.fn(),
  useGrantPlatformAdmin: vi.fn(),
  useRevokePlatformAdmin: vi.fn(),
}));

const USER_ID = "TEST-USER-ID";

const userWith = (capabilities: Parameters<typeof buildUserCapabilities>[0]) =>
  buildUser({ id: USER_ID, capabilities: buildUserCapabilities(capabilities) });

const render = (user: ReturnType<typeof buildUser> | undefined) =>
  renderHookWithProviders(() => useUserActions().forUser(user));

let mutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mutateAsync = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useUpdateUser).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useDeleteUser).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useEnableUser).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useDisableUser).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useGrantPlatformAdmin).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useRevokePlatformAdmin).mockReturnValue(mutation.idle({ mutateAsync }));
});

describe("useUserActions", () => {
  it("withholds every action when the user account permits none", () => {
    const { result } = render(userWith({}));

    for (const action of Object.values(result.current.actions)) expect(action).toBeUndefined();
    expect(result.current.outcomes.remove).toEqual({ state: "denied" });
  });

  it("withholds every action and reports pending while the account has not arrived", () => {
    const { result } = render(undefined);

    expect(result.current.actions.edit).toBeUndefined();
    expect(result.current.outcomes.edit).toEqual({ state: "pending" });
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  // The one resource with a flag per action and no umbrella: nothing here is
  // approximated, so a grant must never spill from one action to another.
  it("hands back exactly the actions the account's own flags permit", () => {
    const { result } = render(userWith({ canEnable: true, canGrantPlatformAdmin: true }));

    expect(result.current.actions.enable).toBeDefined();
    expect(result.current.actions.grantPlatformAdmin).toBeDefined();
    expect(result.current.actions.disable).toBeUndefined();
    expect(result.current.actions.revokePlatformAdmin).toBeUndefined();
    expect(result.current.actions.edit).toBeUndefined();
    expect(result.current.actions.remove).toBeUndefined();
  });

  it("calls the mutation with the account id and body the screen supplies", async () => {
    const { result } = render(userWith({ canEdit: true }));

    await expect(result.current.actions.edit?.run(UPDATE_USER_BODY)).resolves.toBe(true);
    expect(mutateAsync).toHaveBeenCalledWith({ userId: USER_ID, data: UPDATE_USER_BODY });
  });

  it("invalidates the account and the user list", async () => {
    const { result, queryClient } = render(userWith({ canDisable: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await result.current.actions.disable?.run();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetUserByIdQueryKey(USER_ID) });
    // No params, so the key is a prefix and every page and search variant matches.
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllUsersQueryKey() });
  });

  it("removes a deleted account from the cache rather than refetching a 404", async () => {
    const { result, queryClient } = render(userWith({ canDelete: true }));
    const removeQueries = vi.spyOn(queryClient, "removeQueries");
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await result.current.actions.remove?.run();

    expect(removeQueries).toHaveBeenCalledWith({ queryKey: getGetUserByIdQueryKey(USER_ID) });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: getGetUserByIdQueryKey(USER_ID) });
  });

  /**
   * The current user is deliberately NOT invalidated here, and this is the test
   * that says so, because "it used to be" is otherwise the only record.
   *
   * A platform-admin change can never be aimed at the caller: revoke is gated
   * on `!@communityAccessGuard.isCurrentUser(#userId)`, and
   * `canRevokePlatformAdmin` is documented false for one's own record. So the
   * caller's own platform capabilities cannot change through this action, and
   * invalidating the key that carries them refreshed nothing (#203, ADR-0004).
   * The row and the list are what this change does affect.
   */
  it("refreshes the target row and the list after a platform-admin change, and not the caller", async () => {
    const { result, queryClient } = render(
      userWith({ canGrantPlatformAdmin: true, canRevokePlatformAdmin: true }),
    );
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await result.current.actions.grantPlatformAdmin?.run();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetUserByIdQueryKey(USER_ID) });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllUsersQueryKey() });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: getGetCurrentUserQueryKey() });

    invalidateQueries.mockClear();
    await result.current.actions.revokePlatformAdmin?.run();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetUserByIdQueryKey(USER_ID) });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: getGetCurrentUserQueryKey() });
  });

  it("invalidates nothing when the platform-admin change fails", async () => {
    mutateAsync.mockRejectedValue(new Error("boom"));
    const { result, queryClient } = render(userWith({ canGrantPlatformAdmin: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.actions.grantPlatformAdmin?.run()).resolves.toBe(false);
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("carries each mutation's own pending flag", () => {
    vi.mocked(useDisableUser).mockReturnValue(
      mutation.pending({ userId: USER_ID }, { mutateAsync }),
    );
    const { result } = render(userWith({ canDisable: true, canEnable: true }));

    expect(result.current.actions.disable?.isPending).toBe(true);
    expect(result.current.actions.enable?.isPending).toBe(false);
  });
});
