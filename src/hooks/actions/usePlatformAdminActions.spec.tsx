import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getGetCurrentUserQueryKey,
  getGetPlatformAdminsQueryKey,
  useRevokePlatformAdmin,
} from "../../api/users/users";
import { buildPlatformAdmin, buildPlatformAdminCapabilities } from "../../test/fixtures";
import { mutation } from "../../test/queryState";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { usePlatformAdminActions } from "./usePlatformAdminActions";

vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useRevokePlatformAdmin: vi.fn(),
}));

const USER_ID = "TEST-USER-ID";

const adminWith = (canRevoke: boolean, revocable = true) =>
  buildPlatformAdmin({
    user: { id: USER_ID },
    revocable,
    capabilities: buildPlatformAdminCapabilities({ canRevoke }),
  });

const refusal = (status: number, code?: string) => ({
  response: { status, data: { status, message: "refused", errors: code ? [{ message: "refused", code }] : [] } },
});

let mutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mutateAsync = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useRevokePlatformAdmin).mockReturnValue(mutation.idle({ mutateAsync }));
});

const render = () => renderHookWithProviders(() => usePlatformAdminActions());

describe("usePlatformAdminActions", () => {
  it("withholds the revoke when the row's canRevoke is false", () => {
    const { result } = render();
    const { actions, outcomes } = result.current.forPlatformAdmin(adminWith(false));

    expect(actions.revoke).toBeUndefined();
    expect(outcomes.revoke).toEqual({ state: "denied" });
  });

  it("reports pending, not denied, before there is a row", () => {
    const { result } = render();

    expect(result.current.forPlatformAdmin(undefined).outcomes.revoke).toEqual({ state: "pending" });
  });

  // `revocable` is the row's state, which the screen reads: the capability
  // alone decides whether the action is handed over.
  it("hands the revoke over on canRevoke, whether or not the row is revocable now", () => {
    const { result } = render();

    expect(result.current.forPlatformAdmin(adminWith(true, true)).actions.revoke).toBeDefined();
    expect(result.current.forPlatformAdmin(adminWith(true, false)).actions.revoke).toBeDefined();
  });

  it("revokes the row's user and refetches the list, and only the list", async () => {
    const { result, queryClient } = render();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.forPlatformAdmin(adminWith(true)).actions.revoke?.run()).resolves.toEqual({
      ok: true,
    });

    expect(mutateAsync).toHaveBeenCalledWith({ userId: USER_ID });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetPlatformAdminsQueryKey() });
    // Nobody revokes their own role, so the caller's capabilities never change here.
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: getGetCurrentUserQueryKey() });
  });

  it.each([
    ["USER_LAST_PLATFORM_ADMIN", refusal(409, "USER_LAST_PLATFORM_ADMIN")],
    ["USER_NOT_PLATFORM_ADMIN", refusal(409, "USER_NOT_PLATFORM_ADMIN")],
    ["a 404", refusal(404)],
  ])("hands back %s and refetches the stale list", async (_, error) => {
    mutateAsync.mockRejectedValue(error);
    const { result, queryClient } = render();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.forPlatformAdmin(adminWith(true)).actions.revoke?.run()).resolves.toEqual({ error });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetPlatformAdminsQueryKey() });
  });

  it("hands back any other failure and leaves the cache alone", async () => {
    const error = refusal(500);
    mutateAsync.mockRejectedValue(error);
    const { result, queryClient } = render();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.forPlatformAdmin(adminWith(true)).actions.revoke?.run()).resolves.toEqual({ error });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
