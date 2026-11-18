# UI spec document — Datos de hoy

| | |
| --- | --- |
| **Prefix** | `UI-TDY` |
| **Status** | Active |
| **Routes** | `/today`, `/today?supplyId=<id>`; the "Ver datos de hoy" action on `/supply-points/:supplyPointId` |
| **Roles** | A caller who may read the active community (`canRead`): members and community admins. The admin view: a caller the active community grants `canManage`, on a supply that reports `canRead` |
| **Domain rules** | n/a (the data is `getSupplyEnergyToday`, lucoenergia/conluz#595) |
| **Design reference** | Claude Design canvas "Datos de hoy", alternative 1 "Nodos", final artboards |
| **Last reviewed against code** | #432 |

## Purpose

Let a member see that their community's plant is producing today, and how much of it reaches one of
their supply points right now and so far today, without waiting for the distributor's monthly data.
A community admin can look at any supply of the community the same way, from its detail page.

## Rules

### UI-TDY-001 — The community menu leads here right above "Mi consumo y ahorro"

- **Status:** Active
- **Rule:** "Datos de hoy" MUST be a menu entry directly above "Mi consumo y ahorro", route `/today`.
  - It requires the active community's `canRead`, as the route does, so a member with no supply
    point still has it.
  - It stays highlighted in the admin view, which carries a `?supplyId=`.
- **Rationale:** Today's data is the most frequent member check.
- **Implements:** n/a
- **Source:** #432

### UI-TDY-002 — The selector lists the caller's own supplies, without the plant's own

- **Status:** Active
- **Rule:** The selector MUST list only the user's own supply points in the active community,
  excluding plant-backing ones.
  - Each option is named as UI-SUP-010 names a supply. The one in `?supplyId=` is selected, or else
    the first.
  - A caller left with none sees an empty state, not a failure, and no selector.
- **Rationale:** It has the same scope as "Mi consumo y ahorro". A plant's own supply point receives
  no share of the plant's production.
- **Implements:** n/a
- **Source:** #432

### UI-TDY-003 — Another member's supply is reached only from its detail page, in the admin view

- **Status:** Active
- **Rule:** A supply the user does not own MUST be reachable only via "Ver datos de hoy" in
  `SupplyDetailHeader`, MUST NOT appear in the selector and MUST show why it is visible; the action
  MUST NOT be rendered for plant-backing supplies.
  - The action is rendered when the supply reports `canRead` and does not back a plant. It leads to
    `/today?supplyId=<id>`. It is not part of the latest published month's block.
  - A `?supplyId=` that is not one of the caller's own opens the admin view only when it passes
    "Mi consumo y ahorro"'s lookup (UI-HIS-001): the active community's `canManage`, and an enabled
    supply of the active community that reports `canRead`.
  - The admin view replaces the selector with:
    - a breadcrumb;
    - the supply's name (or address) and its CUPS;
    - a notice that the point is not the caller's and is visible because they manage the community;
    - "Volver al punto de suministro".
  - The admin view takes precedence over owning no supply.
  - An unknown, unreadable or plant-backing id is ignored, as if the page had none, without an
    error.
- **Rationale:** Admins inspect any supply without mixing it into their own.
- **Implements:** n/a
- **Source:** #432

### UI-TDY-004 — Every answer has its designed state

- **Status:** Active
- **Rule:** Each `energy-today` status, zero or missing current power, and `stale` MUST map to its
  designed state; stale data MUST use a neutral Notice.
  - A current power of 0 says the plant is not producing. A missing one says there is no data from
    the plant right now. Neither is "not producing" for the other.
  - Both draw the conduit dashed and show no "Te llega ahora" figure. The curve's "Ahora" mark reads
    0 kW for the first and no power for the second.
  - Stale data reads "a las {hh:mm}" in the current values, and the curve's mark reads no power.
  - The status sentence is a polite live region. The hero repeats its values and is hidden from
    assistive technology.
  - Skeletons show only on the first load. A failed first load shows the error with "Reintentar". A
    later poll that fails keeps the last answer on screen.
- **Rationale:** Alert colouring is reserved for failures; missing data is not "not producing".
- **Implements:** n/a
- **Source:** #432

### UI-TDY-005 — Inverter-derived figures say where they come from

- **Status:** Active
- **Rule:** Inverter-derived figures MUST carry the note that they may differ from the
  distributor's; the β line MUST be hidden when null or 0; plant labels MUST be true for one or
  several plants.
  - The note is shown under the curve in every available state. Its sentence about the curve's gaps
    is added only when the curve has a slot with no value.
  - The β line states the coefficient as a percentage, with at most two decimals.
  - The plant node reads "Producción de la comunidad".
- **Rationale:** It avoids mismatches being read as errors.
- **Implements:** n/a
- **Source:** #432

### UI-TDY-006 — The conduit's thickness is absolute, and its colours are the energy tokens

- **Status:** Active
- **Rule:** Conduit thickness MUST follow the absolute log scale; colours MUST reuse existing metric
  tokens.
  - The scale is the one in the design handoff, implemented once in `conduitThickness`
    (`src/pages/today/todayState.ts`). It depends on the power alone, never on the supply.
  - The flowing conduit, the plant node and the figures' swatches use the assigned-energy mark
    colour. With nothing flowing, the conduit is dashed in the inactive border colour. A plant that
    sends no data is drawn on the neutral surface.
- **Rationale:** The same kW looks the same for every supply.
- **Implements:** n/a
- **Source:** #432

### UI-TDY-007 — The page keeps itself current

- **Status:** Active
- **Rule:** The page MUST refetch every 5 minutes and on focus.
  - It never refetches while the document is hidden, and asks nothing before a supply is selected.
- **Rationale:** It matches the inverter cadence.
- **Implements:** n/a
- **Source:** #432

### UI-TDY-008 — One staleness threshold

- **Status:** Active
- **Rule:** Inverter staleness copy that names a threshold MUST name 15 minutes.
  - "Hoy, según el inversor" on the plant detail says "hace más de 15 minutos" (UI-PLT-012).
- **Rationale:** The 60-minute copy must not survive the backend change to 15 minutes. Copy that names
  only the time of the last data, like the "Datos de hoy" notice, is compliant.
- **Implements:** n/a
- **Source:** #432

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading (first load) | The selector loading; skeletons under the figures' labels and for the curve | — |
| No own supply, no admin target | An empty state, no selector | — |
| Available, power flowing | Hero with a solid conduit, sentence, "Te llega ahora" and today's energy, β line, curve, note | Choose another supply |
| Available, power 0 | Hero with a dashed conduit, "not producing" sentence, today's energy only | Choose another supply |
| Available, no current power | Hero with a dashed conduit, "no data now" sentence, today's energy only | Choose another supply |
| Stale (normal) | A neutral notice with the time of the last data; values read "a las {hh:mm}" | Choose another supply |
| No data today / no coefficient today | Hero waiting, a title and an explanation; the community's contact for no coefficient | Contact link |
| Plant not connected | Hero with the plant greyed, a title and an explanation | — |
| Admin view | Breadcrumb, the supply's block with its notice, no selector | Volver al punto de suministro |
| Error (first load) | The load error | Reintentar |

## Accepted exceptions

None.
