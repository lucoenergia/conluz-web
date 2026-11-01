import "@testing-library/jest-dom";
import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildCurrentUser,
  buildPlatformCapabilities,
} from "../../test/fixtures";
import type {
  CommunityCapabilitiesResponse,
  CommunityResponse,
  PlatformCapabilitiesResponse,
} from "../../api/models";

const mockNavigate = vi.fn();
const mockErrorDispatch = vi.fn();

/**
 * What a platform admin holds on a community they administer: canUpdate,
 * canEnable, canDisable and canManageAdmins are platform-wide decisions.
 */
const PLATFORM_VIEW: Partial<CommunityCapabilitiesResponse> = {
  canRead: true,
  canUpdate: true,
  canEnable: true,
  canDisable: true,
  canManageAdmins: true,
};

/** What a community's own admin holds: its roster, but neither the community record nor its admins. */
const COMMUNITY_ADMIN_VIEW: Partial<CommunityCapabilitiesResponse> = {
  canRead: true,
  canUpdate: false,
  canManageMemberships: true,
  canManageAdmins: false,
};

const community = (
  overrides: Partial<CommunityResponse>,
  capabilities: Partial<CommunityCapabilitiesResponse> = PLATFORM_VIEW,
): CommunityResponse =>
  buildCommunity({ ...overrides, capabilities: buildCommunityCapabilities(capabilities) });

const MOCK_COMMUNITIES = [
  community({
    id: "c1",
    name: "Sol Común",
    code: "SOL",
    legalId: "B12345678",
    address: "Calle Mayor 1",
    enabled: true,
    adminNames: ["Ana García", "Bruno Leal", "Carlos Ruiz"],
    memberCount: 25,
    supplyPointCount: 12,
  }),
  community({
    id: "c2",
    name: "Verde Activa",
    code: "VRD",
    legalId: undefined,
    address: undefined,
    enabled: false,
    adminNames: ["Diana Mora"],
    memberCount: 8,
    supplyPointCount: 4,
  }),
];

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

// Only the read is replaced. The actions layer runs for real -- which is the
// point: what is under test is that each row's menu follows the capabilities on
// the payload. Spreading the original keeps the real query-key getters.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllCommunities: vi.fn(),
}));

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

const loggedUser = vi.hoisted(() => ({ current: null as ReturnType<typeof Object> | null }));

vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => loggedUser.current,
}));

import { useGetAllCommunities, type getAllCommunities } from "../../api/communities/communities";
import { CommunitiesPage } from "./CommunitiesPage";

const menuFor = (name: string) => screen.getByRole("button", { name: `Más acciones para ${name}` });
const noMenuFor = (name: string) =>
  screen.queryByRole("button", { name: `Más acciones para ${name}` });

function setup(
  options: {
    communities?: CommunityResponse[];
    platform?: Partial<PlatformCapabilitiesResponse> | null;
    communitiesLoading?: boolean;
  } = {},
) {
  const {
    communities = MOCK_COMMUNITIES,
    platform = { canAdministerPlatform: true, canCreateCommunity: true },
  } = options;

  loggedUser.current =
    platform === null
      ? null
      : buildCurrentUser({ platformCapabilities: buildPlatformCapabilities(platform) });

  vi.mocked(useGetAllCommunities).mockReturnValue(
    options.communitiesLoading
      ? query.loading()
      : query.success<typeof getAllCommunities>(communities),
  );

  return renderWithProviders(<CommunitiesPage />);
}

