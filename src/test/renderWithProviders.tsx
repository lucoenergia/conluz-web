import type { ReactElement, ReactNode } from "react";
import { render, renderHook, type RenderOptions, type RenderResult, type RenderHookResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StyledEngineProvider } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { MemoryRouter } from "react-router";
import { AuthProvider } from "../context/auth.context";
import { LoggedUserProvider } from "../context/logged-user.context";
import { ActiveCommunityContext, CommunityProvider } from "../context/community.context";
import { ErrorProvider } from "../context/error.context";
import { SuccessProvider } from "../context/success.context";
import { theme } from "../theme";

/**
 * A QueryClient for tests: retries off for queries and mutations, so a failing
 * request settles at once instead of backing off past the test's timeout.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export type ProviderOptions = {
  /** Initial router location. Defaults to "/". */
  route?: string;
  /** Inject a client, e.g. one whose cache the spec has seeded. A fresh one is created otherwise. */
  queryClient?: QueryClient;
  /** Seeds the auth token, as `getFromStorage("token")` does in `main.tsx`. None by default. */
  token?: string;
  /** Seeds the active community read by `useActiveCommunity()`. None by default. */
  activeCommunityId?: string;
};

/**
 * Browser storage is shared by every test in a file (jsdom keeps it for the
 * file's lifetime), and the real providers read and write it: the auth token,
 * and the selected community per user. Starting every render from empty
 * storage keeps tests order-independent. The consequence is deliberate:
 * anything a spec writes to storage before rendering is wiped, so seeding
 * goes through `ProviderOptions` and never happens implicitly.
 */
function resetBrowserStorage(): void {
  window.localStorage.clear();
  window.sessionStorage.clear();
}

/**
 * Mirrors the provider nesting in `src/main.tsx`, plus the Error and Success
 * providers that `authenticated.layout.tsx` adds, with `MemoryRouter` in place
 * of `BrowserRouter`.
 *
 * `StrictMode` is intentionally left out: it double-invokes effects in
 * development, which would change how often mocked hooks and callbacks are
 * called and make call-count assertions depend on it.
 */
function createWrapper(options: ProviderOptions, queryClient: QueryClient) {
  const { route = "/", token, activeCommunityId } = options;

  return function Providers({ children }: { children: ReactNode }) {
    // `CommunityProvider` only reads a persisted selection once a logged user
    // exists, and `LoggedUserProvider` takes no initial user, so a seeded
    // community is provided directly on the context the hook reads.
    const community =
      activeCommunityId === undefined ? (
        children
      ) : (
        <ActiveCommunityContext.Provider value={activeCommunityId}>{children}</ActiveCommunityContext.Provider>
      );

    return (
      <AuthProvider initialState={token ?? null}>
        <LoggedUserProvider>
          <CommunityProvider>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider theme={theme}>
                <StyledEngineProvider enableCssLayer>
                  <MemoryRouter initialEntries={[route]}>
                    <ErrorProvider>
                      <SuccessProvider>{community}</SuccessProvider>
                    </ErrorProvider>
                  </MemoryRouter>
                </StyledEngineProvider>
              </ThemeProvider>
            </QueryClientProvider>
          </CommunityProvider>
        </LoggedUserProvider>
      </AuthProvider>
    );
  };
}

/**
 * Renders `ui` inside the production providers. Returns the QueryClient it
 * used, so specs can spy on it (e.g. `vi.spyOn(queryClient, "invalidateQueries")`).
 *
 * A spec that mocks a context module must keep the module's Provider export,
 * by spreading the original: `vi.mock(import("…/error.context"), async (importOriginal) =>
 * ({ ...(await importOriginal()), useErrorDispatch: () => mockDispatch }))`.
 */
export function renderWithProviders(
  ui: ReactElement,
  options: ProviderOptions & Omit<RenderOptions, "wrapper"> = {},
): RenderResult & { queryClient: QueryClient } {
  const { route, queryClient = createTestQueryClient(), token, activeCommunityId, ...renderOptions } = options;
  resetBrowserStorage();
  const wrapper = createWrapper({ route, token, activeCommunityId }, queryClient);
  return { ...render(ui, { wrapper, ...renderOptions }), queryClient };
}

/** `renderHook` counterpart of `renderWithProviders`: same providers, same storage reset. */
export function renderHookWithProviders<Result, Props>(
  hook: (props: Props) => Result,
  options: ProviderOptions & { initialProps?: Props } = {},
): RenderHookResult<Result, Props> & { queryClient: QueryClient } {
  const { route, queryClient = createTestQueryClient(), token, activeCommunityId, initialProps } = options;
  resetBrowserStorage();
  const wrapper = createWrapper({ route, token, activeCommunityId }, queryClient);
  return { ...renderHook(hook, { wrapper, initialProps }), queryClient };
}
