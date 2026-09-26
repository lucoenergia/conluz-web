import { describe, expect, it } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { decide, isDenial } from "./capabilityOutcome";

type Caps = { canManage: boolean };

function httpError(status: number) {
  return new AxiosError("failed", undefined, undefined, undefined, {
    status,
    statusText: "",
    data: undefined,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

describe("decide", () => {
  it("allows only an explicit true", () => {
    expect(decide<Caps>({ canManage: true }, "canManage")).toEqual({ state: "allowed" });
  });

  it("denies an explicit false", () => {
    expect(decide<Caps>({ canManage: false }, "canManage")).toEqual({ state: "denied" });
  });

  it("denies when the capabilities object is missing entirely", () => {
    expect(decide<Caps>(undefined, "canManage")).toEqual({ state: "denied" });
  });

  it("denies when the capability is absent from the object", () => {
    expect(decide<Caps>({} as Caps, "canManage")).toEqual({ state: "denied" });
  });

  // What `=== true` is actually for. JSON has no opinion on what lands in a
  // boolean field, and every one of these is truthy, so a truthiness check
  // would grant access on each.
  it.each([["the string 'false'", "false"], ["the string 'no'", "no"], ["the number 1", 1], ["an empty object", {}]])(
    "denies %s",
    (_name, value) => {
      expect(decide({ canManage: value } as unknown as Caps, "canManage")).toEqual({ state: "denied" });
    },
  );
});

describe("isDenial", () => {
  // The backend hides what the caller may not see rather than admitting it
  // exists, so a 404 is an answer, not a failure to answer.
  it.each([403, 404])("treats %i as the backend saying no", (status) => {
    expect(isDenial(httpError(status))).toBe(true);
  });

  it.each([400, 418, 500, 502, 503])("treats %i as a failure to answer", (status) => {
    expect(isDenial(httpError(status))).toBe(false);
  });

  // No response at all: offline, DNS failure, a timeout. Nothing was answered.
  it("treats a network error with no response as a failure to answer", () => {
    expect(isDenial(new Error("Network Error"))).toBe(false);
  });

  it("treats a missing error as a failure to answer", () => {
    expect(isDenial(undefined)).toBe(false);
    expect(isDenial(null)).toBe(false);
  });
});