describe("CommunitiesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders community names and codes", () => {
    setup();
    expect(screen.getByText("Sol Común")).toBeInTheDocument();
    expect(screen.getByText("SOL")).toBeInTheDocument();
    expect(screen.getByText("Verde Activa")).toBeInTheDocument();
    expect(screen.getByText("VRD")).toBeInTheDocument();
  });

  it("shows first two admin names and 'y N más' overflow under Sol Común's name", () => {
    setup();
    expect(screen.getByText("Administradores: Ana García, Bruno Leal y 1 más")).toBeInTheDocument();
  });

  it("shows single admin name without overflow under Verde Activa's name", () => {
    setup();
    expect(screen.getByText("Administradores: Diana Mora")).toBeInTheDocument();
  });

  it("shows memberCount and supplyPointCount columns", () => {
    setup();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows status chips Activa / Inactiva", () => {
    setup();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("Inactiva")).toBeInTheDocument();
  });

  describe("creating a community", () => {
    it("offers Nueva Comunidad when the platform permits it", () => {
      setup();

      expect(screen.getByRole("link", { name: /Nueva Comunidad/i })).toHaveAttribute(
        "href",
        "/communities/new",
      );
    });

    it("offers nothing when it does not", () => {
      setup({ platform: { canAdministerPlatform: true, canCreateCommunity: false } });

      expect(screen.queryByRole("link", { name: /Nueva Comunidad/i })).not.toBeInTheDocument();
    });

    // Not yet known is not "no", and it is not "yes" either.
    it("offers nothing while the current user has not arrived", () => {
      setup({ platform: null });

      expect(screen.queryByRole("link", { name: /Nueva Comunidad/i })).not.toBeInTheDocument();
    });
  });

  describe("the row menu", () => {
    it("offers both items to a platform admin", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(menuFor("Sol Común"));

      expect(await screen.findByRole("menuitem", { name: /Editar/ })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /Gestionar administradores/ })).toBeInTheDocument();
    });

    // The roster is what a community admin administers; neither the community
    // record nor the community's admins is: both are platform-wide decisions.
    it("UI-ADM-001 gives a community admin no menu: neither the community record nor its admins", () => {
      setup({ communities: [community({ id: "c1", name: "Sol Común" }, COMMUNITY_ADMIN_VIEW)] });

      expect(noMenuFor("Sol Común")).toBeNull();
    });

    it("gives a plain member no menu at all", () => {
      setup({ communities: [community({ id: "c1", name: "Sol Común" }, { canRead: true })] });

      expect(noMenuFor("Sol Común")).toBeNull();
    });

    // Every community carries its own answer, so a list may legitimately mix them.
    it("decides each row from its own community, not from the platform", () => {
      setup({
        communities: [
          community({ id: "c1", name: "Sol Común" }, PLATFORM_VIEW),
          community({ id: "c2", name: "Verde Activa" }, { canRead: true }),
        ],
      });

      expect(menuFor("Sol Común")).toBeInTheDocument();
      expect(noMenuFor("Verde Activa")).toBeNull();
    });

    it("offers nothing while the list has not loaded — not yet known is not 'no'", () => {
      setup({ communitiesLoading: true });

      expect(noMenuFor("Sol Común")).toBeNull();
    });

    it("navigates to /communities/:id/edit when Editar is chosen from the menu", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(menuFor("Sol Común"));
      await user.click(await screen.findByRole("menuitem", { name: /Editar/ }));

      expect(mockNavigate).toHaveBeenCalledWith("/communities/c1/edit");
    });
  });

  describe("managing administrators", () => {
    it("UI-ADM-001 navigates to the community's admins page when the menu item is chosen", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(menuFor("Sol Común"));
      await user.click(await screen.findByRole("menuitem", { name: /Gestionar administradores/ }));

      expect(mockNavigate).toHaveBeenCalledWith("/communities/c1/admins");
    });

    it("UI-ADM-001 is not offered without canManageAdmins, whatever the roster allows", async () => {
      const user = userEvent.setup();
      setup({
        communities: [
          community({ id: "c1", name: "Sol Común" }, { canRead: true, canUpdate: true, canManageMemberships: true }),
        ],
      });

      await user.click(menuFor("Sol Común"));

      expect(await screen.findByRole("menuitem", { name: /Editar/ })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: /Gestionar administradores/ })).not.toBeInTheDocument();
    });

    it("UI-ADM-001 is not offered when canManageAdmins is missing, as from an older backend", async () => {
      const user = userEvent.setup();
      const capabilities = buildCommunityCapabilities({ canRead: true, canUpdate: true, canManageAdmins: true });
      delete (capabilities as Partial<typeof capabilities>).canManageAdmins;
      setup({ communities: [buildCommunity({ id: "c1", name: "Sol Común", capabilities })] });

      await user.click(menuFor("Sol Común"));

      expect(await screen.findByRole("menuitem", { name: /Editar/ })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: /Gestionar administradores/ })).not.toBeInTheDocument();
    });
  });
});

