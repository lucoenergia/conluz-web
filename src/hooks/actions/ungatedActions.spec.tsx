import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLogin, useLogout } from "../../api/authentication/authentication";
import { getGetCurrentUserQueryKey, useChangePassword, useUpdateProfile } from "../../api/users/users";
import { mutation } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { useProfileActions } from "./useProfileActions";
import { useSessionActions } from "./useSessionActions";

/** Complete bodies: a cast would hide a field the screen must supply. */
const CREDENTIALS = { username: "TEST-USERNAME", password: "TEST-PASSWORD" };
const PROFILE_BODY = { email: "test@example.invalid" };
const PASSWORD_BODY = { currentPassword: "TEST-CURRENT-PASSWORD", newPassword: "TEST-NEW-PASSWORD-LONG-ENOUGH" };

/**
 * The two hooks with no capability behind them.
 *
 * Their point is that "no gate" is a decision someone made and wrote down, not
 * an omission -- so what is worth asserting is that the action is always
 * present, for a caller with no capabilities at all. The reasons themselves are
 * held to a shape by src/contracts/mutationHooks.spec.ts.
 */

vi.mock(import("../../api/authentication/authentication"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLogin: vi.fn(),
  useLogout: vi.fn(),
}));
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useUpdateProfile: vi.fn(),
  useChangePassword: vi.fn(),
}));

let mutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mutateAsync = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useLogin).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useLogout).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useUpdateProfile).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useChangePassword).mockReturnValue(mutation.idle({ mutateAsync }));
});

describe("useSessionActions", () => {
  it("hands back both actions with no session and no capabilities at all", () => {
    const { result } = renderHookWithProviders(() => useSessionActions(), {
      token: undefined,
      activeCommunityId: null,
    });

    expect(result.current.actions.login).toBeDefined();
    expect(result.current.actions.logout).toBeDefined();
  });

  it("logs in with the credentials the form supplies and returns the token", async () => {
    mutateAsync.mockResolvedValue({ token: "TEST-TOKEN" });
    const { result } = renderHookWithProviders(() => useSessionActions());

    await expect(
      result.current.actions.login.run(CREDENTIALS),
    ).resolves.toEqual({ token: "TEST-TOKEN" });
    expect(mutateAsync).toHaveBeenCalledWith({ data: CREDENTIALS });
  });

  it("reports a rejected login as a failure rather than throwing at the form", async () => {
    mutateAsync.mockRejectedValue(apiError(400));
    const { result } = renderHookWithProviders(() => useSessionActions());

    await expect(result.current.actions.login.run(CREDENTIALS)).resolves.toEqual({
      failure: { kind: "other", error: expect.anything() },
    });
  });

  // #196: a throttled caller must be told to wait, not that they mistyped.
  it("says a login was throttled, and for how long", async () => {
    mutateAsync.mockRejectedValue(
      apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS", params: { retryAfterSeconds: "840" } }),
    );
    const { result } = renderHookWithProviders(() => useSessionActions());

    await expect(result.current.actions.login.run(CREDENTIALS)).resolves.toEqual({
      failure: { kind: "throttled", retryAfterSeconds: 840 },
    });
  });

  it("logs out without arguments", async () => {
    const { result } = renderHookWithProviders(() => useSessionActions());

    await expect(result.current.actions.logout.run()).resolves.toBe(true);
    expect(mutateAsync).toHaveBeenCalledWith();
  });
});

describe("useProfileActions", () => {
  it("hands back the save for a caller with no capabilities, which is the whole point", () => {
    // The screen this is for edits the signed-in user. Gating it on the
    // administrative canEdit would hide the save button from every ordinary
    // member, since that flag is false on their own record.
    const { result } = renderHookWithProviders(() => useProfileActions());

    expect(result.current.actions.save).toBeDefined();
  });

  it("saves through the endpoint that takes no user id", async () => {
    const { result } = renderHookWithProviders(() => useProfileActions());

    await expect(result.current.actions.save.run(PROFILE_BODY)).resolves.toBe(
      true,
    );
    expect(mutateAsync).toHaveBeenCalledWith({ data: PROFILE_BODY });
  });

  it("refreshes the signed-in user, which the header and every platform gate read", async () => {
    const { result, queryClient } = renderHookWithProviders(() => useProfileActions());
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await result.current.actions.save.run(PROFILE_BODY);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetCurrentUserQueryKey() });
  });

  it("reports failure and leaves the cache alone", async () => {
    mutateAsync.mockRejectedValue(new Error("boom"));
    const { result, queryClient } = renderHookWithProviders(() => useProfileActions());
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.actions.save.run(PROFILE_BODY)).resolves.toBe(
      false,
    );
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});

describe("useProfileActions -- changing the password (#196)", () => {
  it("hands back the change for a caller with no capabilities", () => {
    const { result } = renderHookWithProviders(() => useProfileActions());

    expect(result.current.actions.changePassword).toBeDefined();
  });

  it("sends the body as given and touches no cache, since the session is about to end", async () => {
    const { result, queryClient } = renderHookWithProviders(() => useProfileActions());
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.actions.changePassword.run(PASSWORD_BODY)).resolves.toEqual({ ok: true });
    expect(mutateAsync).toHaveBeenCalledWith({ data: PASSWORD_BODY });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("reports why it was refused", async () => {
    mutateAsync.mockRejectedValue(apiError(400, { code: "USER_CURRENT_PASSWORD_INCORRECT" }));
    const { result } = renderHookWithProviders(() => useProfileActions());

    await expect(result.current.actions.changePassword.run(PASSWORD_BODY)).resolves.toEqual({
      ok: false,
      failure: { kind: "currentPasswordIncorrect" },
    });
  });
});
