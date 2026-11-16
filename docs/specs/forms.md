# UI spec document — Forms

| | |
| --- | --- |
| **Prefix** | `UI-FRM` |
| **Status** | Active |
| **Routes** | `/supply-points`, `/plants`, `/plants/:plantId`, `/communities`, `/platform`, `/members` (the supply, plant, community, member record and registration forms open in the shared overlay over them), `/profile` |
| **Roles** | Whoever may open each form; this document adds no gate |
| **Domain rules** | `lucoenergia/conluz`: API-003, API-004 |
| **Design reference** | Design system: `AddressField`, `ReadOnlyField` (forms group) |
| **Last reviewed against code** | #416 |

<!-- Domain rules are cited by ID; the prefix registry in lucoenergia/conluz → docs/specs/README.md maps each prefix to its file. -->

## Purpose

Let a user type, read and check a whole address before saving it, on a phone as on a desktop, in
every record form that asks for one. Let a user tell at a glance a value they can change from one
they cannot. This document covers only the rules #411 introduced, on the address input, and #416,
on values that can never be edited from their screen; where a refused save is shown is
[`api-errors.md`](api-errors.md)'s (UI-ERR-007).

## Rules

### UI-FRM-001 — An address takes up to 250 characters

- **Status:** Active
- **Rule:** Every address input in the supply, plant, community, member record and profile forms
  MUST accept up to 250 characters and MUST refuse more, through one shared constant.
- **Rationale:** 250 is the limit the API publishes for every address. One constant keeps the forms
  from drifting apart again: the supply form cut an address at 50 characters and the plant form at
  100, without a word, while the others let through what the backend then refused.
- **Implements:** API-004
- **Source:** #411, lucoenergia/conluz#574

### UI-FRM-002 — An address grows to show itself, and stays one line

- **Status:** Active
- **Rule:** An address input MUST grow from one to four visible lines to show its value, and MUST
  keep the value single-line: Enter never inserts a line break and entered line breaks become a
  space.
- **Rationale:** Most use is on a phone, where a one-line input shows an address only a piece at a
  time, so it cannot be checked before saving. Enter keeps submitting the form, as it did in the
  one-line input, and the stored address keeps its one-line shape whatever way it was entered
  (typed, pasted, dropped or autofilled).
- **Implements:** n/a
- **Source:** #411

### UI-FRM-003 — A value that can never be edited looks locked

- **Status:** Active
- **Rule:**
  - An input whose value can never be edited from its screen MUST use the shared read-only
    presentation: a grey fill, the value at full contrast, no hover or focus border highlight, and
    no text caret. It keeps its label and any helper text.
  - It MUST remain keyboard-focusable, with a visible focus indication that is not the editable
    inputs' border highlight, and its value MUST NOT change; it can be selected and copied.
  - Inputs read-only only while a save is in flight (UI-OVL-002) MUST NOT use it.
  - Today: the supply edit form's "Propietario" (UI-SUP-005), the member record's "DNI/NIE" and the
    profile's "Nombre completo" and "DNI/NIF".
- **Rationale:** A locked value must look locked: these inputs looked editable, took a caret and
  highlighted their border, so a user tried to change them and got no feedback. The value stays at
  full contrast, never the disabled style, because most use is on a phone, often outdoors. It stays
  focusable so keyboard and screen-reader users still reach its label and value. The in-flight state
  is transient and must not repaint the form on every save.
- **Implements:** n/a
- **Source:** #416

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Empty or short address | One line, at the height of the other inputs | Type; Enter submits the form |
| Long address | Up to four lines, then it scrolls | The same |
| Save in flight (overlay forms) | The same, read-only (UI-OVL-002), in the editable look | None |
| A value never editable from its screen | The read-only presentation, with its label and any helper text (UI-FRM-003) | Focus it, select and copy its value |
| Refused for its length | The refusal on the address input in the overlay forms, where the profile shows errors on its own page (UI-ERR-007, UI-PRF-004) | Edit the address, which clears an error on it |

## Accepted exceptions

None.
