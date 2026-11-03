# UI spec document — Record lists

| | |
| --- | --- |
| **Prefix** | `UI-LST` |
| **Status** | Active |
| **Routes** | `/members`, `/communities`, `/communities/:communityId/admins`, `/platform-admins`, `/supply-points` |
| **Roles** | Whoever each list's own page admits; see `members.md`, `community-admins.md`, `platform-admins.md`, `supplies.md` |
| **Domain rules** | n/a |
| **Design reference** | Design system: `ResponsiveRecordList`, `ListTable`, `RecordList`, `ListPagination` |
| **Last reviewed against code** | #348 |

<!-- Domain rules are cited by ID; the prefix registry in lucoenergia/conluz → docs/specs/README.md maps each prefix to its file. -->

## Purpose

A records list lets a caller find a record, read its key values and reach its actions, on a phone
or with the side menu open on a laptop, without scrolling sideways and without guessing whether an
empty screen means "nothing here" or "it failed". The rules below hold for every list built on the
shared record list components; each list's own rules stay in its screen's spec document.

## Rules

### UI-LST-001 — The layout follows the viewport, and a table never scrolls sideways

- **Status:** Active
- **Rule:** A records list MUST show its narrow layout below `LIST_TABLE_MIN_WIDTH` and its table
  from it, on the viewport width. A table MUST NOT scroll horizontally; a value that does not fit
  MUST move to a secondary line under the name.
- **Rationale:** With the side menu open, no table fits below `LIST_TABLE_MIN_WIDTH`, and a
  sideways scroll hides data.
- **Implements:** n/a
- **Source:** #347

### UI-LST-002 — Only the name links, and only to a detail that exists

- **Status:** Active
- **Rule:** Only the title (narrow) or the name cell (wide) MAY link to a record's detail, and only
  where a detail route exists. The row MUST NOT be a link or have a hover state.
- **Rationale:** Keeps identifiers selectable as text.
- **Implements:** n/a
- **Source:** #347

### UI-LST-003 — The actions column is drawn only when a row on screen has actions

- **Status:** Active
- **Rule:** A list MUST draw its actions column only when at least one row on screen has actions. A
  row without actions MUST keep an empty cell.
- **Rationale:** No empty column for read-only viewers, and no reflow between rows.
- **Implements:** n/a
- **Source:** #347

### UI-LST-004 — A failed read is reported with a retry, never as empty

- **Status:** Active
- **Rule:** A list whose read fails MUST show what failed with a retry that sends the read again,
  and MUST NOT show the empty state.
- **Rationale:** A failed read is reported and recoverable.
- **Implements:** n/a
- **Source:** #347

### UI-LST-005 — A list is paged only above 25 rows

- **Status:** Active
- **Rule:** A list MUST show pagination only above 25 rows, with 25 rows per page.
- **Rationale:** Generalises UI-MBR-033 to every records list.
- **Implements:** n/a
- **Source:** #347

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | The list's header, and skeleton rows in the layout the viewport selects | Whatever the header offers (e.g. search and filters) |
| Empty | The header, and the list's empty state in place of either layout | Whatever the header offers |
| No results | The header, and a no-results state with an action that clears the search and filters, where the list has them | Clearing the search and filters |
| Error | What failed, with "Reintentar", in place of the header, the rows and the pagination (UI-LST-004) | "Reintentar" |
| Results | One page of rows; the actions column only when a row has actions (UI-LST-003) | Each row's menu, and the name link where a detail exists |
| Paginated | The same, with the range and the page controls below the rows (UI-LST-005) | The same, and the page controls |

## Accepted exceptions

None.
