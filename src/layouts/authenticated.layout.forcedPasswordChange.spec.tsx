import "@testing-library/jest-dom";
import { type FC } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Link, Route, Routes, useLocation } from "react-router";
import { useGetCurrentUser, type getCurrentUser } from "../api/users/users";
import { AuthenticatedLayout } from "./authenticated.layout";
import { LandingRoute } from "../pages/landing/LandingRoute";
import { renderWithProviders } from "../test/renderWithProviders";
import { query } from "../test/queryState";
import { buildCurrentUser, buildPlatformCapabilities } from "../test/fixtures";
import { CommunityRole, type CurrentUserResponse } from "../api/models";

/**
 * A caller who must change their password reaches nothing else until they do
 * (#196). Tier 1: the subject is the layout's decision on the user it is
 * served -- whether that user came from the first load, a login or a refetch
 * after a 403 is the cache's business, covered in passwordChangeRecheck.spec.
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

const mockHeader = vi.fn();
vi.mock("../components/Header/Header", () => ({
  Header: () => {
    mockHeader();
    return <div>header</div>;
  },
}));

vi.mock("../components/Menu/SideMenu", () => ({
  SideMenu: () => <div>side menu</div>,
}));

const Probe: FC<{ label: string }> = ({ label }) => {
  const { pathname } = useLocation();
  return (
    <>
      <output aria-label="path">{pathname}</output>
      <span>{label}</span>
      <Link to="/profile">Mi perfil</Link>
    </>
  );
};

const MEMBER = buildCurrentUser({
  id: "user-1",
  memberships: { "community-a": CommunityRole.COMMUNITY_MEMBER },
});

/** Somebody whose own landing route is NOT "/", so the landing redirect would compete. */
const ADMIN_NO_COMMUNITY = buildCurrentUser({
  id: "user-2",
  memberships: {},
  platformCapabilities: buildPlatformCapabilities({ canAdministerPlatform: true }),
});

function serve(user: CurrentUserResponse) {
  vi.mocked(useGetCurrentUser).mockReturnValue(query.success<typeof getCurrentUser>(user));
}

function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route element={<AuthenticatedLayout />}>
        <Route index element={<LandingRoute />} />
        <Route path="platform" element={<Probe label="platform" />} />
        <Route path="profile" element={<Probe label="profile" />} />
        <Route path="supply-points" element={<Probe label="supply points" />} />
        <Route path="change-password" element={<Probe label="change password" />} />
      </Route>
    </Routes>,
    { route, activeCommunityId: null },
  );
}

/** Exactly: "/" is a substring of every route. */
const currentPath = () => screen.getByRole("status", { name: "path" }).textContent;

describe("the forced password change (AC5)", () => {
  beforeEach(() => {
    vi.mocked(useGetCurrentUser).mockReset();
    mockHeader.mockClear();
  });

  it.each(["/", "/supply-points", "/profile"])("sends a flagged caller from %s to /change-password", (route) => {
    serve({ ...MEMBER, mustChangePassword: true });
    renderAt(route);

    expect(currentPath()).toBe("/change-password");
    expect(screen.getByText("change password")).toBeInTheDocument();
  });

  it("wins over the landing route, which waits for the change", () => {
    serve({ ...ADMIN_NO_COMMUNITY, mustChangePassword: true });
    renderAt("/");

    expect(currentPath()).toBe("/change-password");
  });

  it("brings a flagged caller back when they navigate elsewhere", async () => {
    const user = userEvent.setup();
    serve({ ...MEMBER, mustChangePassword: true });
    renderAt("/change-password");

    await user.click(screen.getByRole("link", { name: "Mi perfil" }));

    expect(currentPath()).toBe("/change-password");
    expect(screen.queryByText("profile")).not.toBeInTheDocument();
  });

  it("never mounts the page it redirects away from", () => {
    serve({ ...MEMBER, mustChangePassword: true });
    renderAt("/supply-points");

    expect(screen.queryByText("supply points")).not.toBeInTheDocument();
  });

  // The full header reads nothing itself, but the layout around it does, so a
  // flagged caller gets a minimal one that still offers logging out (#213).
  it("swaps the full header for one that still offers logging out", () => {
    serve({ ...MEMBER, mustChangePassword: true });
    renderAt("/supply-points");

    expect(mockHeader).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Salir" })).toBeInTheDocument();
  });

  it("keeps the full header for a caller who need not change it", () => {
    serve({ ...MEMBER, mustChangePassword: false });
    renderAt("/supply-points");

    expect(mockHeader).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Salir" })).not.toBeInTheDocument();
  });

  it("leaves a caller who need not change it where they are", () => {
    serve({ ...MEMBER, mustChangePassword: false });
    renderAt("/supply-points");

    expect(currentPath()).toBe("/supply-points");
  });

  it("lets a caller who need not change it land as usual", () => {
    serve({ ...ADMIN_NO_COMMUNITY, mustChangePassword: false });
    renderAt("/");

    expect(currentPath()).toBe("/platform");
  });
});
