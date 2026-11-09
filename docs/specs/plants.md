# UI spec document — Plants

| | |
| --- | --- |
| **Prefix** | `UI-PLS` |
| **Status** | Active |
| **Routes** | `/production`; creating and editing a plant open in the shared overlay over the list |
| **Roles** | Any member of the active community reads the list. A row's menu offers what the plant's own capabilities grant: editing and deleting with `canManage`, its sharing agreements with `canListSharingAgreements`. Creating a plant: a caller to whom the active community reports `canCreatePlants` |
| **Domain rules** | n/a |
| **Design reference** | Design system: `ResponsiveRecordList`, `ListTable`, `RecordList`, `ListPagination` (the list; its shared rules are `record-lists.md`); the plant form is on `AppModal` (`overlays.md`) |
| **Last reviewed against code** | #373 |

<!-- Domain rules are cited by ID; the prefix registry in lucoenergia/conluz → docs/specs/README.md maps each prefix to its file. -->

## Purpose

List a community's plants with what a person knows a plant by: its name, its CAU, its installed
power and inverter, when it was connected and where it is. Find one by what its row shows, and
reach its detail, its sharing agreements or its deletion from its row. Create and edit a plant
without leaving the list, say what is wrong with a form that cannot be sent, and save it once
however often the form is sent.

This document covers only the rules #349 and #373 introduced. A plant deletion's refusal and its
confirmation keep their rules in [`plant-detail.md`](plant-detail.md) (UI-PLT-008, UI-PLT-009), and
the rules every records list shares are in [`record-lists.md`](record-lists.md).

## Rules

### UI-PLS-001 — A row shows what identifies the plant to a person

- **Status:** Active
- **Rule:**
  - A plant row MUST show its name, its CAU or "Sin CAU", its installed power and inverter
    provider (by name, e.g. «Huawei»), its connection date or "Sin fecha de conexión", and its
    address.
  - Missing values MUST be shown as neutral text.
  - It MUST NOT show the provider's station code or the description.
- **Rationale:** A plant still being set up is not an error. The station code is an integration
  key, not something a person identifies a plant by, and the inverter provider's API code
  ("HUAWEI") is not its name.
- **Implements:** n/a
- **Source:** #349

### UI-PLS-002 — The search matches only what the row shows

- **Status:** Active
- **Rule:**
  - The plants search MUST match only what the row shows: the name, the CAU and the address,
    case-insensitively. It MUST NOT match the provider's station code.
  - The search box MUST be named for what it matches ("Buscar por nombre, CAU o dirección").
- **Rationale:** A search that matches a hidden field returns rows with no visible reason for the
  match. A box named for something else (it read "Buscar punto de suministro...") tells a
  screen-reader user they are searching another list.
- **Implements:** n/a
- **Source:** #349

### UI-PLS-003 — The deletion dialog names the plant by its name

- **Status:** Active
- **Rule:** The plant deletion dialog MUST name the plant by its name. It MUST NOT show the
  provider's station code.
- **Rationale:** The user identifies a plant by its name; the station code is an integration key
  the row does not show.
- **Implements:** n/a
- **Source:** #349

### UI-PLS-004 — Creating and editing a plant open over the plant list

- **Status:** Active
- **Rule:**
  - "Nueva Planta", and "Crear Planta" on an empty list, MUST open the create form in the shared
    overlay over the plant list, and MUST leave the address unchanged.
  - "Editar" on a plant's row menu MUST open the edit form in the shared overlay over the plant
    list, filled from that plant's own read, and MUST leave the address unchanged.
  - The create actions MUST be offered only when the active community reports `canCreatePlants`.
    "Editar" MUST be offered only when that plant's `capabilities.canManage` is `true`.
  - The edit form MUST take its values from the plant's first successful read. A later read while
    it is open MUST change neither the values nor what counts as a change (UI-OVL-003).
  - While the plant loads, the overlay MUST show progress and nothing to submit. A plant that is
    missing or outside the active community MUST show the plant detail page's not-found state, and
    a failed read MUST show the detail page's load error, with "Reintentar".
  - After a save, the overlay MUST close, the list MUST show the saved plant without a reload, and
    focus MUST return to the control that opened the form: the create action, or the edited row's
    actions button.
