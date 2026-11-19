# UI spec document — Datos de hoy

| | |
| --- | --- |
| **Prefix** | `UI-TDY` |
| **Status** | Active |
| **Routes** | `/today`, `/today?supplyId=<id>`; the "Ver datos de hoy" action on `/supply-points/:supplyPointId` |
| **Roles** | A caller who may read the active community (`canRead`): members and community admins. Another member's supply, in the selector's "Punto que estás consultando" group: a caller the active community grants `canManage`, on a supply that reports `canRead` |
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

### UI-TDY-002 — The selector is the shared supply selector, without "Todos mis puntos"

- **Status:** Active
- **Rule:** The selector MUST be the shared supply selector of "Mi consumo y ahorro", listing only the
  user's own supply points in the active community, excluding plant-backing ones, and without the
  "Todos mis puntos" option.
  - Each option reads "{nombre} · {CUPS}", the name as UI-SUP-010 names a supply. The one in
    `?supplyId=` is selected, or else the first.
  - The header, the selector's loading skeleton and the no-supply state are those of "Mi consumo y
    ahorro". A caller left with no supply to show sees the neutral "No tienes puntos de suministro en
    esta comunidad", not a failure, and no selector.
- **Rationale:** There is one selector across the app. A plant's own supply point receives no share of
  the plant's production.
- **Implements:** n/a
- **Source:** #432

### UI-TDY-003 — Another member's supply is reached only from its detail page, in the selector's own group

- **Status:** Active
- **Rule:** A supply the user does not own MUST be reachable only via "Ver datos de hoy" in
  `SupplyDetailHeader`, and MUST appear only in the selector's "Punto que estás consultando" group,
  as in "Mi consumo y ahorro"; the action MUST NOT be rendered for plant-backing supplies.
  - The action is rendered when the supply reports `canRead` and does not back a plant. It leads to
    `/today?supplyId=<id>`. It is not part of the latest published month's block.
  - A `?supplyId=` that is not one of the caller's own is shown only when it passes "Mi consumo y
    ahorro"'s lookup (UI-HIS-001): the active community's `canManage`, and an enabled supply of the
    active community that reports `canRead`. The group names its owner, and choosing one of the
    caller's own supplies drops it.
  - A community admin with no own supply sees that group alone, as in "Mi consumo y ahorro" (#385).
  - An unknown, unreadable or plant-backing id is ignored, as if the page had none, without an
    error. A failed lookup, with no own supply to show instead, offers a retry.
- **Rationale:** The admin view is the same in every page that shows a supply's data.
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
| Loading (first load) | The selector's skeleton; then skeletons under the figures' labels and for the curve | — |
| No own supply, no viewed supply | A neutral note, "No tienes puntos de suministro en esta comunidad", no selector | — |
| Available, power flowing | Hero with a solid conduit, sentence, "Te llega ahora" and today's energy, β line, curve, note | Choose another supply |
| Available, power 0 | Hero with a dashed conduit, "not producing" sentence, today's energy only | Choose another supply |
| Available, no current power | Hero with a dashed conduit, "no data now" sentence, today's energy only | Choose another supply |
| Stale (normal) | A neutral notice with the time of the last data; values read "a las {hh:mm}" | Choose another supply |
| No data today / no coefficient today | Hero waiting, a title and an explanation; the community's contact for no coefficient | Contact link |
| Plant not connected | Hero with the plant greyed, a title and an explanation | — |
| Viewed supply (community admin) | The selector's "Punto que estás consultando" group, with the owner's name | Choose one of the caller's own supplies |
| Viewed supply failed to load, no own supply | The load error | Reintentar |
| Error (first load) | The load error | Reintentar |

Every state also shows the page's breadcrumb above the title (UI-LAY-003).

## Accepted exceptions

None.
