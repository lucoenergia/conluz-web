import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { act, render, renderHook, type RenderOptions, type RenderResult, type RenderHookResult } from "@testing-library/react";
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
import { afterEach } from "vitest";

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
  /**
   * Seeds the active community read by `useActiveCommunity()`. `null` states
   * "no community selected" explicitly; omitted leaves it to the real
   * `CommunityProvider`. A seeded community can then be switched with
   * `switchActiveCommunity`.
   */
  activeCommunityId?: string | null;
};

type CommunityControl = { set: ((communityId: string | null) => void) | null };

type HarnessExtras = {
  queryClient: QueryClient;
  /** Switches the seeded active community, as `CommunitySelector` does. Requires `activeCommunityId`. */
  switchActiveCommunity: (communityId: string | null) => void;
};

// `CommunityProvider` only reads a persisted selection once a logged user
// exists, and `LoggedUserProvider` takes no initial user, so a seeded
// community is provided directly on the context the hook reads -- held in
// state so a spec can switch it mid-test.
// eslint-disable-next-line react-refresh/only-export-components -- test-only module, never hot-reloaded
function SeededActiveCommunity({
  initial,
  control,
  children,
}: {
  initial: string | null;
  control: CommunityControl;
  children: ReactNode;
}) {
  const [activeCommunityId, setActiveCommunityId] = useState(initial);
  useEffect(() => {
    control.set = setActiveCommunityId;
    return () => {
      control.set = null;
    };
  }, [control]);
  return <ActiveCommunityContext.Provider value={activeCommunityId}>{children}</ActiveCommunityContext.Provider>;
}

function switcher(control: CommunityControl) {
  return (communityId: string | null) => {
    const set = control.set;
    if (!set) {
      throw new Error("switchActiveCommunity needs the render to seed activeCommunityId");
    }
    act(() => set(communityId));
  };
}

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

// The other end: rendering can persist storage (a single-membership user makes
// `CommunityProvider` persist `activeCommunity:<userId>`), and a later test in
// the same file may not render at all. Registered at module scope, so it is
// collected into every spec file that imports the harness and into no other:
// specs that write storage on purpose, such as `community.context.spec.tsx`,
// are unaffected. Deliberately not a global setup file for the same reason.
afterEach(resetBrowserStorage);

/**
 * Mirrors the provider nesting in `src/main.tsx`, plus the Error and Success
 * providers that `authenticated.layout.tsx` adds, with `MemoryRouter` in place
 * of `BrowserRouter`.
 *
 * `StrictMode` is intentionally left out: it double-invokes effects in
 * development, which would change how often mocked hooks and callbacks are
 * called and make call-count assertions depend on it.
 */
function createWrapper(options: ProviderOptions, queryClient: QueryClient, control: CommunityControl) {
  const { route = "/", token, activeCommunityId } = options;

  return function Providers({ children }: { children: ReactNode }) {
    const community =
      activeCommunityId === undefined ? (
        children
      ) : (
        <SeededActiveCommunity initial={activeCommunityId} control={control}>
          {children}
        </SeededActiveCommunity>
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
): RenderResult & HarnessExtras {
  const { route, queryClient = createTestQueryClient(), token, activeCommunityId, ...renderOptions } = options;
  resetBrowserStorage();
  const control: CommunityControl = { set: null };
  const wrapper = createWrapper({ route, token, activeCommunityId }, queryClient, control);
  return { ...render(ui, { wrapper, ...renderOptions }), queryClient, switchActiveCommunity: switcher(control) };
}

/** `renderHook` counterpart of `renderWithProviders`: same providers, same storage reset. */
export function renderHookWithProviders<Result, Props>(
  hook: (props: Props) => Result,
  options: ProviderOptions & { initialProps?: Props } = {},
): RenderHookResult<Result, Props> & HarnessExtras {
  const { route, queryClient = createTestQueryClient(), token, activeCommunityId, initialProps } = options;
  resetBrowserStorage();
  const control: CommunityControl = { set: null };
  const wrapper = createWrapper({ route, token, activeCommunityId }, queryClient, control);
  return {
    ...renderHook(hook, { wrapper, initialProps }),
    queryClient,
    switchActiveCommunity: switcher(control),
  };
}
