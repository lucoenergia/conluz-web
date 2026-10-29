# UI spec document — Members

| | |
| --- | --- |
| **Prefix** | `UI-MBR` |
| **Status** | Active |
| **Routes** | `/members` |
| **Roles** | A caller whose active community carries `canManageMemberships`; registration, the import, invitations and the bulk send need their own capabilities (UI-MBR-008, UI-MBR-018, UI-MBR-012, UI-MBR-013) |
| **Domain rules** | `lucoenergia/conluz`: MEM-004, MEM-005, MEM-007, MEM-008, MEM-009, MEM-010, MEM-011, MEM-012, MEM-013, MEM-025, MEM-026, MEM-027, MEM-028, MEM-029, MEM-030, MEM-033, MEM-034, ACC-003, ACC-008, ACC-010 |
| **Design reference** | The members page search and filters, screens A–D, mobile and desktop: https://claude.ai/artifact/RwsRYG1EqfMcnBmbysot93 (#331) |
| **Last reviewed against code** | #331 |

## Purpose

Let an admin of a community keep its roster: register members, one by one or from a CSV file, and
invite them to join, see which members are still pending and where their invitation stands, correct
the record the community keeps on each member, and suspend or reactivate a member's access to the
community, and keep it from losing its last active admin; and find a member, or the members in a
given status or role, by searching and filtering the roster. This document covers only the rules
#272, #275, #276, #284, #309 and #331 introduced; the rest of the members page is not covered yet.

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
- **Rule:** A row whose membership is disabled MUST show "Suspendido", in both layouts, whether or
  not the membership has been accepted.
- **Rationale:** It names the state the "Suspender" action produces. A suspended membership grants
  nothing whether or not it was accepted, so "Suspendido" is the state that tells the admin what to
  do about it (UI-MBR-010).
- **Implements:** MEM-005
- **Source:** #272; changed in #275 (suspended wins over pending)

### UI-MBR-007 — A member without email is named alone

- **Status:** Active
- **Rule:**
  - Wherever a member's email is shown next to their name (the roster, the community admins page),
    a member without email MUST be shown without it, with no empty parentheses, separators or blank
    line.
  - On the roster, both layouts MUST show the DNI/NIE/NIF as secondary information: under the name
    in the table, as "email · DNI/NIE/NIF", or the DNI/NIE/NIF alone when there is no contact email;
    in the narrow list, on the line "role · DNI/NIE/NIF", with the email on its own line, left out
    when there is none.
  - Elsewhere, a member without email MUST be shown by name alone.
- **Rationale:** An account, and a member record, may have no email. Admins search the roster by
  DNI/NIE/NIF (UI-MBR-031), so each row shows it, on every viewport, whether or not there is an
  email.
- **Implements:** ACC-003
- **Source:** #272; changed in #275 (the add-member picker it also covered was removed, UI-MBR-016);
  changed in #276 (the community admins dialog became the community admins page, UI-ADM-002);
  changed in #331 (the roster shows the DNI/NIE/NIF as secondary information, maintainer decision)

### UI-MBR-008 — A registration sends the whole record and the personal ID

- **Status:** Active
- **Rule:**
  - "Registrar miembro" MUST be offered when the active community's `capabilities.canRegisterMembers`
    is true. A capability absent from the payload MUST count as false.
  - The form MUST ask for the personal ID and the full name, both required, and for the member
    number, contact email, address and phone, all optional, with the record form's checks
    (UI-MBR-003). A missing personal ID MUST be shown on its field and send no request.
  - Submitting MUST send every field. An empty optional field MUST be sent as `null`. The personal
    ID MUST be sent as typed, without normalising it.
  - A `MEMBERSHIP_ALREADY_EXISTS` refusal MUST say, for the whole form, that the person is already
    in the community, and the form MUST keep what was typed.
