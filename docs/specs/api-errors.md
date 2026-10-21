# UI spec document — API errors

| | |
| --- | --- |
| **Prefix** | `UI-ERR` |
| **Status** | Active |
| **Routes** | Every screen that shows the message of an API error detail |
| **Roles** | Any caller |
| **Domain rules** | n/a |
| **Design reference** | n/a |
| **Last reviewed against code** | #232 |

## Purpose

Tell the user why a request was refused in the app's own words and register, and where they can fix
it. The catalogue in `src/errors/apiErrorCatalogue.ts` holds the app's text for each error code it
maps; the server's message is only the fallback for the codes it does not.

These rules apply across screens. A screen rule that words a code its own way (for example
UI-MBR-023 for the member import rows) is more specific and takes precedence.

This document covers only the rules #232 introduced.

## Rules

### UI-ERR-001 — A code in the catalogue is shown with the catalogue's text

- **Status:** Active
- **Rule:** When the UI shows the message of an API error detail whose code has a catalogue entry, it
  MUST show the catalogue's text and MUST NOT show the server's message.
- **Rationale:** The app owns its wording and register; the server's text is a fallback, not copy.
- **Implements:** n/a
- **Source:** #232

### UI-ERR-002 — A code about one input is shown on that input

- **Status:** Active
- **Rule:** When such a code refers to exactly one input of the form that sent the request — the
  input the code names, or the one named by its `field` param — the UI MUST show the message as an
  error on that input and MUST keep every value the user typed.
- **Rationale:** The user must see what to fix where they fix it, without retyping.
- **Implements:** n/a
- **Source:** #232

### UI-ERR-003 — A code outside the catalogue is shown with the server's message

- **Status:** Active
- **Rule:** When the UI shows the message of an API error detail whose code has no catalogue entry,
  it MUST show the server's message.
- **Rationale:** Documents the fallback that unmapped codes rely on.
- **Implements:** n/a
- **Source:** #232

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Error, code in the catalogue | The catalogue's text, where the screen shows errors, or on the input the code refers to | Correct the input and send again |
| Error, code not in the catalogue | The server's message, where the screen shows errors | Send again |
