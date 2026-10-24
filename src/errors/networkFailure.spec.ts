import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { isNetworkFailure } from "./networkFailure";

describe("isNetworkFailure", () => {
  it("is true for a request that got no answer", () => {
    expect(isNetworkFailure(new AxiosError("Network Error", "ERR_NETWORK"))).toBe(true);
  });

  it("is true for a request that timed out", () => {
    expect(isNetworkFailure(new AxiosError("timeout of 0ms exceeded", "ECONNABORTED"))).toBe(true);
  });

  it.each([400, 403, 404, 500, 503])("is false for a response with status %i", (status) => {
    const error = new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, undefined, {
      status,
      statusText: "",
      headers: {},
      config: { headers: new AxiosError().config?.headers ?? ({} as never) },
      data: null,
    });
    expect(isNetworkFailure(error)).toBe(false);
  });

  it("is false for a request cancelled on purpose", () => {
    expect(isNetworkFailure(new AxiosError("canceled", "ERR_CANCELED"))).toBe(false);
  });

  it.each([null, undefined, "Network Error", new Error("Network Error")])("is false for %j, which is not a request error", (error) => {
    expect(isNetworkFailure(error)).toBe(false);
  });
});
