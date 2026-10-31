# UI spec document — Historical analysis

| | |
| --- | --- |
| **Prefix** | `UI-HIS` |
| **Status** | Active |
| **Routes** | `/historical-analysis` |
| **Roles** | A caller who may read the active community (`canRead`): members and community admins |
| **Domain rules** | n/a |
| **Design reference** | Claude Design round 2 copy deck |
| **Last reviewed against code** | #247 |

Scope: the page shell, its menu entry and its supply selector (#247). The period, figures, charts,
table and CSV are specified by the later issues of lucoenergia/conluz#405 as they land.

## Purpose

Let a caller look back at what their own supplies consumed and saved in the community they are
working in, all of them together or one at a time. A community admin sees their own supplies here
too, never the other members'.

## Rules

### UI-HIS-001 — The selector lists only the caller's own enabled supplies in the active community

- **Status:** Active
- **Rule:** The historical analysis page MUST list only the caller's own enabled supplies in the
  active community, for members and community admins alike. The selector, labelled "Punto de
  suministro", MUST offer "Todos mis puntos" first, as the default, then one option per supply as
  "{nombre} · {CUPS}", the name falling back to the address as UI-SUP-010 does. An option MUST be
  tagged "Punto de planta" exactly when the supply's `plant` reference is non-null. The footer "Solo
  aparecen tus puntos activos en esta comunidad." MUST be shown under it. Below `sm` the selector
  MUST open as a bottom sheet.
- **Rationale:** Supply management lives on another screen; this one is about the caller's own
  energy, so an admin reading the community's whole list would analyse other members' supplies. The
  caller's own listing spans every community they belong to, so it is narrowed to the active one. A
  disabled supply is hidden until what a disabled supply means is decided, and the footer says so.
  The plant tag reads the reference the backend sets for a plant's own supply
  (lucoenergia/conluz#411), never the supply's name.
- **Implements:** n/a
- **Source:** #247

### UI-HIS-002 — The selection is held in the address, and does not survive a community switch

- **Status:** Active
- **Rule:** The selected supply MUST be held in `?supplyId=`. An id the caller cannot select
  (somebody else's supply, one in another community, a disabled one, or an unknown id) MUST fall
  back to "Todos mis puntos" without an error, and the parameter MUST be removed, once the listing
  has succeeded; while the listing is pending or has failed, the parameter MUST be left as it is. A
  community switch MUST drop the parameter, and the page remounts on "Todos mis puntos".
- **Rationale:** Another page can link here with a supply preselected. A stale or foreign link is an
  ordinary case, not a failure, so it lands on the default instead of an error. Nothing is known
  about an id until the listing answers, so it is not removed early. A supply belongs to one
  community, so its id cannot follow the caller into another.
- **Implements:** n/a
- **Source:** #247

### UI-HIS-003 — No own supply here is a neutral state, not a failure

- **Status:** Active
- **Rule:** With no own enabled supply in the active community, the page MUST show the neutral notice
  "No tienes puntos de suministro en esta comunidad", with no alert colour and no controls, for a
  member and a community admin alike. A failed listing MUST NOT show that notice nor the selector, and
  MUST report the error as the supply list does.
- **Rationale:** Owning no supply in a community is an ordinary situation, especially for an admin.
  A failed read says nothing about ownership, so presenting it as "you have none" would be false.
- **Implements:** n/a
- **Source:** #247

### UI-HIS-004 — The community menu leads here right after Inicio

- **Status:** Active
- **Rule:** The community menu MUST list "Mi consumo y ahorro" right after "Inicio", requiring the
  active community's `canRead`, as the route does. The `/supply-points` entry MUST read "Puntos de
  suministro".
- **Rationale:** This page is the caller's own analysis, second only to the home. With it in the
  menu, "Consumo" no longer described the supply list, which manages supply points.
- **Implements:** n/a
- **Source:** #247

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | The title and a placeholder where the selector goes | None |
| Empty | The title and the neutral notice (UI-HIS-003) | None |
| Supplies | The title, the selector with its footer, and the content region | Choosing a supply |
| Error | The title only; the error is reported as on the supply list | None |

## Accepted exceptions

| Exception | Reason | Expires when | Source |
| --- | --- | --- | --- |
| Disabled supplies are hidden from the selector | What a disabled supply means is not decided yet | The disabled-supply decision is made | #247 |
