# UI spec document — Sharing agreements

| | |
| --- | --- |
| **Prefix** | `UI-AGR` |
| **Status** | Active |
| **Routes** | `/plants/:plantId/sharing-agreements`, `/plants/:plantId/sharing-agreements/:sharingAgreementId` |
| **Roles** | A caller with the plant's `canListSharingAgreements`. Authoring and lifecycle actions: the capabilities each agreement and coefficient carries |
| **Domain rules** | n/a |
| **Design reference** | Design system: `ResponsiveRecordList`, `ListTable`, `RecordList`, `ListPagination` (the list; its shared rules are `record-lists.md`) |
| **Last reviewed against code** | #407 |

Scope: the rules introduced in #277 for sharing-agreement states migrated from visual tests to
Vitest, the rules #350 introduced for the list's rows and for how a status is shown, and the
coefficient history's layout (#369), and the create dialog's starting power (#407). Not
exhaustive: other sharing-agreement behaviour is not yet specified here. The rules every records
list shares, the agreement list among them, are in [`record-lists.md`](record-lists.md).

## Purpose

Let a community admin author a plant's sharing agreement (who receives which share of its
production), put it in force, and record when the distributor starts applying each coefficient.
They must always be able to tell how far a draft is from complete and what it changes against what
is in force today.

## Rules

### UI-AGR-001 — The editor's sum follows every unsaved change

- **Status:** Active
- **Rule:** While a draft's coefficients are being edited, "Suma de los coeficientes" MUST reflect the
  unsaved set: every value typed, every supply added and every supply removed, before anything is
  saved.
- **Rationale:** The admin edits towards 100 %, the only sum that can be put in force. Removing a
  supply changes no input field, so a sum that recomputed only on typing would misstate how far the
  draft is from complete right after a removal.
- **Implements:** n/a
- **Source:** #277

### UI-AGR-002 — Each compared row states what is in force and how the draft moves it

- **Status:** Active
- **Rule:**
  - While a draft is compared (UI-AGR-004), a row whose supply has a coefficient in force MUST show
    that coefficient and, when it differs at the displayed precision from the row's valid value, the
    difference in percentage points.
  - The difference MUST be computed from the coefficients, whichever unit (kW or %) the admin is
    typing in.
  - While a draft is compared, a row whose supply has no coefficient in force MUST say "Sin
    coeficiente vigente" and carry the "Nuevo" marker.
- **Rationale:** What the admin decides is how each member's share moves. Points, not a percentage:
  a move from 4,1667 % to 3,1746 % is a change of 0,9921 points, and a "%" suffix reads as a relative
  change. The kW value is only a view of the coefficient, and the coefficient in force may come from
  an agreement with another installed power, so a difference in kW would mix two causes.
- **Implements:** n/a
- **Source:** #277

### UI-AGR-003 — In kW, a rounded total that hides a gap says so

- **Status:** Active
- **Rule:**
  - While editing in kW, when the kW total rounded to cents equals the agreement's nominal power but
    the coefficients sum to less than 100 %, the sum caption MUST say the total is rounded and state, as
    "faltan …", the percentage still missing, to be adjusted in percent mode.
  - In the same situation with the coefficients summing to more than 100 %, the caption MUST state the
    excess as "sobran …", to be adjusted in percent mode.
- **Rationale:** kW inputs have two decimals, so a set can round to the nominal power while its
  coefficients miss 100 % by less than a kW input can express. Only an exact 100 % can be put in
  force, so a caption implying the set is complete would lead to a dead end. Percent mode is named
  because only there can the gap be closed. The kW view is defined against the agreement's nominal
  power, its own snapshot, since lucoenergia/conluz#567.
- **Implements:** n/a
- **Source:** #277; changed in #407 (nominal power replaces installed power)

### UI-AGR-004 — A draft is compared only when something is in force or leaving

- **Status:** Active
- **Rule:**
  - A draft with at least one coefficient MUST be compared when one of its supplies has a coefficient
    in force, or when a supply with a coefficient in force has no row in the draft.
  - Otherwise it MUST show no comparison: no "Comparado con…" line, no in-force lines and no "Nuevo"
    marker.
- **Rationale:** A plant's first agreement has nothing to compare against. Marking every row "Nuevo"
  and heading the list with a comparison that names nothing would be noise around the only fact that
  matters, the coefficients themselves.
- **Implements:** n/a
- **Source:** #277

### UI-AGR-005 — A draft holding applied or closed rows says so and hides nothing

