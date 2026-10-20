import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getGetCurrentUserQueryKey,
  getGetPlatformAdminsQueryKey,
  useGetCurrentUser,
  useInvitePlatformAdmin,
  useResendPlatformAdminInvitation,
  useRevokePlatformAdmin,
  useRevokePlatformAdminInvitation,
  type getCurrentUser,
} from "../../api/users/users";
import {
  buildCurrentUser,
  buildPlatformAdmin,
  buildPlatformAdminCapabilities,
  buildPlatformAdminInvitation,
  buildPlatformCapabilities,
  buildPlatformCapabilitiesWithout,
} from "../../test/fixtures";
import { mutation, query } from "../../test/queryState";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { usePlatformAdminActions } from "./usePlatformAdminActions";

vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useRevokePlatformAdmin: vi.fn(),
  useInvitePlatformAdmin: vi.fn(),
  useResendPlatformAdminInvitation: vi.fn(),
  useRevokePlatformAdminInvitation: vi.fn(),
  useGetCurrentUser: vi.fn(),
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
let inviteMutateAsync: ReturnType<typeof vi.fn>;
let resendMutateAsync: ReturnType<typeof vi.fn>;
let revokeInvitationMutateAsync: ReturnType<typeof vi.fn>;
let inviteReset: ReturnType<typeof vi.fn>;
let resendReset: ReturnType<typeof vi.fn>;

const CODE = "TEST-CODE";
const INVITE_BODY = { personalId: "TEST-PERSONAL-ID", fullName: "TEST-FULL-NAME", email: "TEST@example.test" };

beforeEach(() => {
  mutateAsync = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useRevokePlatformAdmin).mockReturnValue(mutation.idle({ mutateAsync }));
  inviteMutateAsync = vi.fn().mockResolvedValue({ platformAdmin: buildPlatformAdminInvitation(), confirmationCode: CODE });
  inviteReset = vi.fn();
  vi.mocked(useInvitePlatformAdmin).mockReturnValue({
    ...mutation.idle({ mutateAsync: inviteMutateAsync }),
    reset: inviteReset,
  });
  resendMutateAsync = vi.fn().mockResolvedValue({ platformAdmin: buildPlatformAdminInvitation(), confirmationCode: CODE });
  resendReset = vi.fn();
  vi.mocked(useResendPlatformAdminInvitation).mockReturnValue({
    ...mutation.idle({ mutateAsync: resendMutateAsync }),
    reset: resendReset,
  });
  revokeInvitationMutateAsync = vi.fn().mockResolvedValue(buildPlatformAdminInvitation());
  vi.mocked(useRevokePlatformAdminInvitation).mockReturnValue(
    mutation.idle({ mutateAsync: revokeInvitationMutateAsync }),
  );
  vi.mocked(useGetCurrentUser).mockReturnValue(query.disabled());
});

/** The caller's platform capabilities, answered by GET /users/current as usePlatformActions' spec does. */
const signInWith = (platformCapabilities: ReturnType<typeof buildPlatformCapabilities>) =>
  vi.mocked(useGetCurrentUser).mockReturnValue(
    query.success<typeof getCurrentUser>(buildCurrentUser({ platformCapabilities })),
  );

