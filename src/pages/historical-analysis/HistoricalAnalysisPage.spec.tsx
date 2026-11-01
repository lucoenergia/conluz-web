import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navigate, useLocation } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildCurrentUser } from "../../test/fixtures";
import { CAPTURED_SUPPLIES_BY_USER_ID } from "../../test/capturedResponses";
import { apiError } from "../../test/apiError";
import type { CurrentUserResponse, SupplyResponse } from "../../api/models";

// Only the reads are replaced. useGetSuppliesByUserId is also read by the
// harness's real CommunityProvider, for the first-time rule (#237); the
// community is seeded here, so that read stays disabled and is answered as such.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
}));
// GET /communities is read by the real CommunityProvider for a caller with two
// memberships (#237). The community is seeded, so its answer decides nothing here.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllCommunities: vi.fn(),
}));
// useGetAllSupplies is mocked only to prove the page never reads the
// community's whole supply list. The energy metrics reads resolve the period's
// anchor (#248); this spec is about the supply selector, so they stay pending.
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllSupplies: vi.fn(),
  useGetSupplyEnergyMetrics: vi.fn(),
}));
vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMembershipEnergyMetrics: vi.fn(),
}));

const mockErrorDispatch = vi.fn();
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

let mockLoggedUser: CurrentUserResponse;
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => mockLoggedUser,
}));

import { getSuppliesByUserId, useGetSuppliesByUserId } from "../../api/users/users";
import { getAllSupplies, useGetAllSupplies, useGetSupplyEnergyMetrics } from "../../api/supplies/supplies";
import { useGetMembershipEnergyMetrics } from "../../api/memberships/memberships";
import { useGetAllCommunities } from "../../api/communities/communities";
import { useActiveCommunity } from "../../context/community.context";
import { useCommunitySwitchRedirect } from "../../hooks/useCommunitySwitchRedirect";
import { HistoricalAnalysisPage } from "./HistoricalAnalysisPage";

// Every supply below is the captured response's, or one of its elements with
// the fields a case needs overridden. The capture itself is never changed.
const [CAPTURED_PLANT_SUPPLY, CAPTURED_OTHER_COMMUNITY_SUPPLY] = CAPTURED_SUPPLIES_BY_USER_ID;
const COMMUNITY_A = CAPTURED_PLANT_SUPPLY.community.id;
const COMMUNITY_B = CAPTURED_OTHER_COMMUNITY_SUPPLY.community.id;
const OWNER_ID = CAPTURED_PLANT_SUPPLY.user!.id;

const HOME: SupplyResponse = { ...CAPTURED_PLANT_SUPPLY, id: "own-home", name: "Casa", code: "ES0021000000000001AA", plant: null };
const DISABLED: SupplyResponse = { ...CAPTURED_PLANT_SUPPLY, id: "own-disabled", name: "Garaje", code: "ES0021000000000002AA", plant: null, enabled: false };
const NAMELESS: SupplyResponse = { ...CAPTURED_PLANT_SUPPLY, id: "own-nameless", name: null, address: "Calle Mayor 1", code: "ES0021000000000003AA", plant: null };
/** A supply somebody else owns, in the active community: never in the caller's own listing. */
const SOMEONE_ELSES: SupplyResponse = { ...CAPTURED_PLANT_SUPPLY, id: "someone-elses", name: "Vecino", code: "ES0021000000000004AA", plant: null, user: { id: "another-user" } };

const PLANT_LABEL = `${CAPTURED_PLANT_SUPPLY.name} · ${CAPTURED_PLANT_SUPPLY.code}`;
const SELECTOR = /^Punto de suministro/;
const ALL = "Todos mis puntos";
const EMPTY = "No tienes puntos de suministro en esta comunidad";
const FOOTER = "Solo aparecen tus puntos activos en esta comunidad.";

const member = () =>
  buildCurrentUser({ id: OWNER_ID, memberships: { [COMMUNITY_A]: "COMMUNITY_MEMBER", [COMMUNITY_B]: "COMMUNITY_MEMBER" } });
