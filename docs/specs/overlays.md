# UI spec document — Overlays

| | |
| --- | --- |
| **Prefix** | `UI-OVL` |
| **Status** | Active |
| **Routes** | Every route whose page opens a create, edit, action or confirmation flow; on the overlay today: `/community/contact` (the contact channel editor), `/members` (the investment editor and its removal confirmation, #358) |
| **Roles** | Whoever may start the flow; the overlay adds no rule of its own |
| **Domain rules** | `lucoenergia/conluz`: none |
| **Design reference** | Design system: `ContactChannelEditor` (dialogs), the reference the overlay was taken from |
| **Last reviewed against code** | #368 |

<!-- Domain rules are cited by ID; the prefix registry in lucoenergia/conluz → docs/specs/README.md maps each prefix to its file. -->

## Purpose

Let somebody create, edit, act on or confirm something without leaving the page it belongs to, and
without losing what they typed. On a phone, where most use happens, the flow is a bottom sheet
dismissed the way phones dismiss things: a swipe, or back. On a wider screen it is a centred dialog.
Either way it behaves the same: it cannot close under a request in flight, it asks before discarding
changes, and back closes it rather than the page.

## Rules

### UI-OVL-001 — One overlay, a dialog or a bottom sheet

- **Status:** Active
- **Rule:** Every create, edit, action and confirmation flow MUST render in the shared overlay: a
  centred dialog from the `md` breakpoint up, a full-width bottom sheet below it. The dialog is the
  `form` size for a form, and the `compact` size for a confirmation or a short action.
- **Rationale:** One pattern across the app, switching at one breakpoint, the one the contact editor
  already used. Before, overlays switched at three different widths, and most stayed centred on a
  phone. A confirmation in the form size renders as a mostly empty box, hence the second size. The
  sizes' values live in `ResponsiveOverlay`, not here.
- **Implements:** n/a
- **Source:** #368

### UI-OVL-002 — Nothing closes it while a write is in flight

- **Status:** Active
- **Rule:** While a write is in flight, the overlay MUST NOT close by any means (Escape, the
  backdrop, a swipe, the close icon, Cancelar, back), and its inputs MUST be read-only.
- **Rationale:** Closing under a request the user started loses track of it: its result, or its
  refusal, would land on a screen that no longer shows what was sent. The close icon is not offered
  while the write is in flight.
- **Implements:** n/a
- **Source:** #368

### UI-OVL-003 — Unsaved changes are asked about, in the footer

- **Status:** Active
- **Rule:** A close attempt with unsaved changes MUST ask first, inline in the footer: "Seguir
  editando" keeps the overlay and the input and returns focus to the last focused control, and
  "Descartar cambios" closes it. Without changes, a close attempt MUST close directly.
- **Rationale:** No silent loss of input, and no needless prompt. The question replaces the footer
  rather than opening a second dialog, so it is answered where the user already is. Typing again
  withdraws it.
- **Implements:** n/a
- **Source:** #368

### UI-OVL-004 — Back closes the overlay, not the page

- **Status:** Active
- **Rule:** Browser or system back MUST close the open overlay, subject to UI-OVL-003, instead of
  leaving the page, and the page underneath MUST stay as it was. Closing the overlay by other means
  MUST leave no extra history step. With several overlays stacked, each back press MUST close the
  top one only.
- **Rationale:** Back is the usual way to dismiss a sheet on a phone, and it used to leave the page
  and discard the input with no question. An overlay that kept its history step after closing would
  make the next back do nothing visible. A flow that leaves the page as it closes lands where it
  goes, and one back returns to the page the overlay was opened on.
- **Implements:** n/a
- **Source:** #368

### UI-OVL-005 — Leaving the page with changes prompts

- **Status:** Active
- **Rule:** A reload or a tab close while an open overlay has unsaved changes MUST trigger the
  browser's leave-page prompt. Without changes, or with the overlay closed, it MUST NOT.
- **Rationale:** It covers the exits UI-OVL-003 cannot intercept.
- **Implements:** n/a
- **Source:** #368

### UI-OVL-006 — A modal dialog, named by its title

- **Status:** Active
- **Rule:** The overlay MUST trap focus, be a modal dialog named by its title, and return focus to
  the control that opened it on close. Its close icon and the footer's buttons MUST be touch-sized
  targets.
- **Rationale:** Screen-reader users must know where they are and get back where they were;
  keyboard users must not tab out into a page they cannot see. The sheet is a drawer underneath, so
  it carries the dialog role and modality itself.
- **Implements:** n/a
- **Source:** #368

### UI-OVL-007 — In the sheet, only the body scrolls

- **Status:** Active
- **Rule:** In the bottom sheet, the header and the footer MUST stay fixed; only the body scrolls.
- **Rationale:** On a long form the title and the actions stay reachable, and the save button is
  never scrolled away.
- **Implements:** n/a
- **Source:** #368

### UI-OVL-008 — Nothing new bypasses the overlay

- **Status:** Active
- **Rule:** New code MUST NOT import MUI's overlay primitives (`Dialog`, `Modal`, `Drawer`,
  `SwipeableDrawer`) outside the shared overlay, nor add a route for a create or edit flow (a path
  ending in `new` or `edit`). Every exception MUST be listed in its allowlist with its reason or the
  issue that removes it.
- **Rationale:** It keeps UI-OVL-001 true while the existing flows are migrated, and after. An
  exception without a reason or an issue would never be removed. The lint rule and the route
  contract test enforce it; a type-only import of a props type is allowed.
- **Implements:** n/a
- **Source:** #368

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Open, no changes | Header with the title, the scrolling body, the footer with the flow's own controls; focus trapped (UI-OVL-001, UI-OVL-006, UI-OVL-007) | The flow's controls; close directly by any means, back included |
| Open, with changes | The same; a close attempt, back included, replaces the footer with the unsaved-changes question (UI-OVL-003, UI-OVL-004) | Keep editing, discard |
| Write in flight | The same, read-only, with no close icon (UI-OVL-002) | None that closes it |
| Stacked | Each overlay above the previous one | Back closes the top one only (UI-OVL-004) |

## Accepted exceptions

| Exception | Reason | Expires when | Source |
| --- | --- | --- | --- |
| The side menu, `CoefficientHistoryDrawer`, and the historical-analysis supply, period and range pickers keep MUI's primitives | The navigation drawer, a read-only side panel and pickers are not create, edit, action or confirmation flows | Never; listed as permanent in the allowlist | #368 |
| The flows not migrated yet keep MUI's primitives | The migration is split per flow | The issue named next to each allowlist entry closes (#369, #370, #371) | #368 |
| The supply, plant and community create and edit pages keep their routes | They become overlays in their own issues | #372, #373 and #374 close | #368 |
| A reload while an overlay is open leaves one inert history step, costing one extra back press | The history step that lets back close the overlay cannot be removed by a page that has reloaded | Never; browsers offer no way to remove a history entry | #368 |
