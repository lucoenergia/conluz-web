import { describe, expect, it } from "vitest";
import { apiError } from "../test/apiError";
import { classifyInvitationError } from "./invitationErrors";

describe("classifyInvitationError (#274)", () => {
  it("reads the invitation codes", () => {
    expect(classifyInvitationError(apiError(400, { code: "MEMBERSHIP_INVITATION_TOKEN_INVALID" }))).toEqual({
      kind: "tokenInvalid",
    });
    expect(classifyInvitationError(apiError(409, { code: "MEMBERSHIP_INVITATION_LOGIN_REQUIRED" }))).toEqual({
      kind: "loginRequired",
    });
    expect(classifyInvitationError(apiError(403, { code: "USER_PASSWORD_CHANGE_REQUIRED" }))).toEqual({
      kind: "passwordChangeRequired",
    });
  });

  it("reads a refused password with its rule, or without one", () => {
    expect(
      classifyInvitationError(apiError(400, { code: "USER_PASSWORD_POLICY_VIOLATION", params: { rule: "TOO_SHORT" } })),
    ).toEqual({ kind: "policyViolation", rule: "TOO_SHORT" });
    expect(classifyInvitationError(apiError(400, { code: "USER_PASSWORD_POLICY_VIOLATION" }))).toEqual({
      kind: "policyViolation",
      rule: null,
    });
  });

  it("reads the wait of a throttled request from the header or the body", () => {
    expect(classifyInvitationError(apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS" }, { "retry-after": "840" }))).toEqual({
      kind: "throttled",
      retryAfterSeconds: 840,
    });
    expect(classifyInvitationError(apiError(429, { params: { retryAfterSeconds: "61" } }))).toEqual({
      kind: "throttled",
      retryAfterSeconds: 61,
    });
  });

  it("says a 401 ended the session", () => {
    expect(classifyInvitationError(apiError(401))).toEqual({ kind: "unauthorized" });
  });

  it("leaves anything else to the screen's generic message", () => {
    const error = apiError(500);
    expect(classifyInvitationError(error)).toEqual({ kind: "other", error });
    // A code that means something on another screen means nothing here.
    const resetCode = apiError(400, { code: "USER_PASSWORD_RESET_TOKEN_INVALID" });
    expect(classifyInvitationError(resetCode)).toEqual({ kind: "other", error: resetCode });
  });
});