- **Status:** Active
- **Rule:**
  - A draft with a coefficient whose application state is not pending, or whose end state is known and
    not open, MUST show a warning stating that the draft holds coefficients marked as applied or closed.
  - Such a draft MUST show the application and end-state columns and the application-state filter, as
    a published agreement does.
  - A draft whose coefficients are all pending and open MUST show neither the columns nor the filter.
- **Rationale:** The backend guarantees a draft is all pending and open: a coefficient can only be
  applied after the agreement is put in force, and an agreement cannot go back to draft once anything
  is applied. If that guarantee is ever broken, hiding the columns would silently drop data the admin
  needs to see, and showing them without a word would make a broken draft look ordinary. Without the
  anomaly the columns would always read "pending", so they are left out.
- **Implements:** n/a
- **Source:** #277

### UI-AGR-006 — Selecting coefficients offers the actions that apply to the selection

- **Status:** Active
- **Rule:**
  - Once at least one coefficient is selected, a bar MUST show how many are selected
    ("1 seleccionado", "N seleccionados") and an "Acciones" button.
  - When every selected coefficient is awaiting its application date, "Acciones" MUST open a menu
    whose "Registrar fecha" entry is enabled.
  - With nothing selected, the bar MUST NOT render.
- **Rationale:** An agreement put in force usually needs the same application date registered for
  many supplies at once. The count confirms what the action will touch before it opens.
- **Implements:** n/a
- **Source:** #277

### UI-AGR-007 — The coefficient history marks the agreement being viewed

- **Status:** Active
- **Rule:**
  - In the coefficient history opened from an agreement, the period authored by that agreement MUST
    be marked "Este acuerdo" and MUST NOT link to it.
  - A period authored by another agreement MUST link to that agreement when its
    `capabilities.canReadSharingAgreement` is `true`.
- **Rationale:** A link to the page the admin is already on is a dead end, and without the marker
  they cannot tell which period belongs to the agreement they are on. Linking only where the
  capability allows avoids a link that can only end in a denial.
- **Implements:** n/a
- **Source:** #277

### UI-AGR-008 — Closing a coefficient states that production attribution ends

- **Status:** Active
- **Rule:**
  - The close dialog for one supply MUST state that, from the chosen date, the supply stops receiving
    production attribution in this agreement.
  - The close dialog for several supplies MUST state the same for all of them.
- **Rationale:** Closing ends what a member receives from that date onwards. A state-changing action
  is confirmed in a dialog, and the dialog is where its consequence has to be read.
- **Implements:** n/a
- **Source:** #277

### UI-AGR-009 — Editing an agreement starts from its stored values

- **Status:** Active
- **Rule:** The edit dialog MUST open with its name, notes and nominal-power fields filled with the
  agreement's current values.
- **Rationale:** Saving sends every field, so a field that opened empty would be sent as a change the
  admin never made. The field is renamed; the reasoning is unchanged, and the value is the
  agreement's own, never the plant's.
- **Implements:** n/a
- **Source:** #277; changed in #407 (nominal power replaces installed power)

### UI-AGR-010 — Going back to draft states what it undoes

- **Status:** Active
- **Rule:** The revert-to-draft confirmation MUST state that the agreement stops being in force and that
  its coefficients become editable again.
- **Rationale:** Going back to draft takes the agreement out of force. The admin has to know that
  before confirming, not discover it on the page afterwards.
- **Implements:** n/a
- **Source:** #277

### UI-AGR-011 — The distributor file can be generated in every status

- **Status:** Active
- **Rule:** The file panel MUST offer "Generar y descargar TXT" to a caller who may manage the
  agreement, on a DRAFT, a PUBLISHED and a SUPERSEDED agreement alike, whether or not a file is stored.
- **Rationale:** The file is built from the complete coefficient set and nothing is persisted, so the
  contract allows generating it in any status. It is an optional action, never a step that blocks the
  agreement.
- **Implements:** n/a
- **Source:** #149

### UI-AGR-012 — A sealed agreement without a stored file says one can still be generated

- **Status:** Active
- **Rule:** On a PUBLISHED or SUPERSEDED agreement with no stored file, the file panel MUST say that the
  file may have been sent to the distributor outside Conluz and that one can be generated from the
  coefficients. On a DRAFT with no stored file, it MUST say that none has been imported.
- **Rationale:** The draft wording reads as a missing step on an agreement that is already complete.
- **Implements:** n/a
- **Source:** #149

### UI-AGR-013 — A plant without a CAU is decided and worded once

