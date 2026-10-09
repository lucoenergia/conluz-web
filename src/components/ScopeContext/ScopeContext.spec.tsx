import "@testing-library/jest-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestQueryClient, renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildCommunity, buildCurrentUser } from "../../test/fixtures";
import type { CurrentUserResponse, UserResponseMemberships } from "../../api/models";
import { useGetAllCommunities, type getAllCommunities } from "../../api/communities/communities";
import { useGetSuppliesByUserId } from "../../api/users/users";
import { ScopeContext } from "./ScopeContext";

let loggedUser: CurrentUserResponse | null = null;
const mockDispatch = vi.fn();
const activeCommunity = { current: null as string | null };

vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => loggedUser,
}));

vi.mock(import("../../context/community.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useActiveCommunity: () => activeCommunity.current,
  useActiveCommunityDispatch: () => mockDispatch,
}));

vi.mock(import("../../api/communities/communities"), () => ({
  useGetAllCommunities: vi.fn(),
}));

// Read by the harness's real CommunityProvider, for the first-time rule (#237).
// The active community is mocked above, so the provider's own choice is never
// what this surface sees; its read is left unanswered.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
}));

const LONG_NAME = "Comunidad Energética Renovable del Valle Alto de la Sierra de Luco";

const TWO_COMMUNITIES: UserResponseMemberships = {
  "community-a": "COMMUNITY_ADMIN",
  "community-b": "COMMUNITY_MEMBER",
};

function setUp(memberships: UserResponseMemberships, active: string | null) {
  loggedUser = buildCurrentUser({ id: "u1", memberships });
  activeCommunity.current = active;
}

function scopeRegion() {
  return screen.getByRole("region", { name: "Ámbito de la página" });
}

beforeEach(() => {
  mockDispatch.mockClear();
  vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.disabled());
  vi.mocked(useGetAllCommunities).mockReturnValue(
    query.success<typeof getAllCommunities>([
      buildCommunity({ id: "community-a", name: "Comunidad Alpha" }),
      buildCommunity({ id: "community-b", name: LONG_NAME }),
      buildCommunity({ id: "community-z", name: "Comunidad ajena" }),
    ]),
  );
});

