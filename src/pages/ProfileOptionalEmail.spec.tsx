import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { routeRequests, type RequestConfig } from "../test/requestRouter";
import { buildCurrentUser } from "../test/fixtures";
import type { CurrentUserResponse, UpdateProfileBody } from "../api/models";
import { ProfilePage } from "./Profile";

/**
 * The profile email is optional (lucoenergia/conluz#389): an account may have
 * none, and saving an empty field leaves it without one.
 *
 * Tier 2: the real current-user query and the real profile action run against
 * routed requests, so a test can show what the page holds after the save's
 * refetch rather than what it sent.
 */
const CURRENT_USER_URL = "/api/v1/users/current";
const PROFILE_URL = "/api/v1/users/profile";

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const WITH_EMAIL = buildCurrentUser({
  id: "u1",
  fullName: "Ana García",
  email: "ana@example.com",
  address: "Calle Mayor 1",
  phoneNumber: "600000001",
});

/**
 * Serves `user` until the profile is saved, and from then on the user the
 * backend would hold: the stored email, address and phone are what was sent,
 * a missing one stored as none.
 */
function serveProfile(user: CurrentUserResponse) {
  let current = user;
  const router = routeRequests([
    { method: "GET", url: CURRENT_USER_URL, respond: () => current },
    {
      method: "PUT",
      url: PROFILE_URL,
      respond: ({ data }: RequestConfig) => {
        const body = data as UpdateProfileBody;
        current = {
          ...current,
          email: body.email || null,
          address: body.address || null,
          phoneNumber: body.phoneNumber || null,
        };
        return current;
      },
    },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  return router;
}

const profileRequests = (router: ReturnType<typeof routeRequests>) =>
  router.requests.filter((r) => r.method === "PUT" && r.url === PROFILE_URL);

const renderProfile = async () => {
  renderWithProviders(<ProfilePage />, { token: "a-token" });
  return screen.findByLabelText("Email");
};

describe("ProfilePage optional email", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  it("UI-PRF-001 does not mark the email as required", async () => {
    serveProfile(WITH_EMAIL);

    expect(await renderProfile()).not.toBeRequired();
  });

  it("UI-PRF-001 saves a phone change for a member without email, and the profile still shows none", async () => {
    const user = userEvent.setup();
    const router = serveProfile({ ...WITH_EMAIL, email: null });
    const email = await renderProfile();
    expect(email).toHaveValue("");

    const phone = screen.getByLabelText("Número de teléfono");
    await user.clear(phone);
    await user.type(phone, "600000002");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Perfil actualizado correctamente")).toBeInTheDocument();
    expect(profileRequests(router)).toHaveLength(1);
    expect(profileRequests(router)[0].data).toEqual({
      email: undefined,
      address: "Calle Mayor 1",
      phoneNumber: "600000002",
    });
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.queryByText("Introduce un email válido")).not.toBeInTheDocument();
  });

  it("UI-PRF-001 clears an existing email, so the profile shows none afterwards", async () => {
    const user = userEvent.setup();
    let currentUserServed = 0;
    const router = serveProfile(WITH_EMAIL);
    const handle = router.handle;
    mockCustomInstance.mockImplementation((config: RequestConfig) => {
      if (config.url === CURRENT_USER_URL) currentUserServed += 1;
      return handle(config);
    });
    const email = await renderProfile();
    await waitFor(() => expect(email).toHaveValue("ana@example.com"));

    await user.clear(email);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Perfil actualizado correctamente")).toBeInTheDocument();
    expect(profileRequests(router)[0].data).toMatchObject({ email: undefined });
    // The save refetched the signed-in user, and what came back has no email.
    await waitFor(() => expect(currentUserServed).toBeGreaterThan(1));
    expect(screen.getByLabelText("Email")).toHaveValue("");
  });

  it("UI-PRF-002 rejects an invalid email that is there, and sends nothing", async () => {
    const user = userEvent.setup();
    const router = serveProfile(WITH_EMAIL);
    const email = await renderProfile();
    await waitFor(() => expect(email).toHaveValue("ana@example.com"));

    await user.clear(email);
    await user.type(email, "ana@");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Introduce un email válido")).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(profileRequests(router)).toHaveLength(0);
  });
});
