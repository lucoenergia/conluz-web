import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { mutation, query } from "../test/queryState";
import { buildCurrentUser, buildUserCapabilities } from "../test/fixtures";
import { CommunityRole } from "../api/models";
import type { CurrentUserResponse } from "../api/models";
import { useGetCurrentUser, useUpdateProfile, type getCurrentUser } from "../api/users/users";


const mockErrorDispatch = vi.fn();
const mockSaveProfile = vi.fn();
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

// Only the two hooks this page reaches are replaced. useProfileActions runs
// for real -- it is the subject, not scaffolding -- and it needs the module's
// real getGetCurrentUserQueryKey to invalidate with.
vi.mock(import("../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCurrentUser: vi.fn(),
  useUpdateProfile: vi.fn(),
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
    mockSaveProfile.mockResolvedValue(mockCurrentUser);
    vi.mocked(useGetCurrentUser).mockReturnValue(query.success<typeof getCurrentUser>(mockCurrentUser));
    vi.mocked(useUpdateProfile).mockReturnValue(mutation.idle({ mutateAsync: mockSaveProfile }));
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

/**
 * Saving the profile.
 *
 * The screen used to save through PUT /users/{userId}, whose canEdit the API
 * documents as false for an ordinary member looking at their own record. It
 * now goes through PUT /users/profile, which acts on the caller and takes no
 * id -- so these tests are mostly about who it does NOT ask.
 */
describe("ProfilePage save", () => {
  const PERSONAS: [string, CurrentUserResponse][] = [
    [
      // The release blocker: canEdit false on their own record, and they still
      // save. Nothing on this page may consult it.
      "a plain member who may not be edited administratively",
      buildCurrentUser({
        ...mockCurrentUser,
        isPlatformAdmin: false,
        memberships: { "community-1": CommunityRole.COMMUNITY_MEMBER },
        capabilities: buildUserCapabilities({ canEdit: false }),
      }),
    ],
    [
      "a community admin",
      buildCurrentUser({
        ...mockCurrentUser,
        isPlatformAdmin: false,
        memberships: { "community-1": CommunityRole.COMMUNITY_ADMIN },
        capabilities: buildUserCapabilities({ canEdit: false }),
      }),
    ],
    [
      "a platform admin with no membership",
      buildCurrentUser({
        ...mockCurrentUser,
        isPlatformAdmin: true,
        memberships: {},
        capabilities: buildUserCapabilities({ canEdit: true }),
      }),
    ],
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockRoleLabel = "";
    mockSaveProfile.mockResolvedValue(mockCurrentUser);
    vi.mocked(useUpdateProfile).mockReturnValue(mutation.idle({ mutateAsync: mockSaveProfile }));
  });

  const save = async (user: CurrentUserResponse) => {
    vi.mocked(useGetCurrentUser).mockReturnValue(query.success<typeof getCurrentUser>(user));
    renderWithProviders(<ProfilePage />);
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  };

  it.each(PERSONAS)("saves through the profile endpoint for %s", async (_name, user) => {
    await save(user);

    await waitFor(() => expect(mockSaveProfile).toHaveBeenCalledTimes(1));
    // No userId in the variables: the endpoint has none to take.
    expect(mockSaveProfile).toHaveBeenCalledWith({
      data: { email: "ana@example.com", address: "Calle Mayor 1", phoneNumber: "600000001" },
    });
  });

  it("submits exactly the three fields the endpoint accepts", async () => {
    await save(mockCurrentUser);

    await waitFor(() => expect(mockSaveProfile).toHaveBeenCalledTimes(1));
    const [{ data }] = mockSaveProfile.mock.calls[0] as [{ data: Record<string, unknown> }];
    // fullName, personalId and number back in here is the administrative body
    // returning, and with it the 403 for every ordinary member.
    expect(Object.keys(data).sort()).toEqual(["address", "email", "phoneNumber"]);
  });

  it("clears an emptied optional field rather than sending a blank", async () => {
    vi.mocked(useGetCurrentUser).mockReturnValue(query.success<typeof getCurrentUser>(mockCurrentUser));
    renderWithProviders(<ProfilePage />);

    await userEvent.clear(screen.getByLabelText("Dirección"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(mockSaveProfile).toHaveBeenCalledTimes(1));
    expect(mockSaveProfile).toHaveBeenCalledWith({
      data: { email: "ana@example.com", address: undefined, phoneNumber: "600000001" },
    });
  });

  it("reports a rejected save without a success message", async () => {
    mockSaveProfile.mockRejectedValue(new Error("boom"));
    await save(mockCurrentUser);

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Perfil actualizado correctamente")).not.toBeInTheDocument();
  });

  it("confirms a successful save", async () => {
    await save(mockCurrentUser);

    expect(await screen.findByText("Perfil actualizado correctamente")).toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });
});

describe("ProfilePage identity fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoleLabel = "";
    vi.mocked(useGetCurrentUser).mockReturnValue(query.success<typeof getCurrentUser>(mockCurrentUser));
    vi.mocked(useUpdateProfile).mockReturnValue(mutation.idle({ mutateAsync: mockSaveProfile }));
  });

  it.each([
    ["Nombre completo", "Ana García"],
    ["DNI/NIF", "11111111A"],
  ])("shows %s without letting it be edited", (label, value) => {
    renderWithProviders(<ProfilePage />);

    const field = screen.getByLabelText(label);
    expect(field).toHaveValue(value);
    expect(field).toHaveAttribute("readonly");
  });

  it("says how the identity fields are changed, rather than leaving it a mystery", () => {
    renderWithProviders(<ProfilePage />);

    expect(
      screen.getByText(/contacta con la administración de tu comunidad/i),
    ).toBeInTheDocument();
  });

  it("shows the member number once, as the chip", () => {
    renderWithProviders(<ProfilePage />);

    expect(screen.getByText("Socio #7")).toBeInTheDocument();
    expect(screen.queryByLabelText("Número de socio")).not.toBeInTheDocument();
  });
});
