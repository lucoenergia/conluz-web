# UI spec document — Supplies

| | |
| --- | --- |
| **Prefix** | `UI-SUP` |
| **Status** | Active |
| **Routes** | `/supply-points`, `/supply-points?personId=…` (a member's supplies), `/supply-points/:supplyPointId` |
| **Roles** | Any member of the active community reads them. Deleting: a caller to whom the supply reports `canDelete` |
| **Domain rules** | `lucoenergia/conluz`: SUP-001, MEM-026, EPR-003 |
| **Design reference** | n/a |
| **Last reviewed against code** | #324 |

## Purpose

Let a community admin delete a supply that nothing in the community depends on, and tell them how
to stop using one that something does. Deleting a member who owns supplies needs their supplies
deleted first (UI-MBR-015), so this is the step that makes that possible.

This document covers only the rules #290, #302 and #324 introduced.

## Rules

### UI-SUP-001 — Deletion is offered only from the supply's own `canDelete`

- **Status:** Active
- **Rule:**
  - "Eliminar punto de suministro" MUST be offered on a supply's card menu, in the community's
    supply list and in a member's supplies, and on the supply detail page, only when that
    supply's `capabilities.canDelete` is `true`.
  - A `canDelete` absent from the payload MUST count as `false`.
  - On the card menu, "Eliminar punto de suministro" goes last, below a divider, in the error colour.
- **Rationale:** The backend answers per supply who may delete it. A backend that predates the
  endpoint does not report the capability, and offering the action there would send a request the
  backend cannot answer.
- **Implements:** SUP-001
- **Source:** #290, lucoenergia/conluz#412

### UI-SUP-002 — The confirmation names what is deleted, and dismissing it sends nothing

- **Status:** Active
- **Rule:**
  - "Eliminar punto de suministro" MUST open a confirmation before any request is sent.
  - The confirmation MUST name the supply's CUPS, its name when it has one, and its owner, and say
    that the deletion cannot be undone.
  - Cancelling or dismissing the confirmation MUST send nothing.
- **Rationale:** The deletion cannot be undone, and the CUPS alone is hard to recognise; the owner
  is who the admin is usually acting for (UI-MBR-015).
- **Implements:** n/a
- **Source:** #290

### UI-SUP-003 — A deleted supply disappears from every read that showed it

- **Status:** Active
- **Rule:**
  - After a successful deletion, every read that names or counts the supply MUST be refreshed:
    the community's supply list, its owner's supplies, the communities' supply count, and the
    owner's energy metrics.
  - The supply's own detail MUST NOT be refetched. It is dropped where no screen reads it.
  - From the detail page, the screen MUST return to the supply list.
  - A success message MUST name the deleted supply's CUPS.
- **Rationale:** A supply left in a list after its deletion would offer actions that can only fail.
  Refetching the detail of a deleted supply can only answer 404.
- **Implements:** n/a
- **Source:** #290

### UI-SUP-004 — A refused deletion says why, and the supply stays

- **Status:** Active
- **Rule:**
  - A deletion refused with `SUPPLY_HAS_PLANTS` or `SUPPLY_HAS_PARTITION_COEFFICIENTS` MUST say why,
    and MUST recommend disabling the supply to stop using it, naming the action as it appears in
    the app: «Deshabilitar».
  - A 403 MUST say the caller has no permission to delete the supply.
  - A 404 MUST say the supply no longer exists, and MUST refresh the reads that showed it, as
    UI-SUP-003 does. From the detail page, the screen returns to the supply list.
  - Any other failure MUST show a generic message.
  - After any refusal other than a 404 the supply MUST stay where it is.
- **Rationale:** A plant or a sharing agreement's coefficients keep the supply in use, and the
  backend keeps them as the community's records. Disabling stops using the supply and keeps them.
  A 404 means somebody else already deleted the supply, so the screen is stale.
- **Implements:** SUP-001
- **Source:** #290, lucoenergia/conluz#412

### UI-SUP-005 — The owner shown is their record in the supply's community

- **Status:** Active
- **Rule:**
  - The supply detail's "Propietario" and the deletion confirmation's owner (UI-SUP-002) MUST be
    the full name of the supply's `ownerRecord`: the owner's member record in the supply's
    community. The supply's `user` carries the owner's id only.
  - When `ownerRecord` is null — the supply has no owner, or its owner has no membership in its
    community — the detail MUST show no owner ("-") and the confirmation MUST name none.
- **Rationale:** One person may own supplies in several communities, each with its own record of
  them; the supply's community is the one whose record applies. Without a record there is nothing
  the community may show, and falling back to the account would disclose it.
- **Implements:** MEM-026
- **Source:** #302, lucoenergia/conluz#448

### UI-SUP-006 — A consumption period that has not started yet is shown as empty

- **Status:** Active
- **Rule:** On the supply detail page, a consumption refusal with
  `ENERGY_METRICS_PERIOD_START_IN_FUTURE` MUST be shown as an empty period, not as a load failure.
  Any other error MUST still be shown as a load failure. The page MUST decide by the error detail's
  code, never by the HTTP status or the message.
- **Rationale:** Under EPR-003 a period that has not started is refused; for the current month or
  year in its first hour, or a custom range starting later, that is "nothing yet", not a fault.
- **Implements:** EPR-003
- **Source:** #324, lucoenergia/conluz#409
