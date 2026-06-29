import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockErrorDispatch = vi.fn();
const mockUpdateMutate = vi.fn();
let mockIsPlatformAdmin = false;
let mockActiveCommunityRole: string | null = null;

const mockCurrentUser = {
  id: "u1",
  number: 7,
  fullName: "Ana García",
  personalId: "11111111A",
  email: "ana@example.com",
  address: "Calle Mayor 1",
  phoneNumber: "600000001",
};

vi.mock("../api/users/users", () => ({
  useGetCurrentUser: () => ({ data: mockCurrentUser, isLoading: false, error: null, refetch: vi.fn() }),
  useUpdateUser: () => ({ mutateAsync: mockUpdateMutate, isPending: false }),
}));

vi.mock("../context/error.context", () => ({
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock("../hooks/useActiveCommunityRole", () => ({
  useIsPlatformAdmin: () => mockIsPlatformAdmin,
  useActiveCommunityRole: () => mockActiveCommunityRole,
}));

import { MemoryRouter } from "react-router";
import { ProfilePage } from "./Profile";

describe("ProfilePage role label", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPlatformAdmin = false;
    mockActiveCommunityRole = null;
  });

  const setup = () =>
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

  it("shows platform-admin label when the user is a platform admin", () => {
    mockIsPlatformAdmin = true;
    setup();

    expect(screen.getByText("Administrador de plataforma")).toBeInTheDocument();
  });

  it("shows community-admin label when the active-community role is COMMUNITY_ADMIN", () => {
    mockActiveCommunityRole = "COMMUNITY_ADMIN";
    setup();

    expect(screen.getByText("Administrador de comunidad")).toBeInTheDocument();
  });

  it("shows member label when the active-community role is COMMUNITY_MEMBER", () => {
    mockActiveCommunityRole = "COMMUNITY_MEMBER";
    setup();

    expect(screen.getByText("Socio")).toBeInTheDocument();
  });

  it("omits the role chip when there is no platform-admin flag nor active-community role", () => {
    setup();

    expect(screen.queryByText("Administrador de plataforma")).not.toBeInTheDocument();
    expect(screen.queryByText("Administrador de comunidad")).not.toBeInTheDocument();
    expect(screen.queryByText("Socio")).not.toBeInTheDocument();
  });
});
