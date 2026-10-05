import { describe, expect, it } from "vitest";
import { apiError } from "../test/apiError";
import { classifyAuthError, getRetryAfterSeconds, throttledMessage } from "./authErrors";
import { getFirstApiErrorMessage } from "./apiErrorCatalogue";

describe("getRetryAfterSeconds", () => {
  it("reads params.retryAfterSeconds from the body", () => {
    const error = apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS", params: { retryAfterSeconds: "840" } });
    expect(getRetryAfterSeconds(error)).toBe(840);
  });

  it("prefers the body over the header", () => {
    const error = apiError(
      429,
      { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS", params: { retryAfterSeconds: "840" } },
      { "retry-after": "60" },
    );
    expect(getRetryAfterSeconds(error)).toBe(840);
  });

  it("falls back to the Retry-After header when the param is absent", () => {
    const error = apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS" }, { "retry-after": "840" });
    expect(getRetryAfterSeconds(error)).toBe(840);
  });

  it("reads the header through AxiosHeaders.get when the headers object has one", () => {
    const headers = { get: (name: string) => (name === "retry-after" ? "120" : undefined) };
    const error = { response: { status: 429, headers, data: { errors: [] } } };
    expect(getRetryAfterSeconds(error)).toBe(120);
  });

  it("is null when neither is present, or when either is not a positive number of seconds", () => {
    expect(getRetryAfterSeconds(apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS" }))).toBeNull();
    expect(getRetryAfterSeconds(apiError(429, { params: { retryAfterSeconds: "soon" } }))).toBeNull();
    expect(getRetryAfterSeconds(apiError(429, {}, { "retry-after": "Wed, 21 Oct 2026 07:28:00 GMT" }))).toBeNull();
    expect(getRetryAfterSeconds(apiError(429, {}, { "retry-after": "0" }))).toBeNull();
    expect(getRetryAfterSeconds(new Error("network"))).toBeNull();
  });
});

describe("throttledMessage", () => {
  it("rounds the wait up to whole minutes", () => {
    expect(throttledMessage(840)).toBe("Demasiados intentos fallidos. Vuelve a intentarlo dentro de 14 minutos.");
    expect(throttledMessage(841)).toContain("dentro de 15 minutos");
    expect(throttledMessage(61)).toContain("dentro de 2 minutos");
  });

  it("uses the singular for one minute", () => {
    expect(throttledMessage(60)).toContain("dentro de 1 minuto.");
    expect(throttledMessage(1)).toContain("dentro de 1 minuto.");
  });

  it("names no wait when there is none", () => {
    expect(throttledMessage(null)).toBe("Demasiados intentos fallidos. Vuelve a intentarlo más tarde.");
  });
});

describe("classifyAuthError", () => {
  it("classifies a 429 as throttled, with the wait", () => {
    const error = apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS", params: { retryAfterSeconds: "840" } });
    expect(classifyAuthError(error)).toEqual({ kind: "throttled", retryAfterSeconds: 840 });
  });

  it("classifies a 429 with no body as throttled, without a wait", () => {
    expect(classifyAuthError(apiError(429))).toEqual({ kind: "throttled", retryAfterSeconds: null });
  });

  it("classifies a wrong current password", () => {
    expect(classifyAuthError(apiError(400, { code: "USER_CURRENT_PASSWORD_INCORRECT" }))).toEqual({
      kind: "currentPasswordIncorrect",
    });
  });

  it.each(["TOO_SHORT", "TOO_LONG", "TOO_MANY_BYTES"] as const)("classifies a %s policy violation", (rule) => {
    const error = apiError(400, { code: "USER_PASSWORD_POLICY_VIOLATION", params: { rule } });
    expect(classifyAuthError(error)).toEqual({ kind: "policyViolation", rule });
  });

  it("keeps a policy violation whose rule it does not know, without a rule", () => {
    const error = apiError(400, { code: "USER_PASSWORD_POLICY_VIOLATION", params: { rule: "NEW_RULE" } });
    expect(classifyAuthError(error)).toEqual({ kind: "policyViolation", rule: null });
  });

  it("classifies a 401 as unauthorized", () => {
    expect(classifyAuthError(apiError(401))).toEqual({ kind: "unauthorized" });
  });

  it("leaves anything else as other", () => {
    expect(classifyAuthError(apiError(400)).kind).toBe("other");
    expect(classifyAuthError(apiError(500)).kind).toBe("other");
    expect(classifyAuthError(new Error("network")).kind).toBe("other");
  });
});

describe("the catalogue entries for #196", () => {
  it("translates each code to Spanish", () => {
    expect(getFirstApiErrorMessage(apiError(400, { code: "USER_CURRENT_PASSWORD_INCORRECT" }), "x")).toBe(
      "La contraseña actual no es correcta.",
    );
    expect(
      getFirstApiErrorMessage(
        apiError(400, { code: "USER_PASSWORD_POLICY_VIOLATION", params: { rule: "TOO_SHORT" } }),
        "x",
      ),
    ).toBe("La contraseña debe tener al menos 15 caracteres.");
    expect(
      getFirstApiErrorMessage(
        apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS", params: { retryAfterSeconds: "840" } }),
        "x",
      ),
    ).toBe("Demasiados intentos fallidos. Vuelve a intentarlo dentro de 14 minutos.");
  });

  it("degrades to a generic sentence when a param is missing", () => {
    expect(getFirstApiErrorMessage(apiError(400, { code: "USER_PASSWORD_POLICY_VIOLATION" }), "x")).toBe(
      "La contraseña no cumple los requisitos.",
    );
    expect(getFirstApiErrorMessage(apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS" }), "x")).toBe(
      "Demasiados intentos fallidos. Vuelve a intentarlo más tarde.",
    );
  });
});
