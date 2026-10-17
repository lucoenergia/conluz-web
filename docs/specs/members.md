# UI spec document — Members

| | |
| --- | --- |
| **Prefix** | `UI-MBR` |
| **Status** | Active |
| **Routes** | `/members` |
| **Roles** | A caller whose active community carries `canManageMemberships` |
| **Domain rules** | `lucoenergia/conluz`: MEM-005, MEM-026, MEM-027, MEM-028, ACC-003, ACC-008 |
| **Design reference** | n/a |
| **Last reviewed against code** | #272 |

## Purpose

Let an admin of a community keep its roster: correct the record the community keeps on each
member, and suspend or reactivate a member's access to the community. This document covers only
the rules #272 introduced; the rest of the members page is not covered yet.

## Rules

### UI-MBR-001 — Each member action is offered from the row's own capability

- **Status:** Active
- **Rule:**
  - "Editar ficha" MUST be offered when the membership's `capabilities.canEditRecord` is true, on
    any role and state, the caller's own row included.
  - The suspend/reactivate item (UI-MBR-005) MUST be offered only from `canDisable` / `canEnable`.
  - A capability absent from the payload MUST count as false, so a backend that does not send it
    shows neither action.
- **Rationale:** A community admin can no longer change another user's account, so the record and
  the membership are where they correct and suspend a member. The backend answers per row; the
  page reads that answer and never a role. Counting an absent capability as false lets this release
  ship before the backend that reports it.
- **Implements:** MEM-027, MEM-028, ACC-008
- **Source:** #272

### UI-MBR-002 — A record edit sends the whole record

- **Status:** Active
- **Rule:**
  - Saving MUST send every record field (name, number, contact email, address, phone), changed or
    not.
  - An empty optional field MUST be sent as no value (`null`), which clears it.
  - The personal ID MUST be shown read-only and never sent.
  - After a save the roster, and every supply read that names the member, MUST be refreshed.
- **Rationale:** The endpoint replaces the record, so a field left out would be cleared rather than
  kept. The personal ID identifies the account, which the record never writes.
- **Implements:** MEM-028
- **Source:** #272

### UI-MBR-003 — Record errors are shown where they apply

- **Status:** Active
- **Rule:**
  - A blank name, a number that is not an integer of 0 or more, and a contact email that is
    present but not an email MUST each be shown on their field, and MUST NOT send a request.
  - A `MEMBERSHIP_WITHOUT_CONTACT_EMAIL` refusal MUST be shown on the contact email field.
  - A 403, a 404 and any other refusal MUST each be shown for the whole form, with its own message.
  - After any refusal the dialog MUST stay open, with the values as typed.
- **Rationale:** An admin's membership must keep a contact email; the field it is about is where
  the admin will look. The backend's validation errors name no field, so only the client's own
  checks, and this one code, can be placed on one.
- **Implements:** MEM-028
- **Source:** #272

### UI-MBR-004 — A pending invitation says where its next resend goes

- **Status:** Active
- **Rule:** When the membership has not been accepted and has an invitation link that can still be
  used (`acceptedAt` null, `invitationExpiresAt` set), the record form MUST say that the next resend
  goes to the new contact email.
- **Rationale:** A link already sent stays valid, but the next one goes to the record's contact
  email. Without the notice, changing it would silently redirect the next invitation.
- **Implements:** MEM-028
- **Source:** #272

### UI-MBR-005 — Suspend and reactivate are one item

- **Status:** Active
- **Rule:** The row menu MUST offer "Suspender" when the membership is enabled and `canDisable` is
  true, and "Reactivar" when it is disabled and `canEnable` is true, never both. Either one MUST
  open a confirmation naming the member and the community before it is sent.
- **Rationale:** A caller who may do either is granted both capabilities; the membership's own
  `enabled` decides which one applies.
- **Implements:** MEM-027
- **Source:** #272

### UI-MBR-006 — A suspended membership is shown as suspended

- **Status:** Active
- **Rule:** A row whose membership is disabled MUST show "Suspendido", in both layouts.
- **Rationale:** It names the state the "Suspender" action produces.
- **Implements:** MEM-005
- **Source:** #272

### UI-MBR-007 — A member without email is named alone

- **Status:** Active
- **Rule:** Wherever a member's email is shown next to their name (the roster, the add-member
  picker, the community admins list), a member without email MUST be shown by name alone, with no
  empty parentheses, separators or blank line.
- **Rationale:** An account, and a member record, may have no email.
- **Implements:** ACC-003
- **Source:** #272

## States

The record dialog only.

| State | Rendered | Actions available |
| --- | --- | --- |
| Editing | The record, seeded from the row, with the personal ID read-only | Guardar, Cancelar |
| Pending invitation | The same, with a notice about the next resend | Guardar, Cancelar |
| Field errors | The errors on their fields | Guardar, Cancelar |
| Refused | An error for the whole form, or on the email field | Guardar, Cancelar |
| Saving | The save button disabled | Cancelar |

## Accepted exceptions

None.
