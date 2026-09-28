import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildCommunity, buildCommunityCapabilities, buildCurrentUser, buildPlatformCapabilities, buildPlant, buildPlantCapabilities } from "../../test/fixtures";
import { query } from "../../test/queryState";
import type { CommunityCapabilitiesResponse, PlatformCapabilitiesResponse } from "../../api/models";

vi.mock(import("../../api/communities/communities"), () => ({
  useGetCommunityById: vi.fn(),
}));

vi.mock(import("../../pages/production/usePlantInActiveCommunity"), () => ({
  usePlantInActiveCommunity: vi.fn(),
}));

const loggedUser = vi.hoisted(() => ({ current: null as ReturnType<typeof Object> | null }));

vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => loggedUser.current,
}));

import { getCommunityById, useGetCommunityById } from "../../api/communities/communities";
import { usePlantInActiveCommunity } from "../../pages/production/usePlantInActiveCommunity";
import { CapabilityRoute, type CapabilityRequirement } from "./CapabilityRoute";

const COMMUNITY_ID = "community-A";
const PLANT_ID = "plant-1";

function httpError(status: number) {
  return new AxiosError("failed", undefined, undefined, undefined, {
    status,
    statusText: "",
    data: undefined,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

function setPlatformCapabilities(capabilities: Partial<PlatformCapabilitiesResponse>) {
  loggedUser.current = buildCurrentUser({
    platformCapabilities: buildPlatformCapabilities(capabilities),
  });
}

function setCommunityCapabilities(capabilities: Partial<CommunityCapabilitiesResponse>) {
  vi.mocked(useGetCommunityById).mockReturnValue(
    query.success<typeof getCommunityById>(
      buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities(capabilities) }),
    ),
  );
}

function setPlantCapabilities(capabilities: Partial<Parameters<typeof buildPlantCapabilities>[0]>) {
  vi.mocked(usePlantInActiveCommunity).mockReturnValue({
    plant: buildPlant({ id: PLANT_ID, capabilities: buildPlantCapabilities(capabilities) }),
    isLoading: false,
    isNotFound: false,
    error: null,
    refetch: vi.fn(),
  });
}

/**
 * Renders the guard at a guarded URL, with a home route to land on so a
 * redirect is observable rather than inferred.
 */
function setup(require: CapabilityRequirement, { route = "/protected" }: { route?: string } = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<span>home</span>} />
      <Route
        path="/protected"
        element={
          <CapabilityRoute require={require}>
            <span>protected</span>
          </CapabilityRoute>
        }
      />
      <Route
        path="/production/:plantId/sharing-agreements"
        element={
          <CapabilityRoute require={require}>
            <span>protected</span>
          </CapabilityRoute>
        }
      />
    </Routes>,
    { route, activeCommunityId: COMMUNITY_ID },
  );
}

const expectProtected = () => expect(screen.getByText("protected")).toBeInTheDocument();
const expectRedirected = () => {
  expect(screen.getByText("home")).toBeInTheDocument();
  expect(screen.queryByText("protected")).not.toBeInTheDocument();
};
const expectNeither = () => {
  expect(screen.queryByText("protected")).not.toBeInTheDocument();
  expect(screen.queryByText("home")).not.toBeInTheDocument();
};

beforeEach(() => {
  vi.clearAllMocks();
  loggedUser.current = buildCurrentUser();
  vi.mocked(useGetCommunityById).mockReturnValue(query.loading());
  vi.mocked(usePlantInActiveCommunity).mockReturnValue({
    plant: undefined,
    isLoading: true,
    isNotFound: false,
    error: null,
    refetch: vi.fn(),
  });
});

describe("CapabilityRoute — platform scope", () => {
  // Carried from PlatformAdminRoute.spec.
  it("renders children when the platform capability is granted", () => {
    setPlatformCapabilities({ canListUsers: true });
    setup({ scope: "platform", capability: "canListUsers" });
    expectProtected();
  });

  it("redirects when the platform capability is refused", () => {
    setPlatformCapabilities({ canListUsers: false });
    setup({ scope: "platform", capability: "canListUsers" });
    expectRedirected();
  });

  // The drift this epic fixes: the platform flag is no longer a master key, so
  // each platform route asks for the capability that names its own decision.
  it("does not let one platform capability stand in for another", () => {
    setPlatformCapabilities({ canListUsers: true, canCreateUsers: false });
    setup({ scope: "platform", capability: "canCreateUsers" });
    expectRedirected();
  });
});

describe("CapabilityRoute — community scope", () => {
  // Carried from CommunityAdminRoute.spec / CommunityOrPlatformAdminRoute.spec.
  it("renders children for an admin of the active community", () => {
    setCommunityCapabilities({ canManage: true });
    setup({ scope: "community", capability: "canManage" });
    expectProtected();
  });

  it("redirects a plain member", () => {
    setCommunityCapabilities({ canManage: false });
    setup({ scope: "community", capability: "canManage" });
    expectRedirected();
  });

  // The drift fix, stated as a test: a platform admin who does not administer
  // this community loses `integrations`, because the backend 403s every call
  // that page makes. Platform capabilities are irrelevant to a community
  // requirement, so granting all of them changes nothing.
  it("redirects a platform admin who does not administer the community", () => {
    setPlatformCapabilities({
      canAdministerPlatform: true,
      canListUsers: true,
      canCreateCommunity: true,
      canCreateUsers: true,
    });
    setCommunityCapabilities({ canManage: false });
    setup({ scope: "community", capability: "canManage" });
    expectRedirected();
  });

  it("does not let one community capability stand in for another", () => {
    setCommunityCapabilities({ canManage: true, canManageMemberships: false });
    setup({ scope: "community", capability: "canManageMemberships" });
    expectRedirected();
  });
});

