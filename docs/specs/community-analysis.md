# UI spec document — Community energy

| | |
| --- | --- |
| **Prefix** | `UI-CAN` |
| **Status** | Active |
| **Routes** | `/community-analysis` |
| **Roles** | A caller who may read the active community (`canRead`): members and community admins, who see the same page |
| **Domain rules** | `lucoenergia/conluz`: CEM-006, CEM-007 (lucoenergia/conluz#554); lucoenergia/conluz#556 (estimated income); lucoenergia/conluz#559 (CO₂ avoided) |
| **Design reference** | Claude Design canvas "Conluz · Energía de la comunidad y detalle de planta", direction A, revision 5: artboards `Main`, `A-Escritorio`, `A-Estados-1`, `A-Estados-2`, `CompPeriodo`, `CompGrafico`. Where the canvas and #403 disagree, #403 wins. |
| **Last reviewed against code** | #403 |

## Purpose

Let every member of a community see what its plants produced over a period, how much of that energy
was used in the community and how much went to the grid, what the exported energy would have earned
at market price, the CO₂ it avoided, and each plant's share. Community aggregates only: nothing on
the page is about one member or one supply.

## Rules

### UI-CAN-001 — Route and menu entry

- **Status:** Active
- **Rule:** `/community-analysis` MUST require community `canRead`. The menu MUST list "Energía de la
  comunidad" right after "Mi consumo y ahorro" with the same requirement.
- **Rationale:** Every active member sees the community's energy.
- **Implements:** CEM-007
- **Source:** #403

### UI-CAN-002 — The period is anchored to the community's latest published month

- **Status:** Active
- **Rule:** The page MUST anchor its periods to the community's latest published month, offer the
  presets of "Mi consumo y ahorro", keep the period in the query string, and clamp it on a community
  switch. With nothing published it MUST show a neutral notice and no selector.
- **Rationale:** Same period model as the member page, so the two read alike.
- **Implements:** n/a
- **Source:** #403

### UI-CAN-003 — Figures come from the community's metrics only

- **Status:** Active
- **Rule:** Every figure MUST come from `getCommunityEnergyMetrics`. The client MUST NOT compute any
  ratio, share or sum shown as text. The page MUST NOT show any member, supply or per-supply figure.
  Accepted exception: the mobile evolution row's total is the client-side sum of the two segments,
  as UI-HIS-025 accepts for 'Mi consumo y ahorro'.
- **Rationale:** Community aggregates only, computed in one place.
- **Implements:** CEM-007
- **Source:** #403

### UI-CAN-004 — Incomplete coverage is stated

- **Status:** Active
- **Rule:** When `suppliesWithData < supplyCount`, the page MUST say how many of the community's
  supplies have data, in neutral style.
- **Rationale:** Incomplete coverage must be visible, not a smaller figure.
- **Implements:** n/a
- **Source:** #403

### UI-CAN-005 — The income is a market-price estimate

- **Status:** Active
- **Rule:** The income MUST be labelled as an estimate at market price and MUST say that prices may
  be negative. When `unpricedSurplusKWh > 0`, the page MUST say how much exported energy has no price
  and is not counted.
- **Rationale:** It is a market-price estimate, and a gap in prices must not silently lower it.
- **Implements:** n/a
- **Source:** #403

### UI-CAN-006 — The CO₂ avoided names its factor

- **Status:** Active
- **Rule:** CO₂ avoided MUST name the MITECO factor and the factor years applied.
- **Rationale:** The figure depends on the factor chosen.
- **Implements:** n/a
- **Source:** #403

### UI-CAN-007 — The evolution chart

- **Status:** Active
- **Rule:** The evolution chart MUST stack self-consumption and surplus, mark gaps, partial buckets
  and measured zeros from `suppliesWithData` / `supplyCount`, and show no savings.
- **Rationale:** Same marks as the member page, community signals.
- **Implements:** CEM-006
- **Source:** #403

### UI-CAN-008 — Plant rows

- **Status:** Active
- **Rule:** Each plant row MUST show the plant's production and share from the response. A plant
  without data MUST read as such, never as 0. Rows MUST NOT link to the plant detail.
- **Rationale:** A gap is not a zero. The plant detail is for admins.
- **Implements:** n/a
- **Source:** #403

### UI-CAN-009 — Colours

- **Status:** Active
- **Rule:** Self-consumption, surplus and production MUST use `ENERGY_COLORS.community`, `exported`
  and `assigned` respectively. `marks.gold` MUST NOT be used for text. Gold and the self-consumption
  green MUST NOT share a chart or legend.
- **Rationale:** One colour per metric across pages. Gold fails text contrast and is hard to tell
  from the green by lightness.
- **Implements:** n/a
- **Source:** #403

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | The title and a placeholder where the selector goes; then a placeholder per block while its read is pending | None |
| Error | An error with "Reintentar", for the anchor, the period's figures or the evolution series, each in its own place | Retry |
| Nothing published | The header and a neutral notice, "Todavía no hay datos publicados"; no selector | None |
| No plants | The header says there are no plants yet; the plants section shows a neutral empty state | Change the period |
| Incomplete coverage (normal) | A neutral notice: how many of the community's supplies have data for the period | Change the period |
| Gaps and partial buckets (normal) | The evolution chart marks them and says which days, hours or months; neutral, no alert colour | Change the period |
| Ready | Header, period, journey, figures, evolution chart and plants | Change the period |

## Accepted exceptions

| Exception | Reason | Expires when | Source |
| --- | --- | --- | --- |
| Below `sm`, each evolution row's figure is the client-side sum of its two segments (UI-CAN-003) | A bucket carries no total, as UI-HIS-025 accepts for "Mi consumo y ahorro"; the shared evolution rows show the first group added up | The community buckets carry a total, or the shared rows can leave the figure out | #403 |
