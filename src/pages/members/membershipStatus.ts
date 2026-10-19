import type { MembershipResponse } from "../../api/models";
import type { MembershipRowActions } from "../../hooks/actions";

/** The three states the roster tells apart (#275). */
export type MembershipStatus = "active" | "pending" | "suspended";

/**
 * Suspended wins over pending: a suspended membership grants nothing whether
 * or not it was accepted, and "Reactivar" is what the admin can do about it.
 */
export function statusOf(membership: Pick<MembershipResponse, "enabled" | "acceptedAt">): MembershipStatus {
  if (!membership.enabled) return "suspended";
  return membership.acceptedAt === null ? "pending" : "active";
}

/**
 * Where a pending membership's invitation stands, or null once it is accepted.
 *
 * No clock is read: the backend sends `invitationExpiresAt` only while the link
 * can still be used, and null once it has expired, been revoked or been used.
 * So a link that is not active but was sent (`invitedAt`) expired or was revoked.
 */
export type InvitationState =
  | { kind: "never" }
  | { kind: "active"; expiresAt: string }
  | { kind: "lapsed" };

export function invitationStateOf(
  membership: Pick<MembershipResponse, "acceptedAt" | "invitedAt" | "invitationExpiresAt">,
): InvitationState | null {
  if (membership.acceptedAt !== null) return null;
  if (membership.invitedAt === null) return { kind: "never" };
  if (membership.invitationExpiresAt !== null) return { kind: "active", expiresAt: membership.invitationExpiresAt };
  return { kind: "lapsed" };
}

type RowActions = MembershipRowActions["actions"];

export interface InvitationActions {
  invite?: NonNullable<RowActions["invite"]>;
  resend?: NonNullable<RowActions["resendInvitation"]>;
  revoke?: NonNullable<RowActions["revokeInvitation"]>;
}

/**
 * Which invitation writes apply to this row: the capability, then the state,
 * never one standing in for the other. Resolved once, so the menu item, its
 * confirmation and the handler cannot disagree.
 *
 * - "Invitar" sends the first invitation: pending, enabled, never invited.
 * - "Reenviar" sends a new link to one invited before, active or not.
 * - "Revocar enlace" only while a link is active, suspended or not.
 */
export function invitationActionsFor(
  membership: MembershipResponse | null | undefined,
  actions: RowActions,
): InvitationActions {
  const state = membership ? invitationStateOf(membership) : null;
  if (!membership || !state) return {};
  return {
    invite: membership.enabled && state.kind === "never" ? actions.invite : undefined,
    resend: membership.enabled && state.kind !== "never" ? actions.resendInvitation : undefined,
    revoke: state.kind === "active" ? actions.revokeInvitation : undefined,
  };
}
