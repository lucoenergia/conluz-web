# UI spec document — Supplies

| | |
| --- | --- |
| **Prefix** | `UI-SUP` |
| **Status** | Active |
| **Routes** | `/supply-points`, `/supply-points?personId=…` (a member's supplies), `/supply-points/:supplyPointId`, `/supply-points/new`, `/supply-points/:supplyPointId/edit` |
| **Roles** | Any member of the active community reads them. Deleting: a caller to whom the supply reports `canDelete`. Creating and importing: a caller to whom the active community reports `canManage`. Editing: a caller to whom the supply reports `canEdit` |
| **Domain rules** | `lucoenergia/conluz`: SUP-001, SUP-002, SUP-005, SUP-006, SUP-007, MEM-026, EPR-003 |
| **Design reference** | n/a |
| **Last reviewed against code** | #339 |

## Purpose

Let a community admin delete a supply that nothing in the community depends on, and tell them how
to stop using one that something does. Deleting a member who owns supplies needs their supplies
deleted first (UI-MBR-015), so this is the step that makes that possible.

Let a community admin import a community's supplies from a CSV file with the same dialog as the
member import, the step that follows it during onboarding, and correct a supply refused for its
CUPS or its owner on the input concerned. Show a supply without a name by something that
recognises it.

This document covers only the rules #290, #302, #324 and #339 introduced.

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

### UI-SUP-007 — The supply import explains its columns and what it requires, in the member import's dialog

- **Status:** Active
- **Rule:**
  - The supply import MUST use the member import's dialog (UI-MBR-019, UI-MBR-020, UI-MBR-021):
    the community header, an info note, a column guide, a template download, and Cancelar and
    Importar.
  - The column guide MUST list `code`, `address` and `personalId` as required and `addressRef` and
    `name` as optional, in that order, each with a description and an example.
  - The template MUST be `plantilla-puntos-de-suministro.csv` and hold only the header line, in the
    member template's format (UTF-8 byte order mark, `;`, CRLF).
  - The note MUST say that each owner must already be a member of the community, so members are
    imported first; which Excel formats work; the 1000-row limit; and that importing the same file
    again is safe.
  - While the import runs, the dialog MUST NOT close.
- **Rationale:** The two imports are one onboarding task done one after the other, so the admin
  learns one pattern. An owner who is not a member yet is the most likely cause of a failed row, so
  the note says so before the file is sent.
- **Implements:** SUP-005, SUP-002
- **Source:** #339, lucoenergia/conluz#532

### UI-SUP-008 — A refused file is one notice; failed rows are listed by line, worded from their code

- **Status:** Active
- **Rule:**
  - A file refused as a whole with a `SUPPLY_IMPORT_*` code MUST keep the dialog on the guide, with
    the file still chosen, and show one error naming the cause (with the headers or the limit from
    `params`) and that no supply was created. Any other failure MUST say only that the import failed.
  - A result MUST show how many supplies were created and how many rows failed, and offer
    "Importar otro archivo" and "Cerrar".
  - Each failed row MUST be listed as "Línea L: <reason>". The reason MUST be built from the row's
    `code` and `errors`, by column and constraint. Only a code or a constraint the app does not know
    MAY fall back to the row's `message`.
  - Once the import has answered with a result, the supply list MUST be refreshed.
- **Rationale:** Line numbers let the admin fix the file. Text built by the client keeps the
  wording consistent with the rest of the app and translatable. A newer backend may add codes or
  constraints, and its message is better than none.
- **Implements:** SUP-005, SUP-006, SUP-007
- **Source:** #339, lucoenergia/conluz#532

### UI-SUP-009 — A supply refused for its CUPS or its owner is corrected on that input

- **Status:** Active
- **Rule:**
  - A supply create or edit refused with `SUPPLY_CUPS_INVALID`, `SUPPLY_ALREADY_EXISTS` or
    `SUPPLY_REGISTERED_IN_ANOTHER_COMMUNITY` MUST keep the form open with the values typed, and show
    the catalogue text on the CUPS input.
  - A create refused with `SUPPLY_OWNER_NOT_FOUND` MUST do the same on the owner input
    ("Propietario"). The edit form cannot change the owner and sends none, so the code does not
    reach it.
  - Any other refusal MUST keep the generic message.
- **Rationale:** The admin can fix these, and "try later" hides the cause.
- **Implements:** SUP-002, SUP-006, SUP-007
- **Source:** #339, lucoenergia/conluz#532

### UI-SUP-010 — A supply is named by its name, else its address, else its CUPS

- **Status:** Active
- **Rule:**
  - Wherever the app names a supply, it MUST show its `name`, or its `address` when it has no name,
    or its CUPS when the payload carries no address. One helper (`supplyDisplayLabel`) applies the
    order.
  - A search over supplies MUST match that label.
  - A supply reference (`SupplyReferenceResponse`, in sharing agreements and plants) carries no
    address, so a nameless one is named by its CUPS.
  - A field that shows the name as such — the deletion confirmation's "Nombre" (UI-SUP-002) and
    the edit form's input — MUST show only the name.
- **Rationale:** `name` is optional, and a nameless supply must still be recognisable. What is
  shown must be findable by search.
- **Implements:** n/a
- **Source:** #339

## States

The import dialog, as the member import's (`members.md`):

| State | Rendered | Actions available |
| --- | --- | --- |
| Guide | The notes, the column guide, the template download and the file picker | Descargar plantilla, Seleccionar archivo CSV, Importar (once a file is chosen), Cancelar |
| Importing | That the import is running | None; the dialog cannot be closed |
| Refused | The guide, with the refusal and that no supply was created, and the file still chosen | As in Guide |
| Result | The counts, and each failed row with its line and reason | Importar otro archivo, Cerrar |
