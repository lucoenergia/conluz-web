import "@testing-library/jest-dom";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { FC } from "react";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { CommunityRole, type CurrentUserResponse, type SupplyResponse } from "../../api/models";
import { useGetAllCommunities, type getAllCommunities } from "../../api/communities/communities";
import { useGetCurrentUser, useGetSuppliesByUserId, type getSuppliesByUserId } from "../../api/users/users";
import { useLoggedUser } from "../../context/logged-user.context";
import { buildCommunity } from "../../test/fixtures";
import { query } from "../../test/queryState";
import { renderWithProviders } from "../../test/renderWithProviders";
import { CONTACT_ITEM, MENU_SECTIONS } from "../../utils/constants";
import { resolveLandingRoute } from "../../utils/routes";
import {
  COMMUNITY_A,
  COMMUNITY_B,
  answerCommunities,
  communitiesPending,
  currentUser,
  ownSupply,
} from "./homeViews.mocks";

/**
 * The acceptance criteria of #197, against the real route table in App.tsx
 * and the real AuthenticatedLayout, menu included. Only the reads are mocked.
 */

vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
  useGetAllCommunities: vi.fn(),
}));
// The harness's real LoggedUserProvider asks for the current user once there is
// a token; useLoggedUser is mocked below, so that read only has to stay idle.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCurrentUser: vi.fn(),
  useGetSuppliesByUserId: vi.fn(),
}));
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: vi.fn(),
}));
// The page at "/" is not under test, only that nobody is moved off it.
vi.mock(import("../Home"), () => ({
  HomePage: () => <p>Página de inicio actual</p>,
}));

const MEMBER_HEADING = { name: "Tu energía", level: 1 } as const;
const MANAGEMENT_HEADING = { name: "Gestión de la comunidad", level: 1 } as const;

type Profile = {
  user: CurrentUserResponse;
  adminOf: string[];
  ownSupplies: { supplies: SupplyResponse[] } | "pending" | { error: unknown };
};

/** No admin rights in A. Owns a supply there, though nothing depends on it. */
const MEMBER: Profile = {
  user: currentUser({ [COMMUNITY_A]: CommunityRole.COMMUNITY_MEMBER }),
  adminOf: [],
  ownSupplies: { supplies: [ownSupply(COMMUNITY_A)] },
};
const MEMBER_WITHOUT_SUPPLIES: Profile = { ...MEMBER, ownSupplies: { supplies: [] } };
/** Admin of A, known to own nothing there. */
const ADMIN_WITHOUT_SUPPLIES: Profile = {
  user: currentUser({ [COMMUNITY_A]: CommunityRole.COMMUNITY_ADMIN }),
  adminOf: [COMMUNITY_A],
  ownSupplies: { supplies: [] },
};
const ADMIN_WITH_SUPPLIES: Profile = { ...ADMIN_WITHOUT_SUPPLIES, ownSupplies: { supplies: [ownSupply(COMMUNITY_A)] } };
const ADMIN_WHOSE_SUPPLIES_FAILED: Profile = {
  ...ADMIN_WITHOUT_SUPPLIES,
  ownSupplies: { error: new Error("Network Error") },
};
/** A plain member of A, and an admin of B who owns nothing in B. */
const MEMBER_HERE_ADMIN_THERE: Profile = {
  user: currentUser({ [COMMUNITY_A]: CommunityRole.COMMUNITY_MEMBER, [COMMUNITY_B]: CommunityRole.COMMUNITY_ADMIN }),
  adminOf: [COMMUNITY_B],
  ownSupplies: { supplies: [ownSupply(COMMUNITY_A)] },
};

function answerOwnSupplies(answer: Profile["ownSupplies"]): void {
  vi.mocked(useGetSuppliesByUserId).mockImplementation((_userId, options) => {
    if (options?.query?.enabled === false) return query.disabled();
    if (answer === "pending") return query.loading();
    if ("error" in answer) return query.error(answer.error);
    return query.success<typeof getSuppliesByUserId>(answer.supplies);
  });
}

function as(profile: Profile): void {
  vi.mocked(useLoggedUser).mockReturnValue(profile.user);
  answerCommunities({ adminOf: profile.adminOf });
  answerOwnSupplies(profile.ownSupplies);
}

const LocationProbe: FC = () => <output aria-label="Ruta actual">{useLocation().pathname}</output>;

function openApp(route: string, communityId = COMMUNITY_A) {
  return renderWithProviders(
    <>
      <App />
      <LocationProbe />
    </>,
    { route, token: "a-token", activeCommunityId: communityId },
  );
}

function currentPath(): string | null {
  return screen.getByRole("status", { name: "Ruta actual" }).textContent;
}

const memberView = () => screen.findByRole("heading", MEMBER_HEADING);
const managementView = () => screen.findByRole("heading", MANAGEMENT_HEADING);
const viewSwitch = () => screen.queryByRole("tablist", { name: "Vistas de inicio" });

