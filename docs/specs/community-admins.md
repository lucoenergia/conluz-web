# UI spec document — Community admins

| | |
| --- | --- |
| **Prefix** | `UI-ADM` |
| **Status** | Active |
| **Routes** | `/communities/:communityId/admins`, and its entry in the `/communities` row menu |
| **Roles** | A caller to whom the community named in the URL reports `canManageAdmins`: the platform admin |
| **Domain rules** | `lucoenergia/conluz`: MEM-004, MEM-005, MEM-010, MEM-011, MEM-013, MEM-020, MEM-021, MEM-022, MEM-023, MEM-025, ACC-010 |
| **Design reference** | n/a |
| **Last reviewed against code** | #331 |

## Purpose

Let the platform admin keep the admins of a community: invite a person as an admin, see which
admins are still pending and where their invitation stands, resend or revoke an invitation, and
suspend or reactivate an admin's access to the community. The platform admin need not be a
member of the community, and sees nothing about its members here.

## Rules

### UI-ADM-001 — Everything is gated on the community's `canManageAdmins`

- **Status:** Active
- **Rule:**
  - "Gestionar administradores" in a community's row menu, the admins page, its list, the
    invitation and every row action MUST be offered only when that community's
    `capabilities.canManageAdmins` is true. A capability absent from the payload MUST count as
    false.
  - The page MUST be guarded by the community named in the URL, not by the active community, and a
    denied caller MUST be sent to `/` without the list being read.
- **Rationale:** Managing a community's admins is a platform-wide decision that being one of its
  admins does not confer, and the platform admin is usually not a member of the community. Counting
  an absent capability as false keeps the screen hidden against a backend that does not report it.
- **Implements:** MEM-020, MEM-021
- **Source:** #276

### UI-ADM-002 — Each admin shows their record, DNI and state

- **Status:** Active
- **Rule:** Each row MUST show the admin's full name, contact email, phone and personal ID, and
  their status with the members page's labels and rules (UI-MBR-006, UI-MBR-010, UI-MBR-030).
- **Rationale:** The platform admin needs the same reading of a membership's state as a community
  admin has of their members, so both screens share one rule for it.
- **Implements:** MEM-005, MEM-013, MEM-021
- **Source:** #276; changed in #331 (the derived status of UI-MBR-030 replaces the invitation state
  of UI-MBR-011)

### UI-ADM-003 — The invitation asks for the DNI, the name and the contact email

- **Status:** Active
- **Rule:**
  - "Invitar administrador" MUST ask for the personal ID, the full name and the contact email, all
    required, and for the phone, optional. A missing or invalid field MUST be shown on it and send
    no request.
  - Submitting MUST send the personal ID as typed, without normalising it, and an empty phone as
    `null`.
  - On success the dialog MUST close and the list MUST show the new admin as pending with an
    active link.
- **Rationale:** Inviting an admin registers and sends in one step, and the invitation goes to the
  contact email, so it cannot be left out as it can in a member registration.
- **Implements:** MEM-020
- **Source:** #276

### UI-ADM-004 — Each invitation refusal is shown where it belongs

- **Status:** Active
- **Rule:**
  - `MEMBERSHIP_ALREADY_EXISTS` MUST say, for the whole form, that the person is already in the
    community, and the list MUST be refreshed.
  - `MEMBERSHIP_INVITATION_UNAVAILABLE` MUST say, for the whole form, that invitations cannot be sent
    right now.
  - `USER_PERSONAL_ID_INVALID` MUST be shown on the personal ID field.
  - After any refusal the form MUST keep what was typed.
- **Rationale:** Nothing is created or sent on any of these, so the platform admin corrects the
  form or tries later. The person may already be an admin the list has not shown yet.
- **Implements:** MEM-020, ACC-010
- **Source:** #276

### UI-ADM-005 — Each row action is the state's, behind a confirmation

- **Status:** Active
- **Rule:**
  - "Reenviar" MUST be offered for a pending, enabled admin who was invited before.
  - "Revocar enlace" MUST be offered for a pending admin with an active link, suspended or not.
  - One item, "Suspender" or "Reactivar", MUST be offered, chosen by the admin's `enabled`.
  - Each MUST open a confirmation that names the admin and the community, and MUST refresh the list
    once it succeeds.
- **Rationale:** The admin rows carry no capabilities: the community's `canManageAdmins` answers
  whether the caller may ever act on them, and the row's state which action applies now, as on the
  members page (UI-MBR-005, UI-MBR-012).
- **Implements:** MEM-022, MEM-023, MEM-025
- **Source:** #276

### UI-ADM-006 — Row refusals are the members page's, worded for the invitee

- **Status:** Active
- **Rule:**
  - Each refusal of a resend or a revoke MUST have the message UI-MBR-014 gives it, naming "esta
    persona" where the members page names "este miembro".
  - The resend limit MUST say when another resend will be possible.
  - After `MEMBERSHIP_NOT_INVITED`, `MEMBERSHIP_DISABLED` or `MEMBERSHIP_ALREADY_EXISTS`, the list
    MUST be refreshed and the message MUST say so.
  - `MEMBERSHIP_WITHOUT_CONTACT_EMAIL` MUST say that a community admin can add the email from the
    admin's record, and MUST NOT point to "Editar ficha".
- **Rationale:** The platform admin has no record edit on this page; the community's own admins
  keep its member records. The refreshed row shows the state the backend refused from. A resend or
  a revoke is refused about someone whose invitation is pending, who is not an admin until they
  accept, so the message does not call them one.
- **Implements:** MEM-010, MEM-011, MEM-022, MEM-025
- **Source:** #276; changed in #310 ("esta persona" replaces "este administrador")

### UI-ADM-007 — The page reads nothing about members and writes no membership

- **Status:** Active
- **Rule:** The admins page and the communities row menu MUST NOT read
  `GET /api/v1/communities/{communityId}/memberships` or `GET /api/v1/users`, and MUST NOT send
  `POST`, `PATCH` or `DELETE` to `/api/v1/communities/{communityId}/memberships`. Admins are
  listed, invited, suspended and reactivated through the admin endpoints only.
- **Rationale:** These served the old dialog, which read the whole roster and appointed, promoted
  and removed admins through the members' endpoints. The admin endpoints give the platform admin
  exactly the admin memberships, and nothing about the community's members.
- **Implements:** MEM-021
- **Source:** #276

## States

The page:

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | The list's loading row | None |
| Empty | "Esta comunidad no tiene administradores" | Invitar administrador |
| Listed | Each admin with their state | Invitar administrador, each row's menu |
| Error | An error for the list | None |

The invitation dialog:

| State | Rendered | Actions available |
| --- | --- | --- |
| Form | The empty form, with a notice that an invitation is emailed | Invitar, Cancelar |
| Field errors | The errors on their fields | Invitar, Cancelar |
| Refused | An error for the whole form, or on the personal ID, with the values as typed | Invitar, Cancelar |
| Sending | The invite button disabled | Cancelar |

## Accepted exceptions

None.
