import "@testing-library/jest-dom";
import { useEffect, type FC, type ReactNode } from "react";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { Link, Route, Routes, useLocation } from "react-router";
import type { QueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/auth.context";
import { createAppQueryClient } from "../../queryClient";
import { LOGOUT_TIMEOUT_MS } from "../../hooks/useBoundedRevoke";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig, type RequestRouter, type Route as RequestRoute } from "../../test/requestRouter";
import { apiError } from "../../test/apiError";
import { buildCommunity, buildCommunityCapabilities, buildCurrentUser } from "../../test/fixtures";
import { CommunityRole, type CurrentUserResponse, type InvitationInspectionResponse } from "../../api/models";
import { SuccessDisplay } from "../../components/Success/SuccessDisplay";
import { invitationAcceptedLoginMessage, invitationAcceptedMessage } from "../../utils/session";
import { LandingRoute } from "../landing/LandingRoute";
import { Login } from "./Login";
import {
  AcceptInvitation,
  INCOMPLETE_LINK_MESSAGE,
  INVALID_LINK_MESSAGE,
  LOGIN_FAILED_MESSAGE,
  LOGIN_INCOMPLETE_MESSAGE,
  OTHER_ACCOUNT_MESSAGE,
  PASSWORD_CHANGE_REQUIRED_MESSAGE,
} from "./AcceptInvitation";

/**
 * The accept-invitation screen (#274), mounted on the real browser history so
 * the address bar itself can be asserted on.
 *
 * Tier 2: the subject is which requests the page sends, with which body and
 * in which session, and what survives an in-page login -- so the real
 * generated hooks, the real auth and current-user providers and the
 * production query client run, and only the transport is replaced. A request
 * the router does not serve fails the test that sent it.
 */
const INSPECT = "/api/v1/invitations/inspect";
const ACCEPT = "/api/v1/invitations/accept";
const ACCEPT_AS_CURRENT_USER = "/api/v1/users/current/invitations/accept";
const LOGIN = "/api/v1/login";
const LOGOUT = "/api/v1/logout";
const CURRENT_USER = "/api/v1/users/current";
const COMMUNITY = /^\/api\/v1\/communities\/[^/]+$/;

/** Distinctive, so a copy of any of them anywhere -- storage, a log -- can be searched for. */
const TOKEN = "Qx47-invitation-token_kM";
const NEW_PASSWORD = "la higuera del patio da sombra";
const LOGIN_PASSWORD = "el río baja crecido en marzo";
const PERSONAL_ID = "12345678Z";

const COMMUNITY_NAME = "Sol de Lavapiés";
const COMMUNITY_ID = "community-invited";

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

function inspection(loginRequired: boolean): InvitationInspectionResponse {
  return {
    kind: "COMMUNITY",
    community: { id: COMMUNITY_ID, name: COMMUNITY_NAME },
    loginRequired,
    confirmationCodeRequired: false,
  };
}

/** The invited account, before and after accepting: the membership is what the acceptance adds. */
const INVITED_BEFORE = buildCurrentUser({ id: "user-invited", fullName: "Lucía Invitada", memberships: {} });
const INVITED_AFTER = buildCurrentUser({
  id: "user-invited",
  fullName: "Lucía Invitada",
  memberships: { [COMMUNITY_ID]: CommunityRole.COMMUNITY_MEMBER },
});
/** Somebody else, signed in on the same browser. */
const OTHER_ACCOUNT = buildCurrentUser({
  id: "user-other",
  fullName: "Óscar Otro",
  memberships: { "community-other": CommunityRole.COMMUNITY_MEMBER },
});

const PathOutput: FC = () => <output aria-label="path">{useLocation().pathname}</output>;
const TokenOutput: FC = () => <output aria-label="token">{useAuth() ?? "none"}</output>;

/**
 * Counts how often the page is mounted, and records every path the router
 * shows. Together they say whether anything navigated away from, or remounted,
 * the screen that holds the token.
 */
let pageMounts = 0;
let visitedPaths: string[] = [];
const MountProbe: FC<{ children: ReactNode }> = ({ children }) => {
  useEffect(() => {
    pageMounts++;
  }, []);
  return children;
};
const PathRecorder: FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    if (visitedPaths[visitedPaths.length - 1] !== pathname) visitedPaths.push(pathname);
  }, [pathname]);
  return null;
};

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

const HomeProbe: FC = () => <h1>Inicio</h1>;
const ForgotProbe: FC = () => (
  <>
    <h1>Recuperar contraseña</h1>
    <Link to="/login">Volver</Link>
  </>
);

