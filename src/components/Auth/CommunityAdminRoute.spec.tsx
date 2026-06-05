import "@testing-library/jest-dom";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { CommunityAdminRoute } from "./CommunityAdminRoute";
import { CommunityRole } from "../../api/models";

vi.mock("../../hooks/useActiveCommunityRole", () => ({
  useActiveCommunityRole: vi.fn(),
  useIsPlatformAdmin: vi.fn(),
}));

import * as hooks from "../../hooks/useActiveCommunityRole";

function setup(role: string | null, isPlatformAdmin: boolean, path = "/protected") {
  vi.mocked(hooks.useActiveCommunityRole).mockReturnValue(role as CommunityRole | null);
  vi.mocked(hooks.useIsPlatformAdmin).mockReturnValue(isPlatformAdmin);

  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<span>home</span>} />
        <Route
          path="/protected"
          element={
            <CommunityAdminRoute>
              <span>protected</span>
            </CommunityAdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CommunityAdminRoute", () => {
  test("renders children for COMMUNITY_ADMIN role", () => {
    setup(CommunityRole.COMMUNITY_ADMIN, false);
    expect(screen.getByText("protected")).toBeInTheDocument();
  });

  test("renders children for platform admin regardless of community role", () => {
    setup(null, true);
    expect(screen.getByText("protected")).toBeInTheDocument();
  });

  test("redirects to / for COMMUNITY_MEMBER", () => {
    setup(CommunityRole.COMMUNITY_MEMBER, false);
    expect(screen.getByText("home")).toBeInTheDocument();
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
  });

  test("redirects to / when no role is set", () => {
    setup(null, false);
    expect(screen.getByText("home")).toBeInTheDocument();
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
  });
});
