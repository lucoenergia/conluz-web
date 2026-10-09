import "@testing-library/jest-dom";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { FC } from "react";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { CommunityRole, type CurrentUserResponse } from "../../api/models";
import {
  useGetAllCommunities,
  useGetCommunityById,
  type getAllCommunities,
} from "../../api/communities/communities";
import {
  useGetMembershipEnergyMetrics,
  useGetMembershipHourlyProfile,
  useGetMembershipMonthlyConsumption,
  useGetMembershipPayback,
  useGetMemberships,
} from "../../api/memberships/memberships";
import { useGetAllPlants } from "../../api/plants/plants";
import { useGetAllSupplies } from "../../api/supplies/supplies";
import { useGetCurrentUser, useGetSuppliesByUserId, type getSuppliesByUserId } from "../../api/users/users";
import { customInstance } from "../../api/custom-instance";
import { ActiveCommunityResolvedContext } from "../../context/community.context";
import { useLoggedUser } from "../../context/logged-user.context";
import { buildCommunity, buildCurrentUser, buildPlatformCapabilities } from "../../test/fixtures";
import { query } from "../../test/queryState";
import { renderWithProviders } from "../../test/renderWithProviders";
import {
  COMMUNITY_A,
  COMMUNITY_B,
  USER_ID,
  answerCommunities,
  communitiesPending,
  currentUser,
  ownSupply,
} from "../home/homeViews.mocks";

/**
 * The acceptance criteria of #221, against the real route table in App.tsx
 * and the real AuthenticatedLayout, menu included. Only the reads are mocked.
 *
 * "/" has no screen of its own any more. What is under test is where each
 * caller ends up from there, and what renders while that is still undecided.
 */

// Every read below is mocked, and the pages these callers reach make no other.
// The fetcher is stubbed too, so that a read nobody mocked fails the test that
// made it instead of trying the network.
vi.mock(import("../../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: vi.fn(),
}));
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
  useGetAllCommunities: vi.fn(),
}));
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCurrentUser: vi.fn(),
  useGetSuppliesByUserId: vi.fn(),
}));
// The home views' own reads. Which view the caller reaches is under test, not
// its figures, so they all stay in flight.
vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMembershipEnergyMetrics: vi.fn(),
  useGetMembershipHourlyProfile: vi.fn(),
  useGetMembershipMonthlyConsumption: vi.fn(),
  useGetMembershipPayback: vi.fn(),
  useGetMemberships: vi.fn(),
}));
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllSupplies: vi.fn(),
}));
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllPlants: vi.fn(),
}));
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: vi.fn(),
}));

const MEMBER = currentUser({ [COMMUNITY_A]: CommunityRole.COMMUNITY_MEMBER });
const ADMIN = currentUser({ [COMMUNITY_A]: CommunityRole.COMMUNITY_ADMIN });
const MEMBER_OF_TWO = currentUser({
  [COMMUNITY_A]: CommunityRole.COMMUNITY_MEMBER,
  [COMMUNITY_B]: CommunityRole.COMMUNITY_MEMBER,
});
const ADMIN_OF_TWO = currentUser({
  [COMMUNITY_A]: CommunityRole.COMMUNITY_ADMIN,
  [COMMUNITY_B]: CommunityRole.COMMUNITY_ADMIN,
});
const NO_MEMBERSHIP = buildCurrentUser({ id: USER_ID, memberships: {} });
const PLATFORM_ADMIN_NO_MEMBERSHIP = buildCurrentUser({
  id: USER_ID,
  memberships: {},
  platformCapabilities: buildPlatformCapabilities({ canAdministerPlatform: true }),
});

const MEMBER_HEADING = { name: "Tu energía", level: 1 } as const;
const MANAGEMENT_HEADING = { name: "Gestión de la comunidad", level: 1 } as const;
const NO_COMMUNITY_HEADING = { name: "Sin comunidad asignada", level: 1 } as const;

const LocationProbe: FC = () => <output aria-label="Ruta actual">{useLocation().pathname}</output>;

/** A fresh element per call: a rerender handed the same one would be skipped. */
const appWithProbe = () => (
  <>
    <App />
    <LocationProbe />
  </>
);

function currentPath(): string | null {
  return screen.getByRole("status", { name: "Ruta actual" }).textContent;
}

function as(user: CurrentUserResponse, { adminOf = [] as string[] } = {}): void {
  vi.mocked(useLoggedUser).mockReturnValue(user);
  answerCommunities({ adminOf });
}

