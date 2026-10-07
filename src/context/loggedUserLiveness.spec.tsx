import "@testing-library/jest-dom";
import { useEffect, type FC } from "react";
import { act, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes, useLocation } from "react-router";
import { getGetCurrentUserQueryKey } from "../api/users/users";
import { AuthenticatedLayout } from "../layouts/authenticated.layout";
import { CapabilityRoute } from "../components/Auth/CapabilityRoute";
import { LandingRoute } from "../pages/landing/LandingRoute";
import { renderWithProviders } from "../test/renderWithProviders";
import { routeRequests } from "../test/requestRouter";
import { buildCurrentUser, buildPlatformCapabilities } from "../test/fixtures";
import type { CurrentUserResponse } from "../api/models";

/**
 * The regression #203 exists for: a platform admin whose flag is revoked keeps
 * being offered the administration surface until they reload.
 *
 * Tier 2 on purpose. The subject is cache behaviour -- whether a refetch of
 * GET /users/current reaches the menu and the route guards -- so the real
 * generated hook, a real QueryClient and the real LoggedUserProvider all have
 * to run; only the HTTP layer is mocked. With `useGetCurrentUser` stubbed there
 * would be nothing to refetch and the test would decay into "the spy was
 * called".
 *
 * The flag can only change in another session: the backend refuses
 * self-revocation, so no in-app action can do it. The trigger here is therefore
 * the production one -- a window-focus refetch of a stale query, which is why
 * this query opts back into `refetchOnWindowFocus`.
 */
const CURRENT_USER_URL = "/api/v1/users/current";

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

/**
 * No memberships, and the active community seeded to null, so the community
 * capability query and the community selector are both disabled: the only
 * request this spec needs a route for is the current user itself.
 */
const ADMIN = buildCurrentUser({
  id: "user-1",
  fullName: "Ada",
  memberships: {},
  platformCapabilities: buildPlatformCapabilities({ canAdministerPlatform: true, canListUsers: true }),
});
const DEMOTED: CurrentUserResponse = { ...ADMIN, platformCapabilities: buildPlatformCapabilities({}) };

// The side-menu group, renamed to the scope it names in #186. Distinct from
// the /platform page's own "Administración de plataforma" heading.
const PLATFORM_SECTION = "Plataforma";

/**
 * Pushed from a mount effect, not from render: it is what distinguishes "the
 * menu followed the change" from "the page reloaded". A re-render does not
 * remount; only a reload-equivalent would push twice.
 */
const mounts: string[] = [];
const paths: string[] = [];

const CommunitiesPage: FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    mounts.push("communities");
  }, []);
  useEffect(() => {
    paths.push(pathname);
  }, [pathname]);
  return <div data-testid="communities-page">Comunidades page</div>;
};

/**
 * Where a caller with no membership and no platform capability belongs, per
 * `resolveLandingRoute`. The fixtures here hold no memberships -- so that the
 * community queries stay disabled and the route table stays small -- which
 * means a revoked admin is sent on from "/" to here. Routed explicitly rather
 * than left to 404, because that onward step is part of what revocation does.
 */
const NoCommunityPage: FC = () => <div data-testid="no-community-page">Sin comunidad</div>;

function renderApp() {
  return renderWithProviders(
    <Routes>
      <Route element={<AuthenticatedLayout />}>
        <Route index element={<LandingRoute />} />
        <Route path="no-community" element={<NoCommunityPage />} />
        <Route
          path="communities"
          element={
            <CapabilityRoute require={{ scope: "platform", capability: "canAdministerPlatform" }}>
              <CommunitiesPage />
            </CapabilityRoute>
          }
        />
      </Route>
    </Routes>,
    { route: "/communities", activeCommunityId: null, token: "a-token" },
  );
}

/** As returning to the tab does. */
function returnToTab() {
  act(() => {
    window.dispatchEvent(new Event("visibilitychange"));
  });
}

