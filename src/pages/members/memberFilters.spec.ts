import { describe, expect, it } from "vitest";
import type { MembershipResponse } from "../../api/models";
import { buildMembership } from "../../test/fixtures";
import {
  filterMemberships,
  NO_MEMBER_FILTERS,
  type MemberFilters,
} from "./memberFilters";

const LINK = { invitedAt: "2026-10-01T10:00:00Z", invitationExpiresAt: "2026-10-08T10:00:00Z" };

const row = (id: string, overrides: Partial<MembershipResponse>) =>
  buildMembership({ id, user: { id }, personalId: `0000000${id}A`, contactEmail: `${id}@example.com`, ...overrides });

const MARIA = row("maria", { fullName: "María García López", personalId: "12345678Z", contactEmail: "maria.garcia@gmail.com" });
const JOSE = row("jose", { fullName: "José Pérez", personalId: "87654321X", contactEmail: null, acceptedAt: null });
const LUCIA = row("lucia", { fullName: "Lucía Ferrer", personalId: "X1234567L", contactEmail: "lferrer@hotmail.com" });
const ROSTER = [MARIA, JOSE, LUCIA];

const names = (rows: MembershipResponse[]) => rows.map((m) => m.fullName);
const search = (query: string, rows = ROSTER) => names(filterMemberships(rows, { ...NO_MEMBER_FILTERS, query }));

describe("member search (#331)", () => {
  it("UI-MBR-031 finds 'María García' from 'maria garcia', ignoring case and accents", () => {
    expect(search("maria garcia")).toEqual(["María García López"]);
    expect(search("GARCÍA LÓPEZ")).toEqual(["María García López"]);
  });

  it("UI-MBR-031 finds a DNI typed with dots, a hyphen and a lower-case letter", () => {
    expect(search("12.345.678-z")).toEqual(["María García López"]);
    expect(search("x 1234567")).toEqual(["Lucía Ferrer"]);
  });

  it("UI-MBR-031 matches a substring of the contact email", () => {
    expect(search("@gmail")).toEqual(["María García López"]);
    expect(search("FERRER@HOT")).toEqual(["Lucía Ferrer"]);
  });

  it("UI-MBR-031 still matches a member without email by name and DNI", () => {
    expect(search("jose")).toEqual(["José Pérez"]);
    expect(search("8765-4321")).toEqual(["José Pérez"]);
  });

  it("UI-MBR-031 returns only the matching rows of a mixed list, in their order", () => {
    expect(search("er")).toEqual(["José Pérez", "Lucía Ferrer"]);
    expect(search("nadie")).toEqual([]);
  });

  it("UI-MBR-031 matches every row for a blank query, and no DNI for a query of only punctuation", () => {
    expect(search("   ")).toEqual(names(ROSTER));
    expect(search(".-")).toEqual([]);
  });
});

describe("the status filter (#331)", () => {
  const SENT = row("sent", { fullName: "Invitada", acceptedAt: null, ...LINK });
  const NO_EMAIL = row("noemail", { fullName: "Sin Correo", acceptedAt: null, contactEmail: null });
  const NOT_INVITED = row("new", { fullName: "Nueva", acceptedAt: null });
  const LAPSED = row("lapsed", { fullName: "Caducada", acceptedAt: null, invitedAt: LINK.invitedAt });
  const ACTIVE = row("active", { fullName: "Activa" });
  const SUSPENDED = row("suspended", { fullName: "Suspendida", enabled: false, acceptedAt: null });
  const ALL = [SENT, ACTIVE, NO_EMAIL, SUSPENDED, NOT_INVITED, LAPSED];
  const byStatus = (status: MemberFilters["status"]) => names(filterMemberships(ALL, { ...NO_MEMBER_FILTERS, status }));

  it("UI-MBR-030 'Pendiente' returns the four pending sub-statuses and nothing else", () => {
    expect(byStatus("pending")).toEqual(["Invitada", "Sin Correo", "Nueva", "Caducada"]);
  });

  it.each([
    ["active", ["Activa"]],
    ["suspended", ["Suspendida"]],
    ["invitationSent", ["Invitada"]],
    ["noEmail", ["Sin Correo"]],
    ["notInvited", ["Nueva"]],
    ["invitationLapsed", ["Caducada"]],
    ["all", ["Invitada", "Activa", "Sin Correo", "Suspendida", "Nueva", "Caducada"]],
  ] as const)("UI-MBR-030 the %s option returns only the rows in that status", (status, expected) => {
    expect(byStatus(status)).toEqual(expected);
  });
});

describe("search, status and role together (#331)", () => {
  it("UI-MBR-032 returns only the rows matching all three", () => {
    const rows = [
      row("a", { fullName: "Ana García", role: "COMMUNITY_ADMIN", acceptedAt: null }),
      row("b", { fullName: "Ana Ruiz", role: "COMMUNITY_MEMBER", acceptedAt: null }),
      row("c", { fullName: "Ana Soler", role: "COMMUNITY_ADMIN" }),
      row("d", { fullName: "Berta García", role: "COMMUNITY_ADMIN", acceptedAt: null }),
    ];
    const filters: MemberFilters = { query: "ana", status: "pending", role: "COMMUNITY_ADMIN" };
    expect(names(filterMemberships(rows, filters))).toEqual(["Ana García"]);
  });
});
