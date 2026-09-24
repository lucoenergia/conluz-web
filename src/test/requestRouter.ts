/**
 * Tier 2 helper: routes the calls a mocked `customInstance` receives, so specs
 * that test cache behaviour do not hand-write a `switch` over URL strings.
 *
 *   const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));
 *   vi.mock("../../api/custom-instance", () => ({
 *     customInstance: (config: RequestConfig) => mockCustomInstance(config),
 *   }));
 *   const router = routeRequests([
 *     { method: "GET", url: HISTORY_URL, respond: () => [] },
 *   ]);
 *   mockCustomInstance.mockImplementation(router.handle);
 *
 * A request that matches no route is rejected, so an unexpected or renamed
 * route fails the test instead of resolving to `undefined`.
 */

export type RequestConfig = {
  url: string;
  method: string;
  params?: unknown;
  data?: unknown;
};

export type Route = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** An exact URL, or a pattern for URLs with ids or suffixes. */
  url: string | RegExp;
  respond: (config: RequestConfig) => unknown;
};

export type RequestRouter = {
  /** Pass to `mockCustomInstance.mockImplementation`. */
  handle: (config: RequestConfig) => Promise<unknown>;
  /** Every request received, matched or not, in order. */
  requests: RequestConfig[];
};

function matches(route: Route, config: RequestConfig): boolean {
  if (route.method !== config.method.toUpperCase()) return false;
  return typeof route.url === "string" ? route.url === config.url : route.url.test(config.url);
}

export function routeRequests(routes: Route[]): RequestRouter {
  const requests: RequestConfig[] = [];

  const handle = (config: RequestConfig): Promise<unknown> => {
    requests.push(config);
    const route = routes.find((candidate) => matches(candidate, config));
    if (!route) {
      return Promise.reject(new Error(`Unhandled request in test: ${config.method} ${config.url}`));
    }
    try {
      return Promise.resolve(route.respond(config));
    } catch (error) {
      return Promise.reject(error);
    }
  };

  return { handle, requests };
}
