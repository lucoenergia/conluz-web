# UI spec document — Sharing agreements

| | |
| --- | --- |
| **Prefix** | `UI-AGR` |
| **Status** | Active |
| **Routes** | `/plants/:plantId/sharing-agreements`, `/plants/:plantId/sharing-agreements/:sharingAgreementId`, `/plants/:plantId/sharing-agreements/observed`, `/plants/:plantId/sharing-agreements/observed/:sharingAgreementId`, `/plants/:plantId/sharing-agreements/:sharingAgreementId/application-dates` |
| **Roles** | A caller with the plant's `canListSharingAgreements`. Authoring and lifecycle actions: the capabilities each agreement and coefficient carries |
| **Domain rules** | n/a |
| **Design reference** | Design system: `ResponsiveRecordList`, `ListTable`, `RecordList`, `ListPagination` (the list; its shared rules are `record-lists.md`) |
| **Last reviewed against code** | #419 |

Scope: the rules introduced in #277 for sharing-agreement states migrated from visual tests to
Vitest, the rules #350 introduced for the list's rows and for how a status is shown, and the
coefficient history's layout (#369), the create dialog's starting power (#407), and how a
coefficient's end date is shown and worded (#420), the distributor file sent date (#417), and the
observed sharing view: a plant's agreements and one agreement compared with what Datadis shows
(#418), and setting an agreement's application dates after a dry run of every effect, with the
activation confirmation that lists the supplies a first activation closes (#419), and the terms,
counts and help that make the observed sharing readable, the unattributed production and its
breakdown, and each row's measurable days (#419). Not exhaustive: other sharing-agreement behaviour is not yet specified here. The rules every records
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

### UI-AGR-019 — A coefficient's end date is exclusive and reads that way

- **Status:** Active
- **Rule:** Coefficient end dates MUST be displayed exclusive (the first day the coefficient no
  longer applies), formatted in the application time zone, and their wording MUST NOT imply that
  the shown day is included.
- **Rationale:** The backend stores half-open periods (lucoenergia/conluz#581); wording that implies
  an inclusive end leads admins to close a day early.
- **Implements:** n/a
- **Source:** #420

### UI-AGR-020 — The distributor file sent date is shown and edited with the metadata

- **Status:** Active
- **Rule:** The agreement detail MUST show the distributor file sent date or "Sin registrar",
  editable with the agreement metadata in any state.
- **Rationale:** Admins need to know from when the distributor is expected to apply the
  coefficients.
- **Implements:** n/a
- **Source:** #417

### UI-AGR-021 — Every agreement update sends the current sent date

- **Status:** Active
- **Rule:** Every update of an agreement MUST send its current distributor file sent date; only an
  explicit clear sends null in place of a stored date.
- **Rationale:** updateSharingAgreement is a full replacement; omitting the field clears it
  (conluz#580).
- **Implements:** n/a
- **Source:** #417

### UI-AGR-022 — The observed sharing is requested only from its own pages

- **Status:** Active
- **Rule:** The plant's observed sharing and an agreement's MUST be requested only by the plant's
  observed sharing page and the agreement's. The plant detail MUST link to the plant's page without
  requesting either.
- **Rationale:** The analysis is expensive: it reads every day of Datadis data of every supply of
  the plant.
- **Implements:** n/a
- **Source:** #418, lucoenergia/conluz#579

### UI-AGR-023 — Each agreement shows its observed application, its sent date and its recommendations, in backend order

- **Status:** Active
- **Rule:** The plant's observed sharing MUST show one card per agreement, in the order the analysis
  returns them. Each card MUST show "Fichero enviado el <fecha>", or "Fichero enviado: sin registrar", the
  application the analysis observed, its supplies' status counts, its leaving counts when there is
  any, its anomaly counts by type, and its unattributed production (UI-AGR-040). Each status
  and anomaly count MUST come before its label, in tabular figures so the counts align, and a zero
  count MUST read in the secondary text colour. Each card
  and the agreement's page MUST show every recommendation returned, in order, as a finding under
  "Qué revisar": a title stating what was found, a detail from the backend's counts, and a link
  worded apart from the title. "Fechas distintas de las registradas" MUST link to "Fijar fechas",
  which opens the set application dates flow from this agreement's observation (UI-AGR-032), and
  still counts as an agreement to review. A "none" recommendation MUST show nothing. An impossible
  unexplained share adds a finding of its own, before the recommendations (UI-AGR-039). On
  the agreement's page, "Con avisos" MUST keep the coefficient rows applied on another
  date, not distinguishable, or of a supply with an anomaly of the agreement, and the leaving rows
  that left on another date; its count MUST equal the rows it shows.
- **Rationale:** This is what an admin comes to see. The backend owns the order and the
  recommendations; restating either here would let the two disagree. A finding says what the
  analysis saw, which the admin can check, rather than an instruction. A count read down a column
  is compared faster than one at the end of a label of its own length, and the statuses that hold
  rows stand out from those that hold none.
- **Implements:** n/a
- **Source:** #418; findings layout: maintainer decision in the #418 review; the "Fijar fechas"
  link, the count before its label, the impossible share's finding and the sent date's wording:
  #419

### UI-AGR-024 — Anomalies are grouped by agreement and supply, with their evidence

- **Status:** Active
- **Rule:** Anomalies MUST be grouped by agreement, in the order the analysis returns the
  agreements, with those attributed to none last under "Sin acuerdo atribuido". Within an
  agreement they MUST be grouped by supply, in the order each supply first appears, keeping the
  analysis order within a supply; an anomaly about the whole agreement sits under the supply it
  names. Each anomaly MUST show its type, its start (or range), its end (or "en curso") and its
  evidence as "β observada X % en N días medibles": the β the backend observed and the days it
  rests on. Wherever the view counts those days, it MUST call them "días medibles", never "días
  válidos". UNKNOWN_COEFFICIENT MUST read "Coeficiente no registrado". The view MUST NOT show an
  expected β until the backend returns one.
- **Rationale:** An admin reviews them without a flood, and can check each against the evidence.
  "Recibe X %" read as the share the supply should get, and a "valid" day suggested the other days
  were wrong, when they only lack complete data. "Desconocido" said what the application does not
  know; "no registrado" says what was seen. An expected β depends on the agreement the backend
  attributes the anomaly to, which only the backend knows.
- **Implements:** n/a
- **Source:** #418, lucoenergia/conluz#597; the evidence's wording, "días medibles" and
  "Coeficiente no registrado": #419

### UI-AGR-025 — Each kind of date reads one way

- **Status:** Active
- **Rule:** A range of data MUST be written in words ("Del 1 abr 2023 al 31 oct 2026"). A registered
  period MUST read "dd/mm/aaaa – dd/mm/aaaa" with its exclusive end (UI-AGR-019), or
  "dd/mm/aaaa – en curso" while open. An observed range MUST read "Entre el … y el …", and a date the
  data starts on "dd/mm/aaaa o antes". Every date is a local date of the application time zone.
- **Rationale:** One dash, one meaning; the analysis knows a date only as precisely as the data, and
  the view must not claim more.
- **Implements:** n/a
- **Source:** #418

### UI-AGR-026 — A β is a percentage with 4 decimals, and ±0.1 points reads as equal

- **Status:** Active
- **Rule:** Every β MUST be shown as a percentage with 4 decimals. An observed β within ±0.1
  percentage points of the registered one MUST read as equal; beyond that, it MUST take the warning
  style. β is feminine wherever it is labelled: "β registrada", "β observada".
- **Rationale:** It is the analysis's own tolerance; a difference inside it is not a finding. β
  reads "la beta".
- **Implements:** n/a
- **Source:** #418; the feminine labels: #419

### UI-AGR-027 — A proposed date never reads as an observed one

- **Status:** Active
- **Rule:** A row that cannot be distinguished MUST show "No distinguible" and the proposed date
  marked as proposed. A proposed date MUST NOT be marked or styled as observed.
- **Rationale:** A proposed date is not evidence.
- **Implements:** n/a
- **Source:** #418

### UI-AGR-028 — No reason is given for missing data; "No calculables" says once why its supplies are left out

- **Status:** Active
- **Rule:** A supply without Datadis data MUST show "Sin datos de Datadis", with no reason. A supply
  that cannot be computed MUST show "No calculable", with no reason of its own; the "No
  calculables" section MUST say, in one line under its title, that its supplies hold a coefficient
  in this plant and in another, that their energy cannot be split between the plants, and that they
  are left out of the analysis. It MUST NOT name Σβ (UI-AGR-040).
- **Rationale:** The application cannot know why data is missing. It does know what makes a supply
  not computable: the analysis defines it, the same for every supply listed.
- **Implements:** n/a
- **Source:** #418; the "No calculables" explanation: #419

### UI-AGR-029 — The view sets no order of work, proposes no coefficient and claims no real time

- **Status:** Active
- **Rule:** The view's text MUST NOT imply an order in which to work, propose a coefficient, or
  mention real time.
- **Rationale:** The view places each agreement in time; the registered agreement stays the source
  of truth, and Datadis publishes with days of delay.
- **Implements:** n/a
- **Source:** #418

### UI-AGR-030 — Supplies leaving the distribution are shown with the agreement they leave

- **Status:** Active
- **Rule:** The agreement's page MUST list under "Salen del reparto" each supply that leaves the
  distribution with it, with the agreement it leaves, its β there, its observed leaving date and
  its status. A leaving row applied on its date MUST read "Salida · misma fecha", and on another
  date "Salida · otra fecha"; any other status reads as a coefficient row's.
- **Rationale:** A leaving supply keeps receiving attributed production until its coefficient ends.
- **Implements:** n/a
- **Source:** #418

### UI-AGR-031 — An observed β comes only from the backend, wherever a conclusion is stated

- **Status:** Active
- **Rule:** Every coefficient row, leaving row and anomaly MUST show the observed β the backend
  returns, and "—" when it returns none. The view MUST NOT compute an observed β.
- **Rationale:** Admins must be able to verify the analysis, against the figure it rests on.
- **Implements:** n/a
- **Source:** #418, lucoenergia/conluz#597

### UI-AGR-032 — Prefilled dates are marked; uncertain dates are left for the admin

- **Status:** Active
- **Rule:** Opened from the agreement, every date of the set application dates flow MUST start
  empty, and the undated coefficients MUST start selected. Opened from observed sharing, an exact
  observed date MUST be prefilled and marked "Observada". An exact proposed date, for a coefficient
  whose change cannot be observed, MUST be prefilled and marked "Propuesta", with the explanation
  the observed sharing page gives (UI-AGR-027). An observed range or open date MUST be left empty,
  with the observed value as its hint and "Elige una fecha". Any other row MUST show its stored
  date, or none, unmarked. A row with a prefilled date MUST start selected; a row with a range or
  open date MUST start unselected, and so MUST a row already dated, whatever the observation says.
  A date edited away from the one it was prefilled with MUST show that one beside it. A leaving
  supply observed leaving on an exact day MUST start with that day as its closing date, marked
  "Observada"; one observed on a range or open date MUST start without one, with its hint.
- **Rationale:** The admin decides the dates. An observed date is evidence and a proposed one is
  not, so neither may pass for the other, and the client infers no day the backend did not give.
  Changing a stored date rewrites a period production was attributed by, so it is never preselected.
- **Implements:** n/a
- **Source:** #419

### UI-AGR-033 — The preview is not reachable with a missing or future date

- **Status:** Active
- **Rule:** "Ver vista previa" MUST stay disabled while a selected row has no date, or a date that
  is invalid or after today, whether typed or picked, and while nothing is selected and no closing
  date is listed. The reason MUST be visible body text; with three missing dates or fewer and no
  invalid one, it MUST name their rows.
- **Rationale:** A dry run of an incomplete or future request can only be refused; the admin
  should see what to fix where they are fixing it.
- **Implements:** n/a
- **Source:** #419

### UI-AGR-034 — Confirming follows an error-free dry run that shows every effect

- **Status:** Active
- **Rule:** The preview MUST render what the dry run (`previewPartitionCoefficientDates`) returns:
  how many coefficients get a date, how many previous coefficients change their end and how many
  supplies are closed; each coefficient's new period and each move of the end of a previous
  coefficient of its supply; each leaving closure; each agreement whose status changes; and the
  community's start date when it moves, explained as moving the payback. A closure the backend
  applies by default on a first activation MUST be marked "Cierre por defecto: fecha más temprana
  del acuerdo". A date before the day the agreement's file was sent MUST carry a note that does not
  block confirming. Each leaving supply MUST have an editable closing date, and editing one MUST
  run the dry run again with it listed. A refused dry run MUST show each row's error in the
  catalogue's words. "Confirmar y aplicar" MUST be enabled only while the dry run on screen
  answered, without error, for exactly what is entered.
- **Rationale:** Nothing may be written that the admin has not seen in full. A default closure is
  written without having been asked for, so it is the one most in need of saying so.
- **Implements:** n/a
- **Source:** #419, lucoenergia/conluz#583, lucoenergia/conluz#593

### UI-AGR-035 — The result shows the effects as written, and every affected read is refreshed

- **Status:** Active
- **Rule:** After a write applies, the result MUST list the effects from the write's own response,
  never the preview's. Every write that dates coefficients, setting the dates or activating, MUST
  invalidate every agreement and coefficient set of the plant, the plant's active coefficients, its
  observed sharing and each agreement's, every member's payback and the community's energy metrics.
- **Rationale:** There is no version token: the write validates again and may differ from the
  preview. A moved community start date moves every member's payback.
- **Implements:** n/a
- **Source:** #419

### UI-AGR-036 — A refused write applies nothing and keeps the dates

- **Status:** Active
- **Rule:** A write answered with a refusal (409, or 400) MUST say that no data was changed, show
  each row's error in the catalogue's words and keep every date entered; "Volver a la vista previa"
  MUST run the dry run again on the data as it stands. A write whose answer never arrived MUST NOT
  be reported as applied or as refused.
- **Rationale:** A concurrent edit can make a previewed request invalid; the admin should not have
  to type the dates again to see why.
- **Implements:** n/a
- **Source:** #419

### UI-AGR-037 — The activation confirmation lists the supplies its first activation closes

- **Status:** Active
- **Rule:** Once a valid date is chosen, "Registrar fecha" MUST list the supplies a dry run of the
  activation at that date reports as closed by default, each with the agreement it leaves and its
  closing day, and nothing when it reports none. "Registrar fecha" MUST wait for that answer, saying
  so. A refused dry run MUST keep it disabled and show the catalogue's errors; a network or server
  failure MUST offer "Reintentar". The activation itself is unchanged.
- **Rationale:** A first activation also closes the coefficients of the supplies absent from the
  agreement, in the same write; the admin should see them before confirming.
- **Implements:** n/a
- **Source:** #419, lucoenergia/conluz#593

### UI-AGR-038 — Both observed sharing pages explain every term, status and anomaly they show

- **Status:** Active
- **Rule:** The plant's observed sharing page and the agreement's MUST offer "¿Qué significa cada
  estado?" in their header. It MUST open "Cómo leer el reparto observado", which MUST define β
  registrada, β observada, día medible and producción no atribuida (1 − Σβ), and MUST list every
  coefficient status, leaving status and anomaly type of the client, each under the label the view
  shows it with.
- **Rationale:** The view is read by admins who are not analysts; a status or a figure is only
  useful when its meaning is one tap away from where it is shown. Listing from the client's values
  means a status the backend adds cannot reach the view unexplained.
- **Implements:** n/a
- **Source:** #419

### UI-AGR-039 — An impossible unattributed production is shown, flagged and listed under "Qué revisar"

- **Status:** Active
- **Rule:** Where "Producción no atribuida" is shown, on each agreement card of the plant's observed
  sharing and on the agreement's page, a value below −0.1 percentage points MUST still be shown, in
  the warning tone, with "Imposible: los puntos reciben más energía de la que produce la planta.
  Algún dato de Datadis es erróneo; revisa las anomalías con β observada muy alta." under it. That
  agreement's "Qué revisar" MUST then list "Reparto mayor que la producción", with the warning icon,
  before its recommendations, with the detail "Los puntos reciben un X % más de lo que produce la
  planta.", X being the share without its sign. The finding MUST link to "Ver anomalías" when the
  agreement has an anomaly, and MUST have no link when it has none. A value between −0.1 points and
  0 MUST read as any other value, with neither the warning nor the finding. The finding MUST NOT
  count as an agreement to review, and MUST NOT change the "Todo aplicado" notice. The help MUST
  say, under "Producción no atribuida (1 − Σβ)", that a negative total means wrong Datadis data.
- **Rationale:** Supplies cannot receive more than the plant produces, so a share below the
  tolerance always means wrong Datadis data: one supply whose records were a copy of the plant's
  for five months gave −47.5 %. Shown as an ordinary figure, it reads as a plausible result. The
  value stays, so the admin can judge its size. Down to −0.1 points it is rounding, within the
  tolerance the view already uses for β (UI-AGR-026). The finding presents a value the API returns;
  counting the agreement as one to review would be a conclusion the backend does not draw. It comes
  first because it puts every other figure of the agreement in doubt.
- **Implements:** n/a
- **Source:** #419

### UI-AGR-040 — The unattributed production is named in words and says what it is

- **Status:** Active
- **Rule:** The production no supply with data received, on each agreement card of the plant's
  observed sharing and in the agreement page's header details, MUST be labelled "Producción no
  atribuida". When the analysis gives it, an always-visible line MUST follow the value: "Parte de la
  producción de la planta que, según Datadis, no llegó a ningún punto con datos durante la
  aplicación de este acuerdo (N días medibles).", N being the share's days ("1 día medible" for
  one). When the analysis gives none, the value MUST read "—" with nothing under it. The formula,
  1 − Σβ or Σβ alone, MUST appear only in the help dialog.
- **Rationale:** Admins understood neither the figure nor where it came from: the label was a
  formula. A name in words and a sentence beside the value say what it is where it is read; the
  formula stays in the help, for those who want it.
- **Implements:** n/a
- **Source:** #419

### UI-AGR-041 — The unattributed production is broken down into its two parts

- **Status:** Active
- **Rule:** When the analysis gives the unattributed production, it MUST show "X % corresponde a
  puntos que no tenían datos esos días", X being `registeredShareWithoutData`, whenever that is above
  0, whether or not some supply has no measurable day at all. It MUST always show "Resto: Y pp", Y
  being `unallocated − registeredShareWithoutData` in percentage points, with its sign and one
  decimal, followed by "Los puntos con datos recibieron más de lo registrado." when Y is below −0.1
  points, "Producción que no llegó a ningún punto registrado." when it is above 0.1 points, and
  "Dentro del margen de redondeo." from −0.1 to 0.1 points, both included. An impossible share keeps
  its warning (UI-AGR-039).
- **Rationale:** The registered share of the supplies without data those days is expected and is
  not an error; showing it apart leaves the rest, whose sign says what to look at. It is a
  subtraction of two values the API returns, compared with the tolerance the view already uses for
  β (UI-AGR-026). It was shown only when some supply had no measurable day at all, which hid it for
  supplies missing only some days. "Resto" shows when the share of supplies without data is 0 too,
  so its sentence still says which way the figure points.
- **Implements:** n/a
- **Source:** #419

### UI-AGR-042 — Each coefficient row of an agreement shows its measurable days alone

- **Status:** Active
- **Rule:** The agreement's coefficient rows MUST show "Días medibles", a column in the table and a
  field in each stacked row on a phone, not sortable. It MUST read N alone, N being the row's
  `observedValidDays`, in every row: no row MUST show a denominator.
- **Rationale:** A row's measurable days run from its own observed date to the end of the
  agreement's applied window, so a row observed before that window counts more days than the
  window has: rows observed "on or before 01/09/2025" had 426 against 335. The unattributed
  production's days are therefore no denominator for any row, and one format for every row keeps
  them comparable. lucoenergia/conluz#611 adds each row's own window days.
- **Implements:** n/a
- **Source:** #419

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
| Observed sharing loading | "Calculando el reparto observado…" and its progress, with no figure | None |
| Observed sharing not computable, the plant supply without data | "No se puede calcular el reparto observado"; no agreement and no recommendation (UI-AGR-028) | "Ver el punto de la planta", with the plant's `canReadSupply` |
| Observed sharing read failed | "No se pudo cargar el reparto observado." | "Reintentar" |
| Observed sharing help open | "Cómo leer el reparto observado": the terms, every status and anomaly type (UI-AGR-038) | "Cerrar" |
| Agreement observation of a draft | The catalogue's text for `SHARING_AGREEMENT_NOT_OBSERVABLE`, as a note | None |
| Set application dates, dates step | The rows, prefilled when opened from observed sharing (UI-AGR-032); the reason "Ver vista previa" is disabled (UI-AGR-033) | "Misma fecha para todos", "Ver vista previa", "Cancelar" |
| Set application dates, preview | The dry run's effects, default closures marked (UI-AGR-034) | Editing a closing date, "Volver a las fechas", "Confirmar y aplicar" once error-free |
| Set application dates, preview refused or failed | Each row's error, or "No se pudo calcular la vista previa." | "Volver a las fechas"; "Reintentar" on a failure |
| Set application dates, applied | "Fechas aplicadas en …" and the effects as written (UI-AGR-035) | "Ver el acuerdo"; "Volver al reparto observado" when opened from it |
| Set application dates, write refused | "No se han aplicado las fechas", each row's error, the dates kept (UI-AGR-036) | "Volver a la vista previa", "Cancelar" |
| Set application dates of a draft | "Este acuerdo es un borrador. Publícalo antes de fijar sus fechas de aplicación." | None |

## Accepted exceptions

None.
