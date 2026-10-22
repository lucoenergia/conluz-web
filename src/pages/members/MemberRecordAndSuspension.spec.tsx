import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestConfig, type RequestRouter } from "../../test/requestRouter";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildCurrentUser,
  buildMembership,
  buildMembershipCapabilities,
  buildUser,
} from "../../test/fixtures";
import { type MembershipResponse, type UpdateMemberRecordBody } from "../../api/models";
import { CommunityRole } from "../../hooks/permissions";
import { MembersPage } from "./MembersPage";

/**
 * Editing a member's record and suspending a member, against routed requests
 * (#272).
 *
 * Tier 2: the real generated hooks, the real actions layer and a real
 * QueryClient run, and only the HTTP layer is mocked, so a test sees the
 * request each action sends and the roster the page shows once its
 * invalidation has refetched it.
 */
const COMMUNITY_ID = "community-1";
const COMMUNITY_NAME = "Comunidad Solar";
const COMMUNITY_URL = `/api/v1/communities/${COMMUNITY_ID}`;
const ROSTER_URL = `${COMMUNITY_URL}/memberships`;
const membershipUrl = (userId: string, action: "record" | "enable" | "disable") =>
  `${ROSTER_URL}/${userId}/${action}`;

const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const COMMUNITY = buildCommunity({
  id: COMMUNITY_ID,
  name: COMMUNITY_NAME,
  capabilities: buildCommunityCapabilities({ canRead: true, canManageMemberships: true }),
});

const CALLER = buildCurrentUser({
  id: "admin",
  fullName: "Ada Admin",
  memberships: { [COMMUNITY_ID]: CommunityRole.COMMUNITY_ADMIN },
});

/** What the backend grants an active admin of the community on a member's row. */
const ON_A_MEMBER = buildMembershipCapabilities({ canEditRecord: true, canEnable: true, canDisable: true });
/** On an admin's row: the record, but no suspension -- only members can be suspended. */
const ON_AN_ADMIN = buildMembershipCapabilities({ canEditRecord: true });

const ANA = buildMembership({
  id: "m-ana",
  communityId: COMMUNITY_ID,
  role: CommunityRole.COMMUNITY_MEMBER,
  enabled: true,
  acceptedAt: "2026-01-15T09:00:00Z",
  user: buildUser({
    id: "u-ana",
    personalId: "11111111A",
    fullName: "Ana García",
    number: 7,
    email: "ana@example.com",
    address: "Calle Mayor 1",
    phoneNumber: "600000001",
  }),
  capabilities: ON_A_MEMBER,
});

const ADA = buildMembership({
  id: "m-ada",
  communityId: COMMUNITY_ID,
  role: CommunityRole.COMMUNITY_ADMIN,
  enabled: true,
  acceptedAt: "2026-01-15T09:00:00Z",
  user: buildUser({
    id: "admin",
    personalId: "22222222B",
    fullName: "Ada Admin",
    number: 1,
    email: "ada@example.com",
    address: null,
    phoneNumber: null,
  }),
  capabilities: ON_AN_ADMIN,
});

const restError = (status: number, code?: string) => ({
  response: { status, data: { status, message: "refused", errors: [{ message: "refused", code }] } },
});

type Roster = { current: unknown[] };

/**
 * Routes everything the page reads, plus the three writes. `roster.current`
 * is what the next roster GET serves, so a write's handler can change it the
 * way the backend would.
 */
function serve(
  roster: Roster,
  writes: { record?: (config: RequestConfig) => unknown; enable?: () => unknown; disable?: () => unknown } = {},
): RequestRouter {
  const router = routeRequests([
    { method: "GET", url: "/api/v1/users/current", respond: () => CALLER },
    { method: "GET", url: "/api/v1/communities", respond: () => [COMMUNITY] },
    { method: "GET", url: COMMUNITY_URL, respond: () => COMMUNITY },
    { method: "GET", url: ROSTER_URL, respond: () => roster.current },
    {
      method: "PUT",
      url: /\/memberships\/[^/]+\/record$/,
      respond: (config) => {
        if (!writes.record) throw new Error("unexpected record write");
        return writes.record(config);
      },
    },
    {
      method: "POST",
      url: /\/memberships\/[^/]+\/enable$/,
      respond: () => {
        if (!writes.enable) throw new Error("unexpected enable");
        return writes.enable();
      },
    },
    {
      method: "POST",
      url: /\/memberships\/[^/]+\/disable$/,
      respond: () => {
        if (!writes.disable) throw new Error("unexpected disable");
        return writes.disable();
      },
    },
  ]);
  mockCustomInstance.mockImplementation(router.handle);
  return router;
}

