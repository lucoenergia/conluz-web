import "@testing-library/jest-dom";
import type { FC } from "react";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { Route, Routes, useLocation } from "react-router";
import type { QueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/auth.context";
import { createAppQueryClient } from "../../queryClient";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig, type RequestRouter, type Route as RequestRoute } from "../../test/requestRouter";
import { apiError } from "../../test/apiError";
import { buildCurrentUser } from "../../test/fixtures";
import { CommunityRole } from "../../api/models";
import { PASSWORD_UNCHANGED_MESSAGE } from "../../errors/authErrors";
import { PASSWORD_RULE_MESSAGES } from "../../utils/passwordPolicy";
import { markSessionExpired, PASSWORD_RESET_MESSAGE, SESSION_EXPIRED_MESSAGE } from "../../utils/session";
import { Login } from "./Login";
import { ForgotPassword } from "./ForgotPassword";
import { INCOMPLETE_LINK_MESSAGE, INVALID_LINK_MESSAGE, ResetPassword } from "./ResetPassword";

/**
 * The reset screen (#233), mounted on the real browser history so the address
 * bar itself can be asserted on.
 *
 * Tier 2: the subject is which requests the page sends, with which body, and
 * what the real session-ending path leaves behind -- so the real generated
 * hooks and the production query client run, and only the transport is
 * replaced. A request the router does not serve fails the test that sent it.
 */
const RESET = "/api/v1/users/password/reset";
const CURRENT_USER = "/api/v1/users/current";

/** Distinctive, so a copy of it anywhere -- storage, a log -- can be searched for. */
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