describe("home views (#197)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetCurrentUser).mockReturnValue(query.disabled());
    vi.mocked(useGetAllCommunities).mockReturnValue(
      query.success<typeof getAllCommunities>([
        buildCommunity({ id: COMMUNITY_A, name: "Comunidad A" }),
        buildCommunity({ id: COMMUNITY_B, name: "Comunidad B" }),
      ]),
    );
  });

  describe("AC1 -- a member without admin rights", () => {
    it("opening the member route gets the member view and no switch", async () => {
      as(MEMBER);
      openApp("/home/member");

      expect(await memberView()).toBeInTheDocument();
      expect(viewSwitch()).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", MANAGEMENT_HEADING)).not.toBeInTheDocument();
    });

    it("opening the management route is taken to the member view", async () => {
      as(MEMBER);
      openApp("/home/management");

      expect(await memberView()).toBeInTheDocument();
      expect(currentPath()).toBe("/home/member");
    });

    // No criterion states it, but a member's home exists before they own
    // anything: it is not an impossible state to be removed later.
    it("who owns no supplies still gets the member view", async () => {
      as(MEMBER_WITHOUT_SUPPLIES);
      openApp("/home/member");

      expect(await memberView()).toBeInTheDocument();
    });
  });

  describe("AC2 -- a community admin known to own no supplies here", () => {
    it.each(["/home/member", "/home/management"])("opening %s gets the management view and no switch", async (route) => {
      as(ADMIN_WITHOUT_SUPPLIES);
      openApp(route);

      expect(await managementView()).toBeInTheDocument();
      expect(currentPath()).toBe("/home/management");
      expect(viewSwitch()).not.toBeInTheDocument();
    });

    it("sees no affordance leading to the member view anywhere in the layout", async () => {
      as(ADMIN_WITHOUT_SUPPLIES);
      openApp("/home/management");
      await managementView();

      expect(document.querySelector('[href="/home/member"]')).toBeNull();
      expect(screen.queryByRole("tab", { name: "Tu energía" })).not.toBeInTheDocument();
    });
  });

  describe("AC3 -- a community admin who owns supplies here", () => {
    it("moves from the management view to the member view, and back", async () => {
      const user = userEvent.setup();
      as(ADMIN_WITH_SUPPLIES);
      openApp("/home/management");
      await managementView();

      await user.click(screen.getByRole("tab", { name: "Tu energía" }));
      expect(await memberView()).toBeInTheDocument();
      expect(currentPath()).toBe("/home/member");

      await user.click(screen.getByRole("tab", { name: "Gestión" }));
      expect(await managementView()).toBeInTheDocument();
      expect(currentPath()).toBe("/home/management");
    });

    it("lands on the management view from /home", async () => {
      as(ADMIN_WITH_SUPPLIES);
      openApp("/home");

      expect(await managementView()).toBeInTheDocument();
      expect(currentPath()).toBe("/home/management");
    });
  });

  // Known-negative and unknown are different states: AC2's rule is about an
  // admin KNOWN to own none. Failing to find out offers the member view, and
  // never takes the management view away.
  describe("a community admin whose supplies could not be read", () => {
    it("keeps the management view and is offered the switch", async () => {
      as(ADMIN_WHOSE_SUPPLIES_FAILED);
      openApp("/home/management");

      expect(await managementView()).toBeInTheDocument();
      expect(viewSwitch()).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Tu energía" })).toHaveAttribute("href", "/home/member");
    });
  });

  describe("AC4 -- a reload restores the same view", () => {
    it.each([
      ["/home/member", MEMBER_HEADING],
      ["/home/management", MANAGEMENT_HEADING],
    ] as const)("%s, reloaded, shows the same view", async (route, heading) => {
      const user = userEvent.setup();
      as(ADMIN_WITH_SUPPLIES);
      // Arrive through the switch, so what is restored cannot be a default.
      const first = openApp(route === "/home/member" ? "/home/management" : "/home/member");
      await screen.findByRole("heading");
      const tab = route === "/home/member" ? "Tu energía" : "Gestión";
      if (screen.getByRole("tab", { selected: true }).textContent !== tab) {
        await user.click(screen.getByRole("tab", { name: tab }));
      }
      await screen.findByRole("heading", heading);
      const urlBeforeReload = currentPath();
      expect(urlBeforeReload).toBe(route);
      first.unmount();

      openApp(urlBeforeReload!);

      expect(await screen.findByRole("heading", heading)).toBeInTheDocument();
      expect(currentPath()).toBe(route);
    });
  });

  describe("AC5 -- each view's URL, opened again, shows that view", () => {
    it.each([
      ["/home/member", MEMBER_HEADING],
      ["/home/management", MANAGEMENT_HEADING],
    ] as const)("%s opens that view, not a default", async (route, heading) => {
      as(ADMIN_WITH_SUPPLIES);
      openApp(route);

      expect(await screen.findByRole("heading", heading)).toBeInTheDocument();
      expect(screen.getByRole("tab", { selected: true })).toHaveAttribute("href", route);
    });
  });

  describe("AC6 -- switching community on a view the new community does not grant", () => {
    it("member view in A, switched to B where they administer and own nothing, goes to management", async () => {
      as(MEMBER_HERE_ADMIN_THERE);
      const { switchActiveCommunity } = openApp("/home/member", COMMUNITY_A);
      await memberView();

      switchActiveCommunity(COMMUNITY_B);

      expect(await managementView()).toBeInTheDocument();
      expect(currentPath()).toBe("/home/management");
      expect(viewSwitch()).not.toBeInTheDocument();
    });

    it("management view in B, switched to A where they are a plain member, goes to the member view", async () => {
      as(MEMBER_HERE_ADMIN_THERE);
      const { switchActiveCommunity } = openApp("/home/management", COMMUNITY_B);
      await managementView();

      switchActiveCommunity(COMMUNITY_A);

      expect(await memberView()).toBeInTheDocument();
      expect(currentPath()).toBe("/home/member");
    });

    it("goes there and back without an error or an empty screen", async () => {
      as(MEMBER_HERE_ADMIN_THERE);
      const { switchActiveCommunity } = openApp("/home/member", COMMUNITY_A);
      await memberView();

      switchActiveCommunity(COMMUNITY_B);
      await managementView();
      switchActiveCommunity(COMMUNITY_A);

      expect(await memberView()).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("AC7 -- no view flashes before the right one", () => {
    it("renders neither view while the community's capabilities load, then the right one", async () => {
      as(ADMIN_WITHOUT_SUPPLIES);
      communitiesPending();
      const { rerender } = openApp("/home/member");

      expect(screen.queryByRole("heading", MEMBER_HEADING)).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", MANAGEMENT_HEADING)).not.toBeInTheDocument();

      answerCommunities({ adminOf: [COMMUNITY_A] });
      rerender(
        <>
          <App />
          <LocationProbe />
        </>,
      );

      expect(await managementView()).toBeInTheDocument();
      expect(currentPath()).toBe("/home/management");
    });

    // The member view must not render for this admin and then give way to
    // management once their supplies arrive: it waits for the answer.
    it("renders no member view for an admin while their supplies load", async () => {
      as({ ...ADMIN_WITHOUT_SUPPLIES, ownSupplies: "pending" });
      openApp("/home/member");
      await act(async () => {});

      expect(screen.queryByRole("heading", MEMBER_HEADING)).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", MANAGEMENT_HEADING)).not.toBeInTheDocument();
      expect(currentPath()).toBe("/home/member");
    });
  });

  describe("AC8 -- reachable only by a direct URL", () => {
    it("no menu entry leads to either view", () => {
      const destinations = [...MENU_SECTIONS.flatMap((section) => section.items), CONTACT_ITEM].map((item) => item.to);

      expect(destinations.filter((to) => to === "/home" || to.startsWith("/home/"))).toEqual([]);
    });

    it.each([
      ["a plain member", MEMBER],
      ["an admin known to own no supplies", ADMIN_WITHOUT_SUPPLIES],
      ["an admin who owns supplies", ADMIN_WITH_SUPPLIES],
    ])("signing in as %s still lands on /, and the rendered app links to neither view", async (_label, profile) => {
      as(profile);
      // Login navigates to "/" (pinned in Login.spec.tsx); the layout decides
      // the rest.
      expect(resolveLandingRoute(profile.user)).toBe("/");
      openApp("/");

      expect(await screen.findByText("Página de inicio actual")).toBeInTheDocument();
      expect(currentPath()).toBe("/");
      // The side menu is rendered and has resolved its community entries, so
      // the absence below is about the entries and not about an empty menu.
      expect(await screen.findByRole("link", { name: "Producción" })).toHaveAttribute("href", "/production");
      expect(document.querySelector('a[href^="/home"]')).toBeNull();
    });

    // The route table declares them and PAGE_SCOPES classifies the prefix;
    // neither is a link. Anything else naming the paths would be one.
    it("nothing outside the views themselves and the route table names their paths", () => {
      const declaring = [join("src", "App.tsx"), join("src", "utils", "routes.ts")];
      const offenders = sourceFiles("src")
        .filter((file) => !file.startsWith(join("src", "pages", "home")) && !declaring.includes(file))
        .filter((file) => /["'`]\/home(\/|["'`])/.test(readFileSync(file, "utf8")));

      expect(offenders).toEqual([]);
    });
  });
});

/** Production sources: specs may name the paths, since they test them. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.spec\.tsx?$/.test(entry.name) ? [path] : [];
  });
}