- **Rationale:** Registration replaces linking an existing account: the community records the
  member by their personal ID, whether or not they have an account, and never learns which. The
  backend normalises the personal ID, so a typed form with dots or a lower-case letter is not a
  mistake to point out. The record fields are the record form's, so the two cannot drift.
- **Implements:** MEM-007, MEM-008
- **Source:** #275

### UI-MBR-009 — A registered member is pending, and may be invited straight away

- **Status:** Active
- **Rule:**
  - After a registration the roster MUST be refreshed and show the member as pending (UI-MBR-010),
    never invited (UI-MBR-030). Registering MUST send no invitation.
  - When the registered record has a contact email and the response's `capabilities.canInvite` is
    true, the dialog MUST offer "Invitar ahora", which sends the first invitation (UI-MBR-012). A
    refusal MUST be shown in the dialog, which stays open.
  - When the record has no contact email, the dialog MUST NOT offer "Invitar ahora", and MUST say
    to add one from "Editar ficha".
- **Rationale:** Registering only records the member, so the admin decides when they are told.
  Inviting is the next step in most cases, so it is one click away, but only where the backend
  would accept it: without a contact email there is nowhere to send it.
- **Implements:** MEM-007, MEM-009
- **Source:** #275; changed in #331 (the never-invited state is now UI-MBR-030's)

### UI-MBR-010 — The roster tells active, pending and suspended members apart

- **Status:** Active
- **Rule:**
  - A row whose membership is disabled MUST show "Suspendido" (UI-MBR-006).
  - A row whose membership is enabled and not accepted (`acceptedAt` null) MUST show its pending
    sub-status (UI-MBR-030).
  - A row whose membership is enabled and accepted MUST show "Activo".
  - The "Activos" count MUST count only the accepted, enabled memberships.
  - Each applies in both layouts.
- **Rationale:** A pending membership grants no access until it is accepted, so showing it as
  active, or counting it among the active members, would tell the admin that someone has access who
  does not. Its sub-status names what the admin can do about it.
- **Implements:** MEM-004, MEM-005
- **Source:** #275; changed in #331 (a pending row shows its sub-status, not "Pendiente")

### UI-MBR-011 — A pending row shows where its invitation stands

