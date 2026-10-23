# UI spec document — Contact

| | |
| --- | --- |
| **Prefix** | `UI-CTU` |
| **Status** | Active |
| **Routes** | `/community/contact`, `/contact`, `/communities/:communityId/edit` (its Contacto section) |
| **Roles** | Any signed-in caller (`/community/contact`); a platform admin who may update the community (`/communities/:communityId/edit`); a signed-out visitor (`/contact`) |
| **Domain rules** | `lucoenergia/conluz`: CTC-001, CTC-004 |
| **Design reference** | Design system: `ContactChannelList` (data display) |
| **Last reviewed against code** | #295 |

## Purpose

Help somebody reach whoever can help them. A member reaches their community's contact channels from
inside the app and taps a phone or an email to use it. Somebody with no channels to show, or no
community at all, is told to contact whoever manages their energy community. Somebody who cannot
sign in gets the same instruction and the way to recover a password. The operator of the platform is
offered only last, and only when one is configured. A platform admin sees a community's channels so
they can send people who cannot sign in to it.

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
- **Rule:** When no community channels are available, the page MUST first instruct the user to
  contact whoever manages their energy community, and MAY show the operator contact below only when
  it is configured and was retrieved. That covers a community with no channels and a caller with no
  community. While the channels or the active community are not yet known, the instruction MUST NOT
  be shown. A failed channels request MUST be shown as an error with a retry, not as the
  instruction. A failed operator request MUST leave the operator out, with no alert.
- **Rationale:** Whoever manages the community is the one who can unblock the user; the operator must
  not become the default support path. "Not yet known" and "failed" are not "none": showing the
  instruction then would tell a member their community has no contact when it may have.
- **Implements:** CTC-004
- **Source:** #295

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

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading (in-app page or platform admin section) | A progress indicator; no instruction, no "not configured" text | None |
| Channels | The channel list (UI-CTU-001, UI-CTU-002) | Tap a phone or an email |
| No channels, or no community (in-app page) | The instruction, then the operator contact when configured and retrieved | Tap the operator's phone or email |
| No channels (platform admin section) | The neutral "not configured" text, no alert colour | None |
| Channels request failed | An error with a retry | Retry |
| Operator request failed | Nothing for the operator; no alert | — |
| Signed out (`/contact`) | Instruction, password recovery, then the operator contact when configured and retrieved | Recover the password, tap the operator's phone or email, go back to sign in |

## Accepted exceptions

| Exception | Reason | Expires when | Source |
| --- | --- | --- | --- |
| A community admin sees the same read-only page as a member | Editing the channels is not built yet | #296 ships | #295 |
