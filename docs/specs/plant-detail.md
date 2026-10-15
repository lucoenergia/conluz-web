# UI spec document — Plant detail

| | |
| --- | --- |
| **Prefix** | `UI-PLT` |
| **Status** | Active |
| **Routes** | `/production/:plantId` |
| **Roles** | Any member of the plant's community (the plant's `canRead`). Agreements: a caller with the plant's `canListSharingAgreements`. Integration and "Siguiente paso": a caller with the plant's `canManage` |
| **Domain rules** | n/a |
| **Design reference** | Claude Design canvas "Conluz · Detalle de planta"; visual language of the member home ("Tu energía") |
| **Last reviewed against code** | #260 |

## Purpose

Show a plant's own production, and tell whoever may act on the plant what state its sharing
agreements and its Huawei integration are in, without scrolling past the production block on a
phone.

This document covers only the rules #260 introduced. The integrations section keeps the rules in
[`integrations.md`](integrations.md) (UI-INT-005 to UI-INT-010), and the figures and chart labels
keep those in [`formatting.md`](formatting.md).

## Rules

### UI-PLT-001 — Production is the plant's own

- **Status:** Active
- **Rule:**
  - Every production request of the plant detail MUST carry the plant's `supply.id` as `supplyId`:
    the requests for the selected period and those for the period before it alike.
  - No production request may be issued before the plant, and so its supply, is known.
- **Rationale:** The contract has no plant-level production endpoint, only the community's, which
  answers for every plant of the community unless filtered by supply. A supply backs at most one
  plant, so the filtered answer is the plant's own production. Without the filter the screen showed
  the community's production as if it were the plant's. A request issued before the plant loads
  could only be the unfiltered one.
- **Implements:** n/a
- **Source:** #260

### UI-PLT-002 — Each block renders, and reads, only for a caller who may see it

- **Status:** Active
- **Rule:**
  - The agreements row of the summary and the agreements section MUST render only when the plant's
    `capabilities.canListSharingAgreements` is `true`.
  - The integration row of the summary, the integrations section and "Siguiente paso" MUST render
    only when the plant's `capabilities.canManage` is `true`.
  - The screen MUST NOT read the plant's agreements without `canListSharingAgreements`, nor its
    Huawei configuration without `canManage`.
  - The "En esta planta" summary MUST NOT render when it has no rows.
- **Rationale:** Members and community admins share this screen. Listing agreements needs admin
  rights, and reading the configuration needs what writing it needs (UI-INT-006), so for a member
  both reads are guaranteed to fail; a block or a read that can only fail must not exist. A summary
  with no rows would be an empty card.
- **Implements:** n/a
- **Source:** #260

### UI-PLT-003 — The summary states each section's status and leads to it

- **Status:** Active
- **Rule:**
  - The agreements row MUST count the agreements in force (`PUBLISHED`) and in draft (`DRAFT`),
    MUST NOT count superseded ones, and with none in force or in draft MUST say so in words, never
    as a count of zero.
  - The integration row MUST say whether the integration is active, disabled or not configured
    (the read answers `404`).
  - A read that is loading, or that failed with anything other than `404`, MUST NOT be summarised as
    a status.
  - Each row MUST scroll to its section, clear of the app bar, and move focus to the section's
    heading.
  - The agreements section MUST list the agreements in force, then those in draft, each linking to
    its detail, plus a link to the full list, and MUST show an empty state when there are none.
- **Rationale:** About 90% of use is on a phone, where sections below the production block are
  otherwise never seen. Superseded agreements are history and say nothing about the plant today. A
  zero reads like a figure to act on, when it means there is nothing to show. A failed read says
  nothing about what is stored, so it claims nothing, as UI-INT-007 does. Moving focus to the heading
  lands a keyboard or screen-reader user where the page scrolled to.
- **Implements:** n/a
- **Source:** #260

### UI-PLT-004 — "Siguiente paso" shows while the integration needs a step

- **Status:** Active
- **Rule:**
  - "Siguiente paso" MUST show at the top of the screen while the configuration read answers `404`,
    offering to configure the integration.
  - It MUST show while the configuration is disabled (`enabled: false`), offering to activate it.
  - It MUST NOT show while the integration is enabled, while the read is loading, or when the read
    failed with anything other than `404`.
  - Its action MUST only scroll to the integrations section and move focus to its heading; it MUST
    NOT configure, enable or disable anything.
- **Rationale:** A configuration is created disabled (UI-INT-008), so "disabled" is the normal state
  right after setup, and showing the card only for "not configured" would stall the setup at its
  last step. Activating from the card would skip UI-INT-009's confirmation, which is why the card
  only leads to the switch.
- **Implements:** n/a
- **Source:** #260

### UI-PLT-005 — A period without production shows an empty state, not a zero

- **Status:** Active
- **Rule:**
  - When no row of the selected period carries a `power` value (no rows, or rows without one), the
    screen MUST show an empty state, and MUST NOT show a zero figure or an empty chart. A row whose
    `power` is `0` is a measured zero and is shown.
  - While the period is loading, or when its read failed, the screen MUST NOT show that empty state.
  - For a caller with the plant's `canManage` and an integration that is not configured or disabled,
    the empty state MUST point to the integration.
  - For any other caller, the empty state MUST NOT mention configuration.
- **Rationale:** A zero reads as "the plant produced nothing", which is false when the data never
  arrived. The contract does not say how an empty period is answered, so both shapes count as none,
  while a measured zero stays a figure. A failure or a pending read is not an absence of data. A
  member cannot configure the integration and cannot see its state, so pointing them to it would be a
  dead end.
- **Implements:** n/a
- **Source:** #260

### UI-PLT-006 — Setup states use neutral styling

- **Status:** Active
- **Rule:** "Sin configurar" and "Desactivada" MUST use neutral styling, never alert colour.
- **Rationale:** An integration that is not set up yet, or not switched on yet, is a normal state of
  a plant, not a failure. Alert colour is reserved for failures.
- **Implements:** n/a
- **Source:** #260

### UI-PLT-007 — The chart subtitle is localised text

- **Status:** Active
- **Rule:** The production chart's subtitle MUST be Spanish text naming what each bar stands for
  ("Producción por hora", "por día", "por mes", "por año"), never a raw time-range value.
- **Rationale:** The raw value (`Rango: hour`) leaked an internal enum into the Spanish UI.
- **Implements:** n/a
- **Source:** #260

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading (production) | A placeholder card in place of the figure and chart | Period control |
| Empty period | An empty state, no figure, no chart (UI-PLT-005) | Period control; "Ir a integraciones" for an admin whose integration needs a step |
| Integration not configured or disabled (normal) | Neutral status in the summary, "Siguiente paso" at the top | The summary row and the card's action, both scroll to the integrations section |
| Configuration read failed (not `404`) | No integration status, no "Siguiente paso"; the integrations section shows its error (UI-INT-007) | Retry in the integrations section |
| Agreements read failed | No agreements status; the section shows an error | Retry |
| Production read failed | The generic error feedback; no figure, no chart, no empty state | Period control |
