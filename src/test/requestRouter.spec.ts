import { describe, expect, it } from "vitest";
import { routeRequests } from "./requestRouter";

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
  });
});