function renderAt(url: string, options: { strict?: boolean; token?: string } = {}) {
  window.history.replaceState(null, "", url);
  const ui = (
    <>
      <Routes>
        <Route
          path="accept-invitation"
          element={
            <MountProbe>
              <AcceptInvitation />
            </MountProbe>
          }
        />
        <Route path="login" element={<Login />} />
        <Route path="forgot-password" element={<ForgotProbe />} />
        <Route index element={<LandingRoute />} />
        <Route path="home" element={<HomeProbe />} />
      </Routes>
      <SuccessDisplay />
      <PathOutput />
      <TokenOutput />
      <PathRecorder />
    </>
  );
  return renderWithProviders(ui, {
    browserHistory: true,
    token: options.token,
    queryClient: appClientWithoutRetries(),
    // At the root, as main.tsx renders it: only there does StrictMode run each
    // effect twice. A <StrictMode> nested in the providers only renders twice.
    reactStrictMode: options.strict,
  });
}

/** One route that answers its Nth call with the Nth responder; the last one repeats. */
function sequence(method: RequestRoute["method"], url: RequestRoute["url"], ...responses: RequestRoute["respond"][]): RequestRoute {
  let call = 0;
  return {
    method,
    url,
    respond: (config) => {
      const respond = responses[Math.min(call, responses.length - 1)] ?? (() => undefined);
      call++;
      return respond(config);
    },
  };
}

const bodiesTo = (router: RequestRouter, url: string) =>
  router.requests.filter((request: RequestConfig) => request.url === url).map((request) => request.data);

const currentPath = () => screen.getByRole("status", { name: "path" }).textContent;
const currentToken = () => screen.getByRole("status", { name: "token" }).textContent;
const findCommunityHeading = () => screen.findByRole("heading", { level: 1, name: `Únete a ${COMMUNITY_NAME}` });

/** Lets every pending effect and request run, so one that is coming has been sent. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

/** A response the test settles when it chooses. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function tokenInvalid(): never {
  throw apiError(400, { code: "MEMBERSHIP_INVITATION_TOKEN_INVALID" });
}

function throttled(): never {
  throw apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS" }, { "retry-after": "840" });
}

async function choosePassword(user: ReturnType<typeof userEvent.setup>, password: string, confirmation = password) {
  const newPassword = screen.getByLabelText("Nueva contraseña");
  const confirm = screen.getByLabelText("Repite la nueva contraseña");
  await user.clear(newPassword);
  await user.clear(confirm);
  // Pasted, not typed: userEvent.type treats some characters as key names.
  await user.click(newPassword);
  await user.paste(password);
  await user.click(confirm);
  await user.paste(confirmation);
  await user.click(screen.getByRole("button", { name: "Aceptar invitación" }));
}

async function logIn(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByLabelText("DNI/NIF"));
  await user.paste(PERSONAL_ID);
  await user.click(screen.getByLabelText("Contraseña"));
  await user.paste(LOGIN_PASSWORD);
  await user.click(screen.getByRole("button", { name: "Entrar y aceptar" }));
}

/** Every value written to, or still held in, browser storage. */
function storageContents(): string[] {
  const values: string[] = [];
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index) ?? "";
      values.push(key, storage.getItem(key) ?? "");
    }
  }
  return values;
}

const CONSOLE_METHODS = ["log", "info", "warn", "error", "debug"] as const;

let setItemSpy: MockInstance<Storage["setItem"]>;
let consoleSpies: MockInstance[];

beforeEach(() => {
  mockCustomInstance.mockReset();
  pageMounts = 0;
  visitedPaths = [];
  setItemSpy = vi.spyOn(Storage.prototype, "setItem");
  consoleSpies = CONSOLE_METHODS.map((method) => vi.spyOn(console, method));
});

afterEach(() => {
  vi.restoreAllMocks();
});

function writtenAnywhere(secret: string): boolean {
  const written = setItemSpy.mock.calls.flat().map(String);
  const logged = consoleSpies.flatMap((spy) => spy.mock.calls.flat().map(String));
  return [...written, ...logged, ...storageContents()].some((value) => value.includes(secret));
}

/** A current-user route that serves `before` until the acceptance has happened, then `after`. */
function currentUserAcross(state: { accepted: boolean }, before: CurrentUserResponse, after: CurrentUserResponse) {
  let served = 0;
  return {
    route: {
      method: "GET" as const,
      url: CURRENT_USER,
      respond: () => {
        served++;
        return state.accepted ? after : before;
      },
    },
    served: () => served,
  };
}