describe("CapabilityRoute — plant scope", () => {
  const plantRoute = `/production/${PLANT_ID}/sharing-agreements`;

  it("renders children when the plant capability is granted", () => {
    setPlantCapabilities({ canListSharingAgreements: true });
    setup({ scope: "plant", capability: "canListSharingAgreements" }, { route: plantRoute });
    expectProtected();
  });

  it("redirects when the plant capability is refused", () => {
    setPlantCapabilities({ canListSharingAgreements: false });
    setup({ scope: "plant", capability: "canListSharingAgreements" }, { route: plantRoute });
    expectRedirected();
  });

  // A plant in another community is withheld by the wrapper. That has to read
  // as a refusal, not as "still loading", or the page would hang for ever.
  it("redirects for a plant outside the active community", () => {
    vi.mocked(usePlantInActiveCommunity).mockReturnValue({
      plant: undefined,
      isLoading: false,
      isNotFound: true,
      error: null,
      refetch: vi.fn(),
    });
    setup({ scope: "plant", capability: "canListSharingAgreements" }, { route: plantRoute });
    expectRedirected();
  });

  it("fires no plant request on a route that has no plant", () => {
    setPlatformCapabilities({ canListUsers: true });
    setup({ scope: "platform", capability: "canListUsers" });
    expect(vi.mocked(usePlantInActiveCommunity)).toHaveBeenCalledWith("");
  });

  // The URL carries a plant id, so only `enabled` stops the resolver fetching
  // it. Without that, every guarded route under /production/:plantId would
  // fetch the plant to answer a question that has nothing to do with it.
  it("fires no plant request when the requirement is not a plant one, even on a plant URL", () => {
    setPlatformCapabilities({ canListUsers: true });
    setup({ scope: "platform", capability: "canListUsers" }, { route: plantRoute });
    expect(vi.mocked(usePlantInActiveCommunity)).toHaveBeenCalledWith("");
    expect(vi.mocked(usePlantInActiveCommunity)).not.toHaveBeenCalledWith(PLANT_ID);
  });
});

describe("CapabilityRoute — before the answer arrives", () => {
  // The bug this guard is built to fix. On a cold load the active community is
  // still being worked out, and the old guards read that as "no role" and
  // redirected -- which is why the Playwright suite reaches guarded pages by
  // clicking instead of page.goto.
  it("renders nothing while the answer is still pending, rather than redirecting", () => {
    vi.mocked(useGetCommunityById).mockReturnValue(query.loading());
    setup({ scope: "community", capability: "canManage" });
    expectNeither();
  });

  // The same load, once it finishes: the deep link lands on the page.
  it("lands an allowed user on a deep-linked page once the answer arrives", () => {
    setCommunityCapabilities({ canManage: true });
    setup({ scope: "community", capability: "canManage" });
    expectProtected();
  });
});

describe("CapabilityRoute — when the check itself fails", () => {
  it("offers a retry instead of redirecting", () => {
    vi.mocked(useGetCommunityById).mockReturnValue(query.error(httpError(500)));
    setup({ scope: "community", capability: "canManage" });

    expectNeither();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("retries the check when asked", async () => {
    const failed = query.error(httpError(500));
    vi.mocked(useGetCommunityById).mockReturnValue(failed);
    setup({ scope: "community", capability: "canManage" });

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(failed.refetch).toHaveBeenCalledOnce();
  });

  // A 403 or 404 is the backend answering, not failing to answer.
  it.each([403, 404])("redirects rather than offering a retry on %i", (status) => {
    vi.mocked(useGetCommunityById).mockReturnValue(query.error(httpError(status)));
    setup({ scope: "community", capability: "canManage" });
    expectRedirected();
  });
});

describe("CapabilityRoute — switching community", () => {
  /** Answers per community, the way the real per-id query key does. */
  type CommunityAnswer = ReturnType<typeof useGetCommunityById>;

  function answerPerCommunity(answers: Record<string, CommunityAnswer>) {
    vi.mocked(useGetCommunityById).mockImplementation(
      (communityId: string) => answers[communityId] ?? (query.loading() as CommunityAnswer),
    );
  }

  // Admin of A, member of B, standing on a guarded page. While B's answer is in
  // flight the guard must show neither the page nor a redirect: keeping the
  // page up would render it under the wrong community, and redirecting would
  // decide before B has answered.
  it("shows neither the page nor a redirect while the new community is in flight", () => {
    answerPerCommunity({
      [COMMUNITY_ID]: query.success<typeof getCommunityById>(
        buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities({ canManage: true }) }),
      ),
    });
    const { switchActiveCommunity } = setup({ scope: "community", capability: "canManage" });
    expectProtected();

    switchActiveCommunity("community-B");
    expectNeither();
  });

  it("redirects once the new community refuses, not before", () => {
    answerPerCommunity({
      [COMMUNITY_ID]: query.success<typeof getCommunityById>(
        buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities({ canManage: true }) }),
      ),
      "community-B": query.success<typeof getCommunityById>(
        buildCommunity({ id: "community-B", capabilities: buildCommunityCapabilities({ canManage: false }) }),
      ),
    });
    const { switchActiveCommunity } = setup({ scope: "community", capability: "canManage" });
    expectProtected();

    switchActiveCommunity("community-B");
    expectRedirected();
  });
});