/**
 * Opens the app at `route`.
 *
 * `communityId` seeds the active community, resolved; `undefined` leaves it to
 * the real CommunityProvider, which is what a fresh sign-in goes through.
 * `resolved: false` holds the selection in the "not yet worked out" state the
 * provider passes through before its effect has run.
 */
function openApp(
  route: string,
  communityId?: string | null,
  { resolved = true, remembered }: { resolved?: boolean; remembered?: string } = {},
) {
  const ui = (isResolved: boolean) => (
    <ActiveCommunityResolvedContext.Provider value={isResolved}>
      <App />
      <LocationProbe />
    </ActiveCommunityResolvedContext.Provider>
  );
  const rendered = renderWithProviders(resolved ? appWithProbe() : ui(false), {
    route,
    token: "a-token",
    activeCommunityId: communityId,
    rememberedCommunity: remembered === undefined ? undefined : { userId: USER_ID, communityId: remembered },
  });
  return { ...rendered, resolve: () => rendered.rerender(ui(true)) };
}

/** Lets the lazy route chunks arrive and the effects settle. */
async function settle(): Promise<void> {
  await act(async () => {});
}

/**
 * While the landing cannot yet decide, nothing it could decide on renders.
 *
 * Every screen reachable from "/" -- either home view, the no-community
 * screen -- opens with an h1, so no h1 at all in the content
 * means none of them, and no screen standing in for them either. Not the route
 * chunk's spinner, which would mean the landing had not mounted and nothing
 * was being tested. And the caller has not been moved.
 */
