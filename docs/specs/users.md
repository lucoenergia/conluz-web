# UI spec document — Users

| | |
| --- | --- |
| **Prefix** | `UI-USR` |
| **Status** | Active |
| **Routes** | `/users/:userId/edit` |
| **Roles** | A caller whose target account carries `canEdit` |
| **Domain rules** | n/a |
| **Design reference** | n/a |
| **Last reviewed against code** | #192 |

## Purpose

Let an administrator correct another user's personal details. This document covers only the rule
#192 introduced on the edit screen; the rest of the users screens are not covered yet.

## Rules

### UI-USR-001 — A user with no partner number cannot be saved from the edit screen

- **Status:** Active
- **Rule:**
  - When the loaded account has no `number` (`null`), the edit screen MUST show visible text saying
    that the user has no partner number and that their details cannot be saved from here.
  - In that state, the save MUST be disabled and MUST NOT send a request.
- **Rationale:** The account read may answer `number: null`, but the update requires a number, and
  the edit form has no field for it. Any save would be refused, so the screen says why instead of
  offering one.
- **Implements:** n/a
- **Source:** #192

## States

The edit screen only.

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | A spinner | None |
| Load failed | An error message | None |
| Editable | The form | Guardar cambios |
| No partner number | The form and a warning naming the missing number | None |

## Accepted exceptions

None.
