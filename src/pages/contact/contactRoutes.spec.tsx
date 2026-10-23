import "@testing-library/jest-dom";
import type { FC } from "react";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocation } from "react-router";
import type { QueryClient } from "@tanstack/react-query";
import App from "../../App";
import { CommunityRole } from "../../hooks/permissions";
import { createAppQueryClient } from "../../queryClient";
import { buildCommunity, buildContactChannel, buildCurrentUser, buildOperatorContact } from "../../test/fixtures";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestRouter } from "../../test/requestRouter";

/**
 * The two contact routes against the real route table in App.tsx (#295).
 *
 * Tier 2: the subject is which requests each caller's visit sends -- the public
 * page must ask for nothing about a community or a user -- so the real providers
 * and generated hooks run and only the transport is replaced. A request the
 * router does not serve fails the test that sent it.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const COMMUNITY_ID = "community-a";
const OPERATOR_CONTACT = "/api/v1/operator-contact";

const MEMBER = buildCurrentUser({
  id: "user-1",
  fullName: "Ana Socia",
  memberships: { [COMMUNITY_ID]: CommunityRole.COMMUNITY_MEMBER },
});

const SOL_COMUN = buildCommunity({ id: COMMUNITY_ID, name: "Sol Común" });

const PathOutput: FC = () => <output aria-label="path">{useLocation().pathname}</output>;

/** The production client and handlers, minus retries, so a failure is final at once. */
function appClientWithoutRetries(): QueryClient {
  const client = createAppQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false },
    mutations: { ...defaults.mutations, retry: false },
  });
  return client;
}

function renderAppAt(url: string, token?: string) {
  window.history.replaceState(null, "", url);
  return renderWithProviders(
    <>
      <App />
      <PathOutput />
    </>,
    { browserHistory: true, token, queryClient: appClientWithoutRetries() },
  );
}

const currentPath = () => screen.getByRole("status", { name: "path" }).textContent;

/** Lets every pending query, effect and lazy mount run, so a request that is coming has been sent. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

const requested = (router: RequestRouter) =>
  router.requests.map((request) => `${(request.method ?? "GET").toUpperCase()} ${request.url}`);

beforeAll(async () => {
  await Promise.all([import("./SignInHelpPage"), import("./CommunityContactPage"), import("../landing/LandingRoute"), import("../no-community/NoCommunityPage")]);
});

beforeEach(() => {
  mockCustomInstance.mockReset();
});

describe("/contact signed out", () => {
  it("UI-CTU-005 requests the operator contact and nothing about a community or a user", async () => {
    const router = routeRequests([
      { method: "GET", url: OPERATOR_CONTACT, respond: () => ({ contact: buildOperatorContact({ name: "Plataforma Conluz" }) }) },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAppAt("/contact");

    expect(await screen.findByRole("heading", { level: 1, name: "¿No puedes acceder?" })).toBeVisible();
    expect(await screen.findByText("Plataforma Conluz")).toBeVisible();
    await settle();
    expect(requested(router)).toEqual([`GET ${OPERATOR_CONTACT}`]);
    expect(currentPath()).toBe("/contact");
  });
});

describe("/contact signed in", () => {
  it("UI-CTU-001 sends a signed-in caller to the in-app contact page, inside the app", async () => {
    const router = routeRequests([
      { method: "GET", url: "/api/v1/users/current", respond: () => MEMBER },
      { method: "GET", url: "/api/v1/communities", respond: () => [SOL_COMUN] },
      { method: "GET", url: `/api/v1/communities/${COMMUNITY_ID}`, respond: () => SOL_COMUN },
      {
        method: "GET",
        url: `/api/v1/communities/${COMMUNITY_ID}/contact`,
        respond: () => ({
          channels: [buildContactChannel({ type: "EMAIL", label: "Correo", value: "hola@solcomun.test" })],
        }),
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAppAt("/contact", "a-token");

    expect(await screen.findByRole("link", { name: "hola@solcomun.test" })).toHaveAttribute("href", "mailto:hola@solcomun.test");
    expect(currentPath()).toBe("/community/contact");
    // Inside the app chrome, which the public layout does not have.
    expect(screen.getByRole("banner")).toBeInTheDocument();
    await settle();
    expect(requested(router)).not.toContain(`GET ${OPERATOR_CONTACT}`);
  });
});

describe("/community/contact for a caller with no community", () => {
  it("UI-CTU-003 is reached from the no-community page and shows the fallback, operator included", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      { method: "GET", url: "/api/v1/users/current", respond: () => buildCurrentUser({ id: "user-2", memberships: {} }) },
      {
        method: "GET",
        url: OPERATOR_CONTACT,
        respond: () => ({ contact: buildOperatorContact({ name: "Plataforma Conluz", email: "ayuda@conluz.test" }) }),
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAppAt("/no-community", "a-token");
    await user.click(await screen.findByRole("link", { name: "Cómo pedir ayuda" }));

    expect(
      await screen.findByText("Si necesitas ayuda, contacta con quien gestiona tu comunidad energética."),
    ).toBeVisible();
    expect(await screen.findByRole("link", { name: "ayuda@conluz.test" })).toHaveAttribute("href", "mailto:ayuda@conluz.test");
    expect(currentPath()).toBe("/community/contact");
    await settle();
    expect(requested(router).filter((request) => request.includes("contact"))).toEqual([`GET ${OPERATOR_CONTACT}`]);
  });
});
