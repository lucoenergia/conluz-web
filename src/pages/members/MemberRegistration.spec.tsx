import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import type { RequestConfig } from "../../test/requestRouter";
import { buildMember, buildMembershipCapabilities, buildUser } from "../../test/fixtures";
import type { MembershipResponse, RegisterMemberBody } from "../../api/models";
import {
  COMMUNITY_ID,
  COMMUNITY_NAME,
  REGISTER_URL,
  ROSTER_URL,
  inviteUrl,
  requestsTo,
  restError,
  rosterRow,
  serveMembersPage,
  writesSent,
  type Roster,
} from "./MembersPage.testUtils";
import { MembersPage } from "./MembersPage";

/**
 * Registering a member, and inviting them straight away, against routed
 * requests (#275).
 *
 * Tier 2: the real generated hooks, actions layer and QueryClient run, and only
 * the HTTP layer is mocked, so a test sees each request sent and the roster
 * the page shows once its invalidation has refetched it.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const ANA = rosterRow("u-ana", "Ana García", { acceptedAt: "2026-01-15T09:00:00Z" });

/** The new member as the roster lists them once registered: pending, never invited. */
const registeredRow = (body: RegisterMemberBody, overrides: Partial<MembershipResponse> = {}) =>
  rosterRow("u-nuevo", body.fullName, {
    user: buildUser({
      id: "u-nuevo",
      personalId: body.personalId,
      fullName: body.fullName,
      number: body.memberNumber ?? null,
      email: body.contactEmail ?? null,
      address: body.address ?? null,
      phoneNumber: body.phoneNumber ?? null,
    }),
    ...overrides,
  });

/** What the backend answers a registration: the member, pending, with what it may do with them. */
const registeredMember = (body: RegisterMemberBody) =>
  buildMember({
    id: "m-u-nuevo",
    user: { id: "u-nuevo" },
    community: { id: COMMUNITY_ID, name: COMMUNITY_NAME },
    personalId: body.personalId,
    fullName: body.fullName,
    memberNumber: body.memberNumber ?? null,
    contactEmail: body.contactEmail ?? null,
    address: body.address ?? null,
    phoneNumber: body.phoneNumber ?? null,
    capabilities: buildMembershipCapabilities({ canInvite: true, canEditRecord: true }),
  });

/** Registers the body as the backend would: the roster gains the member. */
const registerInto = (roster: Roster) => ({ data }: RequestConfig) => {
  const body = data as RegisterMemberBody;
  roster.current = [...roster.current, registeredRow(body)];
  return registeredMember(body);
};

const renderPage = async () => {
  renderWithProviders(<MembersPage />, { activeCommunityId: COMMUNITY_ID, token: "a-token" });
  await screen.findByText("Ana García");
};

const user = () => userEvent.setup();

async function openRegistration(u: ReturnType<typeof userEvent.setup>) {
  await u.click(screen.getByRole("button", { name: "Registrar miembro" }));
  return screen.findByRole("dialog", { name: `Registrar miembro en ${COMMUNITY_NAME}` });
}

async function fill(
  u: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
  fields: Partial<Record<"DNI/NIE/NIF" | "Nombre completo" | "Número de socio" | "Email de contacto" | "Dirección" | "Teléfono", string>>,
) {
  for (const [label, value] of Object.entries(fields)) {
    if (value) await u.type(within(dialog).getByLabelText(new RegExp(`^${label}`)), value);
  }
}

// The table, not the page: the done dialog names the new member as well.
const rowOf = (name: string) => within(screen.getByRole("table")).getByText(name).closest("tr") as HTMLElement;

beforeEach(() => {
  mockCustomInstance.mockReset();
});