const requestsTo = (router: RequestRouter, method: string, url: string) =>
  router.requests.filter((r) => (r.method ?? "GET").toUpperCase() === method && r.url === url);

const rosterReads = (router: RequestRouter) => requestsTo(router, "GET", ROSTER_URL).length;

const renderPage = async () => {
  renderWithProviders(<MembersPage />, { activeCommunityId: COMMUNITY_ID, token: "a-token" });
  await screen.findByText("Ana García");
};

const user = () => userEvent.setup();

async function openRecordDialog(u: ReturnType<typeof userEvent.setup>, name: string) {
  await u.click(await screen.findByRole("button", { name: `Más acciones para ${name}` }));
  await u.click(await screen.findByRole("menuitem", { name: /Editar ficha/ }));
  return screen.findByRole("dialog", { name: `Editar ficha en ${COMMUNITY_NAME}` });
}

async function replace(u: ReturnType<typeof userEvent.setup>, field: HTMLElement, value: string) {
  await u.clear(field);
  if (value !== "") await u.type(field, value);
}

describe("editing a member record", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  it("UI-MBR-002 sends the whole record and shows the new data once the roster refetches", async () => {
    const u = user();
    const roster: Roster = { current: [ANA, ADA] };
    const router = serve(roster, {
      record: ({ data }) => {
        const body = data as UpdateMemberRecordBody;
        const updated: MembershipResponse = {
          ...ANA,
          user: {
            ...ANA.user!,
            fullName: body.fullName,
            number: body.memberNumber ?? null,
            email: body.contactEmail ?? null,
            address: body.address ?? null,
            phoneNumber: body.phoneNumber ?? null,
          },
        };
        roster.current = [updated, ADA];
        return {};
      },
    });
    await renderPage();
    const readsBefore = rosterReads(router);

    const dialog = await openRecordDialog(u, "Ana García");
    expect(within(dialog).getByLabelText("DNI/NIE")).toHaveValue("11111111A");
    expect(within(dialog).getByLabelText("DNI/NIE")).toHaveAttribute("readonly");
    // Only the name and the phone change: the rest is sent as it was.
    await replace(u, within(dialog).getByLabelText(/Nombre completo/), "Ana García Pérez");
    await replace(u, within(dialog).getByLabelText("Teléfono"), "");
    await u.click(within(dialog).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(requestsTo(router, "PUT", membershipUrl("u-ana", "record"))).toHaveLength(1));
    expect(requestsTo(router, "PUT", membershipUrl("u-ana", "record"))[0].data).toEqual({
      fullName: "Ana García Pérez",
      memberNumber: 7,
      contactEmail: "ana@example.com",
      address: "Calle Mayor 1",
      phoneNumber: null,
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Ana García Pérez")).toBeInTheDocument();
    expect(rosterReads(router)).toBeGreaterThan(readsBefore);
  });

  it("UI-MBR-003 shows MEMBERSHIP_WITHOUT_CONTACT_EMAIL on the email field and keeps the form", async () => {
    const u = user();
    const router = serve({ current: [ANA, ADA] }, {
      record: () => {
        throw restError(400, "MEMBERSHIP_WITHOUT_CONTACT_EMAIL");
      },
    });
    await renderPage();
    const readsBefore = rosterReads(router);

    const dialog = await openRecordDialog(u, "Ada Admin");
    await replace(u, within(dialog).getByLabelText("Dirección"), "Calle Nueva 2");
    await replace(u, within(dialog).getByLabelText("Email de contacto"), "");
    await u.click(within(dialog).getByRole("button", { name: "Guardar" }));

    const email = within(dialog).getByLabelText("Email de contacto");
    await waitFor(() => expect(email).toHaveAttribute("aria-invalid", "true"));
    expect(email).toHaveAccessibleDescription(
      "Un administrador de la comunidad tiene que tener un email de contacto. Para quitárselo, cámbiale antes el rol a miembro.",
    );
    expect(requestsTo(router, "PUT", membershipUrl("admin", "record"))[0].data).toMatchObject({ contactEmail: null });
    // The dialog stays, with what was typed, and nothing was refetched.
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(within(dialog).getByLabelText("Dirección")).toHaveValue("Calle Nueva 2");
    expect(within(dialog).getByLabelText(/Nombre completo/)).toHaveValue("Ada Admin");
    expect(rosterReads(router)).toBe(readsBefore);
  });

  it.each([
    ["a blank name", /Nombre completo/, "   ", "Escribe el nombre completo"],
    ["a negative number", "Número de socio", "-1", "Escribe un número entero igual o mayor que 0"],
    ["a number that is not an integer", "Número de socio", "1.5", "Escribe un número entero igual o mayor que 0"],
    ["an invalid email", "Email de contacto", "nope@", "Introduce un email válido"],
  ])("UI-MBR-003 rejects %s on its field and sends nothing", async (_case, label, value, message) => {
    const u = user();
    const router = serve({ current: [ANA, ADA] });
    await renderPage();

    const dialog = await openRecordDialog(u, "Ana García");
    const field = within(dialog).getByLabelText(label);
    await replace(u, field, value);
    await u.click(within(dialog).getByRole("button", { name: "Guardar" }));

    expect(await within(dialog).findByText(message)).toBeInTheDocument();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(router.requests.filter((r) => r.method === "PUT")).toHaveLength(0);
  });

  it.each([
    [403, "No tienes permiso para editar la ficha de este miembro."],
    [404, "Este miembro ya no pertenece a la comunidad."],
  ])("UI-MBR-003 words a %s refusal for the whole form", async (status, message) => {
    const u = user();
    serve({ current: [ANA, ADA] }, {
      record: () => {
        throw restError(status);
      },
    });
    await renderPage();

    const dialog = await openRecordDialog(u, "Ana García");
    await u.click(within(dialog).getByRole("button", { name: "Guardar" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(message);
  });

  it("UI-MBR-004 says where the next resend goes when the invitation is pending", async () => {
    const u = user();
    const invited = {
      ...ANA,
      acceptedAt: null,
      invitationExpiresAt: "2026-10-20T09:00:00Z",
    } satisfies MembershipResponse;
    serve({ current: [invited, ADA] });
    await renderPage();

    const dialog = await openRecordDialog(u, "Ana García");
    expect(within(dialog).getByText(/el próximo reenvío irá a la nueva dirección/)).toBeInTheDocument();
    await u.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    const accepted = await openRecordDialog(u, "Ada Admin");
    expect(within(accepted).queryByText(/el próximo reenvío/)).not.toBeInTheDocument();
  });
});

describe("suspending and reactivating a member", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  it("UI-MBR-005 UI-MBR-006 suspends, shows the row suspended, then reactivates it", async () => {
    const u = user();
    const roster: Roster = { current: [ANA, ADA] };
    const router = serve(roster, {
      disable: () => {
        roster.current = [{ ...ANA, enabled: false }, ADA];
        return undefined;
      },
      enable: () => {
        roster.current = [ANA, ADA];
        return undefined;
      },
    });
    await renderPage();
    const anaRow = () => screen.getByRole("row", { name: /Ana García/ });
    expect(within(anaRow()).getByText("Activo")).toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: "Más acciones para Ana García" }));
    await u.click(await screen.findByRole("menuitem", { name: /Suspender/ }));
    let dialog = await screen.findByRole("dialog", { name: `Suspender miembro en ${COMMUNITY_NAME}` });
    await u.click(within(dialog).getByRole("button", { name: "Suspender" }));

    await waitFor(() => expect(requestsTo(router, "POST", membershipUrl("u-ana", "disable"))).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await within(anaRow()).findByText("Suspendido")).toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: "Más acciones para Ana García" }));
    await u.click(await screen.findByRole("menuitem", { name: /Reactivar/ }));
    dialog = await screen.findByRole("dialog", { name: `Reactivar miembro en ${COMMUNITY_NAME}` });
    await u.click(within(dialog).getByRole("button", { name: "Reactivar" }));

    await waitFor(() => expect(requestsTo(router, "POST", membershipUrl("u-ana", "enable"))).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await within(anaRow()).findByText("Activo")).toBeInTheDocument();
    expect(requestsTo(router, "POST", membershipUrl("u-ana", "disable"))).toHaveLength(1);
  });
});

describe("a backend that predates the record and suspension capabilities", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  it("UI-MBR-001 renders the roster and offers neither action", async () => {
    const u = user();
    // As that backend serves it: the three capabilities are simply not there.
    // Raw JSON, so nothing has to be cast to leave them out.
    const added = ["canEditRecord", "canEnable", "canDisable"];
    const legacy = Object.fromEntries(
      Object.entries(buildMembershipCapabilities({ canUpdateRole: true, canDelete: true })).filter(
        ([key]) => !added.includes(key),
      ),
    );
    expect(Object.keys(legacy)).not.toContain("canEditRecord");
    serve({ current: [{ ...ANA, capabilities: legacy }] });
    await renderPage();

    await u.click(screen.getByRole("button", { name: "Más acciones para Ana García" }));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: /Cambiar rol/ })).toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: /Editar ficha|Suspender|Reactivar/ })).not.toBeInTheDocument();
  });
});
