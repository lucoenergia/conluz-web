import { describe, expect, it } from "vitest";
import { buildMembership } from "../../test/fixtures";
import { membershipStatusOf, statusLabelOf } from "./membershipStatus";

const LINK = { invitedAt: "2026-10-01T10:00:00Z", invitationExpiresAt: "2026-10-08T10:00:00Z" };
const pending = (overrides: Parameters<typeof buildMembership>[0] = {}) =>
  buildMembership({ acceptedAt: null, contactEmail: "socia@example.com", ...overrides });

describe("the status a membership shows (#331)", () => {
  it.each([
    ["a disabled, accepted membership", buildMembership({ enabled: false }), "Suspendido"],
    ["a disabled, pending membership with a usable link", pending({ enabled: false, ...LINK }), "Suspendido"],
    ["an enabled, accepted membership", buildMembership(), "Activo"],
    ["a pending membership with a usable link", pending(LINK), "Invitación enviada"],
    ["a pending membership with a usable link and no email", pending({ ...LINK, contactEmail: null }), "Invitación enviada"],
    ["a pending membership never invited, with no email", pending({ contactEmail: null }), "Sin email"],
    [
      "a pending membership invited before, with no usable link and no email",
      pending({ invitedAt: LINK.invitedAt, contactEmail: null }),
      "Sin email",
    ],
    ["a pending membership never invited, with an email", pending(), "Sin invitar"],
    [
      "a pending membership invited before, with no usable link",
      pending({ invitedAt: LINK.invitedAt }),
      "Invitación caducada o revocada",
    ],
  ])("UI-MBR-030 shows %s as %s", (_, membership, label) => {
    expect(statusLabelOf(membershipStatusOf(membership))).toBe(label);
  });

  it("UI-MBR-030 keeps the top-level status apart from the pending sub-status", () => {
    expect(membershipStatusOf(pending(LINK))).toEqual({ status: "pending", pending: "invitationSent" });
    expect(membershipStatusOf(buildMembership())).toEqual({ status: "active", pending: null });
    expect(membershipStatusOf(pending({ enabled: false }))).toEqual({ status: "suspended", pending: null });
  });
});