const communityAdmin = () => buildCurrentUser({ id: OWNER_ID, memberships: { [COMMUNITY_A]: "COMMUNITY_ADMIN" } });

type Listing = ReturnType<typeof useGetSuppliesByUserId>;

/** Answers the page's own listing; the provider's disabled read stays disabled. */
function serveListing(listing: Listing) {
  vi.mocked(useGetSuppliesByUserId).mockImplementation((_userId, options) =>
    options?.query?.enabled === false ? query.disabled() : listing,
  );
}
const serveSupplies = (supplies: SupplyResponse[]) => serveListing(query.success<typeof getSuppliesByUserId>(supplies));

/** The page's own reads of the listing, not the provider's disabled one. */
const pageListingCalls = () => vi.mocked(useGetSuppliesByUserId).mock.calls.filter(([, options]) => options?.query?.enabled !== false);

function CurrentLocation() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{pathname + search}</div>;
}
const currentLocation = () => screen.getByTestId("location").textContent;

/** As AuthenticatedLayout renders a routed page: the switch redirect first, then the page keyed on the community. */
function AsRouted() {
  const communityId = useActiveCommunity();
  const redirect = useCommunitySwitchRedirect();
  return (
    <>
      {redirect ? <Navigate to={redirect} replace /> : <HistoricalAnalysisPage key={communityId} />}
      <CurrentLocation />
    </>
  );
}

function renderPage(path = "/historical-analysis", activeCommunityId = COMMUNITY_A) {
  return renderWithProviders(<AsRouted />, { route: path, activeCommunityId });
}

/** Opens the selector (a bottom sheet in jsdom, which answers no media query) and returns its options. */
async function openOptions(): Promise<string[]> {
  await userEvent.click(screen.getByRole("button", { name: SELECTOR }));
  const sheet = screen.getByRole("dialog", { name: "Punto de suministro" });
  return within(sheet).getAllByRole("radio").map((radio) => radio.closest("label")!.textContent ?? "");
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLoggedUser = member();
  vi.mocked(useGetAllCommunities).mockReturnValue(query.disabled());
  vi.mocked(useGetAllSupplies).mockReturnValue(
    query.success<typeof getAllSupplies>({ items: [], size: 10, totalElements: 0, totalPages: 0, number: 0 }),
  );
  vi.mocked(useGetMembershipEnergyMetrics).mockImplementation((_communityId, _userId, _params, options) =>
    options?.query?.enabled === false ? query.disabled() : query.loading(),
  );
  vi.mocked(useGetSupplyEnergyMetrics).mockImplementation((_supplyId, _params, options) =>
    options?.query?.enabled === false ? query.disabled() : query.loading(),
  );
});