const invitationWith = (canResendInvitation: boolean, canRevokeInvitation: boolean) =>
  buildPlatformAdminInvitation({
    user: { id: USER_ID },
    capabilities: buildPlatformAdminCapabilities({ canResendInvitation, canRevokeInvitation }),
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

describe("usePlatformAdminActions: invitations (#288)", () => {
  it("AC8 withholds the invite without canInvitePlatformAdmins, and from a backend without the key", () => {
    signInWith(buildPlatformCapabilities({ canListPlatformAdmins: true }));
    expect(render().result.current.invite).toBeUndefined();

    signInWith(buildPlatformCapabilitiesWithout("canInvitePlatformAdmins", { canListPlatformAdmins: true }));
    const { result } = render();
    expect(result.current.invite).toBeUndefined();
    expect(result.current.inviteOutcome).toEqual({ state: "denied" });
  });

  it("reports the invite pending, not denied, before the signed-in user has loaded", () => {
    const { result } = render();

    expect(result.current.invite).toBeUndefined();
    expect(result.current.inviteOutcome).toEqual({ state: "pending" });
  });

  it("AC1 invites with the body as given, hands back the code, refetches the list and forgets the result", async () => {
    signInWith(buildPlatformCapabilities({ canInvitePlatformAdmins: true }));
    const { result, queryClient } = render();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const setQueryData = vi.spyOn(queryClient, "setQueryData");

    await expect(result.current.invite?.run(INVITE_BODY)).resolves.toEqual({ ok: true, confirmationCode: CODE });

    expect(inviteMutateAsync).toHaveBeenCalledWith({ data: INVITE_BODY });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetPlatformAdminsQueryKey() });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: getGetCurrentUserQueryKey() });
    // The row in the response is never written to the cache: only the list's own read fills it.
    expect(setQueryData).not.toHaveBeenCalled();
    expect(inviteReset).toHaveBeenCalled();
    // Kept out of the mutation cache once it settles.
    expect(vi.mocked(useInvitePlatformAdmin)).toHaveBeenCalledWith({ mutation: { gcTime: 0 } });
    expect(vi.mocked(useResendPlatformAdminInvitation)).toHaveBeenCalledWith({ mutation: { gcTime: 0 } });
  });

  it.each([
    ["USER_ALREADY_PLATFORM_ADMIN", refusal(409, "USER_ALREADY_PLATFORM_ADMIN"), true],
    ["PLATFORM_ADMIN_ALREADY_INVITED", refusal(409, "PLATFORM_ADMIN_ALREADY_INVITED"), true],
    ["USER_PERSONAL_ID_INVALID", refusal(400, "USER_PERSONAL_ID_INVALID"), false],
    ["PLATFORM_ADMIN_INVITATION_UNAVAILABLE", refusal(503, "PLATFORM_ADMIN_INVITATION_UNAVAILABLE"), false],
  ])("hands back a refused invite (%s), refetching only a stale list", async (_, error, refetches) => {
    signInWith(buildPlatformCapabilities({ canInvitePlatformAdmins: true }));
    inviteMutateAsync.mockRejectedValue(error);
    const { result, queryClient } = render();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.invite?.run(INVITE_BODY)).resolves.toEqual({ error });
    if (refetches) expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetPlatformAdminsQueryKey() });
    else expect(invalidateQueries).not.toHaveBeenCalled();
    expect(inviteReset).toHaveBeenCalled();
  });

  it("AC8 withholds resend and link revoke without their row capabilities", () => {
    const { result } = render();
    const { actions, outcomes } = result.current.forPlatformAdmin(invitationWith(false, false));

    expect(actions.resendInvitation).toBeUndefined();
    expect(actions.revokeInvitation).toBeUndefined();
    expect(outcomes.resendInvitation).toEqual({ state: "denied" });
    expect(outcomes.revokeInvitation).toEqual({ state: "denied" });
  });

  it("AC8 withholds them from a backend whose rows lack the keys", () => {
    const { canRevoke } = buildPlatformAdminCapabilities({ canRevoke: true });
    // An older backend's row: the generated type says the keys are always there.
    const row = buildPlatformAdminInvitation({
      capabilities: { canRevoke } as ReturnType<typeof buildPlatformAdminCapabilities>,
    });
    const { actions } = render().result.current.forPlatformAdmin(row);

    expect(actions.resendInvitation).toBeUndefined();
    expect(actions.revokeInvitation).toBeUndefined();
  });

  it("AC3 resends the row's invitation, hands back the new code and refetches the list", async () => {
    const { result, queryClient } = render();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.forPlatformAdmin(invitationWith(true, true)).actions.resendInvitation?.run()).resolves.toEqual({
      ok: true,
      confirmationCode: CODE,
    });
    expect(resendMutateAsync).toHaveBeenCalledWith({ userId: USER_ID });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetPlatformAdminsQueryKey() });
    expect(resendReset).toHaveBeenCalled();
  });

  it("AC4 revokes the row's link and refetches the list", async () => {
    const { result, queryClient } = render();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.forPlatformAdmin(invitationWith(true, true)).actions.revokeInvitation?.run()).resolves.toEqual({
      ok: true,
    });
    expect(revokeInvitationMutateAsync).toHaveBeenCalledWith({ userId: USER_ID });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetPlatformAdminsQueryKey() });
  });

  it.each([
    ["resendInvitation", "PLATFORM_ADMIN_NOT_INVITED", refusal(409, "PLATFORM_ADMIN_NOT_INVITED"), true],
    ["resendInvitation", "a 404", refusal(404), true],
    ["resendInvitation", "the resend limit", refusal(429, "PLATFORM_ADMIN_INVITATION_RESEND_LIMIT_REACHED"), false],
    ["revokeInvitation", "PLATFORM_ADMIN_NOT_INVITED", refusal(409, "PLATFORM_ADMIN_NOT_INVITED"), true],
    ["revokeInvitation", "a 404", refusal(404), true],
    ["revokeInvitation", "a 500", refusal(500), false],
  ] as const)("hands back a refused %s (%s), refetching only a stale list", async (action, _, error, refetches) => {
    resendMutateAsync.mockRejectedValue(error);
    revokeInvitationMutateAsync.mockRejectedValue(error);
    const { result, queryClient } = render();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.forPlatformAdmin(invitationWith(true, true)).actions[action]?.run()).resolves.toEqual({
      error,
    });
    if (refetches) expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetPlatformAdminsQueryKey() });
    else expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
