import "@testing-library/jest-dom";
import type { FC } from "react";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes, useLocation } from "react-router";
import type { QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "../../queryClient";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig, type RequestRouter, type Route as RequestRoute } from "../../test/requestRouter";
import { apiError } from "../../test/apiError";
import { cachesHold, watchForSecrets } from "../../test/secretWatch";
import { buildCurrentUser, buildPlatformCapabilities } from "../../test/fixtures";
import type { InvitationInspectionResponse } from "../../api/models";
import { SuccessDisplay } from "../../components/Success/SuccessDisplay";
import { PLATFORM_INVITATION_ACCEPTED_LOGIN_MESSAGE, PLATFORM_INVITATION_ACCEPTED_MESSAGE } from "../../utils/session";
import { LandingRoute } from "../landing/LandingRoute";
import { Login } from "./Login";
import {
  AcceptInvitation,
  CODE_EXHAUSTED_MESSAGE,
  CODE_INVALID_MESSAGE,
  CODE_MALFORMED_MESSAGE,
  CODE_REQUIRED_MESSAGE,
  PLATFORM_INVALID_LINK_MESSAGE,
} from "./AcceptInvitation";
import { VISIBLE } from "../../test/visibleText";

/**
 * The accept-invitation screen with a platform-admin invitation (#288): the
 * same screen as a community's (#274), naming the platform instead of a
 * community and asking, on both paths, for the confirmation code that whoever
 * invited gave the person.
 *
 * Tier 2, as the community's spec: the subject is which requests the page
 * sends, with which body and in which session, and what survives an in-page
 * login or a wrong code. Only the transport is replaced, and a request the
 * router does not serve fails the test that sent it.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const INSPECT = "/api/v1/invitations/inspect";
const ACCEPT = "/api/v1/invitations/accept";
const ACCEPT_AS_CURRENT_USER = "/api/v1/users/current/invitations/accept";
const LOGIN = "/api/v1/login";
const CURRENT_USER = "/api/v1/users/current";

/** Distinctive, so a copy of any of them anywhere -- storage, a log, a cache -- can be searched for. */
const TOKEN = "Pz91-platform-invitation_tK";
const NEW_PASSWORD = "el almendro florece en enero";
const LOGIN_PASSWORD = "la acequia corre junto al camino";
const PERSONAL_ID = "12345678Z";
/** As the person may type it: lower case and with the hyphen of the grouped display. */
const CODE = "k7q2-m9xz";
const OTHER_CODE = "B4N8R2TW";

function platformInspection(loginRequired: boolean): InvitationInspectionResponse {
  return { kind: "PLATFORM", community: null, loginRequired, confirmationCodeRequired: true };
}

