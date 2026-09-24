import { afterEach } from "vitest";

/**
 * Tier 2 helper: routes the calls a mocked `customInstance` receives, so specs
 * that test cache behaviour do not hand-write a `switch` over URL strings.
 *
 *   const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));
 *   // Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from it.
 *   vi.mock(import("../../api/custom-instance"), async (importOriginal) => ({
 *     ...(await importOriginal()),
 *     customInstance: (config) => mockCustomInstance(config),
 *   }));
 *   const router = routeRequests([
 *     { method: "GET", url: HISTORY_URL, respond: () => [] },
 *   ]);
 *   mockCustomInstance.mockImplementation(router.handle);
 *
 * A request that matches no route is rejected AND fails the test it happened
 * in, whether or not anything awaits the rejection. The rejection alone is not
 * enough: TanStack Query catches a failed fetch and turns it into query error
 * state, so a test that never looks at that query would stay green. A test
 * that deliberately sends an unmatched request must take it with
 * `takeUnmatched()`, which is also how it asserts on it.
 */

/**
 * The parts of an `AxiosRequestConfig` the router reads. `url` and `method`
 * are optional there, so a spec can hand `handle` straight to a mock typed as
 * the real `customInstance`. Generated fetchers always set both.
 */
export type RequestConfig = {
  url?: string;
  method?: string;
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
  /**
   * Returns the unmatched requests not yet taken, and marks them expected so
   * they do not fail the test. Only for tests whose subject is an unmatched
   * request.
   */
  takeUnmatched: () => RequestConfig[];
};

// Axios defaults a missing method to GET.
const methodOf = (config: RequestConfig) => (config.method ?? "GET").toUpperCase();
const urlOf = (config: RequestConfig) => config.url ?? "";
const describeRequest = (config: RequestConfig) => `${methodOf(config)} ${urlOf(config)}`;

function matches(route: Route, config: RequestConfig): boolean {
  if (route.method !== methodOf(config)) return false;
  return typeof route.url === "string" ? route.url === urlOf(config) : route.url.test(urlOf(config));
}

// Unmatched requests not yet reported or taken, across every router created in
// this spec file.
const pendingUnmatched: RequestConfig[] = [];

// Registered at module scope, so it is collected into every spec file that
// imports this helper, as the harness's storage cleanup is. Throwing from
// afterEach fails the test that just ran.
afterEach(() => {
  if (pendingUnmatched.length === 0) return;
  const unmatched = pendingUnmatched.splice(0).map(describeRequest);
  throw new Error(
    `routeRequests: ${unmatched.length} request(s) matched no route in this test:\n` +
      unmatched.map((request) => `  - ${request}`).join("\n") +
      "\nAdd a route for each, or take them with router.takeUnmatched() if the test is about them.",
  );
});

export function routeRequests(routes: Route[]): RequestRouter {
  const requests: RequestConfig[] = [];
  const ownUnmatched: RequestConfig[] = [];

  const handle = (config: RequestConfig): Promise<unknown> => {
    requests.push(config);
    const route = routes.find((candidate) => matches(candidate, config));
    if (!route) {
      ownUnmatched.push(config);
      pendingUnmatched.push(config);
      return Promise.reject(new Error(`Unhandled request in test: ${describeRequest(config)}`));
    }
    try {
      return Promise.resolve(route.respond(config));
    } catch (error) {
      return Promise.reject(error);
    }
  };

  const takeUnmatched = (): RequestConfig[] => {
    const taken = ownUnmatched.splice(0);
    for (const config of taken) {
      const index = pendingUnmatched.indexOf(config);
      if (index !== -1) pendingUnmatched.splice(index, 1);
    }
    return taken;
  };

  return { handle, requests, takeUnmatched };
}
