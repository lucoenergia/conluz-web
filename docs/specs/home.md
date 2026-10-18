# UI spec document — Home

| | |
| --- | --- |
| **Prefix** | `UI-HOM` |
| **Status** | Active |
| **Routes** | `/home/member`, `/home/management` |
| **Roles** | A caller to whom the view is open (`useHomeViews`) |
| **Domain rules** | n/a |
| **Design reference** | n/a |
| **Last reviewed against code** | #280 |

Scope: the rules introduced in #280 for home states migrated from visual tests to Vitest. Not
exhaustive: other home behaviour is not yet specified here.

## Purpose

Show a member what the community's energy did for them in the latest month the distributor has
published, how that compares with the month before and with their history, and when to use
electricity; and show a community admin where the community stands in setting itself up. Neither
view may present a missing figure as a zero or a normal setup stage as a failure.

## Rules

### UI-HOM-001 — The estimate label follows the price each response carries

- **Status:** Active
- **Rule:** A figure whose own response carries an estimated price MUST show "Estimado con un precio
  de …" beside it; a figure whose response carries none MUST show no estimate wording.
- **Rationale:** A member priced with their contracted tariff must not read their savings as an
  approximation, and one card's price is never inferred from another's.
- **Implements:** n/a
- **Source:** #280

### UI-HOM-002 — A payback with nothing recovered yet says so in its sentence

- **Status:** Active
- **Rule:** When an investment is recorded and none of it is recovered yet, the payback card MUST
  show no large figure and MUST say "Has recuperado el 0 % de tu inversión de …" in its sentence.
- **Rationale:** A large "0 %" reads as a failure, while a new member has simply not started.
- **Implements:** n/a
- **Source:** #280

### UI-HOM-003 — Each compared figure states its direction in words and with an arrow

- **Status:** Active
- **Rule:** Each figure compared with the month before MUST state its change as an amount followed by
  "más" or "menos" (in euros for savings, in percentage points for the two shares), beside an upward
  arrow for a rise and a downward arrow for a fall.
- **Rationale:** The words carry the direction for a screen reader and the arrow for a glance;
  percentage points stop a change in a share reading as a relative rise. Neither direction is
  styled as good or bad: the comparison reports, it does not judge.
- **Implements:** n/a
- **Source:** #280

### UI-HOM-004 — A comparison with an incomplete month says it is affected

- **Status:** Active
- **Rule:** When either month is incomplete but the comparison can still be made, the comparison MUST
  still show its figures and MUST say "La comparación está afectada: faltan datos de <mes> …", naming
  the incomplete month.
- **Rationale:** Missing hours change the figures; the member is told that part of the change may
  come from the data that is missing, rather than losing the comparison.
- **Implements:** n/a
- **Source:** #280

### UI-HOM-005 — The twelve-month series says how many months carry data

- **Status:** Active
- **Rule:** The twelve-month block MUST give each month of the range its own slot, show a month with
  nothing stored as "Sin datos" and never as zero, and say how many of the twelve carry data ("<n> de
  12 meses con datos.").
- **Rationale:** A member with a short history must see a short history, not a year of zero savings.
- **Implements:** n/a
- **Source:** #280

### UI-HOM-006 — The best hours are named only when they can be worked out

- **Status:** Active
- **Rule:**
  - When the month has gaps, the lead MUST read "Mejores horas: no se pueden calcular, porque faltan
    datos de este mes." and no hour is shaded.
  - When the month is complete and no hour received assigned energy, the lead MUST read "Mejores
    horas: este mes no te llegó energía de la comunidad en ninguna hora." and no hour is shaded.
- **Rationale:** Hours ranked on incomplete data would point the member at the wrong hours; no
  energy in any hour is a fact about the energy, not a calculation that failed.
- **Implements:** n/a
- **Source:** #280

### UI-HOM-007 — A block with nothing to show is replaced by a neutral notice

- **Status:** Active
- **Rule:**
  - When no month in the range has anything stored, the twelve-month block MUST be replaced by the
    neutral notice "Todavía no hay meses que mostrar".
  - When no month resolves, the best-hours block MUST be replaced by the neutral notice "Todavía no
    hay horas que mostrar".
- **Rationale:** An empty chart reads as zero energy. Nothing stored yet is normal for a new member,
  so it is explained, never raised as an alert.
- **Implements:** n/a
- **Source:** #280

### UI-HOM-008 — The view switch shows only to a caller with both views

- **Status:** Active
- **Rule:** The "Tu energía" / "Gestión" switch MUST render only for a caller to whom both home views
  are open, with the tab of the view on screen selected; a caller with one view MUST get no switch.
- **Rationale:** A switch with one destination offers nothing, and the selected tab tells the caller
  which view they are on.
- **Implements:** n/a
- **Source:** #280

### UI-HOM-009 — The management view explains a missing plant or agreement without an alert

- **Status:** Active
- **Rule:**
  - A community with no plant MUST show "La comunidad todavía no tiene plantas" in the agreements
    card.
  - A plant with no agreement MUST show "Todavía no tiene acuerdo de reparto." in its row.
  - Neither case MUST raise an alert.
- **Rationale:** Both are stages of setting a community up, not failures.
- **Implements:** n/a
- **Source:** #280

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Normal | Every block, each priced as its response says (UI-HOM-001), the comparison with its directions (UI-HOM-003) | The view switch, for a caller with both views (UI-HOM-008) |
| Nothing resolved yet | The payback sentence without a large figure (UI-HOM-002); neutral notices in place of empty blocks (UI-HOM-007) | — |
| Incomplete month | The comparison said to be affected (UI-HOM-004); no best hours named (UI-HOM-006) | — |
| Management setup | No plant, or a plant without an agreement, explained without an alert (UI-HOM-009) | — |

## Accepted exceptions

None.
