import "@testing-library/jest-dom";
import { type FC } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Link, Route, Routes, useLocation } from "react-router";
import { useGetCurrentUser, type getCurrentUser } from "../api/users/users";
import { AuthenticatedLayout } from "./authenticated.layout";
import { renderWithProviders } from "../test/renderWithProviders";
import { query } from "../test/queryState";
import { buildCurrentUser, buildPlatformCapabilities } from "../test/fixtures";
import { CommunityRole, type CurrentUserResponse } from "../api/models";

/**
 * Landing is a once-per-session event, and the signed-in user is a live query
 * now (#203) -- so the effect that decides it runs again on every refetch that
 * changes the payload. Somebody who has navigated elsewhere must not be sent
 * back.
 *
 * Tier 1: the subject is the layout's decision, not the cache. A refetch is
 * expressed as the mocked hook returning a new response and the tree
 * re-rendering, which is exactly what a real refetch does to this component --
 * and it lets the test hand over a NEW OBJECT with the SAME id, which is the
 * case the guard has to survive.
 */
vi.mock(import("../api/users/users"), () => ({
  useGetCurrentUser: vi.fn(),
}));

vi.mock(import("../context/auth.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useAuth: () => "a-token",
}));

vi.mock(import("../hooks/useLogout"), () => ({
  useLogout: () => vi.fn(),
}));

vi.mock("../components/Header/Header", () => ({
  Header: () => <div data-testid="header">header</div>,
}));

vi.mock("../components/Menu/SideMenu", () => ({
  SideMenu: () => <div data-testid="side-menu">side menu</div>,
}));

/** A platform admin with no membership lands on /platform; see resolveLandingRoute. */
const ADMIN_NO_COMMUNITY = buildCurrentUser({
  id: "user-1",
  memberships: {},
  platformCapabilities: buildPlatformCapabilities({ canAdministerPlatform: true }),
});

const Probe: FC<{ label: string }> = ({ label }) => {
  const { pathname } = useLocation();
  return (
    <>
      <span data-testid="path">{pathname}</span>
      <span>{label}</span>
      <Link to="/">Inicio</Link>
      <Link to="/profile">Mi perfil</Link>
    </>
  );
};

/** A member of a community lands on the community's home, /home. */
const MEMBER = buildCurrentUser({
  id: "user-2",
  memberships: { "community-a": CommunityRole.COMMUNITY_MEMBER },
});

function serve(user: CurrentUserResponse) {
  vi.mocked(useGetCurrentUser).mockReturnValue(query.success<typeof getCurrentUser>(user));
}

const routedLayout = (
  <Routes>
    <Route element={<AuthenticatedLayout />}>
      <Route index element={<Probe label="landing" />} />
      <Route path="home" element={<Probe label="home" />} />
      <Route path="platform" element={<Probe label="platform" />} />
      <Route path="profile" element={<Probe label="profile" />} />
    </Route>
  </Routes>
);

function renderAt(route: string) {
  return renderWithProviders(routedLayout, { route, activeCommunityId: null });
}

/**
 * Exactly, not `toHaveTextContent`: that is a substring match, and "/" is a
 * substring of every route -- which let a deleted guard pass this spec once.
 */
function currentPath(): string | null {
  return screen.getByTestId("path").textContent;
}

describe("the landing redirect", () => {
  beforeEach(() => {
    vi.mocked(useGetCurrentUser).mockReset();
  });

  it("sends a platform admin with no community to their landing route", () => {
    serve(ADMIN_NO_COMMUNITY);
    renderAt("/");

    expect(currentPath()).toBe("/platform");
  });

  /**
   * The decisive one, and the reason the guard exists at all: somebody who went
   * BACK to "/" after landing must stay there. On any other route the path
   * check alone would protect them, so this is the only shape that isolates it.
   */
  it("re-navigates nobody when a refetch returns the same user", async () => {
    const user = userEvent.setup();
    serve(ADMIN_NO_COMMUNITY);
    const { rerender } = renderAt("/");
    expect(currentPath()).toBe("/platform");

    await user.click(screen.getByRole("link", { name: "Inicio" }));
    expect(currentPath()).toBe("/");

    // A refetch: same person, a different object. Structural sharing usually
    // keeps the identity, but a payload that changed in any other field would
    // not -- and then only the id-keyed guard stops the redirect.
    serve({ ...ADMIN_NO_COMMUNITY });
    rerender(routedLayout);

    expect(currentPath()).toBe("/");
  });

  /**
   * Belt and braces rather than a production flow: logging out unmounts the
   * layout, so the ref resets on its own. It is keyed on the id regardless, so
   * that a signed-in identity changing under a mounted layout still lands --
   * and so that the guard cannot be read as "once per mount, whoever it is".
   *
   * Starts as a member who lands and then goes back to "/", where their own
   * landing is already recorded, so only a different id can move them on.
   */
  it("lands a different user, so the guard is not a permanent latch", async () => {
    const user = userEvent.setup();
    serve(MEMBER);
    const { rerender } = renderAt("/");
    expect(currentPath()).toBe("/home");
    await user.click(screen.getByRole("link", { name: "Inicio" }));
    expect(currentPath()).toBe("/");

    serve(ADMIN_NO_COMMUNITY);
    rerender(routedLayout);

    expect(currentPath()).toBe("/platform");
  });

  /**
   * The case a first attempt at this guard broke, caught by the visual suite:
   * `platform-and-users.spec.ts` deep links a membership-less platform admin to
   * /integrations, where CapabilityRoute refuses and sends them to "/". They
   * must land from there -- /platform, not the no-community home. So arriving
   * on a route that is not the landing one must record nothing.
   */
  it("still lands a caller who reaches the landing route after being refused a deep link", async () => {
    const user = userEvent.setup();
    serve(ADMIN_NO_COMMUNITY);
    renderAt("/profile");
    expect(currentPath()).toBe("/profile");

    // As CapabilityRoute's `<Navigate replace to="/" />` does.
    await user.click(screen.getByRole("link", { name: "Inicio" }));

    expect(currentPath()).toBe("/platform");
  });

  // What pins `useLocation()` over `window.location`: under MemoryRouter the
  // latter reports "/" for every route, so a window-based check would redirect
  // from here too.
  it("never redirects somebody who is not on the landing route", () => {
    serve(ADMIN_NO_COMMUNITY);
    renderAt("/profile");

    expect(currentPath()).toBe("/profile");
  });
});
