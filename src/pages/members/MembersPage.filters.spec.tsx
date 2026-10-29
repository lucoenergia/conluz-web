import "@testing-library/jest-dom";
import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildCurrentUser,
  buildMembership,
  buildMembershipCapabilities,
} from "../../test/fixtures";
import type { MembershipResponse } from "../../api/models";

// Only the reads are replaced: search, filters and pages are derived on the
// client from the one roster read, which is what these tests are about (#331).
vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMemberships: vi.fn(),
}));

vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
  useGetAllCommunities: vi.fn(),
}));

vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => buildCurrentUser({ id: "admin", memberships: { c1: "COMMUNITY_ADMIN" } }),
}));

// Read by the harness's real CommunityProvider for the first-time rule (#237);
// the community is seeded, so it is left unanswered.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
}));

import { getAllCommunities, getCommunityById, useGetAllCommunities, useGetCommunityById } from "../../api/communities/communities";
import { getMemberships, useGetMemberships } from "../../api/memberships/memberships";
import { useGetSuppliesByUserId } from "../../api/users/users";
import { MembersPage } from "./MembersPage";

const LINK = { invitedAt: "2026-10-01T10:00:00Z", invitationExpiresAt: "2026-10-08T10:00:00Z" };

const row = (id: string, fullName: string, overrides: Partial<MembershipResponse> = {}) =>
  buildMembership({
    id: `m-${id}`,
    user: { id },
    communityId: "c1",
    fullName,
    personalId: `${id.toUpperCase()}-DNI`,
    contactEmail: `${id}@example.com`,
    role: "COMMUNITY_MEMBER",
    capabilities: buildMembershipCapabilities(),
    ...overrides,
  });

/** One row per derived status, with both roles and a member without email. */
const ROSTER = [
  row("maria", "María García", { personalId: "12345678Z", role: "COMMUNITY_ADMIN" }),
  row("sent", "Inés Invitada", { acceptedAt: null, ...LINK }),
  row("noemail", "Óscar Sincorreo", { acceptedAt: null, contactEmail: null, personalId: "87654321X" }),
  row("new", "Nadia Nueva", { acceptedAt: null, role: "COMMUNITY_ADMIN" }),
  row("lapsed", "Elena Caducada", { acceptedAt: null, invitedAt: LINK.invitedAt }),
  row("suspended", "Sara Suspendida", { enabled: false }),
  row("pablo", "Pablo Pérez"),
];

/** `count` active members, numbered so their order is visible. */
const manyMembers = (count: number) =>
  Array.from({ length: count }, (_, i) => row(`u${i + 1}`, `Miembro ${String(i + 1).padStart(2, "0")}`));

const setViewport = (width: number) =>
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });

const setup = (memberships: MembershipResponse[] = ROSTER) => {
  vi.mocked(useGetCommunityById).mockReturnValue(
    query.success<typeof getCommunityById>(
      buildCommunity({ id: "c1", capabilities: buildCommunityCapabilities({ canRead: true, canManageMemberships: true }) }),
    ),
  );
  vi.mocked(useGetMemberships).mockReturnValue(query.success<typeof getMemberships>(memberships));
  return renderWithProviders(<MembersPage />, { activeCommunityId: "c1" });
};

/** The names in the table, in order. */
const tableNames = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((tr) => within(tr).getAllByRole("cell")[0].textContent ?? "");

// The cell opens with the avatar's initial, so a name is found inside it.
const rowNamesOf = (names: string[]) => tableNames().map((cell) => names.find((name) => cell.includes(name)));

const ALL_NAMES = ROSTER.map((m) => m.fullName);
const shown = () => rowNamesOf(ALL_NAMES);

/** The result count's live region; the page holds other status regions too. */
const countRegion = () => {
  const region = screen.getAllByRole("status").find((el) => /^(\d+ miembros?|Cargando…)$/.test(el.textContent ?? ""));
  if (!region) throw new Error("no result count on the page");
  return region;
};
const count = () => countRegion().textContent;

const fact = (label: string) => screen.getByText(label).parentElement as HTMLElement;

