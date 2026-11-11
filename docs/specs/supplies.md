# UI spec document — Supplies

| | |
| --- | --- |
| **Prefix** | `UI-SUP` |
| **Status** | Active |
| **Routes** | `/supply-points`, `/supply-points?personId=…` (a member's supplies), `/supply-points/:supplyPointId`; creating and editing a supply open in the shared overlay over the list |
| **Roles** | Any member of the active community reads them. Deleting: a caller to whom the supply reports `canDelete`. Creating and importing, and seeing each supply's owner in the list: a caller to whom the active community reports `canManage`. Editing: a caller to whom the supply reports `canEdit`. The supply's figures and "Ver análisis completo": a caller to whom the supply reports `canRead` |
| **Domain rules** | `lucoenergia/conluz`: SUP-001, SUP-002, SUP-004, SUP-005, SUP-006, SUP-007, MEM-026, EPR-003, SEM-001 (lucoenergia/conluz#408) |
| **Design reference** | Design system: `ResponsiveRecordList`, `ListTable`, `RecordList`, `FilterChipsBar` (the list; its shared rules are `record-lists.md`); the detail page's latest published month reuses `src/components/EnergyFigures/` (`PeriodHeader`, `PeriodUsageCard`, `PeriodTotals`), as the historical analysis page does |
| **Last reviewed against code** | #406 |

## Purpose

Let a community admin delete a supply that nothing in the community depends on, and tell them how
to stop using one that something does. Deleting a member who owns supplies needs their supplies
deleted first (UI-MBR-015), so this is the step that makes that possible.

Let a community admin import a community's supplies from a CSV file with the same dialog as the
member import, the step that follows it during onboarding, and correct a supply refused for its
CUPS or its owner on the input concerned. Offer as owner only someone the backend accepts: a member
of the active community. Show a supply without a name by something that recognises it. Create and
edit a supply without leaving the list, and save it once however often the form is sent.

List a community's supplies, or one member's, with only what the supply itself says: how it is
named, its CUPS, its owner for whoever manages the community, whether a plant produces onto it, and
whether it has left the community.

Make the supply detail page the supply's record: what it is, its coefficients, and what it used and
saved in its latest published month, with the same figures the historical analysis page shows for
it, and a way into that page for whoever may read them.

This document covers only the rules #290, #302, #324, #339, #348, #252, #388 and #372 introduced.

## Rules

### UI-SUP-001 — Deletion is offered only from the supply's own `canDelete`

- **Status:** Active
- **Rule:**
  - "Eliminar punto de suministro" MUST be offered on a supply's row menu, in the community's
    supply list and in a member's supplies, and on the supply detail page, only when that
    supply's `capabilities.canDelete` is `true`.
  - A `canDelete` absent from the payload MUST count as `false`.
  - On the row menu, "Eliminar punto de suministro" goes last, below a divider, in the error colour.
- **Rationale:** The backend answers per supply who may delete it. A backend that predates the
  endpoint does not report the capability, and offering the action there would send a request the
  backend cannot answer.
- **Implements:** SUP-001
- **Source:** #290, lucoenergia/conluz#412; #348 (the card menu became a row menu, behaviour unchanged)

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
- **Source:** #290, lucoenergia/conluz#412; #348 (the card menu became a row menu, behaviour unchanged)

### UI-SUP-005 — The owner shown is their record in the supply's community

- **Status:** Active
- **Rule:**
  - The supply detail's "Propietario", the edit form's read-only "Propietario" and the deletion
    confirmation's owner (UI-SUP-002) MUST be the full name of the supply's `ownerRecord`: the
    owner's member record in the supply's community. The supply's `user` carries the owner's id
    only.
  - When `ownerRecord` is null — the supply has no owner, or its owner has no membership in its
    community — the detail and the edit form MUST show no owner ("-") and the confirmation MUST
    name none.
- **Rationale:** One person may own supplies in several communities, each with its own record of
  them; the supply's community is the one whose record applies. Without a record there is nothing
  the community may show, and falling back to the account would disclose it. The edit form used to
  resolve the owner against the user listing instead (#388).
- **Implements:** MEM-026
- **Source:** #302, lucoenergia/conluz#448; #388 (extended to the edit form)

### UI-SUP-006 — A consumption period that has not started yet is shown as empty

- **Status:** Removed (#252: the supply detail page no longer asks for a period of its own; its
  figures are the latest published month, which the server resolves, UI-SUP-014)
- **Rule:** On the supply detail page, a consumption refusal with
  `ENERGY_METRICS_PERIOD_START_IN_FUTURE` MUST be shown as an empty period, not as a load failure.
  Any other error MUST still be shown as a load failure. The page MUST decide by the error detail's
  code, never by the HTTP status or the message.
- **Rationale:** Under EPR-003 a period that has not started is refused; for the current month or
  year in its first hour, or a custom range starting later, that is "nothing yet", not a fault.
- **Implements:** EPR-003
- **Source:** #324, lucoenergia/conluz#409; removed in #252

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
    `SUPPLY_REGISTERED_IN_ANOTHER_COMMUNITY` MUST keep the form's overlay open with the values typed,
    show the catalogue text on the CUPS input, and move focus to the CUPS input.
  - A create refused with `SUPPLY_OWNER_NOT_FOUND` MUST do the same on the owner input
    ("Propietario"). The edit form cannot change the owner and sends none, so the code does not
    reach it.
  - Any other refusal MUST keep the generic message, and MUST keep the overlay open with the values
    typed.
- **Rationale:** The admin can fix these, and "try later" hides the cause. Focus goes to the input
  to fix: the inputs were read-only while the save ran (UI-SUP-021), and on a phone the refused
  input may sit outside the sheet's visible part.
- **Implements:** SUP-002, SUP-006, SUP-007
- **Source:** #339, lucoenergia/conluz#532; changed in #372 (the form moved into the overlay; focus
  on the refused input)

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

### UI-SUP-011 — A supply row shows what the supply says, and the owner only to whoever manages the community

- **Status:** Active
- **Rule:**
  - A supply row MUST show its label (UI-SUP-010) and its CUPS unless the label is the CUPS. It
    MUST show its address only when the label is its name, so neither value is shown twice. A
    layout with a CUPS column of its own shows the CUPS there whatever the label is.
  - It MUST show its owner record (UI-SUP-005), or "Sin titular" when there is none, only when the
    active community grants `canManage`, in the community's list and in a member's supplies alike.
  - It MUST NOT show consumption, connection or any other figure.
  - While `canManage` is pending, the list MUST stay in its loading state. If the capability read
    fails, the list MUST render without the owner.
- **Rationale:** Only real supply data is shown. The owner is useful to whoever manages the
  community, and redundant for a member, who only sees their own supplies; a capability decides
  it, not a role. Rows that gained an owner after they were drawn would shift under the reader.
  Hiding the owner discloses nothing, and a failed secondary read must not block the list.
- **Implements:** n/a
- **Source:** #348

### UI-SUP-012 — A plant's own supply is marked with the plant's name

- **Status:** Active
- **Rule:** A supply that a plant of the active community produces onto MUST be marked "Punto de la
  planta <plant name>", without alert colours. The mark MUST come from the supply's own `plant`. On
  the supply detail header, the mark MUST be the tag "Punto de planta". It MUST link to the plant's
  detail when the plant reports `canManage`. Otherwise, or while that is not known, it MUST be plain
  text.
- **Rationale:** A plant's supply is not a consumer, and the reader must not mistake it for one. The
  supply names its plant itself, so the mark needs no read of the plant listing, which needs a
  capability a member does not hold. A plant's detail opens only to whoever may manage that plant
  (UI-PLT-010), and the plant reference carries no capabilities, so the tag reads the plant itself
  for its `canManage`: the same read, and the same answer, as the plant's route guard.
- **Implements:** SUP-004
- **Source:** #348; changed in #252 (the detail header's tag) and #406 (the link follows the plant's `canManage`)

### UI-SUP-013 — A disabled supply is "Dado de baja", and status is never coloured as a failure

- **Status:** Active
- **Rule:**
  - A disabled supply MUST be shown as "Dado de baja", and an enabled one MUST show no status.
  - The status filter and the header counter MUST say "Dados de baja".
  - Filter chips MUST NOT use success or error colours.
- **Rationale:** "Inactivo" is ambiguous, because a disabled supply has left the community. Colour is
  reserved for failures.
- **Implements:** n/a
- **Source:** #348

### UI-SUP-014 — The supply detail page shows the latest published month with the historical analysis page's components

- **Status:** Active
- **Rule:**
  - The supply detail page MUST show the supply's latest published month through the same
    components and endpoint as the historical analysis page: the period header, the period card and
    the four totals, fed by the supply's energy metrics asked for `LATEST_PUBLISHED_MONTH`.
  - It MUST NOT show its own period selector or charts.
  - It MUST ask for the month only for a supply that reports `canRead`.
  - With no published month, it MUST say "Todavía no hay datos publicados de este punto." in a
    neutral notice. A failed request MUST be a load error with "Reintentar".
  - For a plant's own supply, it MUST show the period card's not-applicable state and the plant
    notice, as the historical analysis page does.
- **Rationale:** The page computed its own figures from a period the device's clock chose and a
  production source no other screen uses, so they disagreed with "Mi consumo y ahorro" for the same
  supply and month. One request and one set of components leave a single source of figures, and the
  full analysis stays on one page instead of a second, smaller one here. The month is the one the
  server resolves, never the device's previous month.
- **Implements:** SEM-001
- **Source:** #252

### UI-SUP-015 — "Ver análisis completo" is offered to whoever may read the supply's figures

- **Status:** Active
- **Rule:** "Ver análisis completo" MUST be offered to the supply's owner and to a community admin of
  its community, and to no one else. It MUST be decided by the supply's `canRead`, and MUST link to
  `/historical-analysis?supplyId={id}`.
- **Rationale:** It opens the supply's figures, which the backend opens to the owner and to an
  enabled admin of the supply's community and reports as the supply's `canRead`. Reading the
  capability rather than comparing the owner's id or the caller's role keeps the rule where the
  backend decides it. A platform admin holds neither by virtue of the flag.
- **Implements:** n/a
- **Source:** #252

### UI-SUP-016 — The create form's owners are the active community's memberships

- **Status:** Active
- **Rule:**
  - The create form's owner options MUST be exactly the memberships of the active community, in
    any state, each labelled with the membership's `fullName` and `personalId`.
  - Options MUST be ordered by the member record's full name (Spanish collation, case- and
    accent-insensitive), ties by membership id.
  - Changing the active community MUST replace the options and clear the selection.
  - Without a chosen owner, the form MUST send nothing; it MUST NOT fall back to the caller.
- **Rationale:** The backend accepts as owner only a member of the supply's community, whatever the
  membership's state (SUP-002); offering anyone else is an action guaranteed to fail. The member
  record is how this community names the person, which can differ from the account. Two members
  may share a label, so an option is identified by its membership, not by its text. The roster
  comes in no defined order, so the form orders it the way a Spanish reader looks a name up.
- **Implements:** SUP-002
- **Source:** #388

### UI-SUP-017 — No owner to offer is said on the owner input, and blocks the create form

- **Status:** Active
- **Rule:** When the active community has no memberships, or they fail to load, the owner input
  MUST say so in visible text and the create form MUST NOT be submittable.
- **Rationale:** A blocking reason is visible text, not an empty dropdown.
- **Implements:** SUP-002
- **Source:** #388

### UI-SUP-018 — The supply forms do not read the platform-wide user listing

- **Status:** Active
- **Rule:** The supply forms MUST NOT read the platform-wide user listing (`getAllUsers`). The edit
  form shows the owner from `ownerRecord` (UI-SUP-005) and reads no owner listing at all.
- **Rationale:** Data minimisation: the create form needs one community's members at most, and the
  edit form needs none. The user listing spans every community the caller administers, and carries
  the personal ID of everyone in them.
- **Implements:** n/a
- **Source:** #388

### UI-SUP-019 — Creating and editing a supply open over the supply list

- **Status:** Active
- **Rule:**
  - "Nuevo Punto de Suministro", and "Crear Punto de Suministro" on an empty list, MUST open the
    create form in the shared overlay over the supply list, and MUST leave the address unchanged.
  - "Editar" on a supply's row menu MUST open the edit form in the shared overlay over the supply
    list, filled from that supply's own read, and MUST leave the address unchanged.
  - The create actions MUST be offered only when the active community hands over `createSupply`
    (its `canManage`). "Editar" MUST be offered only when that supply's `capabilities.canEdit` is
    `true`.
  - The edit form MUST take its values from the supply's first successful read. A later read while
    it is open MUST change neither the values nor what counts as a change (UI-OVL-003).
  - While the supply loads, the overlay MUST show progress and nothing to submit. A supply that is
    missing or outside the active community MUST show the supply detail page's not-found state, and
    a failed read MUST show the detail page's load error, with "Reintentar".
  - After a save, the overlay MUST close, the list MUST show the saved supply without a reload, and
    focus MUST return to the control that opened the form: the create action, or the edited row's
    actions button.
- **Rationale:** Creating and editing are flows over the page they belong to (UI-OVL-001,
  UI-OVL-008), so the admin keeps the list, its search and its filter. The old pages are removed
  with no redirect: a redirect route would itself end in `new` or `edit`. A form reseeded by a
  refetch would overwrite what is being typed. The menu item that opened an edit is gone once the
  menu closes, so its row's actions button is where the admin was.
- **Implements:** n/a
- **Source:** #372

### UI-SUP-020 — The edit form's submit reads "Guardar"

- **Status:** Active
- **Rule:** In edit mode, the supply form's submit MUST read "Guardar", whatever the supply's name.
- **Rationale:** Editing is not creating. The page chose its label from the supply's name, so a
  supply without one was saved with "Crear punto de suministro".
- **Implements:** n/a
- **Source:** #372

### UI-SUP-021 — A supply save in flight sends nothing again, and the form is read-only

- **Status:** Active
- **Rule:**
  - While a supply create or edit is in flight, submitting the form again MUST send no second
    request.
  - While a supply create or edit is in flight, every input of the form MUST be read-only, and the
    submit MUST be disabled and say the save is running: "Creando..." in create mode,
    "Guardando..." in edit mode.
- **Rationale:** The page did not wait for its save, so a second tap sent a second request, and a
  create could store the supply twice or answer the second request with a refusal for a CUPS the
  first one had just registered.
- **Implements:** n/a
- **Source:** #372

## States

The supply list follows the states of `record-lists.md`. What is particular to it:

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | Skeleton rows, also while `canManage` is pending (UI-SUP-011) | Search, filter, create and import where offered |
| Empty | "No se encontraron puntos de suministro", with "Crear Punto de Suministro" where `createSupply` is offered | As in Loading |
| No results | "No hay puntos de suministro que coincidan" | "Limpiar filtros", which clears the search and the filter |
| Error | "No se pudieron cargar los puntos de suministro." | "Reintentar" |

The supply detail page's latest published month (UI-SUP-014):

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | A placeholder where the figures go | "Ver análisis completo" where offered |
| Published | The period header, the period card and the four totals | As in Loading |
| Nothing published | "Todavía no hay datos publicados de este punto." | As in Loading |
| Error | "No se pudieron cargar los datos de energía de este punto." | "Reintentar", and as in Loading |
| Not readable | The section's title only; nothing is asked | None |

The create form's owner input (UI-SUP-016, UI-SUP-017):

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | The input with a progress indicator | None: "Crear punto de suministro" is disabled |
| Members | The active community's memberships as options | Choose an owner; "Crear punto de suministro" |
| No members | "Esta comunidad todavía no tiene miembros. Añádelos antes de crear un punto de suministro." | None: "Crear punto de suministro" is disabled |
| Error | "No se pudieron cargar los miembros de esta comunidad. Inténtalo más tarde." | None: "Crear punto de suministro" is disabled |

The edit form in the overlay (UI-SUP-019):

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | Progress in the overlay's body | Cancelar |
| Form | The supply's values, with the owner read-only | Guardar, Cancelar |
| Not found | The supply detail page's not-found state | Cancelar |
| Error | The supply detail page's load error | Reintentar, Cancelar |

The import dialog, as the member import's (`members.md`):

| State | Rendered | Actions available |
| --- | --- | --- |
| Guide | The notes, the column guide, the template download and the file picker | Descargar plantilla, Seleccionar archivo CSV, Importar (once a file is chosen), Cancelar |
| Importing | That the import is running | None; the dialog cannot be closed |
| Refused | The guide, with the refusal and that no supply was created, and the file still chosen | As in Guide |
| Result | The counts, and each failed row with its line and reason | Importar otro archivo, Cerrar |