describe("CommunitiesPage as a records list (#347)", () => {
  const originalWidth = window.innerWidth;
  const setViewportWidth = (width: number) =>
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => setViewportWidth(originalWidth));

  const many = (count: number) =>
    Array.from({ length: count }, (_, index) =>
      community({ id: `c${index + 1}`, name: `Comunidad ${String(index + 1).padStart(2, "0")}`, code: `C${index + 1}` }),
    );

  it("UI-LST-001 shows the stacked list, not a table, at a 1023px viewport", () => {
    setViewportWidth(1023);
    setup();

    expect(screen.getByRole("list", { name: "Comunidades" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("UI-LST-001 shows the table from a 1024px viewport, with code, NIF/CIF, address and administrators under the name", () => {
    setViewportWidth(1024);
    setup();

    expect(screen.queryByRole("list", { name: "Comunidades" })).not.toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Nombre",
      "Miembros",
      "Suministros",
      "Estado",
      "Acciones",
    ]);

    const sol = within(screen.getByText("Sol Común").closest("td") as HTMLElement);
    expect(sol.getByText("SOL")).toBeInTheDocument();
    expect(sol.getByText("NIF/CIF B12345678")).toBeInTheDocument();
    expect(sol.getByText("Calle Mayor 1")).toBeInTheDocument();
    expect(sol.getByText("Administradores: Ana García, Bruno Leal y 1 más")).toBeInTheDocument();
    // In that order: code, NIF/CIF, address, administrators.
    expect(screen.getByText("Sol Común").closest("td")).toHaveTextContent(
      /^Sol Común\s*SOL\s*NIF\/CIF B12345678\s*Calle Mayor 1\s*Administradores: Ana García, Bruno Leal y 1 más$/,
    );

    // A missing tax id or address is left out, not shown as "—".
    const verde = screen.getByText("Verde Activa").closest("td") as HTMLElement;
    expect(within(verde).getByText("VRD")).toBeInTheDocument();
    expect(verde).not.toHaveTextContent("NIF/CIF");
    expect(verde).not.toHaveTextContent("—");
  });

  it("UI-LST-001 leaves the administrators line out for a community without administrators, with no placeholder", () => {
    setViewportWidth(1024);
    setup({
      communities: [
        community({ id: "c1", name: "Sol Común", code: "SOL", adminNames: ["Ana García"] }),
        community({ id: "c3", name: "Sin Gestión", code: "SGN", adminNames: [] }),
      ],
    });

    const row = screen.getByText("Sin Gestión").closest("tr") as HTMLElement;
    expect(row).not.toHaveTextContent("Administradores");
    expect(row).not.toHaveTextContent("—");
    expect(screen.getByText("Administradores: Ana García")).toBeInTheDocument();
  });

  it("UI-LST-004 shows what failed and a retry that reads the list again, not the empty state", async () => {
    const user = userEvent.setup();
    loggedUser.current = buildCurrentUser({
      platformCapabilities: buildPlatformCapabilities({ canAdministerPlatform: true }),
    });
    const failed = query.error<CommunityResponse[]>(new AxiosError("Network Error"));
    vi.mocked(useGetAllCommunities).mockReturnValue(failed);
    renderWithProviders(<CommunitiesPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar las comunidades.");
    expect(screen.queryByText("No hay comunidades registradas")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(failed.refetch).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state for a list that loaded with no communities", () => {
    setup({ communities: [] });

    expect(screen.getByRole("heading", { name: "No hay comunidades registradas" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("UI-LST-005 shows 25 communities without pagination", () => {
    setup({ communities: many(25) });

    expect(screen.getAllByRole("row")).toHaveLength(26);
    expect(screen.queryByRole("navigation", { name: "Páginas de comunidades" })).not.toBeInTheDocument();
  });

  it("UI-LST-005 shows the first 25 of 26 communities, and the pagination", async () => {
    const user = userEvent.setup();
    setup({ communities: many(26) });

    expect(screen.getAllByRole("row")).toHaveLength(26);
    expect(screen.getByText("Comunidad 25")).toBeInTheDocument();
    expect(screen.queryByText("Comunidad 26")).not.toBeInTheDocument();
    expect(screen.getByText("1–25 de 26 comunidades")).toBeInTheDocument();

    await user.click(
      within(screen.getByRole("navigation", { name: "Páginas de comunidades" })).getByRole("button", {
        name: "Página siguiente",
      }),
    );

    expect(screen.getByText("Comunidad 26")).toBeInTheDocument();
    expect(screen.queryByText("Comunidad 01")).not.toBeInTheDocument();
  });
});
