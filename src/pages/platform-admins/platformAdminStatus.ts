import type { PlatformAdminResponse } from "../../api/models";
import type { PlatformAdminRowActions } from "../../hooks/actions";
import { formatCalendarDate, SHORT_CALENDAR_DATE } from "../../utils/formatCalendarDate";
import { invitationActionsFor, invitationStateOf, type MembershipState } from "../members/membershipStatus";

/** A row of GET /platform-admins that is a pending invitation, not a holder of the role (#288). */
export function isPendingInvitation(admin: PlatformAdminResponse): boolean {
  return admin.invitation !== null && admin.invitation !== undefined;
}

/**
 * A pending platform-admin invitation in the shape the community invitations
 * use (#275, #276), so the same chip, captions and actions apply without
 * restating their rules. Null for a holder of the role, which has no
 * invitation state at all.
 *
 * `enabled` is null on a pending row -- it tells nothing about the account --
 * and is never read from it: an invitation can always be resent, as an
 * enabled membership's can.
 */
export function membershipStateOf(admin: PlatformAdminResponse): MembershipState | null {
  if (!admin.invitation) return null;
  return {
    enabled: true,
    acceptedAt: null,
    invitedAt: admin.invitation.invitedAt,
    invitationExpiresAt: admin.invitation.expiresAt,
  };
}

/**
 * Where a pending invitation's link stands (#288). The community invitations
 * showed the same captions until #331 gave them a derived status; a
 * platform-admin invitation has no membership to derive one from, so it keeps
 * them.
 */
export function invitationText(
  membership: Pick<MembershipState, "acceptedAt" | "invitedAt" | "invitationExpiresAt">,
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

type Actions = PlatformAdminRowActions["actions"];

/** What a platform-admin row offers, resolved once so its menu, its dialogs and their handlers agree. */
export interface PlatformAdminRowOffer {
  revokeRole?: NonNullable<Actions["revoke"]>;
  resend?: NonNullable<Actions["resendInvitation"]>;
  revokeLink?: NonNullable<Actions["revokeInvitation"]>;
}

/**
 * The row's own state picks the actions, and the capability gates each one.
 * The row capabilities are authorization only, true on every row
 * (lucoenergia/conluz#452), so the capability alone would offer them all:
 *
 * - a pending invitation offers "Reenviar", and "Revocar enlace" while its
 *   link can still be used -- never "Revocar rol", since it holds no role;
 * - a holder of the role offers "Revocar rol" only.
 */
export function platformAdminRowOffer(admin: PlatformAdminResponse, actions: Actions): PlatformAdminRowOffer {
  const invitation = membershipStateOf(admin);
  if (!invitation) return { revokeRole: actions.revoke };
  const { resend, revoke } = invitationActionsFor(invitation, {
    resendInvitation: actions.resendInvitation,
    revokeInvitation: actions.revokeInvitation,
  });
  return { resend, revokeLink: revoke };
}

export const hasAnyOffer = (offer: PlatformAdminRowOffer) => !!(offer.revokeRole || offer.resend || offer.revokeLink);
