# UI spec document — Profile

| | |
| --- | --- |
| **Prefix** | `UI-PRF` |
| **Status** | Active |
| **Routes** | `/profile` |
| **Roles** | Any signed-in caller |
| **Domain rules** | `lucoenergia/conluz`: ACC-003, ACC-006, API-003 |
| **Design reference** | n/a |
| **Last reviewed against code** | #411 |

## Purpose

Let a signed-in user change their own contact details. This document covers only the rules #272
introduced on the email field and the member-number chip, and #411's on how a refused save is
worded; the address input is [`forms.md`](forms.md)'s (UI-FRM-001, UI-FRM-002), and the rest of
the profile is not covered yet.

## Rules

### UI-PRF-001 — The email is optional

- **Status:** Active
- **Rule:**
  - The email field MUST NOT be required, and an empty one MUST NOT show an error.
  - Saving with an empty field MUST send no email, which leaves the account without one.
- **Rationale:** An account may have no email. A member without one could not otherwise save any
  other change to their profile.
- **Implements:** ACC-003
- **Source:** #272

### UI-PRF-002 — An email that is there is validated

- **Status:** Active
- **Rule:** A non-empty email that does not look like an email MUST show an error on the field and
  MUST NOT send a request.
- **Rationale:** It catches a typo before it is stored as the address the account is reached at.
- **Implements:** n/a
- **Source:** #272

### UI-PRF-003 — No member-number chip without a number

- **Status:** Active
- **Rule:** When the account's `number` is null or absent, the profile MUST NOT render the
  member-number chip. A number that is there, 0 included, MUST render as "Nº <number>" (with
  U+00BA, the ordinal indicator), named "Número de miembro <number>" for assistive technology.
- **Rationale:** Accounts created by member registration have no global number: the member number
  lives on each community's member record (lucoenergia/conluz#392). Rendering "Nº 0" would
  state a number the member does not have.
- **Implements:** ACC-006
- **Source:** #272

### UI-PRF-004 — A refused save is worded by its code

- **Status:** Active
- **Rule:** A refused profile save MUST show the catalogue's text for its error detail's code
  (UI-ERR-001), else the server's message (UI-ERR-003), and "Error al actualizar el perfil. Por
  favor, inténtalo de nuevo." only when the refusal carries neither. The form MUST keep every value
  as typed.
- **Rationale:** One fixed text hid why a save was refused, such as an address over the limit
  (UI-ERR-007), and left the user to retry what would be refused again. The profile does not place
  a refusal on an input; it says why where it shows errors.
- **Implements:** API-003
- **Source:** #411 (maintainer decision)

## States

Not covered yet.

## Accepted exceptions

None.
