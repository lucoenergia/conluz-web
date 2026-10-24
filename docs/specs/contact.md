# UI spec document — Contact

| | |
| --- | --- |
| **Prefix** | `UI-CTU` |
| **Status** | Active |
| **Routes** | `/community/contact`, `/contact`, `/communities/:communityId/edit` (its Contacto section) |
| **Roles** | Any signed-in caller (`/community/contact`), who edits the channels there when they may manage the active community; a platform admin who may update the community (`/communities/:communityId/edit`); a signed-out visitor (`/contact`) |
| **Domain rules** | `lucoenergia/conluz`: CTC-001, CTC-004 |
| **Design reference** | Design system: `ContactChannelList` (data display), `ContactChannelReorderList` (forms), `ContactChannelEditor` and `DeleteContactChannelConfirmationModal` (dialogs) |
| **Last reviewed against code** | #296 |

## Purpose

Help somebody reach whoever can help them. A member reaches their community's contact channels from
inside the app and taps a phone or an email to use it. Somebody with no channels to show, or no
community at all, is told to contact whoever manages their energy community. Somebody who cannot
sign in gets the same instruction and the way to recover a password. The operator of the platform is
offered only last, and only when one is configured. A platform admin sees a community's channels so
they can send people who cannot sign in to it. Whoever manages the community keeps its channels up to
date from the same page, seeing them as members do, one channel at a time.

## Rules

### UI-CTU-001 — The active community's channels, inside the app

- **Status:** Active
- **Rule:** The signed-in contact page MUST show the active community's channels inside the app
  layout, in their stored order, each with its own schedule and notes.
- **Rationale:** Members must not leave the app to find help, and a schedule or a note describes the
  channel it belongs to. The page follows the active community, so a switch shows the new one's
  channels. A signed-in caller who opens the public `/contact` is sent here.
- **Implements:** CTC-001
- **Source:** #295

### UI-CTU-002 — Phones and emails are links

- **Status:** Active
- **Rule:** Phone and email values MUST be rendered as `tel:` and `mailto:` links. A phone's link
  drops the spaces it is written with and keeps a leading `+`. An address MUST be plain text.
- **Rationale:** Most use is on a phone, where one tap should start the call or the email. The value
  is shown as stored; only the link is normalised.
- **Implements:** n/a
- **Source:** #295

### UI-CTU-003 — No channels: the community manager first

- **Status:** Active
- **Rule:** When no community channels are available and the caller cannot manage the community's
  contact, the page MUST first instruct the user to contact whoever manages their energy community,
  and MAY show the operator contact below only when it is configured and was retrieved. While the
  channels or the active community are not yet known, the instruction MUST NOT be shown; a failed
  channels request MUST be shown as an error with a retry; a failed operator request MUST leave the
  operator out, with no alert.
- **Rationale:** Whoever manages the community is the one who can unblock the user; the operator must
  not become the default support path. "Not yet known" and "failed" are not "none": showing the
  instruction then would tell a member their community has no contact when it may have. A caller who
  may manage the contact is the one the instruction would send people to, so UI-CTU-007 applies to
  them instead. "Cannot manage" covers a caller with no community, and a check of the capability
  that failed: the instruction is still true for them, and the page stays usable.
- **Implements:** CTC-004
- **Source:** #295; changed in #296 (a caller who may manage the contact is asked to configure it, UI-CTU-007)

### UI-CTU-004 — Platform admins see a community's channels read-only

- **Status:** Active
- **Rule:** Platform admins MUST see a community's contact channels read-only on the community page
  they open from the communities list, with no edit action; when there are none, they MUST see a
  neutral "not configured" text, never the operator fallback.
- **Rationale:** The operator routes users who cannot sign in to their community. The operator
  fallback would point the operator at itself, so the operator contact is not even requested there.
- **Implements:** CTC-001
- **Source:** #295

### UI-CTU-005 — The public help page

- **Status:** Active
- **Rule:** The public help page MUST show first the instruction to contact whoever manages the
  user's energy community, then password recovery, and MAY show the operator contact last only when
  it is configured and was retrieved. It MUST NOT request anything about a community or a user.