- **Status:** Removed (#331: superseded by UI-MBR-030, whose pending sub-status replaces the
  invitation caption and the link's expiry date)
- **Rule:** A row whose membership is not accepted MUST show its invitation state, under the status
  in the table and as an "Invitación" field in the narrow list:
  - "Sin invitar" when `invitedAt` is null;
  - "Enlace activo hasta el" and the date of `invitationExpiresAt`, in the app time zone, when it is
    set;
  - "Enlace caducado o revocado" when `invitedAt` is set and `invitationExpiresAt` is null.
  An accepted row MUST show no invitation state.
- **Rationale:** "Never invited" and "invited, but the link no longer works" call for different
  actions (UI-MBR-012), and only `invitedAt` tells them apart. The backend sends
  `invitationExpiresAt` only while the link can be used, so the screen reads no clock.
- **Implements:** MEM-013
- **Source:** #275; removed in #331

### UI-MBR-012 — Each invitation write is offered from canInvite and the row's state

- **Status:** Active
- **Rule:**
  - Every item below MUST require the membership's `capabilities.canInvite`. A capability absent
    from the payload MUST count as false.
  - "Invitar" MUST be offered only on a row that is pending, enabled and never invited.
  - "Reenviar" MUST be offered only on a row that is pending, enabled and invited before, whether
    its link is active or not.
  - "Revocar enlace" MUST be offered only on a pending row with an active link, enabled or not.
  - Each MUST open a confirmation naming the member and the community before anything is sent.
  - After each one that succeeds, the roster MUST be refreshed. A refusal refreshes it only as
    UI-MBR-014 says.
- **Rationale:** `canInvite` answers whether this caller may ever invite this member; the state
  answers which write applies now. The first invitation and a resend are different endpoints, and
  the backend refuses each in the other's state. A suspended member cannot be sent anything, but a
  link already sent to them can still be stopped.
- **Implements:** MEM-009, MEM-010, MEM-011, MEM-025
- **Source:** #275

### UI-MBR-013 — The bulk send asks once and goes on while invitations remain

- **Status:** Active
- **Rule:**
  - "Enviar invitaciones pendientes" MUST be offered when the active community's
    `capabilities.canInviteMembers` is true. A capability absent from the payload MUST count as
    false.
  - It MUST ask for confirmation before the first request.
  - After each request it MUST show how many invitations were sent and how many remain, and MUST
    offer to send the next batch while some remain, and only then.
  - After each request that succeeds, the roster MUST be refreshed.
  - A refusal MUST be shown in the dialog.
  - The screen MUST NOT count the eligible members itself.
- **Rationale:** The backend chooses who qualifies and sends a limited batch per request, and says
  how many remain. Counting on the client would restate that rule and drift from it.
- **Implements:** MEM-012
- **Source:** #275

### UI-MBR-014 — Each invitation refusal has its own message

- **Status:** Active
- **Rule:**
  - `MEMBERSHIP_WITHOUT_CONTACT_EMAIL` MUST say the member has no contact email and point to "Editar
    ficha".
  - `MEMBERSHIP_DISABLED` MUST say the member is suspended.
  - `MEMBERSHIP_INVITATION_UNAVAILABLE` MUST say invitations cannot be sent right now.
  - `MEMBERSHIP_INVITATION_RESEND_LIMIT_REACHED` MUST say when another resend will be possible,
    from `params.retryAfterSeconds`, or from the `Retry-After` header when the body has none.
  - After `MEMBERSHIP_ALREADY_INVITED`, `MEMBERSHIP_NOT_INVITED`, `MEMBERSHIP_DISABLED` or a
    `MEMBERSHIP_ALREADY_EXISTS` that answers an invitation write, the roster MUST be refreshed and
    the message MUST say so.
- **Rationale:** Each refusal calls for something different from the admin. The last four mean the
  row changed since it was read (invited, accepted or suspended elsewhere), so the refreshed row
  shows the actual state and the actions it allows.
- **Implements:** MEM-009, MEM-010, MEM-025
- **Source:** #275

### UI-MBR-015 — A member who owns supplies is not removed, and the admin is told why

- **Status:** Active
- **Rule:** When removing a member is refused with `MEMBERSHIP_OWNS_SUPPLIES`, the page MUST say
  that the member owns supplies in this community, recommend suspending them to stop their access,
  and say their supplies must be deleted first to remove them. The member MUST stay in the roster.
  This applies to a row whose role is `COMMUNITY_MEMBER`; an admin's refusal is UI-MBR-029.
- **Rationale:** The generic error gave the admin no way forward. Suspending stops the member's
  access in this community without deleting anything, and needs nothing done first, so it is the
  step the message recommends; deleting the supplies is not done from this page.
- **Implements:** MEM-029
- **Source:** #275 (maintainer decision; lucoenergia/conluz#412); #309 (scoped to a member's row)

### UI-MBR-016 — The page reads no user list and links no existing account

- **Status:** Active
- **Rule:** The members page MUST NOT read `GET /api/v1/users` and MUST NOT send
  `POST /api/v1/communities/{communityId}/memberships`. Members join the roster by registration
  (UI-MBR-008) only.
- **Rationale:** These served the "Añadir miembro" picker, which linked an existing account to the
  community. Registration replaces it: the community records the member by their personal ID and
  invites them, so the page has no use for the list of accounts.
- **Implements:** MEM-007, MEM-008
- **Source:** #275

### UI-MBR-017 — An invalid DNI/NIE/NIF is shown on its field

- **Status:** Active
- **Rule:** When a registration is refused with `USER_PERSONAL_ID_INVALID`, the refusal MUST be
  shown on the personal ID field, not for the whole form, and the form MUST keep every value as
  typed.
- **Rationale:** The refusal is about that one field: the personal ID's format or its control
  letter is wrong, and the admin corrects it there. The page still sends the ID as typed
  (UI-MBR-008); the backend decides whether it is valid.
- **Implements:** ACC-010
- **Source:** #276 (maintainer decision; lucoenergia/conluz#398)

### UI-MBR-018 — The import is offered from canRegisterMembers

- **Status:** Active
- **Rule:** "Importar miembros" MUST be offered when the active community's
  `capabilities.canRegisterMembers` is true, and only then; a capability absent from the payload MUST
  count as false.
- **Rationale:** The import registers each row as a registration does, for the same callers, and no
  capability names the import itself.
- **Implements:** MEM-030
- **Source:** #284; #300 (the legacy user import's capability was retired in lucoenergia/conluz#447)

### UI-MBR-019 — The dialog explains each column and offers a header-only template

- **Status:** Active
- **Rule:**
  - The import dialog MUST list each accepted column with its header exactly as the file names it
    (in English, with its case), what it means, whether it is required, and an example.
  - It MUST offer a template to download, `plantilla-miembros.csv`: a UTF-8 byte order mark followed by
    the header line alone, with the columns separated by `;`.
- **Rationale:** The header is the parser's name for the column, so translating it would make the
  admin write a header the backend refuses. A template with an example row would register that
  example whenever an admin forgot to delete it. The byte order mark makes Excel open the template
  as UTF-8, so accented names typed into it survive.
- **Implements:** MEM-030
- **Source:** #284 (maintainer decision on the template)

### UI-MBR-020 — The dialog states what the import does and accepts

- **Status:** Active
- **Rule:** Before the import, the dialog MUST say that importing registers members and sends
  nothing, and that invitations are sent afterwards one by one or with "Enviar invitaciones
  pendientes"; that spaces, dots and hyphens in the DNI/NIE/NIF are ignored; that both Excel exports,
  "CSV UTF-8" and "CSV (delimitado por punto y coma)", are accepted and "Texto Unicode" is not; that a
  file holds at most 1000 members; and that importing the same file again is safe.
- **Rationale:** Each answers a question an admin preparing a file would otherwise answer by trial:
  whether the members are emailed, whether the DNI must be retyped, which "Guardar como" choice to
  make, how large a file may be, and whether retrying after a partial failure duplicates anyone.
- **Implements:** MEM-030
- **Source:** #284 (maintainer decision on the encoding note)

### UI-MBR-021 — The import sends the file and cannot be interrupted

- **Status:** Active
- **Rule:**
  - The import MUST send the chosen file as the `file` part of a multipart request to `importMembers`,
    and MUST NOT send `POST /api/v1/users/import`.
  - While the request runs, the dialog MUST show that it is importing and MUST NOT be closable.
- **Rationale:** The legacy user import created accounts with passwords from the file; its endpoint
  was retired in lucoenergia/conluz#447, and the import must never fall back to it. An import of
  many rows takes several seconds, and closing the dialog meanwhile would hide a result that cannot
  be asked for again.
- **Implements:** MEM-030
- **Source:** #284; #300 (endpoint retired in lucoenergia/conluz#447)

### UI-MBR-022 — A file refused as a whole says why, and that nothing was registered

- **Status:** Active
- **Rule:**
  - Each whole-file refusal code MUST have its own message. The header codes MUST list the headers in
    `params.headers`, and `MEMBERSHIP_IMPORT_TOO_MANY_ROWS` MUST state `params.maxRows`.
  - Each MUST say that no member was registered, and the dialog MUST keep the chosen file.
  - Any other failure MUST say only that the import failed.
- **Rationale:** Each refusal calls for a different correction to the file, and the admin needs to
  know it is safe to send it again. A failure that is not the file's, such as a dropped connection,
  does not tell whether anything was registered, so the dialog does not claim it.
- **Implements:** MEM-030
- **Source:** #284

### UI-MBR-023 — Each failed row gives its line and a reason in Spanish

- **Status:** Active
- **Rule:**
  - The result MUST say how many members were registered and how many rows failed, and MUST list each
    failed row with its line number and its reason.
  - The reason of a row refused for its values MUST be built from its `errors`: a Spanish label for
    each column and a text for each constraint, with its `params`, every broken rule listed. A
    constraint the page does not know MUST still name its column.
  - The other row codes MUST have their own text.
  - The server's `message` MUST NOT be shown.
- **Rationale:** The server's message is in the request's language and words the rules its own way,
  so it can read as a foreign error in a Spanish screen. The structured errors let the
  page word every rule the way the rest of the screen does, and list all of them at once, so a row is
  corrected in one pass.
- **Implements:** MEM-030
- **Source:** #284

### UI-MBR-024 — After an import, the roster is refreshed and the bulk send is offered

- **Status:** Active
- **Rule:**
  - After an import that succeeds, the roster MUST be refreshed.
  - When at least one member was registered, the result MUST say that no invitation has been sent,
    and MUST offer "Enviar invitaciones pendientes" when the active community's
    `capabilities.canInviteMembers` is true. It MUST open the bulk send (UI-MBR-013), which asks for
    confirmation before sending; the import dialog itself MUST NOT send anything.
- **Rationale:** Registered members are pending until invited, and inviting is the step that
  follows an import. Handing over to the bulk send keeps one place where invitations are sent in
  bulk, with its confirmation and its batches.
- **Implements:** MEM-012, MEM-030
- **Source:** #284

### UI-MBR-025 — The roster shows the community's record, never the account

- **Status:** Active
- **Rule:**
  - Every place the page shows a member's data — the name and contact email in the roster, the
    row's menu labels, the record dialog's seeding and its read-only personal ID, and the names in
    the invitation, suspension, role-change and removal dialogs — MUST read it from the roster row's
    own fields (`fullName`, `memberNumber`, `contactEmail`, `address`, `phoneNumber`, `personalId`),
    never from its `user`, which carries the account's id only.
  - "Puntos de suministro" MUST be offered from the row's `capabilities.canListSupplies`.
  - A person in several communities MUST be shown, on each community's roster, with that
    community's record.
- **Rationale:** Each community keeps its own record of a member, and the account may hold what
  another community or the person entered. The membership now names its record as the member
  responses do, and reports the supplies capability itself, since its user is a reference.
- **Implements:** MEM-026
- **Source:** #302, lucoenergia/conluz#448

### UI-MBR-026 — The last active admin's removal is shown disabled, with the reason

- **Status:** Active
- **Rule:**
  - On a row whose `lastActiveAdmin` is true, the caller's own included, "Eliminar" MUST be shown
    disabled, with "Es el último administrador activo de la comunidad. Primero haz administrador a
    otro miembro activo." under it, and its confirmation MUST NOT open.
  - "Eliminar" MUST still be shown only where the row's `capabilities.canDelete` offers it.
  - A `lastActiveAdmin` absent from the payload MUST count as false.
- **Rationale:** The backend refuses this removal and reports it in advance, apart from `canDelete`,
  which only says the caller may ask. A disabled item with its reason tells the admin why and what
  to do first, where an enabled one led to a request bound to fail; it follows "Revocar rol" on the
  platform admins page (UI-PAD-004). Counting the absent field as false keeps the page as it was
  against a backend that does not send it.
- **Implements:** MEM-033
- **Source:** #309, lucoenergia/conluz#449

### UI-MBR-027 — The last active admin cannot be changed to Miembro

- **Status:** Active
- **Rule:**
  - In the "Cambiar rol" dialog of a row whose `lastActiveAdmin` is true, the caller's own included,
    the Miembro option MUST be disabled, with the reason of UI-MBR-026 under the role field, and
    Confirmar MUST stay disabled while Miembro is selected.
  - "Cambiar rol" itself MUST still be offered from the row's `capabilities.canUpdateRole` alone.
  - A `lastActiveAdmin` absent from the payload MUST count as false.
- **Rationale:** On that row demoting is the only role change, and the backend refuses it. The page
  offers no "Hacer miembro" item: the role is chosen in the "Cambiar rol" dialog, so the choice the
  backend would refuse is disabled there. Confirmar stays disabled because a refetch can make the row
  the last active admin while Miembro is already selected.
- **Implements:** MEM-033
- **Source:** #309 (maintainer decision on where the role change is disabled), lucoenergia/conluz#449

### UI-MBR-028 — A last-admin refusal says why, and the roster is refreshed

- **Status:** Active
- **Rule:** When the role change or the removal is refused with 409 `MEMBERSHIP_LAST_ACTIVE_ADMIN`,
  the page MUST show the reason of UI-MBR-026 followed by "Hemos actualizado la lista.", MUST
  refresh the roster, and the row MUST stay with its role unchanged.
- **Rationale:** The page disables both actions on the last active admin's row, so this refusal
  means the roster was stale: another admin was demoted, suspended or removed since it was read, or
  two admins acted at once. The refreshed row shows the actions disabled with their reason
  (UI-MBR-026, UI-MBR-027), and the message says the list changed, as the invitation refusals that
  mean a stale row do (UI-MBR-014).
- **Implements:** MEM-033
- **Source:** #309, lucoenergia/conluz#449

### UI-MBR-029 — An admin who owns supplies is not removed, and the caller is told to demote them first

- **Status:** Active
- **Rule:** When removing a row whose role is `COMMUNITY_ADMIN` is refused with
  `MEMBERSHIP_OWNS_SUPPLIES`, the page MUST say that the admin owns supplies in this community,
  recommend changing their role to member and then suspending them to stop their access, and say
  their supplies must be deleted first to remove them. The admin MUST stay in the roster.
- **Rationale:** A community admin cannot suspend another admin, so the member's wording
  (UI-MBR-015) recommended a step the caller cannot take; once demoted, the person can be suspended.
  The removed row's role picks the wording: it is the target's data, not the caller's authorization.
- **Implements:** MEM-029, MEM-034
- **Source:** #309, lucoenergia/conluz#449

### UI-MBR-030 — Each membership shows one derived status

- **Status:** Active
- **Rule:** The members page MUST derive one status per membership, evaluated in this order:
  (1) Suspendido if `enabled` is false; (2) Activo if `acceptedAt` is set; (3) otherwise Pendiente,
  with the first matching sub-status: Invitación enviada (`invitationExpiresAt` set), Sin email
  (`contactEmail` null), Sin invitar (`invitedAt` null), Invitación caducada o revocada (`invitedAt`
  set, `invitationExpiresAt` null).
- **Rationale:** The contract has no status field. Suspendido goes first because invitations to a
  disabled membership always fail (`409 MEMBERSHIP_DISABLED`). A usable link outranks a missing
  email because the member can still accept. Sin email outranks the rest because no send can
  succeed (`400 MEMBERSHIP_WITHOUT_CONTACT_EMAIL`). Expired and revoked share a label because the
  contract cannot tell them apart and both lead to the same action.
- **Implements:** MEM-004, MEM-005, MEM-013
- **Source:** #331

### UI-MBR-031 — The search matches name, DNI/NIE/NIF and email as typed

- **Status:** Active
- **Rule:** Member search MUST match a substring of `fullName`, `personalId` or `contactEmail`,
  ignoring case and accents; the query MUST be normalised like `personalId` when matched against it.
- **Rationale:** Admins search with whatever they have at hand, typed in any form.
- **Implements:** n/a
- **Source:** #331

### UI-MBR-032 — Search and filters combine and apply at once

- **Status:** Active
- **Rule:** Search, status filter and role filter MUST combine with AND and MUST apply immediately
  on every viewport.
- **Rationale:** Predictable narrowing; one behaviour across mobile and desktop.
- **Implements:** n/a
- **Source:** #331

### UI-MBR-033 — The list is paged only above 25 rows

- **Status:** Active
- **Rule:** Pagination MUST be rendered only when the filtered result exceeds 25 rows, with pages of
  25, and MUST reset to page 1 when search or filters change.
- **Rationale:** Avoids friction on mobile for typical sizes; avoids empty pages after narrowing.
- **Implements:** n/a
- **Source:** #331

### UI-MBR-034 — The header counters ignore search and filters

- **Status:** Active
- **Rule:** Header counters MUST be computed over the full membership list, independent of search
  and filters.
- **Rationale:** They describe the community, not the current view.
- **Implements:** n/a
- **Source:** #331

### UI-MBR-035 — No matching row shows a no-results state

- **Status:** Active
- **Rule:** When no row matches, the page MUST show a no-results state with an action that clears
  search and filters.
- **Rationale:** An empty table reads as "no members".
- **Implements:** n/a
- **Source:** #331

### UI-MBR-036 — The result count is shown above the list

- **Status:** Active
- **Rule:** The page MUST show, above the list, the number of memberships matching the current
  search and filters.
- **Rationale:** On mobile the list is long; the admin must know the result size without scrolling
  to the pagination.
- **Implements:** n/a
- **Source:** #331

## States

The members list:

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | The search and filters, and "Cargando…" in place of the count | Search, filters |
| Results | The count, one page of rows or cards, each with its derived status (UI-MBR-030) | Search, filters, "Limpiar filtros" while one is active, each row's menu |
| Paged | The same, with the range and the page controls (UI-MBR-033) | The same, and the page controls |
| No results | The count at 0 and the no-results state (UI-MBR-035), neutral | "Limpiar filtros" in the no-results state only |
| Empty roster | The count at 0 and that the community has no members | Search, filters |

The record dialog:

| State | Rendered | Actions available |
| --- | --- | --- |
| Editing | The record, seeded from the row, with the personal ID read-only | Guardar, Cancelar |
| Pending invitation | The same, with a notice about the next resend | Guardar, Cancelar |
| Field errors | The errors on their fields | Guardar, Cancelar |
| Refused | An error for the whole form, or on the email field | Guardar, Cancelar |
| Saving | The save button disabled | Cancelar |

The registration dialog:

| State | Rendered | Actions available |
| --- | --- | --- |
| Form | The empty form, with a notice that registering sends nothing | Registrar, Cancelar |
| Field errors | The errors on their fields | Registrar, Cancelar |
| Refused | An error for the whole form, or on the personal ID, with the values as typed | Registrar, Cancelar |
| Registered, with a contact email and `canInvite` | What happened, and where the invitation would go | Invitar ahora, Cerrar |
| Registered, without a contact email | What happened, and a pointer to "Editar ficha" | Cerrar |
| Invitation refused | The registered state, with the refusal | Invitar ahora, Cerrar |

The bulk send dialog:

| State | Rendered | Actions available |
| --- | --- | --- |
| Confirming | Who receives an invitation, and that they go in batches | Enviar invitaciones, Cancelar |
| Some remain | How many were sent, and how many remain | Enviar las siguientes, Cerrar |
| None remain | How many were sent, and that none remain | Cerrar |
| Refused | The refusal | The same as before the request |

The import dialog:

| State | Rendered | Actions available |
| --- | --- | --- |
| Guide | The notes, the column guide, the template download and the file picker | Descargar plantilla, Seleccionar archivo CSV, Importar (once a file is chosen), Cancelar |
| Importing | That the import is running | None; the dialog cannot be closed |
| Refused | The guide, with the refusal and that nothing was registered, and the file still chosen | As in Guide |
| Result | The counts, each failed row with its line and reason, and, with registered members, that nothing was sent | Importar otro archivo, Cerrar, and Enviar invitaciones pendientes with registered members and `canInviteMembers` |

## Accepted exceptions

None.
