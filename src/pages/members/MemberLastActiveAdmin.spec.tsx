import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGetMembershipsQueryKey } from "../../api/memberships/memberships";
import type { MembershipResponse } from "../../api/models";
import { buildMembershipCapabilities } from "../../test/fixtures";
import { renderWithProviders } from "../../test/renderWithProviders";
import {
  CALLER_ID,
  COMMUNITY_ID,
  COMMUNITY_NAME,
  removeUrl,
  requestsTo,
  restError,
  rosterReads,
  rosterRow,
  serveMembersPage,
  writesSent,
  type Roster,
} from "./MembersPage.testUtils";
import { MembersPage } from "./MembersPage";

/**
 * The community's last active admin on the members page (#309): the role
 * change and the removal the backend would refuse (lucoenergia/conluz#449),
 * their refusal when the roster was stale, and the supplies refusal for an
 * admin.
 *
 * Tier 2: the real generated hooks, actions layer and QueryClient run, and only
 * the HTTP layer is mocked, so a test sees each request sent and the row the
 * page shows once a refusal has refetched the roster.
 */
const { mockCustomInstance, mockErrorDispatch } = vi.hoisted(() => ({
  mockCustomInstance: vi.fn(),
  mockErrorDispatch: vi.fn(),
}));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

// The page's failure slot is the layout's toast, which is not rendered here;
// what the page dispatches to it is what these tests read.
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

// The membership's own URL, which the role change (PATCH) and the removal (DELETE) share.
const membershipUrl = removeUrl;

const REASON = "Es el último administrador activo de la comunidad. Primero haz administrador a otro miembro activo.";
const REFRESHED = "Hemos actualizado la lista.";

/** What the backend grants an active admin on another admin's row (lucoenergia/conluz#449). */
const ON_AN_ADMIN = buildMembershipCapabilities({ canUpdateRole: true, canDelete: true, canEditRecord: true });

const ACCEPTED = { acceptedAt: "2026-01-15T09:00:00Z" };

const adminRow = (userId: string, fullName: string, overrides: Partial<MembershipResponse> = {}) =>
  rosterRow(userId, fullName, {
    ...ACCEPTED,
    role: "COMMUNITY_ADMIN",
    capabilities: ON_AN_ADMIN,
    lastActiveAdmin: false,
    ...overrides,
  });

const LIDIA_LAST = adminRow("u-lidia", "Lidia Última", { lastActiveAdmin: true });
const PABLO_PEER = adminRow("u-pablo", "Pablo Par");
const ANA = rosterRow("u-ana", "Ana García", ACCEPTED);

/** The row as a backend that predates lucoenergia/conluz#449 sends it: without the field. */
function withoutLastActiveAdmin(membership: MembershipResponse): MembershipResponse {
  const older: Partial<MembershipResponse> = { ...membership };
  delete older.lastActiveAdmin;
  // Deliberately incomplete: the missing field is the subject of the test.
  return older as MembershipResponse;
}

/** Changes one member's row as the backend would, for the next roster GET. */
const update = (roster: Roster, userId: string, change: Partial<MembershipResponse>) => {
  roster.current = roster.current.map((m) => (m.user?.id === userId ? { ...m, ...change } : m));
};

const renderPage = async () => {
  const rendered = renderWithProviders(<MembersPage />, { activeCommunityId: COMMUNITY_ID, token: "a-token" });
  await screen.findByText("Ana García");
  return rendered;
};

const user = () => userEvent.setup();

// The table row, not the dialog that may name the same member.
const rowOf = (name: string) =>
  screen
    .getAllByText(name)
    .map((element) => element.closest("tr"))
    .find((row) => row !== null) as HTMLElement;

async function menuOf(u: ReturnType<typeof userEvent.setup>, name: string) {
  await u.click(screen.getByRole("button", { name: `Más acciones para ${name}` }));
  return screen.findByRole("menu");
}

async function openRoleDialog(u: ReturnType<typeof userEvent.setup>, name: string, openMenu?: HTMLElement) {
  const menu = openMenu ?? (await menuOf(u, name));
  await u.click(within(menu).getByRole("menuitem", { name: "Cambiar rol" }));
  return screen.findByRole("dialog", { name: `Cambiar rol en ${COMMUNITY_NAME}` });
}

/** Opens the dialog's role list and returns the option for `label`. */
async function roleOption(u: ReturnType<typeof userEvent.setup>, dialog: HTMLElement, label: string) {
  await u.click(within(dialog).getByRole("combobox"));
  return within(await screen.findByRole("listbox")).getByRole("option", { name: label });
}

beforeEach(() => {
  mockErrorDispatch.mockReset();
});

