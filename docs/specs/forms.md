# UI spec document — Forms

| | |
| --- | --- |
| **Prefix** | `UI-FRM` |
| **Status** | Active |
| **Routes** | `/supply-points`, `/plants`, `/plants/:plantId`, `/communities`, `/platform`, `/members` (the supply, plant, community, member record and registration forms open in the shared overlay over them), `/profile`; for UI-FRM-004, every screen with an input field |
| **Roles** | Whoever may open each form; this document adds no gate |
| **Domain rules** | `lucoenergia/conluz`: API-003, API-004 |
| **Design reference** | Design system: `AddressField`, `ReadOnlyField` (forms group); the theme's field outline (`src/theme/fieldOutline.ts`) |
| **Last reviewed against code** | #432 |

<!-- Domain rules are cited by ID; the prefix registry in lucoenergia/conluz → docs/specs/README.md maps each prefix to its file. -->

## Purpose

Let a user type, read and check a whole address before saving it, on a phone as on a desktop, in
every record form that asks for one. Let a user tell at a glance a value they can change from one
they cannot. Let a user find every editable field's edge, on a phone outdoors as on a desktop. This document
covers only the rules #411 introduced, on the address input, #416 and #431, on values that can never
be edited from their screen, and #432, on the outline every input field shares; where a refused save
is shown is
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
    presentation: a filled field with its label inside, no outline border or underline, a grey fill
    that does not change on hover or focus, the value at full contrast, the label at 4.5:1 or more
    on the fill, and no text caret. It keeps any helper text.
  - It MUST remain keyboard-focusable, with an inset focus ring that is not the editable inputs'
    highlight, and its value MUST NOT change; it can be selected and copied.
  - Inputs read-only only while a save is in flight (UI-OVL-002) MUST NOT use it.
  - Today: the supply edit form's "Propietario" (UI-SUP-005), the member record's "DNI/NIE", the
    profile's "Nombre completo" and "DNI/NIF", and the supply transfer dialog's "Titular actual".
- **Rationale:** A locked value must look locked: these inputs looked editable, took a caret and
  highlighted their border, so a user tried to change them and got no feedback. The value stays at
  full contrast, never the disabled style, because most use is on a phone, often outdoors. It stays
  focusable so keyboard and screen-reader users still reach its label and value. The in-flight state
  is transient and must not repaint the form on every save. The outlined variant floated the label
  over a filled notch, which gave it low contrast at rest and let the focus ring strike through it.
  A filled field removes the notch, and it differs from editable inputs by shape, not only by
  colour.
- **Implements:** n/a
- **Source:** #416; #431 (filled variant, label inside)

### UI-FRM-004 — Every input field has an accessible outline, the same for every kind of field

- **Status:** Active
- **Rule:** Every enabled input field, text, select, autocomplete and date fields alike, MUST have
  an outline with at least 3:1 contrast against both the field fill and the page background, and
  the same outline, fill and states across field kinds, through the theme; disabled inputs are
  exempt.
  - The values are defined once and read by every field: the outline, the white fill, and the hover,
    focus and error states. A field drawn by hand, such as the search bar or an outlined button
    standing in for a field (a selector's sheet trigger, a range picker's day readout), takes the
    same values.
  - A value that can never be edited keeps its read-only presentation (UI-FRM-003).
- **Rationale:** WCAG 1.4.11 asks 3:1 of a control's boundary, and MUI's default outline is well
  below it. About 90 % of use is on a phone, often outdoors, where a faint edge disappears. One look
  for every field, a date included, means no field reads as a different kind of control.
- **Implements:** n/a
- **Source:** #432

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Empty or short address | One line, at the height of the other inputs | Type; Enter submits the form |
| Long address | Up to four lines, then it scrolls | The same |
| Save in flight (overlay forms) | The same, read-only (UI-OVL-002), in the editable look | None |
| An editable field, enabled | The shared outline on a white fill; hover, focus and error change the outline (UI-FRM-004) | Type, pick |
| An editable field, disabled | MUI's disabled look, exempt from UI-FRM-004 | — |
| A value never editable from its screen | The read-only presentation: a filled field with its label inside and any helper text below (UI-FRM-003) | Focus it, select and copy its value |
| Refused for its length | The refusal on the address input in the overlay forms, where the profile shows errors on its own page (UI-ERR-007, UI-PRF-004) | Edit the address, which clears an error on it |

## Accepted exceptions

None.