- **Rationale:** Creating and editing are flows over the page they belong to (UI-OVL-001,
  UI-OVL-008), so the admin keeps the list and its search. The old pages are removed with no
  redirect: a redirect route would itself end in `new` or `edit`. A form reseeded by a refetch would
  overwrite what is being typed. The menu item that opened an edit is gone once the menu closes, so
  its row's actions button is where the admin was.
- **Implements:** n/a
- **Source:** #373

### UI-PLS-005 — An invalid plant form says what is wrong instead of being dropped

- **Status:** Active
- **Rule:** A plant form submitted with a required input empty, or a total power that is not above
  0, MUST send nothing, MUST show an error on each failing input, MUST move focus to the first
  failing input in the form's order, and MUST NOT be discarded silently.
- **Rationale:** The form dropped such a submit without a word: a power of 0 passed the input's own
  minimum and was then discarded, so the admin saw nothing happen. Focus on the first failing input
  puts it in view, which on a phone may be outside the sheet's visible part.
- **Implements:** n/a
- **Source:** #373

### UI-PLS-006 — A plant save in flight sends nothing again, and the form is read-only

- **Status:** Active
- **Rule:**
  - While a plant create or edit is in flight, submitting the form again MUST send no second
    request.
  - While a plant create or edit is in flight, every input of the form MUST be read-only, the
    supply and the connection date included, and the submit MUST be disabled and read
    "Creando..." in create mode, "Guardando..." in edit mode.
- **Rationale:** The page did not wait for its save, so a second tap sent a second request, and a
  create could answer the second one with `SUPPLY_ALREADY_HAS_PLANT` for the plant the first had
  just stored.
- **Implements:** n/a
- **Source:** #373

### UI-PLS-007 — The connection-date picker opens in place

- **Status:** Active
- **Rule:** The plant form's connection-date picker MUST open its calendar inside the form's
  overlay, at every width, and MUST NOT open a dialog of its own over the form. Escape with the
  calendar open MUST close the calendar and leave the form open.
- **Rationale:** On a touch device the responsive picker opened its own modal dialog, which would
  stack a modal over the form's sheet; no modal is stacked over an overlay (`overlays.md`).
- **Implements:** n/a
- **Source:** #373

### UI-PLS-008 — The edit form's submit reads "Guardar"

- **Status:** Active
- **Rule:** In edit mode, the plant form's submit MUST read "Guardar", whatever the plant's name.
- **Rationale:** One label per mode across the supply and plant forms (UI-SUP-020), and none
  inferred from the name: the page chose "Guardar cambios" or "Crear planta" from whether the plant
  had a name.
- **Implements:** n/a
- **Source:** #373

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | The header, the controls, and skeleton rows in the layout the viewport selects | Search; "Nueva Planta" where granted |
| Empty | An empty state in place of the rows; it invites a caller who may create a plant to add the first one, and tells anyone else there is none yet | "Crear Planta" where granted |
| No results | "No hay plantas que coincidan" in place of the rows | "Limpiar filtros", which clears the search |
| Error | "No se pudieron cargar las plantas." with "Reintentar", in place of the rows and the pagination (UI-LST-004) | "Reintentar" |
| Paginated | Above 25 plants, one page of 25 rows, with the range and the page controls below them (UI-LST-005) | Each row's menu, the name link, and the page controls |

The edit form, while the plant cannot be shown yet (UI-PLS-004):

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | A progress indicator labelled "Cargando..." in place of the inputs | "Cancelar"; "Guardar" is disabled |
| Not found | "Planta no encontrada", as on the plant detail page, for a plant that is missing or outside the active community | "Cancelar"; "Guardar" is disabled |
| Error | The plant detail page's load error, "Ha habido un problema al cargar la información de esta planta. Por favor, inténtalo más tarde", with "Reintentar" | "Reintentar", "Cancelar"; "Guardar" is disabled |

## Accepted exceptions

None.