function expectNothingDecided(): void {
  expect(currentPath()).toBe("/");
  const main = screen.getByRole("main");
  expect(within(main).queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  expect(within(main).queryByRole("progressbar")).not.toBeInTheDocument();
}

/** The surface that states the active community (#186). */
function scopeSurface(): HTMLElement {
  return screen.getByRole("region", { name: "Ámbito de la página" });
}

/** Where the caller owns supply points, as GET /users/{me}/supplies answers. */
function ownsSuppliesIn(...communityIds: string[]): void {
  vi.mocked(useGetSuppliesByUserId).mockReturnValue(
    query.success<typeof getSuppliesByUserId>(communityIds.map(ownSupply)),
  );
}

function suppliesReadEnabled(): boolean {
  return vi.mocked(useGetSuppliesByUserId).mock.calls.some(([, options]) => options?.query?.enabled === true);
}

describe("landing at / (#221)", () => {
  // App.tsx loads every page on demand. Loading the ones these callers reach
  // up front keeps the first test from paying their transform inside a
  // `findBy` timeout, which under a full parallel run it can exceed.
  beforeAll(async () => {
    await Promise.all([
      import("./LandingRoute"),
      import("../home/MemberHomePage"),
      import("../home/CommunityManagementPage"),
      import("../no-community/NoCommunityPage"),
      import("../platform/PlatformPage"),
      import("../Profile"),
    ]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetCurrentUser).mockReturnValue(query.disabled());
    vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.success<typeof getSuppliesByUserId>([]));
    vi.mocked(useGetMembershipEnergyMetrics).mockReturnValue(query.loading());
    vi.mocked(useGetMembershipMonthlyConsumption).mockReturnValue(query.loading());
    vi.mocked(useGetMembershipHourlyProfile).mockReturnValue(query.loading());
    vi.mocked(useGetMembershipPayback).mockReturnValue(query.loading());
    vi.mocked(useGetMemberships).mockReturnValue(query.loading());
    vi.mocked(useGetAllSupplies).mockReturnValue(query.loading());
    vi.mocked(useGetAllPlants).mockReturnValue(query.loading());
    vi.mocked(useGetAllCommunities).mockReturnValue(
      query.success<typeof getAllCommunities>([
        buildCommunity({ id: COMMUNITY_A, name: "Comunidad A" }),
        buildCommunity({ id: COMMUNITY_B, name: "Comunidad B" }),
      ]),
    );
  });

  afterEach(() => {
    expect(customInstance).not.toHaveBeenCalled();
  });

  it("AC1 -- a member signing in reaches the member home", async () => {
    // Left to the real provider: one membership is selected for them.
    as(MEMBER);
    openApp("/");

    expect(await screen.findByRole("heading", MEMBER_HEADING)).toBeInTheDocument();
    expect(currentPath()).toBe("/home/member");
  });

  it("AC2 -- a community admin signing in reaches the management home", async () => {
    as(ADMIN, { adminOf: [COMMUNITY_A] });
    openApp("/");

    expect(await screen.findByRole("heading", MANAGEMENT_HEADING)).toBeInTheDocument();
    expect(currentPath()).toBe("/home/management");
  });

  describe("AC1/AC3 case (a) -- while the active community is still being worked out", () => {
    it("renders nothing until it is resolved, then lands on the home", async () => {
      as(MEMBER);
      const { resolve } = openApp("/", COMMUNITY_A, { resolved: false });
      await settle();

      expectNothingDecided();

      resolve();

      expect(await screen.findByRole("heading", MEMBER_HEADING)).toBeInTheDocument();
      expect(currentPath()).toBe("/home/member");
    });

    it("renders nothing while the community's capabilities load, then lands on the home", async () => {
      as(MEMBER);
      communitiesPending();
      const { rerender } = openApp("/", COMMUNITY_A);
      await settle();

      expectNothingDecided();

      answerCommunities({ adminOf: [] });
      rerender(appWithProbe());

      expect(await screen.findByRole("heading", MEMBER_HEADING)).toBeInTheDocument();
      expect(currentPath()).toBe("/home/member");
    });
  });

  describe("entry with several communities (#237)", () => {
    it("UI-ENT-002 AC1 -- a valid remembered community is active, and the caller lands on its home", async () => {
      as(MEMBER_OF_TWO);
      openApp("/", undefined, { remembered: COMMUNITY_B });

      expect(await screen.findByRole("heading", MEMBER_HEADING)).toBeInTheDocument();
      expect(currentPath()).toBe("/home/member");
      expect(within(scopeSurface()).getByText("Comunidad B")).toBeInTheDocument();
      // Remembered and valid: the first-time rule is not consulted at all.
      expect(suppliesReadEnabled()).toBe(false);
    });

    it("UI-ENT-003 AC2 -- with nothing remembered, the first-time rule selects and the caller lands on its home", async () => {
      as(MEMBER_OF_TWO);
      // Alphabetical order alone would pick Comunidad A.
      ownsSuppliesIn(COMMUNITY_B);
      openApp("/");

      expect(await screen.findByRole("heading", MEMBER_HEADING)).toBeInTheDocument();
      expect(currentPath()).toBe("/home/member");
      expect(within(scopeSurface()).getByText("Comunidad B")).toBeInTheDocument();
    });

    it("UI-ENT-003 AC3 -- a remembered community that is no longer a membership gives way to the first-time rule", async () => {
      as(MEMBER_OF_TWO);
      ownsSuppliesIn(COMMUNITY_B);
      openApp("/", undefined, { remembered: "community-no-longer-mine" });

      expect(await screen.findByRole("heading", MEMBER_HEADING)).toBeInTheDocument();
      expect(currentPath()).toBe("/home/member");
      expect(within(scopeSurface()).getByText("Comunidad B")).toBeInTheDocument();
    });

    it("UI-ENT-006 AC4 -- an admin of several sees which community they entered, and the switch changes it in one step", async () => {
      const user = userEvent.setup();
      as(ADMIN_OF_TWO, { adminOf: [COMMUNITY_A, COMMUNITY_B] });
      openApp("/");

      expect(await screen.findByRole("heading", MANAGEMENT_HEADING)).toBeInTheDocument();
      const surface = scopeSurface();
      const control = within(surface).getByRole("button", { name: /^Comunidad activa: Comunidad A\./ });

      await user.click(control);
      await user.click(await screen.findByRole("menuitem", { name: /Comunidad B/ }));

      expect(
        await within(scopeSurface()).findByRole("button", { name: /^Comunidad activa: Comunidad B\./ }),
      ).toBeInTheDocument();
    });

    it("UI-ENT-005 AC8 -- renders nothing while the first-time rule's reads are in flight, then lands", async () => {
      as(MEMBER_OF_TWO);
      vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.loading());
      const { rerender } = openApp("/");
      await settle();

      expectNothingDecided();

      ownsSuppliesIn(COMMUNITY_B);
      rerender(appWithProbe());

      expect(await screen.findByRole("heading", MEMBER_HEADING)).toBeInTheDocument();
      expect(currentPath()).toBe("/home/member");
    });

    it("UI-ENT-005 a deep link with nothing remembered is kept, not refused for want of a community", async () => {
      as(MEMBER_OF_TWO);
      openApp("/home/member");

      expect(await screen.findByRole("heading", MEMBER_HEADING)).toBeInTheDocument();
      expect(currentPath()).toBe("/home/member");
    });
  });

  describe("AC3 case (c) -- no membership at all", () => {
    it("UI-ENT-004 AC7 -- sees the no-community screen", async () => {
      as(NO_MEMBERSHIP);
      openApp("/", null);

      expect(await screen.findByRole("heading", NO_COMMUNITY_HEADING)).toBeInTheDocument();
      expect(currentPath()).toBe("/no-community");
    });

    it("UI-ENT-004 AC7 -- lands on the platform when they may administer it", async () => {
      as(PLATFORM_ADMIN_NO_MEMBERSHIP);
      openApp("/", null);

      await waitFor(() => expect(currentPath()).toBe("/platform"));
    });

    it("UI-ENT-004 still lands after being refused a deep link", async () => {
      as(PLATFORM_ADMIN_NO_MEMBERSHIP);
      // A community page: the guard refuses and sends them to "/".
      openApp("/integrations", null);

      await waitFor(() => expect(currentPath()).toBe("/platform"));
    });
  });

  it("offers a retry, and goes nowhere, when the community's capabilities cannot be read", async () => {
    as(MEMBER);
    vi.mocked(useGetCommunityById).mockReturnValue(query.error(new Error("Network Error")));
    openApp("/", COMMUNITY_A);

    expect(await screen.findByRole("button", { name: /reintentar/i })).toBeInTheDocument();
    expect(currentPath()).toBe("/");
  });

  it("moves nobody who is not on /", async () => {
    as(PLATFORM_ADMIN_NO_MEMBERSHIP);
    openApp("/profile", null);

    await settle();
    expect(currentPath()).toBe("/profile");
  });

  it("AC4 -- the navigation offers exactly one Inicio, leading to the home", async () => {
    as(MEMBER);
    openApp("/", COMMUNITY_A);

    await screen.findByRole("heading", MEMBER_HEADING);
    const inicio = screen.getAllByRole("link", { name: "Inicio" });
    expect(inicio).toHaveLength(1);
    expect(inicio[0]).toHaveAttribute("href", "/home");
  });
});

