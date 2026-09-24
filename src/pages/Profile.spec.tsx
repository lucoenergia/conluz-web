import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { mutation, query } from "../test/queryState";
import { buildUser } from "../test/fixtures";
import { useGetCurrentUser, useUpdateUser, type getCurrentUser } from "../api/users/users";
import type { useActiveCommunityRole } from "../hooks/useActiveCommunityRole";

const mockErrorDispatch = vi.fn();
const mockUpdateMutate = vi.fn();
let mockIsPlatformAdmin = false;
let mockActiveCommunityRole: ReturnType<typeof useActiveCommunityRole> = null;

const mockCurrentUser = buildUser({
  id: "u1",
  number: 7,
  fullName: "Ana García",
  personalId: "11111111A",
  email: "ana@example.com",
  address: "Calle Mayor 1",
  phoneNumber: "600000001",
});

vi.mock(import("../api/users/users"), () => ({
  useGetCurrentUser: vi.fn(),
  useUpdateUser: vi.fn(),
}));

vi.mock(import("../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock(import("../hooks/useActiveCommunityRole"), () => ({
  useIsPlatformAdmin: () => mockIsPlatformAdmin,
  useActiveCommunityRole: () => mockActiveCommunityRole,
}));

import { ProfilePage } from "./Profile";

describe("ProfilePage role label", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPlatformAdmin = false;
    mockActiveCommunityRole = null;
    vi.mocked(useGetCurrentUser).mockReturnValue(query.success<typeof getCurrentUser>(mockCurrentUser));
    vi.mocked(useUpdateUser).mockReturnValue(mutation.idle({ mutateAsync: mockUpdateMutate }));
  });

  const setup = () =>
    renderWithProviders(<ProfilePage />);

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