describe("the signed-in user is live", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
    mounts.length = 0;
    paths.length = 0;
  });

  it("stops offering the administration surface once the flag is revoked elsewhere, without a reload", async () => {
    let served = 0;
    const router = routeRequests([
      {
        method: "GET",
        url: CURRENT_USER_URL,
        respond: () => {
          served += 1;
          return served === 1 ? ADMIN : DEMOTED;
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    const { queryClient } = renderApp();

    expect(await screen.findByTestId("communities-page")).toBeInTheDocument();
    expect(screen.getByText(PLATFORM_SECTION)).toBeInTheDocument();

    // Stale, as it would be by the time somebody came back to the tab. Only
    // `dataUpdatedAt` moves; the payload is the same object, so nothing
    // re-renders on this line.
    queryClient.setQueryData(getGetCurrentUserQueryKey(), ADMIN, { updatedAt: Date.now() - 60_000 });
    returnToTab();

    await waitFor(() => expect(served).toBe(2));

    // The section goes because BOTH its items do: a section survives on any one
    // permitted item, so asserting the title alone would not say that Usuarios
    // went too.
    await waitFor(() => expect(screen.queryByText(PLATFORM_SECTION)).not.toBeInTheDocument());
    expect(screen.queryByText("Comunidades")).not.toBeInTheDocument();
    expect(screen.queryByText("Usuarios")).not.toBeInTheDocument();

    // And the guard starts refusing the page it was already showing. Waiting
    // for the destination rather than for the page to vanish: the redirect
    // happens in an effect, so there is a frame with neither on screen. The
    // destination is /no-community, because the guard sends a denial to "/" and
    // this caller has no membership to show there.
    expect(await screen.findByTestId("no-community-page")).toBeInTheDocument();
    expect(screen.queryByTestId("communities-page")).not.toBeInTheDocument();

    // No reload: the page was mounted once, and the only requests were the two
    // current-user fetches.
    expect(mounts).toEqual(["communities"]);
    expect(router.requests.map((request) => request.url)).toEqual([CURRENT_USER_URL, CURRENT_USER_URL]);
  });

  it("starts offering it once the flag is granted elsewhere", async () => {
    let served = 0;
    const router = routeRequests([
      {
        method: "GET",
        url: CURRENT_USER_URL,
        respond: () => {
          served += 1;
          return served === 1 ? DEMOTED : ADMIN;
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    const { queryClient } = renderApp();

    // Denied to start with, so the guard sends them away.
    expect(await screen.findByTestId("no-community-page")).toBeInTheDocument();
    expect(screen.queryByText(PLATFORM_SECTION)).not.toBeInTheDocument();

    queryClient.setQueryData(getGetCurrentUserQueryKey(), DEMOTED, { updatedAt: Date.now() - 60_000 });
    returnToTab();

    await waitFor(() => expect(served).toBe(2));
    expect(await screen.findByText(PLATFORM_SECTION)).toBeInTheDocument();
    expect(screen.getByText("Comunidades")).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
  });

  it("keeps the menu and the guarded page while a refetch is in flight", async () => {
    let resolveRefetch: ((user: CurrentUserResponse) => void) | undefined;
    let served = 0;
    const router = routeRequests([
      {
        method: "GET",
        url: CURRENT_USER_URL,
        respond: () => {
          served += 1;
          if (served === 1) return ADMIN;
          return new Promise<CurrentUserResponse>((resolve) => {
            resolveRefetch = resolve;
          });
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    const { queryClient } = renderApp();
    expect(await screen.findByTestId("communities-page")).toBeInTheDocument();

    act(() => {
      void queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
    });
    await waitFor(() => expect(served).toBe(2));

    // Mid-flight: React Query still holds the last answer, so nothing may fall
    // back to "no user". A blank here would mean the layout's spinner, an empty
    // menu and every guard taking its pending -- or worse, denied -- branch.
    expect(screen.getByText(PLATFORM_SECTION)).toBeInTheDocument();
    expect(screen.getByTestId("communities-page")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(paths).toEqual(["/communities"]);

    act(() => {
      resolveRefetch?.(ADMIN);
    });

    await waitFor(() => expect(screen.getByTestId("communities-page")).toBeInTheDocument());
    expect(screen.getByText(PLATFORM_SECTION)).toBeInTheDocument();
    expect(paths).toEqual(["/communities"]);
    expect(mounts).toEqual(["communities"]);
  });
});