/**
 * AC5 and AC6 over the source. "/" itself stays -- it is the landing, and every
 * breadcrumb's Inicio and every denial leads there -- so what must not survive
 * is the screen it used to serve. What "/" serves instead is pinned by the
 * landing tests above.
 */
describe("the old home screen is gone (#221)", () => {
  it("nothing in the app imports it or names it", () => {
    const offenders = sourceFiles("src").filter((file) =>
      /\bHomePage\b|["'](?:\.{1,2}\/)+(?:pages\/)?Home["']/.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
    expect(existsSync(join("src", "pages", "Home.tsx"))).toBe(false);
  });
});

/**
 * AC5 and AC6 of #237 over the source. The choose-a-community screen had no
 * route of its own -- "/" rendered it -- so what must not survive is the
 * component and its copy, and any other control that changes the community.
 */
describe("the choose-a-community screen is gone (#237)", () => {
  it("UI-ENT-006 AC5 AC6 -- nothing in the app renders it, routes to it or names it", () => {
    const offenders = sourceFiles("src").filter((file) =>
      /\bChooseCommunityPage\b|Elige una comunidad|Elegir comunidad/.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
    expect(existsSync(join("src", "pages", "landing", "ChooseCommunityPage.tsx"))).toBe(false);
  });

  it("UI-ENT-006 the scope surface's community switch is the only control that changes the community", () => {
    const sources = sourceFiles("src").map((file) => ({ file, source: readFileSync(file, "utf8") }));

    // The dispatch is reached only through useActiveCommunityDetails...
    const dispatchers = sources
      .filter(({ file, source }) => /\buseActiveCommunityDispatch\b/.test(source) && !file.endsWith("community.context.tsx"))
      .map(({ file }) => file);
    expect(dispatchers).toEqual([join("src", "hooks", "useActiveCommunityDetails.ts")]);

    // ...and only the scope surface takes its `select`.
    const selectors = sources
      .filter(
        ({ file, source }) =>
          /\buseActiveCommunityDetails\b/.test(source) &&
          /\bselect\b/.test(source) &&
          !file.endsWith("useActiveCommunityDetails.ts"),
      )
      .map(({ file }) => file);
    expect(selectors).toEqual([join("src", "components", "ScopeContext", "ScopeContext.tsx")]);
  });
});

/** Production sources: specs may name what they test. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.spec\.tsx?$/.test(entry.name) ? [path] : [];
  });
}
