# UI spec document — Users

| | |
| --- | --- |
| **Prefix** | `UI-USR` |
| **Status** | Removed |
| **Routes** | None. `/users/:userId/edit` was removed in #285 |
| **Roles** | n/a |
| **Domain rules** | n/a |
| **Design reference** | n/a |
| **Last reviewed against code** | #285 |

## Purpose

Let an administrator correct another user's personal details. This document covered only the rule
#192 introduced on the edit screen.

The users screens (`/users`, `/users/new`, `/users/:userId/edit`) were removed in #285, so the
platform admin no longer reads other users' personal data. Platform admins are now managed on
`/platform-admins` (`platform-admins.md`). The rule below stays as a tombstone so its ID is not
reused.

## Rules

### UI-USR-001 — A user with no partner number cannot be saved from the edit screen

- **Status:** Removed (#285: the edit screen no longer exists)
- **Rule:**
  - When the loaded account has no `number` (`null`), the edit screen MUST show visible text saying
    that the user has no partner number and that their details cannot be saved from here.
  - In that state, the save MUST be disabled and MUST NOT send a request.
- **Rationale:** The account read may answer `number: null`, but the update requires a number, and
  the edit form has no field for it. Any save would be refused, so the screen says why instead of
  offering one.
- **Implements:** n/a
- **Source:** #192; removed in #285

## States

None: the screen was removed in #285.

## Accepted exceptions

None.
