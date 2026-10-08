import "@testing-library/jest-dom";
import type { FC } from "react";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocation } from "react-router";
import type { QueryClient } from "@tanstack/react-query";
import App from "../../App";
import { CommunityRole } from "../../api/models";
import { useAuth } from "../../context/auth.context";
import { createAppQueryClient } from "../../queryClient";
import { buildCurrentUser } from "../../test/fixtures";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestRouter, type Route as RequestRoute } from "../../test/requestRouter";
import { PASSWORD_RESET_MESSAGE } from "../../utils/session";

/**
 * The password-recovery routes (#233), against the real route table in
 * App.tsx: both screens are public and work with or without a session, and a
 * session that turns out to be stale ends without losing the reset link.
 *
 * Tier 2: the subject is what the real providers do on these routes -- the
 * current-user read, its 401 and the session it ends -- so the production
 * query client and the real generated hooks run, and only the transport is
 * replaced. A request the router does not serve fails the test that sent it.
 */
const CURRENT_USER = "/api/v1/users/current";
const RESET = "/api/v1/users/password/reset";
const TOKEN = "Zq81-reset-token_aB";
const PASSWORD = "el gato duerme junto a la ventana";

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
const TokenOutput: FC = () => <output aria-label="token">{useAuth() ?? "none"}</output>;

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
      <TokenOutput />
    </>,
    { browserHistory: true, token, queryClient: appClientWithoutRetries() },
  );
}

function unauthorized() {
  return Object.assign(new Error("HTTP 401"), { status: 401, response: { status: 401, data: { errors: [] } } });
}

/** A response the test settles when it chooses. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const resetBodies = (router: RequestRouter) =>
  router.requests.filter((request) => request.url === RESET).map((request) => request.data);

const currentPath = () => screen.getByRole("status", { name: "path" }).textContent;
const currentToken = () => screen.getByRole("status", { name: "token" }).textContent;
const findResetForm = () => screen.findByRole("heading", { level: 1, name: "Restablecer contraseña" });

/** Lets every pending query, effect and lazy mount run, so a request that is coming has been sent. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText("Nueva contraseña"));
  await user.paste(PASSWORD);
  await user.click(screen.getByLabelText("Repite la nueva contraseña"));
  await user.paste(PASSWORD);
  await user.click(screen.getByRole("button", { name: "Restablecer contraseña" }));
}

// App.tsx loads every page on demand. Loading the ones these tests reach up
// front keeps a test from paying their transform inside its own timeout, which
// under a full parallel run it can exceed.
beforeAll(async () => {
  await Promise.all([import("./ForgotPassword"), import("./ResetPassword"), import("./Login")]);
});

beforeEach(() => {
  mockCustomInstance.mockReset();
});

describe("the old new-password route (AC10)", () => {
  it("no longer renders a screen at /forgot-password/<anything>", async () => {
    const router = routeRequests([]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAppAt("/forgot-password/anything");
    await settle();

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
    expect(currentPath()).toBe("/forgot-password/anything");
  });
});

describe("with a session", () => {
  it("serves the forgot-password screen instead of redirecting", async () => {
    const router = routeRequests([{ method: "GET", url: CURRENT_USER, respond: () => MEMBER }]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAppAt("/forgot-password", "a-token");

    expect(await screen.findByRole("heading", { level: 1, name: "¿Olvidaste tu contraseña?" })).toBeInTheDocument();
    await settle();
    expect(currentPath()).toBe("/forgot-password");
  });

  it("serves the reset screen, keeps the link's token, and ends the session on success", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      { method: "GET", url: CURRENT_USER, respond: () => MEMBER },
      { method: "POST", url: RESET, respond: () => undefined },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAppAt(`/reset-password#${TOKEN}`, "a-token");
    await findResetForm();
    await settle();
    expect(currentPath()).toBe("/reset-password");
    expect(currentToken()).toBe("a-token");

    await fillAndSubmit(user);

    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    expect(resetBodies(router)).toEqual([{ token: TOKEN, newPassword: PASSWORD }]);
    expect(currentToken()).toBe("none");
    expect(screen.getAllByText(PASSWORD_RESET_MESSAGE)).toHaveLength(1);
  });
});

describe("with a stale session", () => {
  it("ends it on the 401 without leaving the page, and the reset still sends the link's token", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      {
        method: "GET",
        url: CURRENT_USER,
        respond: () => {
          throw unauthorized();
        },
      },
      { method: "POST", url: RESET, respond: () => undefined },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAppAt(`/reset-password#${TOKEN}`, "a-stale-token");
    await findResetForm();
    await waitFor(() => expect(currentToken()).toBe("none"));
    await settle();

    expect(currentPath()).toBe("/reset-password");
    expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();

    await fillAndSubmit(user);

    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    expect(resetBodies(router)).toEqual([{ token: TOKEN, newPassword: PASSWORD }]);
    expect(screen.getAllByText(PASSWORD_RESET_MESSAGE)).toHaveLength(1);
  });

  it("completes a reset that was in flight when the 401 cleared the cache", async () => {
    const user = userEvent.setup();
    const currentUser = deferred<never>();
    const reset = deferred<undefined>();
    const routes: RequestRoute[] = [
      { method: "GET", url: CURRENT_USER, respond: () => currentUser.promise },
      { method: "POST", url: RESET, respond: () => reset.promise },
    ];
    const router = routeRequests(routes);
    mockCustomInstance.mockImplementation(router.handle);

    renderAppAt(`/reset-password#${TOKEN}`, "a-stale-token");
    await findResetForm();
    await fillAndSubmit(user);
    await waitFor(() => expect(resetBodies(router)).toHaveLength(1));

    await act(async () => currentUser.reject(unauthorized()));
    await waitFor(() => expect(currentToken()).toBe("none"));
    expect(currentPath()).toBe("/reset-password");

    await act(async () => reset.resolve(undefined));

    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    expect(resetBodies(router)).toEqual([{ token: TOKEN, newPassword: PASSWORD }]);
    expect(screen.getAllByText(PASSWORD_RESET_MESSAGE)).toHaveLength(1);
  });
});
