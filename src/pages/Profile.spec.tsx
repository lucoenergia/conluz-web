import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { mutation, query } from "../test/queryState";
import { apiError } from "../test/apiError";
import { buildCurrentUser, buildUserCapabilities } from "../test/fixtures";
import { CommunityRole } from "../hooks/permissions";
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
import { VISIBLE } from "../test/visibleText";

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

  // This chip and the profile menu once named the same role differently.
  // "Miembro" is the app's word for a member (#400) -- the members page, the
  // users page and the menu all use it. Both screens now render whichever the
  // module reports.
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
 * The screen saves through PUT /users/profile, which acts on the caller, takes
 * no id and is open to any authenticated caller -- so these tests are mostly
 * about who it does NOT ask. Every caller's record grants nothing, because
 * nothing on this page may consult a capability.
 */
describe("ProfilePage save", () => {
  const CALLERS: [string, CurrentUserResponse][] = [
    [
      "a plain member",
      buildCurrentUser({
        ...mockCurrentUser,
        isPlatformAdmin: false,
        memberships: { "community-1": CommunityRole.COMMUNITY_MEMBER },
        capabilities: buildUserCapabilities(),
      }),
    ],
    [
      "a community admin",
      buildCurrentUser({
        ...mockCurrentUser,
        isPlatformAdmin: false,
        memberships: { "community-1": CommunityRole.COMMUNITY_ADMIN },
        capabilities: buildUserCapabilities(),
      }),
    ],
    [
      "a platform admin with no membership",
      buildCurrentUser({
        ...mockCurrentUser,
        isPlatformAdmin: true,
        memberships: {},
        capabilities: buildUserCapabilities(),
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

  it.each(CALLERS)("saves through the profile endpoint for %s", async (_name, user) => {
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

    expect(await screen.findByText("Perfil actualizado correctamente", VISIBLE)).toBeInTheDocument();
    // Announced through a region that was in place before the save (#310).
    expect(screen.getByRole("status")).toHaveTextContent("Perfil actualizado correctamente");
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });
});

describe("ProfilePage address and refusals (#411)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoleLabel = "";
    mockSaveProfile.mockResolvedValue(mockCurrentUser);
    vi.mocked(useUpdateProfile).mockReturnValue(mutation.idle({ mutateAsync: mockSaveProfile }));
    vi.mocked(useGetCurrentUser).mockReturnValue(query.success<typeof getCurrentUser>(mockCurrentUser));
  });

  const address = () => screen.getByRole("textbox", { name: "Dirección" });

  it("UI-FRM-001 refuses the 251st character", async () => {
    const u = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await u.clear(address());
    await u.paste("a".repeat(250));
    await u.type(address(), "b");

    expect(address()).toHaveValue("a".repeat(250));
  });

  it("UI-FRM-002 Enter in the address submits the form, and adds no line break", async () => {
    const u = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await u.type(address(), ", bajo{Enter}");

    await waitFor(() => expect(mockSaveProfile).toHaveBeenCalledTimes(1));
    expect(mockSaveProfile).toHaveBeenCalledWith({
      data: { email: "ana@example.com", address: "Calle Mayor 1, bajo", phoneNumber: "600000001" },
    });
  });

  it.each<[string, unknown, string]>([
    [
      "a catalogued code with its catalogue's text",
      apiError(400, { code: "FIELD_TOO_LONG", params: { field: "address", maxLength: "250", n: "251" } }),
      "La dirección puede tener como máximo 250 caracteres. Ahora tiene 251.",
    ],
    ["a code outside the catalogue with the server's message", apiError(400, { code: null }), "raw backend message"],
    [
      "a failure with no error detail with the page's own text",
      apiError(500),
      "Error al actualizar el perfil. Por favor, inténtalo de nuevo.",
    ],
  ])("UI-PRF-004 words %s", async (_case, error, message) => {
    mockSaveProfile.mockRejectedValue(error);
    const u = userEvent.setup();
    renderWithProviders(<ProfilePage />);

    await u.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(message));
    expect(mockErrorDispatch).toHaveBeenCalledTimes(1);
    expect(address()).toHaveValue("Calle Mayor 1");
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

    expect(screen.getByRole("img", { name: "Número de miembro 7" })).toHaveTextContent("Nº 7");
    expect(screen.queryByRole("textbox", { name: /número de miembro/i })).not.toBeInTheDocument();
  });

  // "º" is the masculine ordinal indicator (U+00BA), not the degree sign
  // (U+00B0) it looks like. Code points, so a look-alike cannot pass.
  it("UI-PRF-003 abbreviates número with the ordinal indicator, not the degree sign", () => {
    renderWithProviders(<ProfilePage />);

    const codePoints = [...(screen.getByRole("img", { name: "Número de miembro 7" }).textContent ?? "")].map(
      (character) => character.codePointAt(0),
    );
    expect(codePoints).toEqual([0x4e, 0xba, 0x20, 0x37]);
    expect(codePoints).not.toContain(0xb0);
  });

  it("UI-PRF-003 shows no member-number chip for an account without a number", () => {
    mockRoleLabel = "Miembro";
    vi.mocked(useGetCurrentUser).mockReturnValue(
      query.success<typeof getCurrentUser>({ ...mockCurrentUser, number: null }),
    );
    renderWithProviders(<ProfilePage />);

    expect(screen.queryByRole("img", { name: /^Número de miembro/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Nº /)).not.toBeInTheDocument();
    // Only the number's chip goes; the role chip beside it stays.
    expect(screen.getByText("Miembro")).toBeInTheDocument();
  });

  it("UI-PRF-003 shows a member number of 0, which is a real number", () => {
    vi.mocked(useGetCurrentUser).mockReturnValue(
      query.success<typeof getCurrentUser>({ ...mockCurrentUser, number: 0 }),
    );
    renderWithProviders(<ProfilePage />);

    expect(screen.getByRole("img", { name: "Número de miembro 0" })).toHaveTextContent("Nº 0");
  });
});
