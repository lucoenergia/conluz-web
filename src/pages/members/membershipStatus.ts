import type { MembershipResponse } from "../../api/models";
import type { Action } from "../../hooks/actions";
import { formatCalendarDate, SHORT_CALENDAR_DATE } from "../../utils/formatCalendarDate";

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

/** Where a pending membership stands with its invitation (#331). */
export type PendingStatus = "invitationSent" | "noEmail" | "notInvited" | "invitationLapsed";

/** A membership's status, with its pending sub-status when it is pending. */
export type DerivedMembershipStatus =
  | { status: "active" | "suspended"; pending: null }
  | { status: "pending"; pending: PendingStatus };

/** What the derived status reads of a row. */
export type MembershipStatusFields = Pick<
  MembershipResponse,
  "enabled" | "acceptedAt" | "invitedAt" | "invitationExpiresAt" | "contactEmail"
>;

/**
 * The one status a membership shows, and the one the status filter matches
 * (#331). The contract has no status field, so it is derived, first match wins:
 *
 * 1. Suspended: an invitation to a disabled membership always fails.
 * 2. Active: accepted.
 * 3. Pending, and of the pending:
 *    - a link that can still be used, since the member can still accept it,
 *      email or not;
 *    - no contact email, since no send can succeed;
 *    - never invited;
 *    - invited, with no usable link: expired and revoked look the same in the
 *      contract, and both are resent.
 */
export function membershipStatusOf(membership: MembershipStatusFields): DerivedMembershipStatus {
  if (!membership.enabled) return { status: "suspended", pending: null };
  if (membership.acceptedAt !== null) return { status: "active", pending: null };
  if (membership.invitationExpiresAt !== null) return { status: "pending", pending: "invitationSent" };
  if (membership.contactEmail === null) return { status: "pending", pending: "noEmail" };
  if (membership.invitedAt === null) return { status: "pending", pending: "notInvited" };
  return { status: "pending", pending: "invitationLapsed" };
}

/** The label of each status and pending sub-status, wherever it is shown or offered. */
export const STATUS_LABELS: Record<MembershipStatus | PendingStatus, string> = {
  active: "Activo",
  suspended: "Suspendido",
  pending: "Pendiente",
  invitationSent: "Invitación enviada",
  noEmail: "Sin email",
  notInvited: "Sin invitar",
  invitationLapsed: "Invitación caducada o revocada",
};

/** The label a row shows: its pending sub-status, or its status. */
export function statusLabelOf(derived: DerivedMembershipStatus): string {
  return STATUS_LABELS[derived.pending ?? derived.status];
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

/** What the status and invitation rules read of a row: a roster row and a community admin both carry it. */
export type MembershipState = Pick<MembershipResponse, "enabled" | "acceptedAt" | "invitedAt" | "invitationExpiresAt">;

/** Where a pending membership's invitation stands, or null once it is accepted (#275). */
export function invitationText(
  membership: Pick<MembershipResponse, "acceptedAt" | "invitedAt" | "invitationExpiresAt">,
): string | null {
  const state = invitationStateOf(membership);
  if (!state) return null;
  switch (state.kind) {
    case "never":
      return "Sin invitar";
    case "active":
      return `Enlace activo hasta el ${formatCalendarDate(state.expiresAt, SHORT_CALENDAR_DATE)}`;
    case "lapsed":
      return "Enlace caducado o revocado";
  }
}

/**
 * The invitation writes a row's caller was handed, by the names the action
 * hooks use. A community admin's row has no first invitation to send: inviting
 * an admin registers and sends in one step (#276).
 */
interface InvitationRowActions<Invite, Resend, Revoke> {
  invite?: Invite;
  resendInvitation?: Resend;
  revokeInvitation?: Revoke;
}

export interface InvitationActions<Invite = never, Resend = never, Revoke = never> {
  invite?: Invite;
  resend?: Resend;
  revoke?: Revoke;
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
export function invitationActionsFor<Invite = never, Resend = never, Revoke = never>(
  membership: MembershipState | null | undefined,
  actions: InvitationRowActions<Invite, Resend, Revoke>,
): InvitationActions<Invite, Resend, Revoke> {
  const state = membership ? invitationStateOf(membership) : null;
  if (!membership || !state) return {};
  return {
    invite: membership.enabled && state.kind === "never" ? actions.invite : undefined,
    resend: membership.enabled && state.kind !== "never" ? actions.resendInvitation : undefined,
    revoke: state.kind === "active" ? actions.revokeInvitation : undefined,
  };
}

/** The suspend or reactivate a row offers, and which of the two it is. */
export type StatusToggle = { action: Action<[], boolean>; isSuspending: boolean } | undefined;

/**
 * Suspend or reactivate, never both. A caller who may do either is granted
 * both halves of the pair, so the row's own `enabled` picks the one that
 * applies -- resolved once, so the menu item, its confirmation and the handler
 * cannot disagree about which was chosen.
 */
export function statusToggleFor(
  membership: Pick<MembershipResponse, "enabled"> | null | undefined,
  actions: { enable?: Action<[], boolean>; disable?: Action<[], boolean> },
): StatusToggle {
  if (!membership) return undefined;
  if (membership.enabled) return actions.disable && { action: actions.disable, isSuspending: true };
  return actions.enable && { action: actions.enable, isSuspending: false };
}
