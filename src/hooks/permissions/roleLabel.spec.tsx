import { describe, expect, it, vi } from "vitest";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { buildCurrentUser } from "../../test/fixtures";
import { query } from "../../test/queryState";
import { useGetCurrentUser, type getCurrentUser } from "../../api/users/users";
import { CommunityRole } from "../../api/models";

const mockRole = vi.hoisted(() => ({ current: null as CommunityRole | null }));

vi.mock(import("./useActiveCommunityRole"), () => ({
  useActiveCommunityRole: () => mockRole.current,
  useIsPlatformAdmin: () => false,
}));

// The signed-in user is the GET /users/current query (#203); the label reads
// `isPlatformAdmin` off it.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCurrentUser: vi.fn(),
}));

import { useActiveCommunityRoleLabel } from "./roleLabel";

function renderWith(
  { isPlatformAdmin = false, role = null }: { isPlatformAdmin?: boolean; role?: CommunityRole | null },
) {
  mockRole.current = role;
  vi.mocked(useGetCurrentUser).mockReturnValue(
    query.success<typeof getCurrentUser>(buildCurrentUser({ isPlatformAdmin })),
  );
  return renderHookWithProviders(() => ({ label: useActiveCommunityRoleLabel() }));
}

describe("useActiveCommunityRoleLabel", () => {
  it("names a platform admin", () => {
    const { result } = renderWith({ isPlatformAdmin: true });
    expect(result.current.label).toBe("Administrador de plataforma");
  });

  // The platform flag wins: it is the wider privilege, and showing somebody
  // both labels at once would say nothing useful.
  it("names a platform admin even when they also administer a community", () => {
    const { result } = renderWith({ isPlatformAdmin: true, role: CommunityRole.COMMUNITY_ADMIN });
    expect(result.current.label).toBe("Administrador de plataforma");
  });

  it("names a community admin", () => {
    const { result } = renderWith({ role: CommunityRole.COMMUNITY_ADMIN });
    expect(result.current.label).toBe("Administrador de comunidad");
  });

  // "Miembro" is the app's word for the role, used by the members page, the
  // users page and the menu. "Socio" is the counting noun for a person.
  it("names a member", () => {
    const { result } = renderWith({ role: CommunityRole.COMMUNITY_MEMBER });
    expect(result.current.label).toBe("Miembro");
  });

  // Nothing to say rather than a blank badge: callers hide it entirely.
  it("says nothing when there is no role to report", () => {
    const { result } = renderWith({ role: null });
    expect(result.current.label).toBe("");
  });
});