- **Rationale:** Visitors cannot sign in, and the platform cannot know their community. Whoever
  manages it unblocks access; the operator is a fallback. Password recovery works only for an
  account with an email, so the page says so.
- **Implements:** CTC-004
- **Source:** #295

### UI-CTU-006 — Editing controls only when they can succeed

- **Status:** Active
- **Rule:** The contact edit, add and reorder controls MUST be rendered only when they can succeed:
  edit and reorder require `canManage`, add also requires fewer than 10 channels, and reorder
  requires at least 2 channels.
- **Rationale:** Actions guaranteed to fail must not be rendered. At the limit, a neutral text states
  the maximum instead of the add control. In the order mode, the first channel has no "Subir" and
  the last no "Bajar", for the same reason.
- **Implements:** n/a
- **Source:** #296

### UI-CTU-007 — No channels: a manager is asked to configure them

- **Status:** Active
- **Rule:** A user with `canManage` MUST see a configure call-to-action instead of the member fallback
  when the community has no channels.
- **Rationale:** The admin is the one who can fix the empty state. The operator contact is not
  requested for them. While it is not yet known whether the caller has `canManage`, neither the
  call-to-action nor the fallback is shown.
- **Implements:** n/a
- **Source:** #296

### UI-CTU-008 — One save at a time

- **Status:** Active
- **Rule:** Contact changes MUST be saved one operation at a time: while a save is in flight, no other
  change can be started, and the list shown afterwards MUST be the one the server returned.
- **Rationale:** Every save replaces the whole list; overlapping saves by the same admin would
  overwrite each other. The list sent is built from the one the admin was looking at when the editor
  opened, never from a copy refetched meanwhile, so a channel is replaced, added or removed where the
  admin saw it. Changes by different admins are not reconciled: the last write wins.
- **Implements:** n/a
- **Source:** #296

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading (in-app page or platform admin section) | A progress indicator; no instruction, no "not configured" text | None |
| Channels | The channel list (UI-CTU-001, UI-CTU-002) | Tap a phone or an email |
| Channels, caller may manage (in-app page) | The list with an "Editar" per channel, "Añadir canal" below 10 channels or the limit text at 10, "Cambiar orden" from 2 channels (UI-CTU-006) | Edit a channel, add one, enter the order mode |
| No channels, or no community (in-app page) | The instruction, then the operator contact when configured and retrieved | Tap the operator's phone or email |
| No channels, caller may manage (in-app page) | A neutral configure panel; no instruction, no operator (UI-CTU-007) | "Configurar contacto", which opens the sheet for a new channel |
| No channels, caller's capability not yet known (in-app page) | A progress indicator; neither the instruction nor the configure panel | None |
| Sheet, no changes | The channel in a bottom sheet below `md`, a 560 px dialog from `md` up; focus trapped | Save, delete (an existing channel), close directly |
| Sheet, with changes | The same; closing by any means replaces the footer with the unsaved-changes question | Keep editing (focus back on the last field), discard |
| Sheet, with errors | Each reason below its field; focus on the first one | Correct and save again, close |
| Sheet, saving | Read-only fields and a single "Guardando…"; no close or delete control; no other sheet or order mode can be opened (UI-CTU-008) | None |
| Sheet, server error | An error alert at the top, focused, with the input kept | Save again, close |
| Sheet, offline | The offline message at the top, focused, with the input kept | Save again, close |
| Sheet, lost rights (403 or 404) | The lost-rights message; the input read-only but selectable; no "Guardar" | Close, which refreshes the community and shows the member view |
| Order mode | Numbered rows with "Subir" and "Bajar"; no add or edit controls; each move announced, focus on the moved channel | Move, save the order, cancel |
| Delete confirmation | The channel's name and the effect on the others, over the sheet; nothing sent until confirmed | Confirm, cancel |
| Last channel deleted | The configure panel and a neutral notice; focus on "Configurar contacto" | "Configurar contacto" |
| No channels (platform admin section) | The neutral "not configured" text, no alert colour | None |
| Channels request failed | An error with a retry | Retry |
| Operator request failed | Nothing for the operator; no alert | — |
| Signed out (`/contact`) | Instruction, password recovery, then the operator contact when configured and retrieved | Recover the password, tap the operator's phone or email, go back to sign in |
