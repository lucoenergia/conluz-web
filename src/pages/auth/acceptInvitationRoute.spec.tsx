import "@testing-library/jest-dom";
import type { FC } from "react";
import { act, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocation } from "react-router";
import type { QueryClient } from "@tanstack/react-query";
import App from "../../App";
import { CommunityRole } from "../../hooks/permissions";
import { createAppQueryClient } from "../../queryClient";
import { buildCurrentUser } from "../../test/fixtures";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests } from "../../test/requestRouter";

/**
 * The accept-invitation route (#274), against the real route table in
 * App.tsx: the screen is public and serves a caller with or without a
 * session, never sending either away from the token it holds.
 *
 * Tier 2: the subject is what the real layout and providers do on this route,
 * so the production query client and the real generated hooks run, and only
 * the transport is replaced.
 */
const CURRENT_USER = "/api/v1/users/current";
const INSPECT = "/api/v1/invitations/inspect";
const TOKEN = "Qx47-invitation-token_kM";
const INSPECTION = {
  kind: "COMMUNITY",
  community: { id: "community-invited", name: "Sol de Lavapiés" },
  loginRequired: true,
  confirmationCodeRequired: false,
};

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const MEMBER = buildCurrentUser({
  id: "user-1",
  fullName: "Ana Socia",
  memberships: { "community-a": CommunityRole.COMMUNITY_MEMBER },
});

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
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

// App.tsx loads every page on demand. Loading the one these tests reach up
// front keeps a test from paying its transform inside its own timeout.
beforeAll(async () => {
  await import("./AcceptInvitation");
});

beforeEach(() => {
  mockCustomInstance.mockReset();
});

describe("UI-INV-001 the accept-invitation route", () => {
  it("UI-INV-001 serves the screen without a session", async () => {
    const router = routeRequests([{ method: "POST", url: INSPECT, respond: () => INSPECTION }]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAppAt(`/accept-invitation#${TOKEN}`);

    expect(await screen.findByRole("heading", { level: 1, name: "Únete a Sol de Lavapiés" })).toBeInTheDocument();
    await settle();
    expect(currentPath()).toBe("/accept-invitation");
    expect(screen.getByLabelText("DNI/NIF")).toBeInTheDocument();
  });

  it("UI-INV-001 serves the screen with a session instead of redirecting", async () => {
    const router = routeRequests([
      { method: "GET", url: CURRENT_USER, respond: () => MEMBER },
      { method: "POST", url: INSPECT, respond: () => INSPECTION },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAppAt(`/accept-invitation#${TOKEN}`, "a-token");

    expect(await screen.findByRole("heading", { level: 1, name: "Únete a Sol de Lavapiés" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Aceptar invitación" })).toBeEnabled();
    await settle();
    expect(currentPath()).toBe("/accept-invitation");
    expect(router.requests.filter((request) => request.url === INSPECT).map((request) => request.data)).toEqual([
      { token: TOKEN },
    ]);
  });
});
