# UI spec document — Platform admins

| | |
| --- | --- |
| **Prefix** | `UI-PAD` |
| **Status** | Active |
| **Routes** | `/platform-admins`; the platform admin's reach over every authenticated route |
| **Roles** | A caller whose platform capabilities carry `canListPlatformAdmins` |
| **Domain rules** | n/a |
| **Design reference** | n/a |
| **Last reviewed against code** | #285 |

## Purpose

Let a platform admin see who administers the platform and revoke the role, without reading
anybody's personal data. The page replaces the users page, which listed every user with their
personal data. It also covers what a platform admin with no membership can still reach: the
platform's own screens, never a member's.

Granting the role is not on this page yet. It arrives with the platform-admin invitation.

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
  - Each row MUST show the platform admin's full name, the account's email, and whether the
    account is enabled ("Habilitado") or disabled ("Deshabilitado").
  - A platform admin without email MUST be shown by name alone, with no placeholder: the table's
    email cell is empty, and the narrow list has no email line.
- **Rationale:** These are the fields that identify an admin. Nothing else about the account is
  read, so the page shows no personal data beyond them. Shown by name alone for the same reason
  as UI-MBR-007.
- **Implements:** n/a
- **Source:** #285

### UI-PAD-003 — Revocar rol is offered only where the caller may revoke

- **Status:** Active
- **Rule:** "Revocar rol" MUST be offered only on a row whose `capabilities.canRevoke` is true. A
  row with no permitted action MUST show no row-actions button.
- **Rationale:** `canRevoke` is false on the caller's own row: nobody may revoke their own role.
  A menu with nothing in it is a promise of something to do.
- **Implements:** n/a
- **Source:** #285

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

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | The list's loading row | None |
| Empty | "No hay administradores de plataforma" | None |
| Error | An error message | None |
| Listed | One row per platform admin | "Revocar rol" on the rows that allow it |

## Accepted exceptions

None.
