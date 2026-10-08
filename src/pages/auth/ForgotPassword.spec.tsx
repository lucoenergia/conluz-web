import "@testing-library/jest-dom";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type Route as RequestRoute, type RequestRouter } from "../../test/requestRouter";
import { apiError } from "../../test/apiError";
import { ForgotPassword, RECOVERY_REQUESTED_MESSAGE } from "./ForgotPassword";

/**
 * Requesting a reset link (#233).
 *
 * Tier 2: the subject is the request the page sends and its body, so the real
 * generated hook runs and only the transport is replaced. A request the router
 * does not serve fails the test that sent it.
 */
const RECOVER = "/api/v1/users/password/recover";

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

function recoverRoutes(...responses: RequestRoute["respond"][]): RequestRoute[] {
  let call = 0;
  return [
    {
      method: "POST",
      url: RECOVER,
      respond: (config) => {
        const respond = responses[Math.min(call, responses.length - 1)] ?? (() => undefined);
        call++;
        return respond(config);
      },
    },
  ];
}

const recoverBodies = (router: RequestRouter) =>
  router.requests.filter((request) => request.url === RECOVER).map((request) => request.data);

/** Lets every pending effect and request run, so one that is coming has been sent. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="forgot-password" element={<ForgotPassword />} />
    </Routes>,
    { route: "/forgot-password" },
  );
}

async function submit(user: ReturnType<typeof userEvent.setup>, personalId: string) {
  const field = screen.getByLabelText("DNI/NIE/NIF");
  await user.clear(field);
  if (personalId) await user.type(field, personalId);
  await user.click(screen.getByRole("button", { name: "Enviar" }));
}

beforeEach(() => {
  mockCustomInstance.mockReset();
});

describe("the forgot-password screen", () => {
  it("shows the same confirmation whatever the personal ID (AC1)", async () => {
    const confirmations: string[] = [];
    const router = routeRequests(recoverRoutes(() => undefined));
    mockCustomInstance.mockImplementation(router.handle);

    for (const personalId of ["12345678Z", "X1234567L"]) {
      const user = userEvent.setup();
      const { unmount } = renderPage();
      await submit(user, personalId);
      confirmations.push((await screen.findByRole("alert")).textContent ?? "");
      expect(screen.queryByLabelText("DNI/NIE/NIF")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Volver al inicio de sesión" })).toHaveAttribute("href", "/login");
      unmount();
    }

    expect(confirmations).toEqual([RECOVERY_REQUESTED_MESSAGE, RECOVERY_REQUESTED_MESSAGE]);
    expect(recoverBodies(router)).toEqual([{ personalId: "12345678Z" }, { personalId: "X1234567L" }]);
  });

  it("sends the personal ID trimmed", async () => {
    const user = userEvent.setup();
    const router = routeRequests(recoverRoutes(() => undefined));
    mockCustomInstance.mockImplementation(router.handle);

    renderPage();
    await submit(user, "  12345678Z ");
    await screen.findByText(RECOVERY_REQUESTED_MESSAGE);

    expect(recoverBodies(router)).toEqual([{ personalId: "12345678Z" }]);
  });

  it.each(["", "   "])("asks for the personal ID when it is %j, and sends nothing", async (personalId) => {
    const user = userEvent.setup();
    const router = routeRequests([]);
    mockCustomInstance.mockImplementation(router.handle);

    renderPage();
    await submit(user, personalId);
    await settle();

    expect(screen.getByLabelText("DNI/NIE/NIF")).toHaveAccessibleDescription("Por favor, introduce tu DNI/NIE/NIF");
    expect(router.requests).toEqual([]);
  });

  it.each([
    ["params.retryAfterSeconds", apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS", params: { retryAfterSeconds: "840" } })],
    ["the Retry-After header", apiError(429, { code: "AUTH_TOO_MANY_FAILED_ATTEMPTS" }, { "retry-after": "840" })],
  ])("gives the wait from %s in minutes, and stays usable (AC2)", async (_, error) => {
    const user = userEvent.setup();
    const router = routeRequests(
      recoverRoutes(
        () => {
          throw error;
        },
        () => undefined,
      ),
    );
    mockCustomInstance.mockImplementation(router.handle);

    renderPage();
    await submit(user, "12345678Z");

    expect(await screen.findByRole("alert")).toHaveTextContent("dentro de 14 minutos");
    expect(screen.getByLabelText("DNI/NIE/NIF")).toHaveValue("12345678Z");

    await user.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByText(RECOVERY_REQUESTED_MESSAGE)).toBeInTheDocument();
    expect(recoverBodies(router)).toEqual([{ personalId: "12345678Z" }, { personalId: "12345678Z" }]);
  });

  it("shows the generic error on any other failure, and keeps the form", async () => {
    const user = userEvent.setup();
    const router = routeRequests(
      recoverRoutes(() => {
        throw apiError(500);
      }),
    );
    mockCustomInstance.mockImplementation(router.handle);

    renderPage();
    await submit(user, "12345678Z");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se ha podido enviar la solicitud. Por favor, inténtalo más tarde.",
    );
    expect(screen.getByLabelText("DNI/NIE/NIF")).toBeInTheDocument();
  });
});