describe("ScopeContext — community-scoped page", () => {
  test("states the active community with initials, the label and its name", () => {
    setUp(TWO_COMMUNITIES, "community-a");
    renderWithProviders(<ScopeContext variant="menuHeader" />, { route: "/production" });

    const region = scopeRegion();
    expect(within(region).getByText("Comunidad activa")).toBeInTheDocument();
    expect(within(region).getByText("Comunidad Alpha")).toBeInTheDocument();
    expect(within(region).getByText("CA")).toBeInTheDocument();
  });

  test("AC5: a single community is a plain label: no control, nothing focusable", async () => {
    const user = userEvent.setup();
    setUp({ "community-a": "COMMUNITY_MEMBER" }, "community-a");
    renderWithProviders(<ScopeContext variant="strip" />, { route: "/" });

    const region = scopeRegion();
    expect(within(region).getByText("Comunidad Alpha")).toBeInTheDocument();
    expect(within(region).getByText("Comunidad activa")).toBeInTheDocument();
    expect(within(region).queryByRole("button")).not.toBeInTheDocument();
    expect(region.querySelector("[aria-haspopup]")).toBeNull();

    await user.tab();
    expect(region).not.toContainElement(document.activeElement as HTMLElement);
  });

  test("with several communities the surface is a control named after the active one", () => {
    setUp(TWO_COMMUNITIES, "community-a");
    renderWithProviders(<ScopeContext variant="strip" />, { route: "/" });

    const control = within(scopeRegion()).getByRole("button", { name: /Comunidad activa: Comunidad Alpha/ });
    expect(control).toHaveAttribute("aria-haspopup", "menu");
    expect(control).toHaveAttribute("aria-expanded", "false");
  });

  // Several communities and none active is the moment before the selection is
  // worked out (#237): the surface waits, it does not ask the caller to choose.
  test("UI-ENT-005 with several communities and none active yet it reads as loading, not as a prompt", () => {
    setUp(TWO_COMMUNITIES, null);
    renderWithProviders(<ScopeContext variant="strip" />, { route: "/" });

    expect(within(scopeRegion()).getByRole("button", { name: /Cargando comunidad…/ })).toBeInTheDocument();
    expect(within(scopeRegion()).getByText("Comunidad activa")).toBeInTheDocument();
  });

  test("lists only the user's communities", async () => {
    const user = userEvent.setup();
    setUp(TWO_COMMUNITIES, "community-a");
    renderWithProviders(<ScopeContext variant="strip" />, { route: "/" });

    await user.click(screen.getByRole("button", { name: /Cambiar comunidad/ }));

    const menu = screen.getByRole("menu");
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(2);
    expect(within(menu).queryByText("Comunidad ajena")).not.toBeInTheDocument();
    expect(within(menu).getByText("Tus comunidades")).toBeInTheDocument();
  });

  test("AC10: a long name truncates on the control and reads in full in the list", async () => {
    const user = userEvent.setup();
    setUp(TWO_COMMUNITIES, "community-b");
    renderWithProviders(<ScopeContext variant="strip" />, { route: "/" });

    // Structural check: the ellipsis comes from Typography's noWrap, whose CSS
    // sits in a cascade layer jsdom does not resolve, so the class is asserted.
    const closedName = within(scopeRegion()).getByText(LONG_NAME);
    expect(closedName).toHaveClass("MuiTypography-noWrap");

    await user.click(screen.getByRole("button", { name: /Cambiar comunidad/ }));

    const listed = within(screen.getByRole("menu")).getByText(LONG_NAME);
    expect(listed).toHaveTextContent(LONG_NAME);
    expect(listed).not.toHaveClass("MuiTypography-noWrap");
    expect(listed).not.toHaveAttribute("title");
  });

  test("AC12: operable by keyboard alone; the active community is marked and another can be chosen", async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    setUp(TWO_COMMUNITIES, "community-a");
    renderWithProviders(<ScopeContext variant="menuHeader" />, { route: "/", queryClient });

    await user.tab();
    const control = screen.getByRole("button", { name: /Cambiar comunidad/ });
    expect(control).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(control).toHaveAttribute("aria-expanded", "true");

    // Focus opens on the active community, which is marked as current.
    const active = screen.getByRole("menuitem", { name: /Comunidad Alpha/ });
    expect(active).toHaveFocus();
    expect(active).toHaveAttribute("aria-current", "true");

    await user.keyboard("{ArrowDown}");
    const other = screen.getByRole("menuitem", { name: new RegExp(LONG_NAME) });
    expect(other).toHaveFocus();
    expect(other).not.toHaveAttribute("aria-current");

    await user.keyboard("{Enter}");
    expect(mockDispatch).toHaveBeenCalledWith("community-b");
    expect(invalidateSpy).toHaveBeenCalledWith();
  });

  test("choosing the community already active changes nothing", async () => {
    const user = userEvent.setup();
    setUp(TWO_COMMUNITIES, "community-a");
    renderWithProviders(<ScopeContext variant="strip" />, { route: "/" });

    await user.click(screen.getByRole("button", { name: /Cambiar comunidad/ }));
    await user.click(screen.getByRole("menuitem", { name: /Comunidad Alpha/ }));

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test("renders nothing for a user with no community", () => {
    setUp({}, null);
    renderWithProviders(<ScopeContext variant="strip" />, { route: "/" });

    expect(screen.queryByRole("region", { name: "Ámbito de la página" })).not.toBeInTheDocument();
  });
});

describe("ScopeContext — platform and personal pages (AC7, AC13)", () => {
  // Icons are asserted through the data-testid MUI gives every icon: an icon
  // has no role or text, and AC13 is precisely that text AND icon tell the
  // states apart without colour.
  test("a platform page shows 'Toda la plataforma' with a globe and is not interactive", () => {
    setUp(TWO_COMMUNITIES, "community-a");
    renderWithProviders(<ScopeContext variant="strip" />, { route: "/users" });

    const region = scopeRegion();
    expect(within(region).getByText("Toda la plataforma")).toBeInTheDocument();
    expect(within(region).getByText("Esta página no depende de la comunidad activa.")).toBeInTheDocument();
    expect(within(region).getByTestId("PublicRoundedIcon")).toBeInTheDocument();
    expect(within(region).queryByRole("button")).not.toBeInTheDocument();
    expect(within(region).queryByText("Comunidad Alpha")).not.toBeInTheDocument();
  });

  test("a personal page shows 'Tu cuenta' with a person icon and is not interactive", () => {
    setUp(TWO_COMMUNITIES, "community-a");
    renderWithProviders(<ScopeContext variant="menuHeader" />, { route: "/profile" });

    const region = scopeRegion();
    expect(within(region).getByText("Tu cuenta")).toBeInTheDocument();
    expect(within(region).getByText("Esta página solo afecta a tus propios datos.")).toBeInTheDocument();
    expect(within(region).getByTestId("PersonRoundedIcon")).toBeInTheDocument();
    expect(within(region).queryByRole("button")).not.toBeInTheDocument();
  });

  test("the three states differ by text and by icon", () => {
    setUp(TWO_COMMUNITIES, "community-a");
    const states = ["/", "/communities", "/change-password"].map((route) => {
      const { unmount } = renderWithProviders(<ScopeContext variant="strip" />, { route });
      const region = scopeRegion();
      const icons = Array.from(region.querySelectorAll("svg[data-testid]")).map((svg) => svg.getAttribute("data-testid"));
      const text = region.textContent;
      unmount();
      return { icons: icons.join(","), text };
    });

    expect(new Set(states.map((state) => state.text)).size).toBe(3);
    // The community state's glyph is its initials; the other two carry distinct icons.
    expect(states[1].icons).not.toEqual(states[2].icons);
  });

  test.each(["/no-community", "/not-a-classified-route"])("%s renders no scope surface", (route) => {
    setUp(TWO_COMMUNITIES, "community-a");
    const { container } = renderWithProviders(<ScopeContext variant="strip" />, { route });

    expect(container).toBeEmptyDOMElement();
  });
});
