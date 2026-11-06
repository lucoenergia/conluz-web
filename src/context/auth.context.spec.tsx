import "@testing-library/jest-dom";
import type { FC } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAuthDispatch } from "./auth.context";
import { AXIOS_INSTANCE } from "../http/custom-instance";
import { renderWithProviders } from "../test/renderWithProviders";
import { buildCurrentUser } from "../test/fixtures";

/**
 * Whether the requests the app sends carry the session's token (#389).
 *
 * The real API client runs, interceptors included, because the subject is what
 * the interceptor chain puts on a request; only the adapter is replaced, by one
 * that records each request and answers at once, so nothing reaches the
 * network. The current-user query is the request under test: it is the first
 * one a session sends, and the one whose 401 ends the session.
 *
 * StrictMode is on, as in `main.tsx`: it runs every effect twice, which is
 * where a token held by an effect can go missing.
 */
const CURRENT_USER_URL = "/api/v1/users/current";
const INFO_URL = "/api/v1/info";

const USER = buildCurrentUser({ id: "user-1", fullName: "Ada", memberships: {} });

const LoginProbe: FC = () => {
  const dispatchAuth = useAuthDispatch();
  return (
    <>
      <button onClick={() => dispatchAuth({ token: "a-token", remember: false })}>Entrar</button>
      <button onClick={() => dispatchAuth(null)}>Salir</button>
      <button
        onClick={() => {
          dispatchAuth({ token: "a-token", remember: false });
          void AXIOS_INSTANCE.get(INFO_URL);
        }}
      >
        Entrar y consultar
      </button>
    </>
  );
};

describe("the token on the app's requests", () => {
  let sent: InternalAxiosRequestConfig[];
  let originalAdapter: typeof AXIOS_INSTANCE.defaults.adapter;

  beforeEach(() => {
    sent = [];
    originalAdapter = AXIOS_INSTANCE.defaults.adapter;
    const recording: AxiosAdapter = async (config) => {
      sent.push(config);
      return { data: USER, status: 200, statusText: "OK", headers: {}, config };
    };
    AXIOS_INSTANCE.defaults.adapter = recording;
  });

  afterEach(() => {
    AXIOS_INSTANCE.defaults.adapter = originalAdapter;
  });

  const authorizationOf = (config: InternalAxiosRequestConfig) => config.headers.get("Authorization") ?? null;
  const currentUserRequests = () => sent.filter((config) => config.url === CURRENT_USER_URL);

  it("UI-DATA-003 sends the token on the first request after a login", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginProbe />, { reactStrictMode: true });

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(currentUserRequests().length).toBeGreaterThan(0));
    expect(currentUserRequests().map(authorizationOf)).toEqual(
      currentUserRequests().map(() => "Bearer a-token"),
    );
  });

  it("UI-DATA-003 sends the token on a request sent as it is set, before the app re-renders", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginProbe />, { reactStrictMode: true });

    await user.click(screen.getByRole("button", { name: "Entrar y consultar" }));

    await waitFor(() => expect(sent.some((config) => config.url === INFO_URL)).toBe(true));
    expect(sent.filter((config) => config.url === INFO_URL).map(authorizationOf)).toEqual(["Bearer a-token"]);
  });

  it("UI-DATA-003 sends a stored token on the first request after start-up", async () => {
    renderWithProviders(<LoginProbe />, { token: "stored-token", reactStrictMode: true });

    await waitFor(() => expect(currentUserRequests().length).toBeGreaterThan(0));
    expect(currentUserRequests().map(authorizationOf)).toEqual(
      currentUserRequests().map(() => "Bearer stored-token"),
    );
  });

  it("UI-DATA-003 sends no token once the session has ended", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginProbe />, { token: "stored-token", reactStrictMode: true });
    await waitFor(() => expect(currentUserRequests().length).toBeGreaterThan(0));

    await user.click(screen.getByRole("button", { name: "Salir" }));
    sent = [];
    await AXIOS_INSTANCE.get(INFO_URL);

    expect(sent.map(authorizationOf)).toEqual([null]);
  });
});