function renderAt(url: string, options: { strict?: boolean; token?: string } = {}) {
  window.history.replaceState(null, "", url);
  const ui = (
    <>
      <Routes>
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="login" element={<Login />} />
      </Routes>
      <PathOutput />
      <TokenOutput />
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

function resetRoutes(...responses: RequestRoute["respond"][]): RequestRoute[] {
  let call = 0;
  return [
    {
      method: "POST",
      url: RESET,
      respond: (config) => {
        const respond = responses[Math.min(call, responses.length - 1)] ?? (() => undefined);
        call++;
        return respond(config);
      },
    },
  ];
}

const resetBodies = (router: RequestRouter) =>
  router.requests.filter((request: RequestConfig) => request.url === RESET).map((request) => request.data);

const currentPath = () => screen.getByRole("status", { name: "path" }).textContent;
const currentToken = () => screen.getByRole("status", { name: "token" }).textContent;
const findForm = () => screen.findByRole("heading", { level: 1, name: "Restablecer contraseña" });

/** Lets every pending effect and request run, so one that is coming has been sent. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

async function submit(user: ReturnType<typeof userEvent.setup>, password: string, confirmation = password) {
  const newPassword = screen.getByLabelText("Nueva contraseña");
  const confirm = screen.getByLabelText("Repite la nueva contraseña");
  await user.clear(newPassword);
  await user.clear(confirm);
  // Pasted, not typed: userEvent.type treats some characters as key names.
  await user.click(newPassword);
  await user.paste(password);
  await user.click(confirm);
  await user.paste(confirmation);
  await user.click(screen.getByRole("button", { name: "Restablecer contraseña" }));
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

describe("the reset link (AC3)", () => {
  it.each([
    ["", false],
    [" under StrictMode", true],
  ])("sends the fragment's token, clears the address bar, and keeps both secrets out of storage and logs%s", async (_, strict) => {
    const user = userEvent.setup();
    const router = routeRequests(resetRoutes(() => undefined));
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/reset-password#${TOKEN}`, { strict });
    await findForm();
    await settle();

    expect(window.location.hash).toBe("");
    expect(window.location.href).not.toContain("#");
    expect(window.location.pathname).toBe("/reset-password");

    await submit(user, PASSWORD);
    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });

    expect(resetBodies(router)).toEqual([{ token: TOKEN, newPassword: PASSWORD }]);
    expect(writtenAnywhere(TOKEN)).toBe(false);
    expect(writtenAnywhere(PASSWORD)).toBe(false);
  });
});

describe("a link with no token (AC4)", () => {
  it.each(["/reset-password", "/reset-password#"])("at %s says the link is incomplete and sends nothing", async (url) => {
    const router = routeRequests([]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(url);
    await findForm();
    await settle();

    expect(screen.getByRole("alert")).toHaveTextContent(INCOMPLETE_LINK_MESSAGE);
    expect(screen.getByRole("link", { name: "Solicitar un nuevo enlace" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
    expect(window.location.href).not.toContain("#");
    expect(router.requests).toEqual([]);
  });
});

describe("the checks before sending (AC5)", () => {
  it.each([
    ["14 code points", "a".repeat(14), undefined, PASSWORD_RULE_MESSAGES.TOO_SHORT],
    ["65 code points", "a".repeat(65), undefined, PASSWORD_RULE_MESSAGES.TOO_LONG],
    // 19 code points, 76 bytes.
    ["emoji over 72 bytes", "😀".repeat(19), undefined, PASSWORD_RULE_MESSAGES.TOO_MANY_BYTES],
    ["a confirmation that differs", PASSWORD, `${PASSWORD}!`, "Las contraseñas no coinciden"],
  ])("refuse %s and send nothing", async (_, password, confirmation, message) => {
    const user = userEvent.setup();
    const router = routeRequests([]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/reset-password#${TOKEN}`);
    await findForm();
    await submit(user, password, confirmation);
    await settle();

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(router.requests).toEqual([]);
  });
});

describe("a successful reset (AC6)", () => {
  it.each([
    ["", false],
    [" under StrictMode", true],
  ])("ends no session it does not have, and the login page says so once%s", async (_, strict) => {
    const user = userEvent.setup();
    const router = routeRequests(resetRoutes(() => undefined));
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/reset-password#${TOKEN}`, { strict });
    await findForm();
    await submit(user, PASSWORD);

    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    expect(currentPath()).toBe("/login");
    expect(screen.getAllByText(PASSWORD_RESET_MESSAGE)).toHaveLength(1);

    // Away and back: the notice was for that one arrival.
    await user.click(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" }));
    await screen.findByRole("heading", { name: "¿Olvidaste tu contraseña?" });
    await user.click(screen.getByRole("link", { name: "Volver al inicio de sesión" }));
    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    expect(screen.queryByText(PASSWORD_RESET_MESSAGE)).not.toBeInTheDocument();
  });

  it("clears a session that existed", async () => {
    const user = userEvent.setup();
    const router = routeRequests([
      ...resetRoutes(() => undefined),
      { method: "GET", url: CURRENT_USER, respond: () => MEMBER },
    ]);
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/reset-password#${TOKEN}`, { token: "a-token" });
    await findForm();
    // As a remembered login leaves it.
    window.localStorage.setItem("token", "a-token");
    expect(currentToken()).toBe("a-token");

    await submit(user, PASSWORD);

    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    expect(currentToken()).toBe("none");
    expect(window.localStorage.getItem("token")).toBeNull();
    expect(window.sessionStorage.getItem("token")).toBeNull();
    expect(screen.getAllByText(PASSWORD_RESET_MESSAGE)).toHaveLength(1);
  });

  it("shows only the reset notice when an expiry notice was pending", async () => {
    const user = userEvent.setup();
    const router = routeRequests(resetRoutes(() => undefined));
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/reset-password#${TOKEN}`);
    await findForm();
    // What a stale session ending on this page leaves behind.
    markSessionExpired();

    await submit(user, PASSWORD);

    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    expect(screen.getAllByText(PASSWORD_RESET_MESSAGE)).toHaveLength(1);
    expect(screen.queryByText(SESSION_EXPIRED_MESSAGE)).not.toBeInTheDocument();
  });
});

describe("an unusable link (AC7)", () => {
  it("says the link is not valid or has expired, and offers a new one", async () => {
    const user = userEvent.setup();
    const router = routeRequests(
      resetRoutes(() => {
        throw apiError(400, { code: "USER_PASSWORD_RESET_TOKEN_INVALID" });
      }),
    );
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/reset-password#${TOKEN}`);
    await findForm();
    await submit(user, PASSWORD);

    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID_LINK_MESSAGE);
    expect(screen.getByRole("link", { name: "Solicitar un nuevo enlace" })).toHaveAttribute("href", "/forgot-password");
    expect(currentPath()).toBe("/reset-password");
  });
});

describe("a refused password (AC8)", () => {
  it.each([
    [
      "USER_PASSWORD_POLICY_VIOLATION",
      apiError(400, { code: "USER_PASSWORD_POLICY_VIOLATION", params: { rule: "TOO_SHORT" } }),
      PASSWORD_RULE_MESSAGES.TOO_SHORT,
    ],
    ["USER_PASSWORD_UNCHANGED", apiError(400, { code: "USER_PASSWORD_UNCHANGED" }), PASSWORD_UNCHANGED_MESSAGE],
  ])("%s shows on the new password, and a corrected attempt sends the same token", async (_, error, message) => {
    const user = userEvent.setup();
    const router = routeRequests(
      resetRoutes(
        () => {
          throw error;
        },
        () => undefined,
      ),
    );
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/reset-password#${TOKEN}`);
    await findForm();
    await submit(user, PASSWORD);

    const newPassword = screen.getByLabelText("Nueva contraseña");
    await waitFor(() => expect(newPassword).toHaveAccessibleDescription(expect.stringContaining(message)));
    expect(newPassword).toBeInvalid();

    const corrected = "otra frase distinta para la cuenta";
    await submit(user, corrected);

    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    expect(resetBodies(router)).toEqual([
      { token: TOKEN, newPassword: PASSWORD },
      { token: TOKEN, newPassword: corrected },
    ]);
  });
});

describe("a throttled reset (AC2)", () => {
  it.each([
    ["params.retryAfterSeconds", apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS", params: { retryAfterSeconds: "840" } })],
    ["the Retry-After header", apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS" }, { "retry-after": "840" })],
  ])("gives the wait from %s in minutes, and keeps the screen and the token", async (_, error) => {
    const user = userEvent.setup();
    const router = routeRequests(
      resetRoutes(
        () => {
          throw error;
        },
        () => undefined,
      ),
    );
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/reset-password#${TOKEN}`);
    await findForm();
    await submit(user, PASSWORD);

    expect(await screen.findByRole("alert")).toHaveTextContent("dentro de 14 minutos");

    await submit(user, PASSWORD);
    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    expect(resetBodies(router)).toEqual([
      { token: TOKEN, newPassword: PASSWORD },
      { token: TOKEN, newPassword: PASSWORD },
    ]);
  });
});

describe("the password as typed (AC9)", () => {
  it("is sent with its leading and trailing spaces", async () => {
    const user = userEvent.setup();
    const router = routeRequests(resetRoutes(() => undefined));
    mockCustomInstance.mockImplementation(router.handle);
    const spaced = "  una frase con espacios alrededor  ";

    renderAt(`/reset-password#${TOKEN}`);
    await findForm();
    await submit(user, spaced);

    await screen.findByRole("heading", { name: "Bienvenide a ConLuz" });
    expect(resetBodies(router)).toEqual([{ token: TOKEN, newPassword: spaced }]);
  });
});

describe("any other failure", () => {
  it("shows the generic error and keeps the form", async () => {
    const user = userEvent.setup();
    const router = routeRequests(
      resetRoutes(() => {
        throw apiError(500);
      }),
    );
    mockCustomInstance.mockImplementation(router.handle);

    renderAt(`/reset-password#${TOKEN}`);
    await findForm();
    await submit(user, PASSWORD);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se ha podido restablecer la contraseña. Por favor, inténtalo más tarde.",
    );
    expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();
  });
});