describe("the last active admin's row (#309)", () => {
  it("UI-MBR-026 shows Eliminar disabled, with the reason, and sends nothing", async () => {
    const u = user();
    const router = serveMembersPage(mockCustomInstance, { current: [LIDIA_LAST, ANA] });
    await renderPage();

    const menu = await menuOf(u, "Lidia Última");
    const item = within(menu).getByRole("menuitem", { name: /Eliminar/ });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(within(item).getByText(REASON)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(writesSent(router)).toEqual([]);
  });

  it("UI-MBR-027 offers Cambiar rol, with Miembro disabled and the reason in its dialog", async () => {
    const u = user();
    const router = serveMembersPage(mockCustomInstance, { current: [LIDIA_LAST, ANA] });
    await renderPage();

    const menu = await menuOf(u, "Lidia Última");
    expect(within(menu).getByRole("menuitem", { name: "Cambiar rol" })).not.toHaveAttribute("aria-disabled");
    const dialog = await openRoleDialog(u, "Lidia Última", menu);

    expect(within(dialog).getByText(REASON)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(await roleOption(u, dialog, "Miembro")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("option", { name: "Administrador" })).not.toHaveAttribute("aria-disabled");
    expect(writesSent(router)).toEqual([]);
  });

  it("UI-MBR-026 UI-MBR-027 treat the caller's own row the same when it is the last active admin", async () => {
    const u = user();
    const own = adminRow(CALLER_ID, "Ada Admin", { lastActiveAdmin: true });
    serveMembersPage(mockCustomInstance, { current: [own, ANA] });
    await renderPage();

    const menu = await menuOf(u, "Ada Admin");
    const remove = within(menu).getByRole("menuitem", { name: /Eliminar/ });
    expect(remove).toHaveAttribute("aria-disabled", "true");
    expect(within(remove).getByText(REASON)).toBeInTheDocument();

    const dialog = await openRoleDialog(u, "Ada Admin", menu);
    expect(within(dialog).getByText(REASON)).toBeInTheDocument();
    expect(await roleOption(u, dialog, "Miembro")).toHaveAttribute("aria-disabled", "true");
  });

  it("UI-MBR-026 UI-MBR-027 offer neither action without its capability, as before", async () => {
    const u = user();
    const recordOnly = adminRow("u-lidia", "Lidia Última", {
      lastActiveAdmin: true,
      capabilities: buildMembershipCapabilities({ canEditRecord: true }),
    });
    serveMembersPage(mockCustomInstance, { current: [recordOnly, ANA] });
    await renderPage();

    const menu = await menuOf(u, "Lidia Última");
    expect(within(menu).getByRole("menuitem", { name: "Editar ficha" })).toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: /Cambiar rol/ })).not.toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: /Eliminar/ })).not.toBeInTheDocument();
    expect(within(menu).queryByText(REASON)).not.toBeInTheDocument();
  });

  it("UI-MBR-026 UI-MBR-027 leave both actions enabled on an admin who is not the last active one", async () => {
    const u = user();
    serveMembersPage(mockCustomInstance, { current: [PABLO_PEER, ANA] });
    await renderPage();

    const menu = await menuOf(u, "Pablo Par");
    expect(within(menu).getByRole("menuitem", { name: "Eliminar" })).not.toHaveAttribute("aria-disabled");
    expect(within(menu).queryByText(REASON)).not.toBeInTheDocument();

    const dialog = await openRoleDialog(u, "Pablo Par", menu);
    expect(within(dialog).queryByText(REASON)).not.toBeInTheDocument();
    expect(await roleOption(u, dialog, "Miembro")).not.toHaveAttribute("aria-disabled");
  });
});

describe("a backend that does not send lastActiveAdmin (#309)", () => {
  it("UI-MBR-026 removes the row as before", async () => {
    const u = user();
    const roster: Roster = { current: [withoutLastActiveAdmin(PABLO_PEER), ANA] };
    const router = serveMembersPage(mockCustomInstance, roster, {
      remove: () => {
        roster.current = roster.current.filter((m) => m.user?.id !== "u-pablo");
        return undefined;
      },
    });
    await renderPage();

    const menu = await menuOf(u, "Pablo Par");
    const item = within(menu).getByRole("menuitem", { name: "Eliminar" });
    expect(item).not.toHaveAttribute("aria-disabled");
    await u.click(item);
    const dialog = await screen.findByRole("dialog", { name: `Eliminar miembro de ${COMMUNITY_NAME}` });
    await u.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(requestsTo(router, "DELETE", removeUrl("u-pablo"))).toHaveLength(1));
    await waitFor(() => expect(screen.queryByText("Pablo Par")).not.toBeInTheDocument());
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  it("UI-MBR-027 changes the role to Miembro as before", async () => {
    const u = user();
    const roster: Roster = { current: [withoutLastActiveAdmin(PABLO_PEER), ANA] };
    const router = serveMembersPage(mockCustomInstance, roster, {
      changeRole: () => {
        update(roster, "u-pablo", { role: "COMMUNITY_MEMBER" });
        return roster.current[0];
      },
    });
    await renderPage();

    const dialog = await openRoleDialog(u, "Pablo Par");
    expect(within(dialog).queryByText(REASON)).not.toBeInTheDocument();
    await u.click(await roleOption(u, dialog, "Miembro"));
    await u.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(requestsTo(router, "PATCH", membershipUrl("u-pablo"))).toHaveLength(1));
    expect(requestsTo(router, "PATCH", membershipUrl("u-pablo"))[0].data).toEqual({ role: "COMMUNITY_MEMBER" });
    await waitFor(() => expect(within(rowOf("Pablo Par")).getByText("Miembro")).toBeInTheDocument());
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });
});

