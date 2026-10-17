# UI spec document — Profile

| | |
| --- | --- |
| **Prefix** | `UI-PRF` |
| **Status** | Active |
| **Routes** | `/profile` |
| **Roles** | Any signed-in caller |
| **Domain rules** | `lucoenergia/conluz`: ACC-003, ACC-006 |
| **Design reference** | n/a |
| **Last reviewed against code** | #272 |

## Purpose

Let a signed-in user change their own contact details. This document covers only the rules #272
introduced on the email field and the member-number chip; the rest of the profile is not covered
yet.

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
  member-number chip. A number that is there, 0 included, MUST render as "Socio #<number>".
- **Rationale:** Accounts created by member registration have no global number: the member number
  lives on each community's member record (lucoenergia/conluz#392). Rendering "Socio #0" would
  state a number the member does not have.
- **Implements:** ACC-006
- **Source:** #272

## States

Not covered yet.

## Accepted exceptions

None.