const communityRoute: RequestRoute = {
  method: "GET",
  url: COMMUNITY,
  respond: () =>
    buildCommunity({
      id: COMMUNITY_ID,
      name: COMMUNITY_NAME,
      capabilities: buildCommunityCapabilities({ canRead: true }),
    }),
};

describe("UI-INV-003 a link with no token (AC6)", () => {
  it.each(["/accept-invitation", "/accept-invitation#"])(
    "UI-INV-003 at %s says the link is incomplete and sends nothing",
    async (url) => {
      const router = routeRequests([]);
      mockCustomInstance.mockImplementation(router.handle);

      renderAt(url);
      await screen.findByRole("heading", { level: 1, name: "Aceptar invitación" });
      await settle();

      expect(screen.getByRole("alert")).toHaveTextContent(INCOMPLETE_LINK_MESSAGE);
      expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("DNI/NIF")).not.toBeInTheDocument();
      expect(window.location.href).not.toContain("#");
      expect(router.requests).toEqual([]);
    },
  );
});

describe("UI-INV-002 the token stays in memory (AC8)", () => {
  it.each([
    ["", false],
    [" under StrictMode", true],
  ])(
    "UI-INV-002 inspects once, clears the address bar, and keeps the token and the password out of storage and logs%s",
    async (_, strict) => {
      const user = userEvent.setup();
      const router = routeRequests([
        { method: "POST", url: INSPECT, respond: () => inspection(false) },
        { method: "POST", url: ACCEPT, respond: () => undefined },
      ]);
      mockCustomInstance.mockImplementation(router.handle);

      renderAt(`/accept-invitation#${TOKEN}`, { strict });
      await findCommunityHeading();
      await settle();

      expect(window.location.hash).toBe("");
      expect(window.location.href).not.toContain("#");
      expect(window.location.pathname).toBe("/accept-invitation");
      expect(bodiesTo(router, INSPECT)).toEqual([{ token: TOKEN }]);

      await choosePassword(user, NEW_PASSWORD);
      await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });

      expect(bodiesTo(router, ACCEPT)).toEqual([{ token: TOKEN, newPassword: NEW_PASSWORD }]);
      expect(writtenAnywhere(TOKEN)).toBe(false);
      expect(writtenAnywhere(NEW_PASSWORD)).toBe(false);
    },
  );

  it.each([
    ["", false],
    [" under StrictMode", true],
  ])("UI-INV-002 keeps the token and the login password out of storage and logs across an in-page login%s", async (_, strict) => {
    const user = userEvent.setup();
    const state = { accepted: false };
    const currentUser = currentUserAcross(state, INVITED_BEFORE, INVITED_AFTER);
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => inspection(true) },
      { method: "POST", url: LOGIN, respond: () => ({ token: "session-token" }) },
      currentUser.route,
      {
        method: "POST",
        url: ACCEPT_AS_CURRENT_USER,
        respond: () => {
          state.accepted = true;
          return undefined;
        },
      },
      communityRoute,
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`, { strict });
    await findCommunityHeading();
    await logIn(user);
    await screen.findByRole("heading", { level: 1, name: "Inicio" });

    expect(window.location.hash).toBe("");
    expect(bodiesTo(router, INSPECT)).toEqual([{ token: TOKEN }]);
    expect(bodiesTo(router, ACCEPT_AS_CURRENT_USER)).toEqual([{ token: TOKEN }]);
    expect(writtenAnywhere(TOKEN)).toBe(false);
    expect(writtenAnywhere(LOGIN_PASSWORD)).toBe(false);
  });
});

describe("UI-INV-004 inspection", () => {
  it("UI-INV-004 names the community the invitation is for", async () => {
    const router = routeRequests([{ method: "POST", url: INSPECT, respond: () => inspection(false) }]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`);

    expect(await findCommunityHeading()).toBeInTheDocument();
    expect(screen.getByText("Elige una contraseña para tu cuenta")).toBeInTheDocument();
  });

  // A platform-admin invitation's code (#288) is never asked of a community's.
  it.each([
    ["the new-password path", false, undefined],
    ["the login form", true, undefined],
    ["the signed-in button", true, "invited-session"],
  ])("UI-INV-014 AC7 asks for no confirmation code on %s", async (_, loginRequired, token) => {
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => inspection(loginRequired) },
      { method: "GET", url: CURRENT_USER, respond: () => INVITED_BEFORE },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`, { token });
    await findCommunityHeading();
    await screen.findByRole("button", { name: loginRequired && !token ? "Entrar y aceptar" : "Aceptar invitación" });

    expect(screen.queryByLabelText("Código de confirmación")).not.toBeInTheDocument();
  });
});

describe("UI-INV-007 an account without a password (AC1)", () => {
  it("UI-INV-007 accepts with a new password and leads to the login page with a one-time notice", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => inspection(false) },
      { method: "POST", url: ACCEPT, respond: () => undefined },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`);
    await findCommunityHeading();
    expect(screen.getByLabelText("Nueva contraseña")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("Repite la nueva contraseña")).toHaveAttribute("autocomplete", "new-password");

    await choosePassword(user, NEW_PASSWORD);

    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    expect(currentPath()).toBe("/login");
    expect(bodiesTo(router, ACCEPT)).toEqual([{ token: TOKEN, newPassword: NEW_PASSWORD }]);
    expect(screen.getAllByText(invitationAcceptedLoginMessage(COMMUNITY_NAME))).toHaveLength(1);

    // Once: leaving the login page and coming back does not show it again.
    await user.click(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" }));
    await screen.findByRole("heading", { name: "Recuperar contraseña" });
    await user.click(screen.getByRole("link", { name: "Volver" }));
    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    expect(screen.queryByText(invitationAcceptedLoginMessage(COMMUNITY_NAME))).not.toBeInTheDocument();
  });

  it("UI-INV-007 revokes another account's session before going to the login page", async () => {
    const user = userEvent.setup();
    let pathAtLogout: string | null = null;
    const router = routeRequests([
      { method: "GET", url: CURRENT_USER, respond: () => OTHER_ACCOUNT },
      { method: "GET", url: COMMUNITY, respond: () => buildCommunity({ id: "community-other" }) },
      { method: "POST", url: INSPECT, respond: () => inspection(false) },
      { method: "POST", url: ACCEPT, respond: () => undefined },
      {
        method: "POST",
        url: LOGOUT,
        respond: () => {
          pathAtLogout = window.location.pathname;
          return undefined;
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`, { token: "other-session" });
    await findCommunityHeading();
    expect(currentToken()).toBe("other-session");

    await choosePassword(user, NEW_PASSWORD);

    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    const urls = router.requests.map((request) => request.url);
    expect(urls.indexOf(LOGOUT)).toBeGreaterThan(urls.indexOf(ACCEPT));
    expect(pathAtLogout).toBe("/accept-invitation");
    expect(currentToken()).toBe("none");
    expect(currentPath()).toBe("/login");
    expect(screen.getAllByText(invitationAcceptedLoginMessage(COMMUNITY_NAME))).toHaveLength(1);
  });

  it("UI-INV-007 ends another account's session even when the revocation fails", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      { method: "GET", url: CURRENT_USER, respond: () => OTHER_ACCOUNT },
      { method: "GET", url: COMMUNITY, respond: () => buildCommunity({ id: "community-other" }) },
      { method: "POST", url: INSPECT, respond: () => inspection(false) },
      { method: "POST", url: ACCEPT, respond: () => undefined },
      {
        method: "POST",
        url: LOGOUT,
        respond: () => {
          throw apiError(500);
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`, { token: "other-session" });
    await findCommunityHeading();
    await choosePassword(user, NEW_PASSWORD);

    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    expect(bodiesTo(router, LOGOUT)).toHaveLength(1);
    expect(currentToken()).toBe("none");
    expect(screen.getAllByText(invitationAcceptedLoginMessage(COMMUNITY_NAME))).toHaveLength(1);
  });

  describe("when the revocation never answers", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(async () => {
      await act(() => vi.runOnlyPendingTimersAsync());
      vi.useRealTimers();
    });

    it("UI-INV-007 ends another account's session and goes to the login page once the bound passes", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const router = routeRequests([
        { method: "GET", url: CURRENT_USER, respond: () => OTHER_ACCOUNT },
        { method: "GET", url: COMMUNITY, respond: () => buildCommunity({ id: "community-other" }) },
        { method: "POST", url: INSPECT, respond: () => inspection(false) },
        { method: "POST", url: ACCEPT, respond: () => undefined },
        { method: "POST", url: LOGOUT, respond: () => new Promise(() => {}) },
      ]);
      mockCustomInstance.mockImplementation(router.handle);

      renderAt(`/accept-invitation#${TOKEN}`, { token: "other-session" });
      await findCommunityHeading();
      await choosePassword(user, NEW_PASSWORD);

      await waitFor(() => expect(bodiesTo(router, LOGOUT)).toHaveLength(1));
      // Waiting for the revocation, within its bound.
      expect(currentToken()).toBe("other-session");
      expect(currentPath()).toBe("/accept-invitation");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(LOGOUT_TIMEOUT_MS);
      });

      await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
      expect(currentToken()).toBe("none");
      expect(currentPath()).toBe("/login");
      expect(screen.getAllByText(invitationAcceptedLoginMessage(COMMUNITY_NAME))).toHaveLength(1);
    });
  });

  it("UI-INV-007 checks the policy before sending", async () => {
    const user = userEvent.setup();
    const router = routeRequests([{ method: "POST", url: INSPECT, respond: () => inspection(false) }]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`);
    await findCommunityHeading();
    await choosePassword(user, "corta");

    expect(await screen.findByText(/al menos 15 caracteres/)).toBeInTheDocument();
    await choosePassword(user, NEW_PASSWORD, `${NEW_PASSWORD}!`);
    expect(await screen.findByText("Las contraseñas no coinciden")).toBeInTheDocument();
    expect(bodiesTo(router, ACCEPT)).toEqual([]);
  });
});

describe("UI-INV-008 a refused password", () => {
  it("UI-INV-008 shows the error on the field and keeps the token for a corrected attempt", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => inspection(false) },
      sequence(
        "POST",
        ACCEPT,
        () => {
          throw apiError(400, { code: "USER_PASSWORD_POLICY_VIOLATION" });
        },
        () => undefined,
      ),
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`);
    await findCommunityHeading();
    await choosePassword(user, NEW_PASSWORD);

    expect(await screen.findByText("La contraseña no cumple los requisitos.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nueva contraseña")).toHaveAttribute("aria-invalid", "true");

    await choosePassword(user, `${NEW_PASSWORD} y fresca`);
    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    expect(bodiesTo(router, ACCEPT)).toEqual([
      { token: TOKEN, newPassword: NEW_PASSWORD },
      { token: TOKEN, newPassword: `${NEW_PASSWORD} y fresca` },
    ]);
  });
});

