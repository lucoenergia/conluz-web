import "@testing-library/jest-dom";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { PlatformAdminRoute } from "./PlatformAdminRoute";

vi.mock("../../hooks/useActiveCommunityRole", () => ({
  useActiveCommunityRole: vi.fn(),
  useIsPlatformAdmin: vi.fn(),
}));

import * as hooks from "../../hooks/useActiveCommunityRole";

function setup(isPlatformAdmin: boolean) {
  vi.mocked(hooks.useActiveCommunityRole).mockReturnValue(null);
  vi.mocked(hooks.useIsPlatformAdmin).mockReturnValue(isPlatformAdmin);

  render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route path="/" element={<span>home</span>} />
        <Route
          path="/protected"
          element={
            <PlatformAdminRoute>
              <span>protected</span>
            </PlatformAdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PlatformAdminRoute", () => {
  test("renders children for platform admin", () => {
    setup(true);
    expect(screen.getByText("protected")).toBeInTheDocument();
  });

  test("redirects to / for non-platform admin", () => {
    setup(false);
    expect(screen.getByText("home")).toBeInTheDocument();
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
  });
});