describe("registering a member", () => {
  it("UI-MBR-008 UI-MBR-009 sends the whole registration, and the roster shows the member as pending; nothing else is sent", async () => {
    const u = user();
    const roster: Roster = { current: [ANA] };
    const router = serveMembersPage(mockCustomInstance, roster, { register: registerInto(roster) });
    await renderPage();

    const dialog = await openRegistration(u);
    await fill(u, dialog, {
      "DNI/NIE/NIF": "12.345.678-z",
      "Nombre completo": "  Nuria Nueva  ",
      "Número de socio": "12",
      "Email de contacto": "nuria@example.com",
    });
    await u.click(within(dialog).getByRole("button", { name: "Registrar" }));

    await waitFor(() => expect(requestsTo(router, "POST", REGISTER_URL)).toHaveLength(1));
    // Every field present; the blank ones as null. The DNI goes as typed: the
    // backend normalises it.
    expect(requestsTo(router, "POST", REGISTER_URL)[0].data).toEqual({
      personalId: "12.345.678-z",
      fullName: "Nuria Nueva",
      memberNumber: 12,
      contactEmail: "nuria@example.com",
      address: null,
      phoneNumber: null,
    });
    const done = await screen.findByRole("dialog", { name: `Miembro registrado en ${COMMUNITY_NAME}` });
    expect(within(done).getByText(/todavía no le hemos enviado nada/)).toBeInTheDocument();
    await u.click(within(done).getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    expect(await within(screen.getByRole("table")).findByText("Nuria Nueva")).toBeInTheDocument();
    expect(within(rowOf("Nuria Nueva")).getByText("Pendiente")).toBeInTheDocument();
    expect(within(rowOf("Nuria Nueva")).getByText("Sin invitar")).toBeInTheDocument();
    // Registering sends nothing to the member: no invitation went out.
    expect(writesSent(router).map((r) => `${r.method} ${r.url}`)).toEqual([`POST ${REGISTER_URL}`]);
  });

  it("UI-MBR-009 invites straight away when the record has a contact email, and the row shows the active link", async () => {
    const u = user();
    const roster: Roster = { current: [ANA] };
    const router = serveMembersPage(mockCustomInstance, roster, {
      register: registerInto(roster),
      invite: () => {
        roster.current = roster.current.map((m) =>
          m.user?.id === "u-nuevo"
            ? { ...m, invitedAt: "2026-10-19T10:00:00Z", invitationExpiresAt: "2026-10-26T10:00:00Z" }
            : m,
        );
        return {};
      },
    });
    await renderPage();

    const dialog = await openRegistration(u);
    await fill(u, dialog, { "DNI/NIE/NIF": "12345678Z", "Nombre completo": "Nuria Nueva", "Email de contacto": "nuria@example.com" });
    await u.click(within(dialog).getByRole("button", { name: "Registrar" }));
    const done = await screen.findByRole("dialog", { name: `Miembro registrado en ${COMMUNITY_NAME}` });
    expect(within(done).getByText(/nuria@example\.com/)).toBeInTheDocument();
    await u.click(within(done).getByRole("button", { name: "Invitar ahora" }));

    await waitFor(() => expect(requestsTo(router, "POST", inviteUrl("u-nuevo"))).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await within(rowOf("Nuria Nueva")).findByText("Enlace activo hasta el 26 oct 2026")).toBeInTheDocument();
  });

  it("UI-MBR-009 offers no invitation without a contact email, and points to the record edit", async () => {
    const u = user();
    const roster: Roster = { current: [ANA] };
    const router = serveMembersPage(mockCustomInstance, roster, { register: registerInto(roster) });
    await renderPage();

    const dialog = await openRegistration(u);
    await fill(u, dialog, { "DNI/NIE/NIF": "12345678Z", "Nombre completo": "Nuria Nueva" });
    await u.click(within(dialog).getByRole("button", { name: "Registrar" }));

    const done = await screen.findByRole("dialog", { name: `Miembro registrado en ${COMMUNITY_NAME}` });
    expect(within(done).queryByRole("button", { name: "Invitar ahora" })).not.toBeInTheDocument();
    expect(within(done).getByText(/Añádelo desde «Editar ficha»/)).toBeInTheDocument();
    expect(requestsTo(router, "POST", REGISTER_URL)[0].data).toMatchObject({ contactEmail: null });
  });

  it("UI-MBR-009 keeps the dialog open with the reason when the invitation is refused", async () => {
    const u = user();
    const roster: Roster = { current: [ANA] };
    serveMembersPage(mockCustomInstance, roster, {
      register: registerInto(roster),
      invite: () => {
        throw restError(503, "MEMBERSHIP_INVITATION_UNAVAILABLE");
      },
    });
    await renderPage();

    const dialog = await openRegistration(u);
    await fill(u, dialog, { "DNI/NIE/NIF": "12345678Z", "Nombre completo": "Nuria Nueva", "Email de contacto": "nuria@example.com" });
    await u.click(within(dialog).getByRole("button", { name: "Registrar" }));
    const done = await screen.findByRole("dialog", { name: `Miembro registrado en ${COMMUNITY_NAME}` });
    await u.click(within(done).getByRole("button", { name: "Invitar ahora" }));

    expect(
      await within(done).findByText("Ahora mismo no se pueden enviar invitaciones. Inténtalo más tarde."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBe(done);
  });

  it("UI-MBR-008 says the person is already in the community, and keeps what was typed", async () => {
    const u = user();
    serveMembersPage(mockCustomInstance, { current: [ANA] }, {
      register: () => {
        throw restError(409, "MEMBERSHIP_ALREADY_EXISTS");
      },
    });
    await renderPage();

    const dialog = await openRegistration(u);
    await fill(u, dialog, { "DNI/NIE/NIF": "12345678Z", "Nombre completo": "Ana García" });
    await u.click(within(dialog).getByRole("button", { name: "Registrar" }));

    expect(await within(dialog).findByText("Ya forma parte de esta comunidad.")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^DNI\/NIE\/NIF/)).toHaveValue("12345678Z");
  });

  it("UI-MBR-017 shows an invalid DNI/NIE/NIF on its field, and the other fields keep their values", async () => {
    const u = user();
    serveMembersPage(mockCustomInstance, { current: [ANA] }, {
      register: () => {
        throw restError(400, "USER_PERSONAL_ID_INVALID");
      },
    });
    await renderPage();

    const dialog = await openRegistration(u);
    await fill(u, dialog, {
      "DNI/NIE/NIF": "12345678A",
      "Nombre completo": "Nuria Nueva",
      "Email de contacto": "nuria@example.com",
      Teléfono: "600 111 222",
    });
    await u.click(within(dialog).getByRole("button", { name: "Registrar" }));

    const personalId = within(dialog).getByLabelText(/^DNI\/NIE\/NIF/);
    await waitFor(() => expect(personalId).toHaveAttribute("aria-invalid", "true"));
    expect(personalId).toHaveAccessibleDescription("El DNI/NIE/NIF no es válido. Revisa los números y la letra.");
    expect(personalId).toHaveValue("12345678A");
    expect(within(dialog).getByLabelText(/^Nombre completo/)).toHaveValue("Nuria Nueva");
    expect(within(dialog).getByLabelText(/^Email de contacto/)).toHaveValue("nuria@example.com");
    expect(within(dialog).getByLabelText(/^Teléfono/)).toHaveValue("600 111 222");
    // On the field only, not repeated for the whole form.
    expect(within(dialog).getAllByText("El DNI/NIE/NIF no es válido. Revisa los números y la letra.")).toHaveLength(1);
  });

  it.each([
    ["no DNI", { "Nombre completo": "Nuria Nueva" }, /^DNI\/NIE\/NIF/, "Escribe el DNI/NIE/NIF"],
    ["no name", { "DNI/NIE/NIF": "12345678Z" }, /^Nombre completo/, "Escribe el nombre completo"],
    [
      "a number that is not an integer",
      { "DNI/NIE/NIF": "12345678Z", "Nombre completo": "Nuria Nueva", "Número de socio": "1.5" },
      /^Número de socio/,
      "Escribe un número entero igual o mayor que 0",
    ],
    [
      "an invalid email",
      { "DNI/NIE/NIF": "12345678Z", "Nombre completo": "Nuria Nueva", "Email de contacto": "nope@" },
      /^Email de contacto/,
      "Introduce un email válido",
    ],
  ] as const)("UI-MBR-008 rejects %s on its field and sends nothing", async (_case, fields, label, message) => {
    const u = user();
    const router = serveMembersPage(mockCustomInstance, { current: [ANA] });
    await renderPage();

    const dialog = await openRegistration(u);
    await fill(u, dialog, fields);
    await u.click(within(dialog).getByRole("button", { name: "Registrar" }));

    expect(await within(dialog).findByText(message)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(label)).toHaveAttribute("aria-invalid", "true");
    expect(writesSent(router)).toHaveLength(0);
  });
});

describe("the add-member picker is gone", () => {
  it("UI-MBR-016 reads no user list and links no existing account", async () => {
    const u = user();
    const roster: Roster = { current: [ANA] };
    const router = serveMembersPage(mockCustomInstance, roster, { register: registerInto(roster) });
    await renderPage();

    expect(screen.queryByRole("button", { name: "Añadir miembro" })).not.toBeInTheDocument();
    const dialog = await openRegistration(u);
    await fill(u, dialog, { "DNI/NIE/NIF": "12345678Z", "Nombre completo": "Nuria Nueva" });
    await u.click(within(dialog).getByRole("button", { name: "Registrar" }));
    await screen.findByRole("dialog", { name: `Miembro registrado en ${COMMUNITY_NAME}` });

    // Neither has a route, so either would also fail the test on its own; the
    // assertion says what is being guarded.
    expect(router.requests.filter((r) => r.url?.startsWith("/api/v1/users") && r.url !== "/api/v1/users/current")).toEqual([]);
    expect(requestsTo(router, "POST", ROSTER_URL)).toEqual([]);
  });
});