describe("UI-INV-009 the account turns out to have a password", () => {
  it("UI-INV-009 switches to the login path on 409 and accepts signed in with the same token", async () => {
    const user = userEvent.setup();
    const state = { accepted: false };
    const currentUser = currentUserAcross(state, INVITED_BEFORE, INVITED_AFTER);
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => inspection(false) },
      {
        method: "POST",
        url: ACCEPT,
        respond: () => {
          throw apiError(409, { code: "MEMBERSHIP_INVITATION_LOGIN_REQUIRED" });
        },
      },
      { method: "POST", url: LOGIN, respond: () => ({ token: "session-token" }) },
      currentUser.route,
      {
        method: "POST",
        url: ACCEPT_AS_CURRENT_USER,
        respond: () => {
          state.accepted = true;
          return undefined;
        },
      },
      communityRoute,
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`);
    await findCommunityHeading();
    await choosePassword(user, NEW_PASSWORD);

    expect(await screen.findByText("Inicia sesión para aceptar la invitación")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();

    await logIn(user);
    await screen.findByRole("heading", { level: 1, name: "Inicio" });
    expect(bodiesTo(router, ACCEPT_AS_CURRENT_USER)).toEqual([{ token: TOKEN }]);
  });
});

describe("UI-INV-012 logging in on this screen (AC2)", () => {
  it("UI-INV-012 logs in without leaving the page and accepts with the original token", async () => {
    const user = userEvent.setup();
    const state = { accepted: false };
    // The new session's first read of the current user waits for the test, so
    // the page can be looked at while the login is still settling.
    const sessionLive = deferred<CurrentUserResponse>();
    let currentUserReads = 0;
    let duringAcceptance: { mounts: number; paths: string[]; session: string | null } | null = null;
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => inspection(true) },
      { method: "POST", url: LOGIN, respond: () => ({ token: "session-token" }) },
      {
        method: "GET",
        url: CURRENT_USER,
        respond: () => {
          currentUserReads++;
          return currentUserReads === 1 ? sessionLive.promise : state.accepted ? INVITED_AFTER : INVITED_BEFORE;
        },
      },
      {
        method: "POST",
        url: ACCEPT_AS_CURRENT_USER,
        respond: () => {
          duringAcceptance = {
            mounts: pageMounts,
            paths: [...visitedPaths],
            session: screen.getByRole("status", { name: "token" }).textContent,
          };
          state.accepted = true;
          return undefined;
        },
      },
      communityRoute,
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`);
    await findCommunityHeading();
    expect(screen.getByLabelText("DNI/NIF")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("autocomplete", "current-password");

    await logIn(user);
    await waitFor(() => expect(currentUserReads).toBe(1));
    await settle();

    // Signed in, and still here: same mount, same path, the community still named.
    expect(currentToken()).toBe("session-token");
    expect(currentPath()).toBe("/accept-invitation");
    expect(visitedPaths).toEqual(["/accept-invitation"]);
    expect(pageMounts).toBe(1);
    expect(screen.getByRole("heading", { level: 1, name: `Únete a ${COMMUNITY_NAME}` })).toBeInTheDocument();
    expect(bodiesTo(router, ACCEPT_AS_CURRENT_USER)).toEqual([]);

    await act(async () => sessionLive.resolve(INVITED_BEFORE));
    await screen.findByRole("heading", { level: 1, name: "Inicio" });

    expect(bodiesTo(router, LOGIN)).toEqual([{ username: PERSONAL_ID, password: LOGIN_PASSWORD }]);
    expect(bodiesTo(router, ACCEPT_AS_CURRENT_USER)).toEqual([{ token: TOKEN }]);
    // The acceptance was sent from the same mount of the page, on the same
    // path, with the new session in place.
    expect(duringAcceptance).toEqual({ mounts: 1, paths: ["/accept-invitation"], session: "session-token" });
    // The current user is read for the new session before accepting, and again after.
    const urls = router.requests.map((request) => request.url);
    expect(urls.indexOf(CURRENT_USER)).toBeLessThan(urls.indexOf(ACCEPT_AS_CURRENT_USER));
    expect(writtenAnywhere(TOKEN)).toBe(false);
  });

  it("UI-INV-012 offers a retry when the new session's user cannot be read, and accepts once it is", async () => {
    const user = userEvent.setup();
    const state = { accepted: false };
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => inspection(true) },
      { method: "POST", url: LOGIN, respond: () => ({ token: "session-token" }) },
      sequence(
        "GET",
        CURRENT_USER,
        () => {
          throw apiError(500);
        },
        () => (state.accepted ? INVITED_AFTER : INVITED_BEFORE),
      ),
      {
        method: "POST",
        url: ACCEPT_AS_CURRENT_USER,
        respond: () => {
          state.accepted = true;
          return undefined;
        },
      },
      communityRoute,
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`);
    await findCommunityHeading();
    await logIn(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(LOGIN_INCOMPLETE_MESSAGE);
    // Still signed in, still here, and nothing accepted yet.
    expect(currentToken()).toBe("session-token");
    expect(currentPath()).toBe("/accept-invitation");
    expect(bodiesTo(router, ACCEPT_AS_CURRENT_USER)).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    await screen.findByRole("heading", { level: 1, name: "Inicio" });
    expect(bodiesTo(router, CURRENT_USER).length).toBeGreaterThanOrEqual(2);
    expect(bodiesTo(router, ACCEPT_AS_CURRENT_USER)).toEqual([{ token: TOKEN }]);
    expect(pageMounts).toBe(1);
    expect(writtenAnywhere(TOKEN)).toBe(false);
  });

  it("UI-INV-012 ends the new session, with no retry, when reading its user answers 401", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => inspection(true) },
      { method: "POST", url: LOGIN, respond: () => ({ token: "session-token" }) },
      {
        method: "GET",
        url: CURRENT_USER,
        respond: () => {
          throw apiError(401);
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`);
    await findCommunityHeading();
    await logIn(user);

    await waitFor(() => expect(bodiesTo(router, CURRENT_USER)).toHaveLength(1));
    await waitFor(() => expect(currentToken()).toBe("none"));
    expect(await screen.findByLabelText("DNI/NIF")).toBeInTheDocument();
    expect(screen.queryByText(LOGIN_INCOMPLETE_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
    expect(currentPath()).toBe("/accept-invitation");
    expect(bodiesTo(router, ACCEPT_AS_CURRENT_USER)).toEqual([]);
  });

  it("UI-INV-012 keeps the screen on a refused login, and says why", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => inspection(true) },
      sequence(
        "POST",
        LOGIN,
        () => {
          throw apiError(400);
        },
        throttled,
      ),
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`);
    await findCommunityHeading();

    await logIn(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(LOGIN_FAILED_MESSAGE);
    await logIn(user);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("dentro de 14 minutos"));

    expect(currentPath()).toBe("/accept-invitation");
    expect(pageMounts).toBe(1);
    expect(router.requests.filter((request) => request.url === ACCEPT_AS_CURRENT_USER)).toEqual([]);
  });
});

describe("UI-INV-010 signed in as the invited account (AC3)", () => {
  it("UI-INV-010 accepts with one button, refreshes the current user, and the landing says so once", async () => {
    const user = userEvent.setup();
    const state = { accepted: false };
    const currentUser = currentUserAcross(state, INVITED_BEFORE, INVITED_AFTER);
    const router = routeRequests([
      currentUser.route,
      { method: "POST", url: INSPECT, respond: () => inspection(true) },
      {
        method: "POST",
        url: ACCEPT_AS_CURRENT_USER,
        respond: () => {
          state.accepted = true;
          return undefined;
        },
      },
      communityRoute,
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`, { token: "invited-session" });
    await findCommunityHeading();
    expect(await screen.findByText("Lucía Invitada")).toBeInTheDocument();
    expect(screen.queryByLabelText("DNI/NIF")).not.toBeInTheDocument();
    expect(currentUser.served()).toBe(1);

    await user.click(screen.getByRole("button", { name: "Aceptar invitación" }));

    // The new membership is what sends the landing to the home rather than to
    // the no-community screen.
    await screen.findByRole("heading", { level: 1, name: "Inicio" });
    expect(currentUser.served()).toBe(2);
    expect(bodiesTo(router, ACCEPT_AS_CURRENT_USER)).toEqual([{ token: TOKEN }]);
    expect(screen.getAllByText(invitationAcceptedMessage(COMMUNITY_NAME))).toHaveLength(1);
    expect(window.sessionStorage.getItem("invitationAccepted")).toBeNull();
  });
});

