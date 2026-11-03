# UI spec document — Plants

| | |
| --- | --- |
| **Prefix** | `UI-PLS` |
| **Status** | Active |
| **Routes** | `/production` |
| **Roles** | Any member of the active community reads the list. A row's menu offers what the plant's own capabilities grant: editing and deleting with `canManage`, its sharing agreements with `canListSharingAgreements`. Creating a plant: a caller to whom the active community reports `canCreatePlants` |
| **Domain rules** | n/a |
| **Design reference** | Design system: `ResponsiveRecordList`, `ListTable`, `RecordList`, `ListPagination` (the list; its shared rules are `record-lists.md`) |
| **Last reviewed against code** | #349 |

<!-- Domain rules are cited by ID; the prefix registry in lucoenergia/conluz → docs/specs/README.md maps each prefix to its file. -->

## Purpose

List a community's plants with what a person knows a plant by: its name, its CAU, its installed
power and inverter, when it was connected and where it is. Find one by what its row shows, and
reach its detail, its sharing agreements or its deletion from its row.

This document covers only the rules #349 introduced. A plant deletion's refusal and its
confirmation keep their rules in [`plant-detail.md`](plant-detail.md) (UI-PLT-008, UI-PLT-009), and
the rules every records list shares are in [`record-lists.md`](record-lists.md).

## Rules

### UI-PLS-001 — A row shows what identifies the plant to a person

- **Status:** Active
- **Rule:**
  - A plant row MUST show its name, its CAU or "Sin CAU", its installed power and inverter
    provider, its connection date or "Sin fecha de conexión", and its address.
  - Missing values MUST be shown as neutral text.
  - It MUST NOT show the provider's station code or the description.
- **Rationale:** A plant still being set up is not an error. The station code is an integration
  key, not something a person identifies a plant by.
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

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | The header, the controls, and skeleton rows in the layout the viewport selects | Search; "Nueva Planta" where granted |
| Empty | An empty state in place of the rows; it invites a caller who may create a plant to add the first one, and tells anyone else there is none yet | "Crear Planta" where granted |
| No results | "No hay plantas que coincidan" in place of the rows | "Limpiar filtros", which clears the search |
| Error | "No se pudieron cargar las plantas." with "Reintentar", in place of the rows and the pagination (UI-LST-004) | "Reintentar" |
| Paginated | Above 25 plants, one page of 25 rows, with the range and the page controls below them (UI-LST-005) | Each row's menu, the name link, and the page controls |

## Accepted exceptions

None.