async function pick(user: ReturnType<typeof userEvent.setup>, field: "Estado" | "Rol", option: string) {
  await user.click(screen.getByRole("combobox", { name: field }));
  await user.click(await screen.findByRole("option", { name: option }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.disabled());
  vi.mocked(useGetAllCommunities).mockReturnValue(
    query.success<typeof getAllCommunities>([buildCommunity({ id: "c1", name: "Comunidad Solar Norte" })]),
  );
});

afterEach(() => setViewport(1024));

describe("searching and filtering the members (#331)", () => {
  it("UI-MBR-031 finds 'María García' from 'maria garcia', and a DNI typed with dots and a hyphen", async () => {
    const user = userEvent.setup();
    setup();
    const search = screen.getByRole("searchbox", { name: "Buscar miembros" });

    await user.type(search, "maria garcia");
    expect(shown()).toEqual(["María García"]);

    await user.clear(search);
    await user.type(search, "12.345.678-z");
    expect(shown()).toEqual(["María García"]);
  });

  it("UI-MBR-031 still matches a member without email by name and DNI", async () => {
    const user = userEvent.setup();
    setup();
    const search = screen.getByRole("searchbox", { name: "Buscar miembros" });

    await user.type(search, "oscar");
    expect(shown()).toEqual(["Óscar Sincorreo"]);
    await user.clear(search);
    await user.type(search, "8765-4321");
    expect(shown()).toEqual(["Óscar Sincorreo"]);
  });

  it("UI-MBR-030 the 'Pendiente' option shows the four pending sub-statuses and nothing else", async () => {
    const user = userEvent.setup();
    setup();

    await pick(user, "Estado", "Pendiente");

    expect(shown()).toEqual(["Inés Invitada", "Óscar Sincorreo", "Nadia Nueva", "Elena Caducada"]);
  });

  it.each([
    ["Activo", ["María García", "Pablo Pérez"]],
    ["Suspendido", ["Sara Suspendida"]],
    ["Invitación enviada", ["Inés Invitada"]],
    ["Sin email", ["Óscar Sincorreo"]],
    ["Sin invitar", ["Nadia Nueva"]],
    ["Invitación caducada o revocada", ["Elena Caducada"]],
  ])("UI-MBR-030 the %s option shows only the rows in that status", async (option, expected) => {
    const user = userEvent.setup();
    setup();

    await pick(user, "Estado", option);

    expect(shown()).toEqual(expected);
  });

  it("UI-MBR-032 combines search, status and role", async () => {
    const user = userEvent.setup();
    setup([
      row("a", "Ana García", { role: "COMMUNITY_ADMIN", acceptedAt: null }),
      row("b", "Ana Ruiz", { acceptedAt: null }),
      row("c", "Ana Soler", { role: "COMMUNITY_ADMIN" }),
      row("d", "Berta García", { role: "COMMUNITY_ADMIN", acceptedAt: null }),
    ]);

    await user.type(screen.getByRole("searchbox", { name: "Buscar miembros" }), "ana");
    await pick(user, "Estado", "Pendiente");
    await pick(user, "Rol", "Administrador");

    expect(rowNamesOf(["Ana García", "Ana Ruiz", "Ana Soler", "Berta García"])).toEqual(["Ana García"]);
  });

  it("UI-MBR-036 shows how many members match, also with nothing active", async () => {
    const user = userEvent.setup();
    setup();
    expect(count()).toBe("7 miembros");

    await pick(user, "Rol", "Administrador");
    expect(count()).toBe("2 miembros");

    await pick(user, "Estado", "Sin invitar");
    expect(count()).toBe("1 miembro");
  });

  it("UI-MBR-034 keeps the header counters over the whole roster under any search or filter", async () => {
    const user = userEvent.setup();
    setup();
    const facts = () => ["Total", "Activos", "Admins"].map((label) => fact(label).textContent?.replace(/\s+/g, ""));
    const before = facts();
    expect(before).toEqual(["Total7", "Activos2", "Admins2"]);

    await user.type(screen.getByRole("searchbox", { name: "Buscar miembros" }), "nadia");
    await pick(user, "Estado", "Pendiente");
    expect(shown()).toEqual(["Nadia Nueva"]);

    expect(facts()).toEqual(before);
  });

  it("UI-MBR-035 shows a no-results state whose 'Limpiar filtros' restores the whole list", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByRole("searchbox", { name: "Buscar miembros" }), "nadie");

    expect(screen.getByRole("heading", { name: "No hay miembros que coincidan" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(count()).toBe("0 miembros");
    // The empty state's action is the only one: the filter bar's is hidden.
    expect(screen.getAllByRole("button", { name: "Limpiar filtros" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(shown()).toEqual(ALL_NAMES);
    expect(screen.getByRole("searchbox", { name: "Buscar miembros" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Estado" })).toHaveTextContent("Todos los estados");
    expect(screen.getByRole("combobox", { name: "Rol" })).toHaveTextContent("Todos los roles");
  });

  it("UI-MBR-035 offers the filter bar's 'Limpiar filtros' only while something is active and some row matches", async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();

    await pick(user, "Rol", "Miembro");
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(shown()).toEqual(ALL_NAMES);
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();
  });

  it("UI-MBR-035 keeps the empty-roster message for a community with no members, with nothing to clear", () => {
    setup([]);

    expect(screen.getByText("No hay miembros en esta comunidad")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "No hay miembros que coincidan" })).not.toBeInTheDocument();
    expect(count()).toBe("0 miembros");
  });
});

describe("the pages of the members (#331)", () => {
  it("UI-MBR-033 shows 25 rows on one page, with no pagination", () => {
    setup(manyMembers(25));

    expect(tableNames()).toHaveLength(25);
    expect(screen.queryByRole("navigation", { name: "Páginas de miembros" })).not.toBeInTheDocument();
  });

  it("UI-MBR-033 splits 26 rows into a page of 25 and a page of 1", async () => {
    const user = userEvent.setup();
    setup(manyMembers(26));

    expect(tableNames()).toHaveLength(25);
    expect(tableNames()[0]).toContain("Miembro 01");
    expect(screen.getByText("1–25 de 26 miembros")).toBeInTheDocument();

    const pages = screen.getByRole("navigation", { name: "Páginas de miembros" });
    await user.click(within(pages).getByRole("button", { name: "Ir a la página 2" }));

    expect(tableNames()).toHaveLength(1);
    expect(tableNames()[0]).toContain("Miembro 26");
    expect(screen.getByText("26–26 de 26 miembros")).toBeInTheDocument();
  });

  it("UI-MBR-033 returns to page 1 when a filter changes on page 2", async () => {
    const user = userEvent.setup();
    setup([...manyMembers(30), ...manyMembers(30).map((m, i) => ({ ...m, id: `a-${i}`, role: "COMMUNITY_ADMIN" as const }))]);

    await user.click(screen.getByRole("button", { name: "Ir a la página 2" }));
    expect(screen.getByText("26–50 de 60 miembros")).toBeInTheDocument();

    await pick(user, "Rol", "Administrador");

    expect(screen.getByText("1–25 de 30 miembros")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página 1, la actual" })).toBeInTheDocument();
  });

  it("UI-MBR-033 returns to page 1 when the search changes on page 2", async () => {
    const user = userEvent.setup();
    setup(manyMembers(60));

    await user.click(screen.getByRole("button", { name: "Ir a la página 2" }));
    await user.type(screen.getByRole("searchbox", { name: "Buscar miembros" }), "miembro");

    expect(screen.getByText("1–25 de 60 miembros")).toBeInTheDocument();
  });

  it("#331 AC17 scrolls to the result count on a page change", async () => {
    const user = userEvent.setup();
    // jsdom has no scrollIntoView, so it is provided for this test and taken back.
    const original = Element.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      setup(manyMembers(26));

      await user.click(screen.getByRole("button", { name: "Ir a la página 2" }));

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView.mock.contexts[0]).toBe(countRegion());
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });
});

describe("on a phone (#331)", () => {
  beforeEach(() => setViewport(380));

  it("UI-MBR-032 applies a selection in the filter panel at once, and leaves the panel open", async () => {
    const user = userEvent.setup();
    setup();
    const list = () => screen.getByRole("list", { name: "Miembros de la comunidad" });
    // The search stays visible; the filters wait behind their button.
    expect(screen.getByRole("searchbox", { name: "Buscar miembros" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Pendiente" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filtros" }));
    await user.click(screen.getByRole("radio", { name: "Sin email" }));

    expect(within(list()).getAllByRole("listitem")).toHaveLength(1);
    expect(within(list()).getByText("Óscar Sincorreo")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Sin email" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Ver 1 miembro" })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Administrador" }));
    expect(screen.getByRole("button", { name: "Ver 0 miembros" })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Todos los roles" }));
    await user.click(screen.getByRole("button", { name: "Ver 1 miembro" }));
    expect(screen.queryByRole("radio", { name: "Sin email" })).not.toBeInTheDocument();
    expect(within(list()).getAllByRole("listitem")).toHaveLength(1);
  });

  it("UI-MBR-032 counts the active filters, not the search, and shows each as a removable chip", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByRole("searchbox", { name: "Buscar miembros" }), "a");
    expect(screen.getByRole("button", { name: "Filtros" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filtros" }));
    await user.click(screen.getByRole("radio", { name: "Pendiente" }));
    expect(screen.getByRole("button", { name: "Filtros, 1 activo" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Miembro" }));
    expect(screen.getByRole("button", { name: "Filtros, 2 activos" })).toBeInTheDocument();

    // A deletable chip is a button named by its label, removed with Delete.
    screen.getByRole("button", { name: "Estado: Pendiente" }).focus();
    await user.keyboard("{Delete}");

    expect(screen.queryByText("Estado: Pendiente")).not.toBeInTheDocument();
    expect(screen.getByText("Rol: Miembro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filtros, 1 activo" })).toBeInTheDocument();
  });

  it("UI-MBR-035 offers 'Limpiar filtros' next to 'Filtros' only while something is active and some row matches", async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();

    const search = screen.getByRole("searchbox", { name: "Buscar miembros" });
    await user.type(search, "nadia");
    expect(screen.getAllByRole("button", { name: "Limpiar filtros" })).toHaveLength(1);

    await user.type(search, "zzz");
    // No results: only the empty state's action remains.
    expect(screen.getByRole("heading", { name: "No hay miembros que coincidan" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Limpiar filtros" })).toHaveLength(1);
  });

  it("UI-MBR-036 shows the count above the cards", () => {
    setup();

    expect(count()).toBe("7 miembros");
  });

  it("#331 shows each card's status, 'role · DNI/NIE/NIF' and the email on its own line, without one when there is no email", () => {
    setup();
    const list = screen.getByRole("list", { name: "Miembros de la comunidad" });
    const card = (name: string) => within(list).getByText(name).closest("li") as HTMLElement;

    expect(card("María García")).toHaveTextContent(/María García\s*Activo\s*Administrador · 12345678Z\s*maria@example\.com$/);
    expect(card("Óscar Sincorreo")).toHaveTextContent(/Óscar Sincorreo\s*Sin email\s*Miembro · 87654321X$/);
  });

  it("UI-MBR-033 pages on a phone with previous, 'current of total' and next", async () => {
    const user = userEvent.setup();
    setup(manyMembers(26));
    const pages = screen.getByRole("navigation", { name: "Páginas de miembros" });

    expect(within(pages).getByText("1 de 2")).toBeInTheDocument();
    expect(within(pages).getByRole("button", { name: "Página anterior" })).toBeDisabled();

    await user.click(within(pages).getByRole("button", { name: "Página siguiente" }));

    expect(within(pages).getByText("2 de 2")).toBeInTheDocument();
    expect(within(pages).getByRole("button", { name: "Página siguiente" })).toBeDisabled();
    expect(within(screen.getByRole("list", { name: "Miembros de la comunidad" })).getAllByRole("listitem")).toHaveLength(1);
  });
});