describe("UI-INV-011 signed in as another account (AC4)", () => {
  it("UI-INV-011 says the link is not usable, offers to log out, and the token survives the logout and a new login", async () => {
    const user = userEvent.setup();
    const session = { current: OTHER_ACCOUNT, accepted: false };
    let pathAtLogout: string | null = null;
    const router = routeRequests([
      {
        method: "GET",
        url: CURRENT_USER,
        respond: () => (session.accepted ? INVITED_AFTER : session.current),
      },
      communityRoute,
      { method: "POST", url: INSPECT, respond: () => inspection(true) },
      sequence("POST", ACCEPT_AS_CURRENT_USER, tokenInvalid, () => {
        session.accepted = true;
        return undefined;
      }),
      {
        method: "POST",
        url: LOGOUT,
        respond: () => {
          pathAtLogout = window.location.pathname;
          return undefined;
        },
      },
      {
        method: "POST",
        url: LOGIN,
        respond: () => {
          session.current = INVITED_BEFORE;
          return { token: "invited-session" };
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`, { token: "other-session" });
    await findCommunityHeading();
    await screen.findByText("Óscar Otro");
    await user.click(screen.getByRole("button", { name: "Aceptar invitación" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID_LINK_MESSAGE);
    expect(screen.getByText(OTHER_ACCOUNT_MESSAGE)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    await screen.findByLabelText("DNI/NIF");
    expect(pathAtLogout).toBe("/accept-invitation");
    expect(currentToken()).toBe("none");
    expect(currentPath()).toBe("/accept-invitation");

    await logIn(user);
    await screen.findByRole("heading", { level: 1, name: "Inicio" });
    expect(bodiesTo(router, ACCEPT_AS_CURRENT_USER)).toEqual([{ token: TOKEN }, { token: TOKEN }]);
    expect(pageMounts).toBe(1);
    expect(writtenAnywhere(TOKEN)).toBe(false);
  });
});

describe("UI-INV-011 logging out when the revocation never answers", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(async () => {
    await act(() => vi.runOnlyPendingTimersAsync());
    vi.useRealTimers();
  });

  it("UI-INV-011 ends the session and offers the login on this screen once the bound passes", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const router = routeRequests([
      { method: "GET", url: CURRENT_USER, respond: () => OTHER_ACCOUNT },
      communityRoute,
      { method: "POST", url: INSPECT, respond: () => inspection(true) },
      { method: "POST", url: ACCEPT_AS_CURRENT_USER, respond: tokenInvalid },
      { method: "POST", url: LOGOUT, respond: () => new Promise(() => {}) },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`, { token: "other-session" });
    await findCommunityHeading();
    await screen.findByText("Óscar Otro");
    await user.click(screen.getByRole("button", { name: "Aceptar invitación" }));
    await user.click(await screen.findByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() => expect(bodiesTo(router, LOGOUT)).toHaveLength(1));
    // Waiting for the revocation, within its bound.
    expect(currentToken()).toBe("other-session");
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(LOGOUT_TIMEOUT_MS);
    });

    expect(await screen.findByLabelText("DNI/NIF")).toBeInTheDocument();
    expect(currentToken()).toBe("none");
    expect(currentPath()).toBe("/accept-invitation");
    expect(pageMounts).toBe(1);
  });
});

describe("UI-INV-005 an unusable token (AC5)", () => {
  it("UI-INV-005 shows the same message when the inspection refuses it", async () => {
    const router = routeRequests([{ method: "POST", url: INSPECT, respond: tokenInvalid }]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`);

    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID_LINK_MESSAGE);
    expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("DNI/NIF")).not.toBeInTheDocument();
  });

  it("UI-INV-005 shows the same message when the acceptance without a session refuses it", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => inspection(false) },
      { method: "POST", url: ACCEPT, respond: tokenInvalid },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`);
    await findCommunityHeading();
    await choosePassword(user, NEW_PASSWORD);

    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID_LINK_MESSAGE);
    expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
  });

  it("UI-INV-005 shows the same message when the acceptance after logging in refuses it", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => inspection(true) },
      { method: "POST", url: LOGIN, respond: () => ({ token: "session-token" }) },
      { method: "GET", url: CURRENT_USER, respond: () => INVITED_BEFORE },
      { method: "POST", url: ACCEPT_AS_CURRENT_USER, respond: tokenInvalid },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`);
    await findCommunityHeading();
    await logIn(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID_LINK_MESSAGE);
  });
});

describe("UI-INV-006 a throttled request (AC7)", () => {
  it("UI-INV-006 shows the wait in minutes on inspection, and inspects again on request", async () => {
    const user = userEvent.setup();
    const router = routeRequests([sequence("POST", INSPECT, throttled, () => inspection(false))]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Demasiados intentos fallidos. Vuelve a intentarlo dentro de 14 minutos.",
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    await findCommunityHeading();
    expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();
    expect(bodiesTo(router, INSPECT)).toEqual([{ token: TOKEN }, { token: TOKEN }]);
  });

  it("UI-INV-006 shows the wait in minutes on acceptance, and keeps the form and the token", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => inspection(false) },
      sequence("POST", ACCEPT, throttled, () => undefined),
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`);
    await findCommunityHeading();
    await choosePassword(user, NEW_PASSWORD);

    expect(await screen.findByRole("alert")).toHaveTextContent("dentro de 14 minutos");
    expect(screen.getByLabelText("Nueva contraseña")).toBeEnabled();

    await choosePassword(user, NEW_PASSWORD);
    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    expect(bodiesTo(router, ACCEPT)).toEqual([
      { token: TOKEN, newPassword: NEW_PASSWORD },
      { token: TOKEN, newPassword: NEW_PASSWORD },
    ]);
  });

  it("UI-INV-006 shows the wait in minutes on the signed-in acceptance, and keeps the button", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      { method: "GET", url: CURRENT_USER, respond: () => INVITED_BEFORE },
      { method: "POST", url: INSPECT, respond: () => inspection(true) },
      { method: "POST", url: ACCEPT_AS_CURRENT_USER, respond: throttled },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`, { token: "invited-session" });
    await findCommunityHeading();
    await screen.findByText("Lucía Invitada");
    await user.click(screen.getByRole("button", { name: "Aceptar invitación" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("dentro de 14 minutos");
    expect(screen.getByRole("button", { name: "Aceptar invitación" })).toBeEnabled();
  });
});

describe("UI-INV-013 a password change comes first", () => {
  it("UI-INV-013 explains it and links to the change-password page", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      { method: "GET", url: CURRENT_USER, respond: () => ({ ...INVITED_BEFORE, mustChangePassword: true }) },
      { method: "POST", url: INSPECT, respond: () => inspection(true) },
      {
        method: "POST",
        url: ACCEPT_AS_CURRENT_USER,
        respond: () => {
          throw apiError(403, { code: "USER_PASSWORD_CHANGE_REQUIRED" });
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`, { token: "invited-session" });
    await findCommunityHeading();
    await screen.findByText("Lucía Invitada");
    await user.click(screen.getByRole("button", { name: "Aceptar invitación" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(PASSWORD_CHANGE_REQUIRED_MESSAGE);
    expect(within(document.body).getByRole("link", { name: "Cambiar contraseña" })).toHaveAttribute(
      "href",
      "/change-password",
    );
    expect(currentPath()).toBe("/accept-invitation");
  });
});