describe("HistoricalAnalysisPage", () => {
  describe("UI-HIS-001 lists only the caller's own enabled supplies in the active community", () => {
    it("UI-HIS-001 AC1 offers a community admin their one own supply, never the community's other ten", async () => {
      mockLoggedUser = communityAdmin();
      const communitySupplies = Array.from({ length: 10 }, (_, index) => ({ ...SOMEONE_ELSES, id: `community-supply-${index}` }));
      vi.mocked(useGetAllSupplies).mockReturnValue(
        query.success<typeof getAllSupplies>({ items: [HOME, ...communitySupplies], size: 10, totalElements: 11, totalPages: 2, number: 0 }),
      );
      serveSupplies([HOME]);
      renderPage();

      expect(await openOptions()).toEqual([ALL, `Casa · ${HOME.code}`]);
      expect(useGetAllSupplies).not.toHaveBeenCalled();
      expect(pageListingCalls()[0][0]).toBe(OWNER_ID);
    });

    it("UI-HIS-001 AC2 offers a member with supplies in two communities only the active one's", async () => {
      serveSupplies(CAPTURED_SUPPLIES_BY_USER_ID);
      renderPage();

      expect(await openOptions()).toEqual([ALL, expect.stringContaining(PLANT_LABEL)]);
    });

    it("UI-HIS-001 leaves a disabled supply out, and says only active supplies are listed", async () => {
      serveSupplies([HOME, DISABLED]);
      renderPage();

      expect(screen.getByText(FOOTER)).toBeInTheDocument();
      expect(await openOptions()).toEqual([ALL, `Casa · ${HOME.code}`]);
    });

    it("UI-HIS-001 labels a supply without a name by its address", async () => {
      serveSupplies([NAMELESS]);
      renderPage();

      expect(await openOptions()).toEqual([ALL, `Calle Mayor 1 · ${NAMELESS.code}`]);
    });

    it("UI-HIS-001 AC6 tags a plant's own supply Punto de planta, and no other", async () => {
      serveSupplies([CAPTURED_PLANT_SUPPLY, HOME]);
      renderPage();

      const [, plant, home] = await openOptions();
      expect(plant).toBe(`${PLANT_LABEL}Punto de planta`);
      expect(home).toBe(`Casa · ${HOME.code}`);
    });

    it("UI-HIS-001 tags a supply by its plant reference, whatever its name says", async () => {
      serveSupplies([{ ...HOME, id: "named-like-a-plant", name: "Planta", plant: null }]);
      renderPage();

      const [, option] = await openOptions();
      expect(option).toBe(`Planta · ${HOME.code}`);
    });

    it("UI-HIS-001 starts on Todos mis puntos and selects a supply into ?supplyId=", async () => {
      serveSupplies([HOME, CAPTURED_PLANT_SUPPLY]);
      renderPage();

      expect(screen.getByRole("button", { name: SELECTOR })).toHaveTextContent(ALL);
      await openOptions();
      await userEvent.click(screen.getByRole("radio", { name: `Casa · ${HOME.code}` }));

      expect(currentLocation()).toBe(`/historical-analysis?supplyId=${HOME.id}`);
      expect(screen.getByRole("button", { name: SELECTOR })).toHaveTextContent(`Casa · ${HOME.code}`);
    });
  });

  describe("UI-HIS-002 holds the selection in ?supplyId=", () => {
    it("UI-HIS-002 preselects an own supply named in the address", () => {
      serveSupplies([HOME, CAPTURED_PLANT_SUPPLY]);
      renderPage(`/historical-analysis?supplyId=${HOME.id}`);

      expect(screen.getByRole("button", { name: SELECTOR })).toHaveTextContent(`Casa · ${HOME.code}`);
      expect(currentLocation()).toBe(`/historical-analysis?supplyId=${HOME.id}`);
    });

    it.each([
      ["somebody else's supply", SOMEONE_ELSES.id],
      ["a supply in another community", CAPTURED_OTHER_COMMUNITY_SUPPLY.id],
      ["a disabled supply", DISABLED.id],
      ["an id that does not exist", "no-such-supply"],
    ])("UI-HIS-002 AC3 falls back to Todos mis puntos for %s, without an error, and removes the id", async (_case, supplyId) => {
      serveSupplies([HOME, DISABLED, CAPTURED_OTHER_COMMUNITY_SUPPLY]);
      renderPage(`/historical-analysis?supplyId=${supplyId}`);

      await waitFor(() => expect(currentLocation()).toBe("/historical-analysis"));
      expect(screen.getByRole("button", { name: SELECTOR })).toHaveTextContent(ALL);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(mockErrorDispatch).not.toHaveBeenCalled();
    });

    it.each([
      ["pending", query.loading<Awaited<ReturnType<typeof getSuppliesByUserId>>>()],
      ["failed", query.error(apiError(500))],
    ])("UI-HIS-002 leaves ?supplyId= untouched while the listing is %s", async (_case, listing) => {
      serveListing(listing as Listing);
      renderPage("/historical-analysis?supplyId=no-such-supply");

      // Give a normalising effect the chance to run before asserting it did not.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(currentLocation()).toBe("/historical-analysis?supplyId=no-such-supply");
    });

    it("UI-HIS-002 AC4 drops ?supplyId= on a community switch and remounts on Todos mis puntos", async () => {
      // The new community's listing has not answered yet: the id is dropped by
      // the switch itself, not by the fallback, which waits for a listing.
      serveSupplies([HOME, CAPTURED_OTHER_COMMUNITY_SUPPLY]);
      const { switchActiveCommunity } = renderPage(`/historical-analysis?supplyId=${HOME.id}`);
      expect(screen.getByRole("button", { name: SELECTOR })).toHaveTextContent(`Casa · ${HOME.code}`);

      serveListing(query.loading<Awaited<ReturnType<typeof getSuppliesByUserId>>>() as Listing);
      switchActiveCommunity(COMMUNITY_B);
      await waitFor(() => expect(currentLocation()).toBe("/historical-analysis"));

      serveSupplies([HOME, CAPTURED_OTHER_COMMUNITY_SUPPLY]);
      switchActiveCommunity(COMMUNITY_A);
      await waitFor(() => expect(screen.getByRole("button", { name: SELECTOR })).toHaveTextContent(ALL));
      expect(currentLocation()).toBe("/historical-analysis");
    });
  });

  describe("UI-HIS-003 a caller with no own supply here gets a neutral state and no controls", () => {
    it.each([
      ["a member", member],
      ["a community admin", communityAdmin],
    ])("UI-HIS-003 AC5 shows %s with no own supply a neutral notice, no selector and no alert", (_case, user) => {
      mockLoggedUser = user();
      serveSupplies([CAPTURED_OTHER_COMMUNITY_SUPPLY, DISABLED]);
      const { container } = renderPage();

      expect(screen.getByRole("note")).toHaveTextContent(EMPTY);
      expect(screen.queryByRole("button", { name: SELECTOR })).not.toBeInTheDocument();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(screen.queryByText(FOOTER)).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(container.querySelector(".MuiAlert-root")).toBeNull();
    });

    it("UI-HIS-003 shows no neutral notice while the listing is pending", () => {
      serveListing(query.loading<Awaited<ReturnType<typeof getSuppliesByUserId>>>() as Listing);
      renderPage();

      expect(screen.queryByText(EMPTY)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: SELECTOR })).not.toBeInTheDocument();
    });

    it("UI-HIS-003 shows a failed listing as an error, not as owning no supply", async () => {
      serveListing(query.error(apiError(500)) as Listing);
      renderPage();

      await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledTimes(1));
      expect(mockErrorDispatch).toHaveBeenCalledWith(expect.stringContaining("tus puntos de suministro"));
      expect(screen.queryByText(EMPTY)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: SELECTOR })).not.toBeInTheDocument();
    });
  });

  describe("from sm up", () => {
    beforeEach(() => {
      // jsdom has no layout: answer every (min-width) query as a wide screen would.
      vi.stubGlobal(
        "matchMedia",
        (mediaQuery: string) =>
          ({
            matches: mediaQuery.includes("min-width"),
            media: mediaQuery,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          }) as MediaQueryList,
      );
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("UI-HIS-001 is a dropdown with the same options and footer", async () => {
      serveSupplies([CAPTURED_PLANT_SUPPLY, HOME, DISABLED]);
      renderPage();

      expect(screen.getByText(FOOTER)).toBeInTheDocument();
      await userEvent.click(screen.getByRole("combobox", { name: "Punto de suministro" }));
      const options = within(screen.getByRole("listbox")).getAllByRole("option");
      expect(options.map((option) => option.textContent)).toEqual([ALL, `${PLANT_LABEL}Punto de planta`, `Casa · ${HOME.code}`]);
    });
  });
});

describe("below sm", () => {
  it("UI-HIS-001 opens the selector as a bottom sheet", async () => {
    serveSupplies([HOME]);
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: SELECTOR }));
    expect(screen.getByRole("dialog", { name: "Punto de suministro" })).toHaveClass("MuiDrawer-paperAnchorBottom");
  });
});
