# UI spec document — Plant detail

| | |
| --- | --- |
| **Prefix** | `UI-PLT` |
| **Status** | Active |
| **Routes** | `/plants/:plantId`; `/plants` for the plant deletion (UI-PLT-008, UI-PLT-009, UI-PLT-014) |
| **Roles** | Community admin only: the plant's `canManage` (UI-PLT-010). Agreements: also the plant's `canListSharingAgreements` |
| **Domain rules** | `lucoenergia/conluz`: PLT-001 (UI-PLT-008) |
| **Design reference** | Claude Design canvas "Conluz · Energía de la comunidad y detalle de planta", revision 5: artboards `Planta-Movil`, `Planta-Escritorio`, `Planta-Estados`, `Planta-Hoy-Estados`, `CompHoy`, `CompPeriodo`, `CompGrafico` |
| **Last reviewed against code** | #406 |

## Purpose

Show a community admin what a plant produced: today, according to its inverter, and over a period,
as the distributor measured it. Tell them what state its sharing agreements and its Huawei
integration are in, without scrolling past the production blocks on a phone.

This document covers only the rules #260, #290, #311, #349 and #406 introduced. The integrations section keeps the rules in
[`integrations.md`](integrations.md) (UI-INT-005 to UI-INT-010), and the figures and chart labels
keep those in [`formatting.md`](formatting.md).

## Rules

### UI-PLT-001 — Production is the plant's own

- **Status:** Removed in #406 (the detail no longer reads the community production operations with
  `supplyId`; its production comes from the plant's own operations, UI-PLT-011 and UI-PLT-012)
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
- **Rationale:** The screen is for the plant's community admins (UI-PLT-010), but each block still
  follows the capability the plant reports for it rather than the route's: listing agreements and
  reading the configuration are capabilities of their own, and a block or a read that can only fail
  must not exist. A summary with no rows would be an empty card.
- **Implements:** n/a
- **Source:** #260, #406

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

- **Status:** Removed in #406 (the chart it described is gone; gaps, partial buckets, measured zeros
  and a plant with no production yet are UI-PLT-011's)
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

- **Status:** Removed in #406 (the chart and its period control are gone)
- **Rule:** The production chart's subtitle MUST be Spanish text naming what each bar stands for
  ("Producción por hora", "por día", "por mes", "por año"), never a raw time-range value.
- **Rationale:** The raw value (`Rango: hour`) leaked an internal enum into the Spanish UI.
- **Implements:** n/a
- **Source:** #260

### UI-PLT-008 — A plant that holds the sharing history is kept, and the refusal says so

- **Status:** Active
- **Rule:**
  - A plant deletion refused with `PLANT_HAS_SHARING_AGREEMENTS` or
    `PLANT_HAS_PARTITION_COEFFICIENTS` MUST show its own message: the plant holds the community's
    sharing history and must be kept.
  - That message MUST NOT suggest trying again, and the plant MUST stay in the list.
  - Any other failure keeps the generic message.
- **Rationale:** The backend refuses these deletions for good: the agreements and coefficients are
  the community's records, and a plant cannot be disabled instead. A message inviting a retry
  would send the admin round in circles.
- **Implements:** PLT-001
- **Source:** #290, lucoenergia/conluz#437

### UI-PLT-009 — A deleted plant is confirmed by the page, after its row has gone

- **Status:** Active
- **Rule:**
  - After a successful deletion from the plant list, the page MUST confirm it with a success
    message naming the plant by its name, in guillemets ("Planta «<nombre>» eliminada."), shown
    and announced.
  - The confirmation MUST still be there once the refreshed list no longer shows the plant.
  - A refused deletion MUST NOT show or announce the confirmation.
- **Rationale:** The deletion refreshes the list, and the deleted plant's row leaves it. A
  confirmation mounted in the row would unmount with it, so the success would flash for one round
  trip, or never appear. The page outlives the row, as it outlived the card, and as it does for a
  supply deletion (UI-SUP-003). The provider's station code is a technical join key the row does
  not show; the user knows the plant by its name, and the guillemets keep a name that already
  starts with "Planta" readable.
- **Source:** #311, #349

### UI-PLT-010 — The plant section lives under `/plants`, for community admins only

- **Status:** Active
- **Rule:** The plant section MUST live under `/plants` and MUST be reachable only by a community
  admin. A plant link elsewhere MUST render as plain text for a caller without plant `canManage`.
  `/production` paths MUST NOT redirect.
  - The plant list requires the community's `canManage`; a plant's detail and its agreements, the
    plant's `canManage`. The agreement routes keep their own `canListSharingAgreements` inside it.
  - The menu entry "Plantas" requires the community's `canManage`, as the list does.
  - A community switch on a plant's detail goes to `/plants`.
- **Rationale:** The plant view is operational. Members see plant totals on the community page.
- **Implements:** n/a
- **Source:** #406