/** The invited account, before and after accepting: the role is what the acceptance adds. */
const INVITED_BEFORE = buildCurrentUser({ id: "user-invited", fullName: "Pablo Invitado", memberships: {} });
const INVITED_AFTER = buildCurrentUser({
  id: "user-invited",
  fullName: "Pablo Invitado",
  memberships: {},
  isPlatformAdmin: true,
  platformCapabilities: buildPlatformCapabilities({ canAdministerPlatform: true }),
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

function renderAt(url: string, options: { strict?: boolean; token?: string } = {}) {
  window.history.replaceState(null, "", url);
  const ui = (
    <>
      <Routes>
        <Route path="accept-invitation" element={<AcceptInvitation />} />
        <Route path="login" element={<Login />} />
        <Route index element={<LandingRoute />} />
        <Route path="platform" element={<h1>Plataforma</h1>} />
      </Routes>
      <SuccessDisplay />
      <PathOutput />
    </>
  );
  return renderWithProviders(ui, {
    browserHistory: true,
    token: options.token,
    queryClient: appClientWithoutRetries(),
    // At the root, as main.tsx renders it: only there does StrictMode run each
    // effect twice.
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

/** A current-user route that serves `before` until the acceptance has happened, then `after`. */
function currentUserAcross(state: { accepted: boolean }) {
  let served = 0;
  return {
    route: {
      method: "GET" as const,
      url: CURRENT_USER,
      respond: () => {
        served++;
        return state.accepted ? INVITED_AFTER : INVITED_BEFORE;
      },
    } satisfies RequestRoute,
    served: () => served,
  };
}

const bodiesTo = (router: RequestRouter, url: string) =>
  router.requests.filter((request: RequestConfig) => request.url === url).map((request) => request.data);

const currentPath = () => screen.getByRole("status", { name: "path" }).textContent;
const findPlatformHeading = () =>
  screen.findByRole("heading", { level: 1, name: "Únete como administrador de la plataforma" });
const codeField = () => screen.getByLabelText("Código de confirmación");

/** Lets every pending effect and request run, so one that is coming has been sent. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

const codeInvalid = (): never => {
  throw apiError(400, { code: "PLATFORM_ADMIN_INVITATION_CODE_INVALID" });
};
const codeExhausted = (): never => {
  throw apiError(400, { code: "PLATFORM_ADMIN_INVITATION_CODE_ATTEMPTS_EXHAUSTED" });
};

async function typeCode(user: ReturnType<typeof userEvent.setup>, code: string) {
  await user.clear(codeField());
  await user.click(codeField());
  await user.paste(code);
}

async function choosePassword(user: ReturnType<typeof userEvent.setup>, password: string) {
  const newPassword = screen.getByLabelText("Nueva contraseña");
  const confirm = screen.getByLabelText("Repite la nueva contraseña");
  await user.clear(newPassword);
  await user.clear(confirm);
  // Pasted, not typed: userEvent.type treats some characters as key names.
  await user.click(newPassword);
  await user.paste(password);
  await user.click(confirm);
  await user.paste(password);
}

async function fillLogin(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByLabelText("DNI/NIF"));
  await user.paste(PERSONAL_ID);
  await user.click(screen.getByLabelText("Contraseña"));
  await user.paste(LOGIN_PASSWORD);
}

let secrets: ReturnType<typeof watchForSecrets>;

beforeEach(() => {
  mockCustomInstance.mockReset();
  secrets = watchForSecrets();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UI-INV-004 UI-INV-014 a platform invitation names the platform and asks for the code (AC5)", () => {
  it.each([
    ["", false],
    [" under StrictMode", true],
  ])(
    "UI-INV-014 UI-INV-017 accepts with a new password and the code, and the login page says so once%s",
    async (_, strict) => {
      const user = userEvent.setup();
      const router = routeRequests([
        { method: "POST", url: INSPECT, respond: () => platformInspection(false) },
        { method: "POST", url: ACCEPT, respond: () => undefined },
      ]);
      mockCustomInstance.mockImplementation(router.handle);

      const { queryClient } = renderAt(`/accept-invitation#${TOKEN}`, { strict });
      await findPlatformHeading();
      expect(screen.getByText("Elige una contraseña para tu cuenta")).toBeInTheDocument();
      expect(screen.queryByText(/Únete a /)).not.toBeInTheDocument();
      expect(codeField()).toHaveAttribute("autocomplete", "off");
      expect(codeField()).toBeRequired();

      await typeCode(user, CODE);
      await choosePassword(user, NEW_PASSWORD);
      await user.click(screen.getByRole("button", { name: "Aceptar invitación" }));

      await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
      expect(bodiesTo(router, ACCEPT)).toEqual([{ token: TOKEN, newPassword: NEW_PASSWORD, confirmationCode: CODE }]);
      expect(screen.getAllByText(PLATFORM_INVITATION_ACCEPTED_LOGIN_MESSAGE, VISIBLE)).toHaveLength(1);
      await settle();
      expect(window.sessionStorage.getItem("platformInvitationAccepted")).toBeNull();

      // The code, like the token, went in the request body and nowhere else.
      expect(secrets.leaksOf(CODE)).toEqual([]);
      expect(secrets.leaksOf(TOKEN)).toEqual([]);
      expect(secrets.leaksOf(NEW_PASSWORD)).toEqual([]);
      await waitFor(() => expect(cachesHold(queryClient, CODE)).toBe(false));
    },
  );

  it("UI-INV-014 UI-INV-017 logs in on the page with the code, accepts with the original token, and the landing says so once", async () => {
    const user = userEvent.setup();
    const state = { accepted: false };
    const currentUser = currentUserAcross(state);
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => platformInspection(true) },
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
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    const { queryClient } = renderAt(`/accept-invitation#${TOKEN}`, { strict: true });
    await findPlatformHeading();
    await fillLogin(user);

    // A code that cannot be one is refused before any login: no session is opened for it.
    await typeCode(user, "ABC");
    await user.click(screen.getByRole("button", { name: "Entrar y aceptar" }));
    expect(codeField()).toHaveAccessibleDescription(CODE_MALFORMED_MESSAGE);
    expect(bodiesTo(router, LOGIN)).toEqual([]);

    await typeCode(user, CODE);
    await user.click(screen.getByLabelText("Contraseña"));
    await user.paste(LOGIN_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Entrar y aceptar" }));

    // The new capabilities apply: the re-read user is a platform admin, whom the landing sends to the platform.
    await screen.findByRole("heading", { level: 1, name: "Plataforma" });
    expect(bodiesTo(router, ACCEPT_AS_CURRENT_USER)).toEqual([{ token: TOKEN, confirmationCode: CODE }]);
    expect(screen.getAllByText(PLATFORM_INVITATION_ACCEPTED_MESSAGE, VISIBLE)).toHaveLength(1);
    expect(window.sessionStorage.getItem("platformInvitationAccepted")).toBeNull();
    expect(secrets.leaksOf(CODE)).toEqual([]);
    expect(secrets.leaksOf(TOKEN)).toEqual([]);
    await waitFor(() => expect(cachesHold(queryClient, CODE)).toBe(false));
  });

  it("UI-INV-014 UI-INV-017 accepts signed in with the code, re-reads the current user, and the landing says so once", async () => {
    const user = userEvent.setup();
    const state = { accepted: false };
    const currentUser = currentUserAcross(state);
    const router = routeRequests([
      currentUser.route,
      { method: "POST", url: INSPECT, respond: () => platformInspection(true) },
      {
        method: "POST",
        url: ACCEPT_AS_CURRENT_USER,
        respond: () => {
          state.accepted = true;
          return undefined;
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`, { token: "invited-session", strict: true });
    await findPlatformHeading();
    expect(await screen.findByText("Pablo Invitado")).toBeInTheDocument();
    expect(codeField()).toHaveAttribute("autocomplete", "off");

    await user.click(screen.getByRole("button", { name: "Aceptar invitación" }));
    expect(codeField()).toHaveAccessibleDescription(CODE_REQUIRED_MESSAGE);
    expect(bodiesTo(router, ACCEPT_AS_CURRENT_USER)).toEqual([]);

    await typeCode(user, CODE);
    const readsBefore = currentUser.served();
    await user.click(screen.getByRole("button", { name: "Aceptar invitación" }));

    await screen.findByRole("heading", { level: 1, name: "Plataforma" });
    expect(currentUser.served()).toBeGreaterThan(readsBefore);
    expect(bodiesTo(router, ACCEPT_AS_CURRENT_USER)).toEqual([{ token: TOKEN, confirmationCode: CODE }]);
    expect(screen.getAllByText(PLATFORM_INVITATION_ACCEPTED_MESSAGE, VISIBLE)).toHaveLength(1);
    expect(secrets.leaksOf(CODE)).toEqual([]);
  });
});

describe("UI-INV-015 UI-INV-016 a wrong code (AC6)", () => {
  it("UI-INV-015 shows a wrong code on its field and keeps the token and the passwords for another try", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => platformInspection(false) },
      sequence("POST", ACCEPT, codeInvalid, () => undefined),
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`, { strict: true });
    await findPlatformHeading();
    await typeCode(user, OTHER_CODE);
    await choosePassword(user, NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Aceptar invitación" }));

    await waitFor(() => expect(codeField()).toHaveAccessibleDescription(CODE_INVALID_MESSAGE));
    expect(codeField()).toHaveValue(OTHER_CODE);
    expect(screen.getByLabelText("Nueva contraseña")).toHaveValue(NEW_PASSWORD);
    expect(screen.getByLabelText("Repite la nueva contraseña")).toHaveValue(NEW_PASSWORD);

    await typeCode(user, CODE);
    expect(codeField()).not.toHaveAccessibleDescription(CODE_INVALID_MESSAGE);
    await user.click(screen.getByRole("button", { name: "Aceptar invitación" }));

    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    expect(bodiesTo(router, ACCEPT)).toEqual([
      { token: TOKEN, newPassword: NEW_PASSWORD, confirmationCode: OTHER_CODE },
      { token: TOKEN, newPassword: NEW_PASSWORD, confirmationCode: CODE },
    ]);
  });

  it("UI-INV-015 after an in-page login, shows a wrong code on the field next to the accept button, still signed in", async () => {
    const user = userEvent.setup();
    const state = { accepted: false };
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => platformInspection(true) },
      { method: "POST", url: LOGIN, respond: () => ({ token: "session-token" }) },
      currentUserAcross(state).route,
      sequence("POST", ACCEPT_AS_CURRENT_USER, codeInvalid, () => {
        state.accepted = true;
        return undefined;
      }),
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`);
    await findPlatformHeading();
    await fillLogin(user);
    await typeCode(user, OTHER_CODE);
    await user.click(screen.getByRole("button", { name: "Entrar y aceptar" }));

    expect(await screen.findByText("Pablo Invitado")).toBeInTheDocument();
    await waitFor(() => expect(codeField()).toHaveAccessibleDescription(CODE_INVALID_MESSAGE));
    expect(codeField()).toHaveValue(OTHER_CODE);
    expect(bodiesTo(router, LOGIN)).toHaveLength(1);

    await typeCode(user, CODE);
    await user.click(screen.getByRole("button", { name: "Aceptar invitación" }));

    await screen.findByRole("heading", { level: 1, name: "Plataforma" });
    expect(bodiesTo(router, ACCEPT_AS_CURRENT_USER)).toEqual([
      { token: TOKEN, confirmationCode: OTHER_CODE },
      { token: TOKEN, confirmationCode: CODE },
    ]);
    expect(bodiesTo(router, LOGIN)).toHaveLength(1);
  });

  it.each([
    ["without a session", false],
    ["signed in", true],
  ])("UI-INV-016 says the invitation was cancelled after too many wrong codes, and offers no other attempt (%s)", async (_, signedIn) => {
    const user = userEvent.setup();
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => platformInspection(signedIn) },
      { method: "POST", url: ACCEPT, respond: codeExhausted },
      { method: "POST", url: ACCEPT_AS_CURRENT_USER, respond: codeExhausted },
      { method: "GET", url: CURRENT_USER, respond: () => INVITED_BEFORE },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`, signedIn ? { token: "invited-session" } : {});
    await findPlatformHeading();
    if (signedIn) await screen.findByText("Pablo Invitado");
    await typeCode(user, CODE);
    if (!signedIn) await choosePassword(user, NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Aceptar invitación" }));

    expect(await screen.findByText(CODE_EXHAUSTED_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Código de confirmación")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al inicio de sesión" })).toBeInTheDocument();
    expect(currentPath()).toBe("/accept-invitation");
  });
});

describe("UI-INV-005 UI-INV-009 a platform invitation's other answers", () => {
  it("UI-INV-005 says to ask whoever invited for a new link when the acceptance refuses the token", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => platformInspection(false) },
      {
        method: "POST",
        url: ACCEPT,
        respond: () => {
          throw apiError(400, { code: "MEMBERSHIP_INVITATION_TOKEN_INVALID" });
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`);
    await findPlatformHeading();
    await typeCode(user, CODE);
    await choosePassword(user, NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Aceptar invitación" }));

    expect(await screen.findByText(PLATFORM_INVALID_LINK_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText("Acepta la invitación para administrar la plataforma")).toBeInTheDocument();
  });

  it("UI-INV-009 switches to the login path on its own login-required code, keeping the token and the code", async () => {
    const user = userEvent.setup();
    const state = { accepted: false };
    const router = routeRequests([
      { method: "POST", url: INSPECT, respond: () => platformInspection(false) },
      {
        method: "POST",
        url: ACCEPT,
        respond: () => {
          throw apiError(409, { code: "PLATFORM_ADMIN_INVITATION_LOGIN_REQUIRED" });
        },
      },
      { method: "POST", url: LOGIN, respond: () => ({ token: "session-token" }) },
      currentUserAcross(state).route,
      {
        method: "POST",
        url: ACCEPT_AS_CURRENT_USER,
        respond: () => {
          state.accepted = true;
          return undefined;
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/accept-invitation#${TOKEN}`);
    await findPlatformHeading();
    await typeCode(user, CODE);
    await choosePassword(user, NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Aceptar invitación" }));

    expect(await screen.findByRole("button", { name: "Entrar y aceptar" })).toBeInTheDocument();
    expect(codeField()).toHaveValue(CODE);
    await fillLogin(user);
    await user.click(screen.getByRole("button", { name: "Entrar y aceptar" }));

    await screen.findByRole("heading", { level: 1, name: "Plataforma" });
    expect(bodiesTo(router, ACCEPT_AS_CURRENT_USER)).toEqual([{ token: TOKEN, confirmationCode: CODE }]);
  });
});
