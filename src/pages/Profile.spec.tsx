import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { mutation, query } from "../test/queryState";
import { buildCurrentUser } from "../test/fixtures";
import { useGetCurrentUser, useUpdateUser, type getCurrentUser } from "../api/users/users";


const mockErrorDispatch = vi.fn();
const mockUpdateMutate = vi.fn();
let mockRoleLabel = "";

const mockCurrentUser = buildCurrentUser({
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

// The page renders whatever label the permissions module produces; how that
// label is chosen is roleLabel.spec's subject, not this one's.
vi.mock(import("../hooks/permissions"), async (importOriginal) => ({
  ...(await importOriginal()),
  useActiveCommunityRoleLabel: () => mockRoleLabel,
}));

import { ProfilePage } from "./Profile";

describe("ProfilePage role label", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoleLabel = "";
    vi.mocked(useGetCurrentUser).mockReturnValue(query.success<typeof getCurrentUser>(mockCurrentUser));
    vi.mocked(useUpdateUser).mockReturnValue(mutation.idle({ mutateAsync: mockUpdateMutate }));
  });

  const setup = () =>
    renderWithProviders(<ProfilePage />);

  it("shows the role label the permissions module reports", () => {
    mockRoleLabel = "Administrador de plataforma";
    setup();

    expect(screen.getByText("Administrador de plataforma")).toBeInTheDocument();
  });

  it("shows a community role label the same way", () => {
    mockRoleLabel = "Administrador de comunidad";
    setup();

    expect(screen.getByText("Administrador de comunidad")).toBeInTheDocument();
  });

  // Was "Socio" here and "Miembro" in the profile menu, for the same role.
  // "Miembro" is the app's word for the role -- the members page, the users
  // page and the menu all use it -- while "Socio" counts people (`Socio #7`
  // just below this chip, the "Socios" totals on the platform and community
  // pages). Both screens now render whichever the module reports.
  it("names a plain member Miembro", () => {
    mockRoleLabel = "Miembro";
    setup();

    expect(screen.getByText("Miembro")).toBeInTheDocument();
  });

  it("omits the role chip entirely when there is no role to report", () => {
    setup();

    expect(screen.queryByText("Administrador de plataforma")).not.toBeInTheDocument();
    expect(screen.queryByText("Administrador de comunidad")).not.toBeInTheDocument();
    expect(screen.queryByText("Miembro")).not.toBeInTheDocument();
  });
});