### UI-PLT-011 — "Producción por periodo" shows the distributor's production, anchored to the latest production day

- **Status:** Active
- **Rule:** "Producción por periodo" MUST show the plant's distributor production, anchored at the
  latest complete production day, with the presets `LAST_7`, `LAST_30`, `DAY_YEAR` and a custom
  range. It MUST mark gaps, partial buckets and measured zeros from `hoursWithData` /
  `expectedHours`. Under a day anchor every range MUST be labelled by days, and the publication
  sentence MUST name the anchor day without promising a fixed delay.
  - The default preset is `LAST_7`. The period total comes from the plant's metrics for the resolved
    period; a null total reads "Sin datos", never a zero.
  - With no production day yet, the section MUST show a neutral notice ("Todavía no hay datos de la
    distribuidora para esta planta") and no selector.
  - No request is made before the plant is known, and none bound to a period before the period is.
- **Rationale:** It is the energy the plant exported, as the distributor measured it. A whole-month
  label would promise data the period does not hold.
- **Implements:** n/a
- **Source:** #406

### UI-PLT-012 — "Hoy, según el inversor" shows today's inverter production, and keeps it current

- **Status:** Active
- **Rule:** "Hoy, según el inversor" MUST render only when the inverter status is not
  `NOT_AVAILABLE`. It MUST draw the power curve with gaps broken and nothing after now, MUST state
  the stale and no-data states in words, and MUST refetch every 5 minutes while the document is
  visible, pausing while it is hidden.
  - The curve runs over the local day on the instant line, from today's midnight to tomorrow's in
    the app's time zone, so a day the clocks change lasts 23 or 25 hours; its "Ahora" mark is at
    now, and a gap is covered by a "Sin datos" band.
  - The "Ahora" mark reads now's time and the latest snapshot's power ("Ahora · 14:00 · 44,99 kW").
    It reads the time alone when that snapshot is a gap, or while the data is stale: an hour-old
    power is not now's.
  - The block also refetches when the page regains focus, and after a change to the plant's Huawei
    configuration.
- **Rationale:** Inverter data is separate from, and may differ from, the distributor's. Without
  refetching, its update time and stale state freeze.
- **Implements:** n/a
- **Source:** #406

### UI-PLT-013 — Production is gold, and gold is never text

- **Status:** Active
- **Rule:** Production on the plant detail MUST use `ENERGY_COLORS.assigned`. `marks.gold` MUST
  NOT be used for text.
  - Figures stay in the text colour, with a gold swatch beside them; the "Ahora" mark uses
    `brand.main`.
- **Rationale:** One colour per metric across pages.
- **Implements:** n/a
- **Source:** #406

### UI-PLT-014 — Editing and deleting a plant open from its detail's menu

- **Status:** Active
- **Rule:**
  - The detail's header MUST offer "Editar planta" and "Eliminar planta" in its menu, each only when
    the plant grants that action; with neither, there is no menu.
  - "Editar planta" MUST open the plant form over the detail, and return focus to the menu's button
    when it closes.
  - Once a plant deleted from its detail is gone (deleted now, or already, a `404`), the screen MUST
    go to `/plants`, replacing the detail's history entry. A refused deletion stays on the detail and
    says why (UI-PLT-008).
- **Rationale:** An admin looking at a plant should not have to go back to the list to change it.
  The menu follows the supply detail's. A deleted plant leaves nothing to show, and a back that
  landed on it would show a plant that is gone.
- **Implements:** n/a
- **Source:** #406

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Inverter not available (no enabled Huawei configuration) | No "Hoy, según el inversor" block (UI-PLT-012) | — |
| No inverter data today | "Sin datos del inversor hoy", no figure, no chart | — |
| Inverter producing | Today's energy, the power curve, "Actualizado a las HH:mm" | — |
| Inverter not producing yet | Today's energy at 0, the curve flat at 0, "Todavía no ha empezado a producir hoy" | — |
| Inverter stale | A neutral note saying nothing new arrived for more than an hour; no "Actualizado" line | — |
| Inverter day with a gap | The line broken under a "Sin datos" band, and a note naming the stretch | — |
| Inverter read failed | The block's error | Retry |
| No production day from the distributor | A neutral notice, no selector (UI-PLT-011) | — |
| Period loading | Placeholders in place of the total and the chart | Period selector |
| Period total or series read failed | That part's error | Retry; period selector |
| Integration not configured or disabled (normal) | Neutral status in the summary, "Siguiente paso" at the top | The summary row and the card's action, both scroll to the integrations section |
| Configuration read failed (not `404`) | No integration status, no "Siguiente paso"; the integrations section shows its error (UI-INT-007) | Retry in the integrations section |
| Agreements read failed | No agreements status; the section shows an error | Retry |
