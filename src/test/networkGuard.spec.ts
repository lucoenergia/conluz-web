import { describe, expect, it } from "vitest";
import { useQuery } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react";
import { AXIOS_INSTANCE, customInstance } from "../api/custom-instance";
import { renderHookWithProviders } from "./renderWithProviders";
import { takeBlockedRequests } from "./networkGuard";

describe("networkGuard (#211)", () => {
  it("refuses an axios request before it leaves the process, naming its method and URL", async () => {
    await expect(AXIOS_INSTANCE.get("/api/v1/guarded")).rejects.toThrow(
      /^Real network request blocked in a unit test: GET \S+\/api\/v1\/guarded$/,
    );
    // This test is about a refused request, so it takes it; untaken, it fails the test.
    expect(takeBlockedRequests()).toEqual([expect.stringMatching(/^GET \S+\/api\/v1\/guarded$/)]);
  });

  it("refuses a fetch the same way", async () => {
    await expect(fetch("http://localhost:8443/api/v1/fetched", { method: "post" })).rejects.toThrow(
      "Real network request blocked in a unit test: POST http://localhost:8443/api/v1/fetched",
    );
    expect(takeBlockedRequests()).toEqual(["POST http://localhost:8443/api/v1/fetched"]);
  });

  // The two below are expected to fail: the guard's afterEach must fail a test
  // that reached the network, however the rejection is handled. Each body
  // passes on its own, so only that afterEach can make them fail.
  it.fails("fails a test whose unmocked query reaches the network, though nothing awaits it", async () => {
    const { result } = renderHookWithProviders(() =>
      useQuery({
        queryKey: ["unmocked"],
        queryFn: () => customInstance({ url: "/api/v1/unmocked", method: "GET" }),
      }),
    );

    // TanStack Query catches the rejection and turns it into error state.
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it.fails("fails a test that sends a request and drops the result", () => {
    void AXIOS_INSTANCE.post("/api/v1/dropped").catch(() => undefined);
  });
});
