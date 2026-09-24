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
 * A request that matches no route is rejected, so an unexpected or renamed
 * route fails the test instead of resolving to `undefined`.
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
};

// Axios defaults a missing method to GET.
const methodOf = (config: RequestConfig) => (config.method ?? "GET").toUpperCase();
const urlOf = (config: RequestConfig) => config.url ?? "";

function matches(route: Route, config: RequestConfig): boolean {
  if (route.method !== methodOf(config)) return false;
  return typeof route.url === "string" ? route.url === urlOf(config) : route.url.test(urlOf(config));
}

export function routeRequests(routes: Route[]): RequestRouter {
  const requests: RequestConfig[] = [];

  const handle = (config: RequestConfig): Promise<unknown> => {
    requests.push(config);
    const route = routes.find((candidate) => matches(candidate, config));
    if (!route) {
      return Promise.reject(new Error(`Unhandled request in test: ${methodOf(config)} ${urlOf(config)}`));
    }
    try {
      return Promise.resolve(route.respond(config));
    } catch (error) {
      return Promise.reject(error);
    }
  };

  return { handle, requests };
}
