import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import {
  AXIOS_INSTANCE,
  REQUEST_TIMEOUT_MS,
  UPLOAD_TIMEOUT_MS,
  customInstance,
} from "./custom-instance";

/**
 * The limit every request goes out with (#310). The adapter is replaced by one
 * that records the config and answers at once, so nothing reaches the network;
 * enforcing the limit is the transport's job, which axios does with the value
 * asserted here.
 */
describe("customInstance's request timeout", () => {
  let sent: InternalAxiosRequestConfig[];
  let originalAdapter: typeof AXIOS_INSTANCE.defaults.adapter;

  beforeEach(() => {
    sent = [];
    originalAdapter = AXIOS_INSTANCE.defaults.adapter;
    const recording: AxiosAdapter = async (config) => {
      sent.push(config);
      return { data: null, status: 200, statusText: "OK", headers: {}, config };
    };
    AXIOS_INSTANCE.defaults.adapter = recording;
  });

  afterEach(() => {
    AXIOS_INSTANCE.defaults.adapter = originalAdapter;
  });

  it("#310 gives an ordinary request a limit, so one the network never answers settles", async () => {
    await customInstance({ url: "/api/v1/communities", method: "GET" });

    expect(REQUEST_TIMEOUT_MS).toBeGreaterThan(0);
    expect(sent[0].timeout).toBe(REQUEST_TIMEOUT_MS);
  });

  it("#310 gives a file upload the longer limit", async () => {
    const body = new FormData();
    body.append("file", new Blob(["a,b"]), "members.csv");

    await customInstance({ url: "/api/v1/communities/c1/members/import", method: "POST", data: body });

    expect(sent[0].timeout).toBe(UPLOAD_TIMEOUT_MS);
    expect(UPLOAD_TIMEOUT_MS).toBeGreaterThan(REQUEST_TIMEOUT_MS);
  });

  it("#310 keeps a limit the call sets itself", async () => {
    await customInstance({ url: "/api/v1/logout", method: "POST", timeout: 4000 });

    expect(sent[0].timeout).toBe(4000);
  });
});
