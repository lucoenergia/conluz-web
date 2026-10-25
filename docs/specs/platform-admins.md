# UI spec document — Platform admins

| | |
| --- | --- |
| **Prefix** | `UI-PAD` |
| **Status** | Active |
| **Routes** | `/platform-admins`; the platform admin's reach over every authenticated route |
| **Roles** | A caller whose platform capabilities carry `canListPlatformAdmins` |
| **Domain rules** | lucoenergia/conluz ADR-0004 (platform-admin invitations, #452) |
| **Design reference** | n/a |
| **Last reviewed against code** | #288 |

## Purpose

Let a platform admin see who administers the platform, invite a person to the role, and revoke
it, without reading anybody's personal data. The page replaces the users page, which listed every user with their
personal data. It also covers what a platform admin with no membership can still reach: the
platform's own screens, never a member's.

The role is never granted from this page. A platform admin invites a person, the person accepts
the emailed link with a confirmation code the inviter gives them by another channel, and only then
holds the role (lucoenergia/conluz ADR-0004). Until they accept, the list shows them as a pending
invitation. The acceptance itself is the invitation-acceptance screen (`UI-INV`).

## Rules

### UI-PAD-001 — The page and its menu entry are gated on canListPlatformAdmins

- **Status:** Active
- **Rule:**
  - `/platform-admins`, its side-menu entry "Administradores de plataforma" and the matching button
    on the platform overview MUST require the platform capability `canListPlatformAdmins`.
  - A response without that capability MUST count as a denial: the route redirects to `/`, and
    neither the entry nor the button is shown.
  - A denied caller MUST NOT request the list.
- **Rationale:** The backend answers who may list the platform admins. A backend that predates
  the capability would otherwise let the page fire a request it refuses.
- **Implements:** n/a
- **Source:** #285

### UI-PAD-002 — Each row shows the admin's name, email and state

- **Status:** Active
- **Rule:**
  - Each row without an `invitation` MUST show the platform admin's full name, the account's email,
    and whether the account is enabled ("Habilitado") or disabled ("Deshabilitado").
  - A platform admin without email MUST be shown by name alone, with no placeholder: the table's
    email cell is empty, and the narrow list has no email line.
  - A row with an `invitation` is a pending invitation, shown as UI-PAD-011 says.
- **Rationale:** These are the fields that identify an admin. Nothing else about the account is
  read, so the page shows no personal data beyond them. Shown by name alone for the same reason
  as UI-MBR-007.
- **Implements:** n/a
- **Source:** #285; changed in #288 (pending invitations are listed too)

### UI-PAD-003 — Revocar rol is offered only where the caller may revoke a held role

- **Status:** Active
- **Rule:**
  - "Revocar rol" MUST be offered only on a row without an `invitation` whose
    `capabilities.canRevoke` is true. A pending invitation MUST NOT offer it, whatever its
    capabilities say.
  - A row with no permitted action MUST show no row-actions button.
- **Rationale:** `canRevoke` is false on the caller's own row: nobody may revoke their own role.
  It is authorization only, true on pending rows too (lucoenergia/conluz#452), and a pending
  invitation holds no role to revoke. A menu with nothing in it is a promise of something to do.
- **Implements:** n/a
- **Source:** #285; changed in #288 (never on a pending invitation)

### UI-PAD-004 — Revocar rol is disabled, with the reason, when the platform would refuse it

- **Status:** Active
- **Rule:** On a row whose `revocable` is false, "Revocar rol" MUST be shown disabled, with the
  visible text "La plataforma necesita al menos un administrador de plataforma habilitado.", and
  MUST NOT open the confirmation or send a request.
- **Rationale:** `canRevoke` says whether the caller may ever revoke this admin; `revocable` says
  whether the platform would accept it now. It is false only for the last enabled platform admin.
  The two are read together, never one standing in for the other.
- **Implements:** n/a
- **Source:** #285

### UI-PAD-005 — Revoking asks for confirmation, then refetches the list

- **Status:** Active
- **Rule:** "Revocar rol" MUST open a confirmation naming the admin. Confirming MUST send
  `revokePlatformAdmin` for that admin and refetch the list. Cancelling MUST send nothing.
- **Rationale:** Revoking changes who may administer the platform, so it is not a single click.
  The list is refetched so that every row's `revocable` reflects the change.
- **Implements:** n/a
- **Source:** #285

### UI-PAD-006 — Each refusal says what happened, and a stale row refetches the list

- **Status:** Active
- **Rule:**
  - `USER_LAST_PLATFORM_ADMIN`, `USER_NOT_PLATFORM_ADMIN` and a 404 MUST each show their own
    message, ending with "Hemos actualizado la lista.", and MUST refetch the list.
  - Any other failure MUST show a generic message and MUST NOT refetch the list.
- **Rationale:** Each of the three means the row was stale: another revoke left this admin the last
  enabled one, someone already revoked the role, or the account no longer exists. Refetching shows
  the state the backend refused from.
- **Implements:** n/a
- **Source:** #285

### UI-PAD-007 — The page reads nothing about users or members

- **Status:** Active
- **Rule:** The page MUST read the platform admins from `getPlatformAdmins` only. It MUST NOT
  request the user list, a user's record, a community or any roster.
- **Rationale:** The page exists so that the platform admin no longer needs the users page, which
  exposed every user's personal data.
- **Implements:** n/a
- **Source:** #285

### UI-PAD-008 — A platform admin with no membership reaches no member's data

- **Status:** Active
- **Rule:**
  - A platform admin with no membership MUST keep the platform overview, the communities, community
    creation and editing, a community's admins, the platform admins, their profile and their
    password change.
  - None of those screens MUST request the user list, a user's record, a roster, supplies, plants,
    consumption, production, investment or payback. None of them MUST show a member's data.
  - Every route under `/supply-points` and `/production` MUST require an active community the
    caller may read (`canRead`). A platform admin with no membership who opens one by URL MUST be
    sent to `/`, before any of its requests is sent.
  - The side menu MUST offer them no entry to a member screen or to users.
- **Rationale:** The platform flag never grants access to a community's operational data.
  `/supply-points`, its detail page and `/production/:plantId` used to be open to any signed-in
  caller, so a platform admin could still read a supply's consumption, a plant or a member's record
  by URL. The web client closes these paths on capabilities, ahead of the backend closing its own
  access, because the backend still grants it today.
- **Implements:** n/a
- **Source:** #285

### UI-PAD-009 — Inviting a platform admin is gated on canInvitePlatformAdmins

- **Status:** Active
- **Rule:**
  - "Invitar administrador de plataforma" MUST be offered only when the caller's platform
    capabilities carry `canInvitePlatformAdmins`. A response without it MUST count as a denial.
  - It MUST open a form asking for the DNI/NIE/NIF, the full name and the email, all three
    required, and MUST send nothing while one is missing or the email is not valid.
  - Sending MUST call `invitePlatformAdmin` with the three values, trimmed, and refetch the list,
    which then shows the person as a pending invitation.
- **Rationale:** The backend answers who may invite. The form is the community admin invitation's
  (#276) without the phone, which the platform invitation does not take; an invalid DNI/NIE/NIF is
  shown as UI-MBR-017 shows it.
- **Implements:** lucoenergia/conluz ADR-0004 §1
- **Source:** #288

### UI-PAD-010 — The confirmation code is shown once, only in the dialog that sent it

- **Status:** Active
- **Rule:**
  - After an invitation or a resend, the dialog that sent it MUST show the confirmation code from
    the response, grouped in two blocks of four characters, with a button that copies it.
  - It MUST say that the code is given by phone or in person, never by email; that it will not be
    shown again; and that a resend generates a new one and the old one stops working.
  - The code MUST be kept only in that dialog's state, and discarded when it closes. It MUST NOT be
    written to storage or cookies, put in the URL, logged, held in the query or mutation cache, or
    shown anywhere else.
  - While it shows the code, the dialog MUST NOT close on a backdrop click or Escape; only "Hecho"
    closes it. It MUST stay open if the refetch that follows takes the row away.
- **Rationale:** The backend returns the code only in the response that generated it, and the
  person cannot accept without it. A code closed by accident cannot be shown again, and getting a
  new one spends one of the day's resends.
- **Implements:** lucoenergia/conluz ADR-0004 §4
- **Source:** #288 (the closing rule: maintainer decision)

### UI-PAD-011 — A pending invitation shows its state and its link's

- **Status:** Active
- **Rule:**
  - A row with an `invitation` MUST show the name and email the inviter typed, the state
    "Pendiente", and its link's state: "Enlace activo hasta el {date}" from
    `invitation.expiresAt`, or "Enlace caducado o revocado" when that is null.
  - It MUST NOT show "Habilitado" or "Deshabilitado", and MUST NOT read `enabled` or `revocable`,
    which are null on it.
  - The narrow list MUST show the link's state as an "Invitación" line.
- **Rationale:** A pending invitation tells nothing about the account. The state and the captions
  are the community invitations' (UI-MBR-011), through the same rules, so the two pages
  cannot disagree.
- **Implements:** lucoenergia/conluz ADR-0004 §7
- **Source:** #288

### UI-PAD-012 — A pending invitation offers only its resend and its link's revoke

- **Status:** Active
- **Rule:**
  - A row with an `invitation` MUST offer "Reenviar" when `capabilities.canResendInvitation` is
    true, and "Revocar enlace" when `capabilities.canRevokeInvitation` is true and
    `invitation.expiresAt` is set. A row without an `invitation` MUST offer neither.
  - Each MUST open a confirmation naming the person; cancelling MUST send nothing. Confirming MUST
    send `resendPlatformAdminInvitation` or `revokePlatformAdminInvitation` and refetch the list.
  - A resend MUST show its new code as UI-PAD-010 says. After a link's revoke the row MUST still
    offer "Reenviar".
- **Rationale:** Both capabilities are authorization only, true on every row (lucoenergia/conluz#452),
  so the row's `invitation` decides which apply, and the capability gates each one.
- **Implements:** lucoenergia/conluz ADR-0004 §7
- **Source:** #288

### UI-PAD-013 — Each invitation refusal says what happened

- **Status:** Active
- **Rule:**
  - Inviting: `USER_PERSONAL_ID_INVALID` MUST be shown on the DNI/NIE/NIF field.
    `USER_ALREADY_PLATFORM_ADMIN` and `PLATFORM_ADMIN_ALREADY_INVITED` MUST be shown for the whole
    form, ending with "Hemos actualizado la lista.", and MUST refetch the list. A 503 MUST say that
    invitations cannot be sent right now. Every refusal MUST keep the typed values.
  - Resending: `PLATFORM_ADMIN_INVITATION_RESEND_LIMIT_REACHED` MUST say when another resend
    becomes possible, from `Retry-After` or the body, naming the invitee as "esta persona".
  - Resending or revoking a link: `PLATFORM_ADMIN_NOT_INVITED` and a 404 MUST each say the row was
    stale, ending with "Hemos actualizado la lista.", and MUST refetch the list. A 503 MUST say
    that invitations cannot be sent right now.
- **Rationale:** A stale row is refreshed so the page shows the state the backend refused from;
  the wait is worded as the community invitations' (UI-MBR-014). Someone whose invitation is
  pending is not an admin yet, so the refusal does not call them one.
- **Implements:** n/a
- **Source:** #288; changed in #310 (the resend limit names the invitee as "esta persona", not "este
  administrador")

### UI-PAD-014 — The counters count holders of the role

- **Status:** Active
- **Rule:** "Total" and the announced result count MUST count the rows without an `invitation`.
  "Pendientes" MUST count the rows with one, and MUST be shown only when there is at least one.
  The announcement MUST name the pending invitations apart, after the holders, when there is at
  least one ("3 administradores de plataforma y 1 invitación pendiente"), and MUST NOT announce the
  list as empty while one is shown.
- **Rationale:** A pending invitation is not a platform admin (lucoenergia/conluz ADR-0004 §1). The
  list renders the pending invitations too, so an announcement that left them out described a list
  other than the one on screen.
- **Implements:** lucoenergia/conluz ADR-0004 §1
- **Source:** #288 (maintainer decision); changed in #310 (the announcement names the pending
  invitations)

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | The list's loading row | None |
| Empty | "No hay administradores de plataforma", only with neither holders nor pending invitations | None |
| Error | An error message | None |
| Listed | One row per platform admin, then one per pending invitation | "Invitar administrador de plataforma" when allowed; "Revocar rol" on the holders' rows that allow it; "Reenviar" and "Revocar enlace" on pending rows |
| Code shown | The code dialog, over the list | "Copiar", "Hecho" |

## Accepted exceptions

None.