- **Status:** Active
- **Rule:** The file panel's reason for not generating, the next-step banner, the lifecycle rail and a
  refused generation (`PLANT_MISSING_REGULATORY_CODE`) MUST show the same sentence. A CAU that is only
  whitespace MUST count as missing on every one of them.
- **Rationale:** The backend refuses to generate the file with a whitespace-only CAU. While the panel
  and the next step decided this separately, the panel offered a request guaranteed to fail next to a
  banner saying the CAU was missing.
- **Implements:** n/a
- **Source:** #149

### UI-AGR-014 — The generate dialog says the year only names the file

- **Status:** Active
- **Rule:** The generate dialog MUST state that the year is used only to name the file and that the
  content does not change with it.
- **Rationale:** Without it, the year field reads as changing the data, but the file content encodes no
  year or period.
- **Implements:** n/a
- **Source:** #149

### UI-AGR-015 — A row shows what the list response carries about the agreement, in the API's order

- **Status:** Active
- **Rule:** A sharing agreement row MUST show its name, its status, its nominal power, its evidence
  file (filename and upload date) or "Sin fichero", its last edit date ("Editado el …") or, if never
  edited, its creation date ("Creado el …"), and its notes on one line when it has any. The list MUST
  keep the API's order (newest first). It MUST NOT show the number of supplies or the coefficient sum.
- **Rationale:** A row shows only data the list response carries; the coefficient sum and the number
  of supplies are not in it. The backend owns the order, so the page does not sort. The power is the
  agreement's nominal power, renamed from installed power.
- **Implements:** n/a
- **Source:** #350; changed in #407 (nominal power replaces installed power)

### UI-AGR-016 — A status is never shown as a failure

- **Status:** Active
- **Rule:** The agreement status MUST be shown with neutral or informational styling for every status
  (Borrador, Vigente, Histórico), wherever it appears (for example the list, the detail header, the
  coefficient history and the plant detail's agreements). It MUST NOT use warning or error colours. A selected
  status filter MUST use the brand colour, whatever the status.
- **Rationale:** Draft, published and superseded are lifecycle states, not failures, and colour is
  reserved for failures.
- **Implements:** n/a
- **Source:** #350

### UI-AGR-017 — The coefficient history is a side drawer from md up, a bottom sheet below

- **Status:** Active
- **Rule:** The coefficient history MUST open as a side drawer from the `md` breakpoint up, and as a
  bottom sheet below it.
- **Rationale:** One threshold for the whole app, the shared overlay's (UI-OVL-001). The history
  switched at a narrower width of its own, so between that width and `md` it was a side drawer over
  a page whose dialogs were already bottom sheets. On a phone the sheet puts the timeline under the
  thumb; from `md` up the side panel keeps the agreement's table in view beside it.
- **Implements:** n/a
- **Source:** #369

### UI-AGR-018 — The create dialog starts from the plant's nominal power

- **Status:** Active
- **Rule:** The agreement create dialog MUST seed its nominal power with the plant's
  `nominalPowerKW`, editable before saving.
- **Rationale:** The agreement keeps its own snapshot, but its natural starting value is the
  plant's exportable power. Seeding avoids retyping, and retyping the peak power is the error this
  rule prevents. The edit dialog starts from the agreement's own value instead (UI-AGR-009).
- **Implements:** n/a
- **Source:** #407, lucoenergia/conluz#567

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Draft, first agreement of the plant | Coefficients with no comparison (UI-AGR-004) | Authoring actions |
| Draft, something in force or leaving | Comparison context line, in-force lines per row, "Salen del reparto" when supplies leave (UI-AGR-002, UI-AGR-004) | Authoring actions |
| Draft holding applied or closed rows | Anomaly warning, application columns and filter (UI-AGR-005) | Authoring actions |
| Editing | Live sum (UI-AGR-001) and, in kW, the rounding caption (UI-AGR-003) | Save, cancel, add, remove and revert rows |
| Published, rows selected | Selection bar with count and "Acciones" (UI-AGR-006) | The actions that apply to the selection |
| List loading | Skeleton rows in the layout on screen | Creating, once the plant has arrived |
| List empty, the plant has no agreements | "No se encontraron acuerdos de reparto" | Creating |
| List with no results, a search or a status filter hiding every agreement | "No hay acuerdos de reparto que coincidan" (UI-AGR-015) | "Limpiar filtros", which clears both |
| List read failed | "No se pudieron cargar los acuerdos de reparto." in place of the rows (UI-LST-004) | "Reintentar" |
| List of more than 25 agreements | 25 rows and the pagination (UI-LST-005) | Changing page; a new search or filter returns to the first |

## Accepted exceptions

None.