describe("a refusal from a stale roster (#309)", () => {
  it("UI-MBR-028 a role change refused with MEMBERSHIP_LAST_ACTIVE_ADMIN says why and that the list was refreshed, and keeps the row", async () => {
    const u = user();
    const roster: Roster = { current: [PABLO_PEER, ANA] };
    const router = serveMembersPage(mockCustomInstance, roster, {
      changeRole: () => {
        // Another admin left meanwhile, so Pablo is now the last active one.
        update(roster, "u-pablo", { lastActiveAdmin: true });
        throw restError(409, "MEMBERSHIP_LAST_ACTIVE_ADMIN");
      },
    });
    const { queryClient } = await renderPage();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    const dialog = await openRoleDialog(u, "Pablo Par");
    await u.click(await roleOption(u, dialog, "Miembro"));
    const readsBefore = rosterReads(router);
    await u.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(`${REASON} ${REFRESHED}`));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetMembershipsQueryKey(COMMUNITY_ID) });
    await waitFor(() => expect(rosterReads(router)).toBeGreaterThan(readsBefore));
    // The refetched row now says why, in the dialog still open.
    expect(await within(dialog).findByText(REASON)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(within(rowOf("Pablo Par")).getByText("Administrador")).toBeInTheDocument();
  });

  it("UI-MBR-028 a removal refused with MEMBERSHIP_LAST_ACTIVE_ADMIN says why and that the list was refreshed, and keeps the row", async () => {
    const u = user();
    const roster: Roster = { current: [PABLO_PEER, ANA] };
    const router = serveMembersPage(mockCustomInstance, roster, {
      remove: () => {
        update(roster, "u-pablo", { lastActiveAdmin: true });
        throw restError(409, "MEMBERSHIP_LAST_ACTIVE_ADMIN");
      },
    });
    const { queryClient } = await renderPage();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    const menu = await menuOf(u, "Pablo Par");
    await u.click(within(menu).getByRole("menuitem", { name: "Eliminar" }));
    const dialog = await screen.findByRole("dialog", { name: `Eliminar miembro de ${COMMUNITY_NAME}` });
    const readsBefore = rosterReads(router);
    await u.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalledWith(`${REASON} ${REFRESHED}`));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetMembershipsQueryKey(COMMUNITY_ID) });
    await waitFor(() => expect(rosterReads(router)).toBeGreaterThan(readsBefore));
    expect(within(rowOf("Pablo Par")).getByText("Administrador")).toBeInTheDocument();
    // The refetched row is the last active admin now, so its removal is no longer offered.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const refreshedMenu = await menuOf(u, "Pablo Par");
    expect(within(refreshedMenu).getByRole("menuitem", { name: /Eliminar/ })).toHaveAttribute("aria-disabled", "true");
  });
});

describe("removing a supply owner, by the row's role (#309)", () => {
  async function removeRefusedForOwningSupplies(name: string, userId: string, row: MembershipResponse) {
    const u = user();
    const router = serveMembersPage(mockCustomInstance, { current: [row, ANA] }, {
      remove: () => {
        throw restError(409, "MEMBERSHIP_OWNS_SUPPLIES");
      },
    });
    await renderPage();

    const menu = await menuOf(u, name);
    await u.click(within(menu).getByRole("menuitem", { name: "Eliminar" }));
    const dialog = await screen.findByRole("dialog", { name: `Eliminar miembro de ${COMMUNITY_NAME}` });
    await u.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(requestsTo(router, "DELETE", removeUrl(userId))).toHaveLength(1));
    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
    expect(rowOf(name)).toBeInTheDocument();
  }

  it("UI-MBR-029 recommends demoting an admin to member before suspending them", async () => {
    await removeRefusedForOwningSupplies("Pablo Par", "u-pablo", PABLO_PEER);

    expect(mockErrorDispatch).toHaveBeenCalledWith(
      "Este administrador es titular de suministros en esta comunidad. Si quieres que deje de tener acceso, primero cámbiale el rol a miembro y después suspéndelo; para eliminarlo, antes hay que eliminar sus suministros.",
    );
  });

  it("UI-MBR-015 keeps recommending suspension for a member", async () => {
    await removeRefusedForOwningSupplies("Marta Miembro", "u-marta", rosterRow("u-marta", "Marta Miembro", ACCEPTED));

    expect(mockErrorDispatch).toHaveBeenCalledWith(
      "Este miembro es titular de suministros en esta comunidad. Si quieres que deje de tener acceso, suspéndelo; para eliminarlo, antes hay que eliminar sus suministros.",
    );
  });
});
