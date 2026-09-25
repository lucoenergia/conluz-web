import { describe, expect, it } from "vitest";
import { useQuery } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "./renderWithProviders";
import { routeRequests, type RequestConfig } from "./requestRouter";

const describeRequest = ({ method, url }: RequestConfig) => `${method} ${url}`;

describe("routeRequests", () => {
  it("rejects a request no route matches, naming its method and URL", async () => {
    const router = routeRequests([{ method: "GET", url: "/api/v1/users", respond: () => [] }]);

    await expect(router.handle({ method: "GET", url: "/api/v1/communities" })).rejects.toThrow(
      "Unhandled request in test: GET /api/v1/communities",
    );
    // Same URL, different method: still unmatched.
    await expect(router.handle({ method: "POST", url: "/api/v1/users" })).rejects.toThrow(
      "Unhandled request in test: POST /api/v1/users",
    );
    // This test is about unmatched requests, so it takes them; untaken, they fail the test.
    expect(router.takeUnmatched().map(describeRequest)).toEqual(["GET /api/v1/communities", "POST /api/v1/users"]);
  });

  it("resolves a matched route with its response, by exact URL or by pattern", async () => {
    const router = routeRequests([
      { method: "GET", url: "/api/v1/users", respond: () => ({ items: [] }) },
      {
        method: "POST",
        url: /^\/api\/v1\/communities\/[^/]+\/memberships$/,
        respond: (config) => ({ received: config.data }),
      },
    ]);

    await expect(router.handle({ method: "GET", url: "/api/v1/users" })).resolves.toEqual({ items: [] });
    await expect(
      router.handle({ method: "POST", url: "/api/v1/communities/c1/memberships", data: { userId: "u1" } }),
    ).resolves.toEqual({ received: { userId: "u1" } });
  });

  it("logs every request, matched or not, with its method and URL in order", async () => {
    const router = routeRequests([{ method: "GET", url: "/api/v1/users", respond: () => [] }]);

    await router.handle({ method: "GET", url: "/api/v1/users" });
    await router.handle({ method: "DELETE", url: "/api/v1/users/u1" }).catch(() => undefined);
    await router.handle({ method: "GET", url: "/api/v1/users", params: { size: 10 } });

    expect(router.requests.map(({ method, url }) => `${method} ${url}`)).toEqual([
      "GET /api/v1/users",
      "DELETE /api/v1/users/u1",
      "GET /api/v1/users",
    ]);
    expect(router.requests[2].params).toEqual({ size: 10 });
    expect(router.takeUnmatched().map(describeRequest)).toEqual(["DELETE /api/v1/users/u1"]);
  });

  // The two below are expected to fail: the router's afterEach must fail a
  // test with an untaken unmatched request, however the rejection is handled.
  // Each body passes on its own, so only that afterEach can make them fail.
  it.fails("fails a test whose unmatched request comes from a real query that nothing awaits", async () => {
    const router = routeRequests([]);
    const { result } = renderHookWithProviders(() =>
      useQuery({ queryKey: ["unrouted"], queryFn: () => router.handle({ method: "GET", url: "/api/v1/unrouted" }) }),
    );

    // TanStack Query catches the rejection and turns it into error state.
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it.fails("fails a test that sends an unmatched request and drops the result", () => {
    const router = routeRequests([]);
    void router.handle({ method: "POST", url: "/api/v1/dropped" }).catch(() => undefined);
  });
});
