# UI spec document — Surplus claim

| | |
| --- | --- |
| **Prefix** | `UI-SCL` |
| **Status** | Active |
| **Routes** | `/plants/:plantId/surplus-claim` |
| **Roles** | Community admin only: the plant's `canManage`, the guard of every plant route (UI-PLT-010) |
| **Domain rules** | `lucoenergia/conluz`: SCL-002 to SCL-011, SCL-014 to SCL-016, SCL-020 |
| **Design reference** | Claude Design project "Reclamación de excedentes", section 2 ("1a con resumen arriba y todas las acciones"), mobile and desktop, every state |
| **Last reviewed against code** | #455 |

## Purpose

Let a community admin review one closed month of a plant's surplus, day by day and hour by hour,
see what may make it incomplete, and download the file the retailer asks for to claim it. The page
is reached from the plant detail (UI-PLT-017).

## Rules

### UI-SCL-001 — The month lives in the address

- **Status:** Active
- **Rule:**
  - The month shown MUST be the one in `?month=YYYY-MM`. Choosing another MUST write it there,
    replacing the history entry.
  - Without `month`, the page MUST ask for the claim without a month and show the server's default,
    leaving the address without `month`.
  - A `month` that is not a month MUST be dropped without being asked for, and a month the server
    refuses (`400`) MUST be dropped; either way the default month MUST be shown, with no error.
- **Rationale:** A reload or a shared link shows the month that was reviewed. Back leaves the page
  instead of walking through the months seen. A month the server will not claim, such as the
  current one, is not a failure the admin can act on.
- **Implements:** SCL-007
- **Source:** #455

### UI-SCL-002 — The months offered

- **Status:** Active
- **Rule:** The month selector MUST offer every month from the earlier of `availableMonths.firstMonth`
  and the month shown to the later of `availableMonths.latestPublishedMonth` and the month shown,
  newest first, labelled like "Octubre de 2026". A missing bound MUST count as the month shown. The
  selector MUST say "Solo meses cerrados. La distribuidora publica cada mes hacia el día 10 del
  siguiente."
- **Rationale:** The month shown is always one of the options, even when a link names a month outside
  the range the server reports.
- **Implements:** SCL-008
- **Source:** #455

### UI-SCL-003 — Every action sits in the top summary

- **Status:** Active
- **Rule:**
  - The top summary MUST hold, in this order, the control row (the month selector, the format
    selector and the download), the block "Lo que reclamas", and the block "Calidad de los datos"
    with the warning line, all before the warnings.
  - The control row's fields and button MUST stack full width below `sm`. The CIL notice
    (UI-SCL-010) and a failed download (UI-SCL-011) MUST take the button's place in it.
  - From `sm` up, the two blocks MUST sit side by side, each as wide as its content, with their
    labels and figures on shared rows. Below `sm` they MUST stack.
  - With at least one warning raised (UI-SCL-005), the warning line MUST read "Este mes tiene N
    avisos · Ver avisos" ("1 aviso" for one). "Ver avisos" MUST bring the warnings into view and move
    focus to them.
- **Rationale:** The admin acts without scrolling, on a phone too. The figures are grouped by
  meaning, what is claimed apart from how good its data is, and the month's warnings sit with the
  data quality they are about, before the download is confirmed (design: "Reclamación de
  excedentes", section 3, alternative A).
- **Implements:** n/a
- **Source:** #455

### UI-SCL-004 — The month's figures, and what the income is

- **Status:** Active
- **Rule:**
  - "Lo que reclamas" MUST show the month's surplus in kWh beside the surplus swatch and the
    estimated income in euros, the two largest figures of the summary.
  - "Calidad de los datos" MUST show "Días reales" as "X de N", the `REAL` days of the month's N
    days, and "Puntos con datos" as "X de Y", or "Ninguno" with no supply in scope.
  - The income MUST carry the note "Estimación a precio de mercado (OMIE) del excedente de este
    fichero. Lo que pague la comercializadora puede ser distinto.", and, when `unpricedSurplusKWh` is
    above zero, the line "{kWh} sin precio de mercado: no cuentan en el importe."
  - A negative income MUST keep its minus sign, in the text colour, never in alert colour.
  - A null surplus or income MUST read "—", never 0.
- **Rationale:** The income is a gross market-price estimate, not what the retailer pays. Market
  prices may be negative, which is not a failure. A month with no records has no surplus to show,
  which a measured 0 would misstate. One "X de N" says what two separate counts of real and
  estimated days said.
- **Implements:** SCL-006
- **Source:** #455

### UI-SCL-005 — The warnings

- **Status:** Active
- **Rule:**
  - A warning MUST count as raised when its list is not empty, its object is not null, or
    `noAppliedCoefficients` is true.
  - Each raised warning MUST be shown as a warning notice, unnumbered, in this order:
    `suppliesWithoutData`, `suppliesWithGaps`, `uncoveredShare`, `plantSupplyShare`,
    `noAppliedCoefficients`, `hoursAboveNominalPower`, each with the text and the list #455 states.
  - Coefficients MUST read with four decimals ("4,2000 %"), days like "mié 07/10", consecutive
    uncovered days as one range ("Del 1 al 12 de octubre (12 días)", "El 20 de octubre (1 día)"), and
    supplies by name and CUPS.
  - With none raised, the page MUST show no warnings and no count.
- **Rationale:** The admin decides whether to send an incomplete file, so every reason it may be
  incomplete is visible text, in one place the count leads to.
- **Implements:** SCL-009, SCL-010, SCL-011
- **Source:** #455

### UI-SCL-006 — The days, and "Estimado" as a neutral state

- **Status:** Active
- **Rule:**
  - "Excedentes día a día" MUST list every day of the month with its date ("lun 01/06/2026"), its
    state, its total in kWh and its peak hour ("13–14 h · 42,09 kWh", "—" without one).
  - The state MUST read "Real" as text, and "Estimado" as a neutral chip, never in alert colour.
  - From `sm` up the days MUST be a table; below, one row per day.
  - The month's total MUST close the list, followed by the legend "Real: todas las horas del día
    tienen datos de la distribuidora. Estimado: faltan horas; el día va al fichero marcado como
    estimado (E)."
- **Rationale:** An estimated day is a normal state of the file, not a failure, and alert colours are
  kept for failures. A wide table does not fit a phone.
- **Implements:** SCL-003, SCL-005
- **Source:** #455

### UI-SCL-007 — A day's hours

- **Status:** Active
- **Rule:**
  - Opening a day MUST list its 23, 24 or 25 hours, labelled from `startsAt` on `APP_TIME_ZONE`'s
    clock, never the device's: "13–14 h", "01–03 h" for the hour the clocks go forward, and
    "02–03 h (1.ª)" and "02–03 h (2.ª)" for the hour lived twice.
  - A day with other than 24 hours MUST carry "Cambio de hora: 23 horas" or "Cambio de hora: 25
    horas".
  - An hour without a record MUST read "Sin datos", never 0.
  - An hour listed in `hoursAboveNominalPower` MUST be highlighted in the warning style, and
    explained in a line under the hours.
- **Rationale:** The file has one column per hour of the local day, so the admin reviews the same
  hours it carries. A gap is not a measured zero.
- **Implements:** SCL-002, SCL-004, SCL-011
- **Source:** #455

### UI-SCL-008 — A download is the month shown, in the format chosen

- **Status:** Active
- **Rule:**
  - "Descargar fichero" MUST ask for the file of the month the response shows, never a default, in
    the format selected: "Endesa (Excel en ZIP)" (the default) or "Genérico (CSV)".
  - It MUST save the file under the name in `Content-Disposition`.
  - While the month selected is loading it MUST be disabled; while the file downloads it MUST read
    "Descargando…" and be disabled.
- **Rationale:** The file is what was reviewed. The month in the address and the one shown differ
  only while a new month loads.
- **Implements:** SCL-014, SCL-015
- **Source:** #455

### UI-SCL-009 — A month with warnings is confirmed first

- **Status:** Active
- **Rule:** With at least one warning raised, "Descargar fichero" MUST first open the shared
  confirmation overlay "Vas a descargar un fichero incompleto", listing the warnings' texts, with
  "Tú decides si lo envías. Revisa los avisos antes de mandarlo a la comercializadora.",
  "Cancelar", which asks for nothing, and "Descargar igualmente". Without warnings, the download
  MUST start at once.
- **Rationale:** Warnings never block the file, so the admin decides; the app shows the risk at the
  moment of deciding.
- **Implements:** SCL-020
- **Source:** #455

### UI-SCL-010 — Endesa's format without a CIL

- **Status:** Active
- **Rule:**
  - With "Endesa (Excel en ZIP)" selected and no CIL in the claim, the summary MUST show the warning
    notice "Falta el CIL de la planta. Endesa lo necesita para identificar la instalación." with
    "Añadir CIL" instead of "Descargar fichero". A `409` `SURPLUS_CLAIM_CIL_REQUIRED` from the
    download MUST show the same notice.
  - "Genérico (CSV)" MUST never be blocked.
  - "Añadir CIL" MUST open the plant's edit form; saving it MUST read the claim again.
  - A refusal MUST be forgotten once the month, the format or the claim's CIL changes.
- **Rationale:** A blocking reason is visible text, and an action bound to fail is not offered. A
  refusal that outlived its cause would hide the download for good.
- **Implements:** SCL-016
- **Source:** #455

### UI-SCL-011 — A failed download

- **Status:** Active
- **Rule:** Any other failed download MUST show, inside the summary, "No se pudo descargar el
  fichero de {mes}." with "Reintentar", which MUST repeat the same request.
- **Rationale:** The failure is shown where the download was asked for, and retrying needs no other
  choice.
- **Implements:** n/a
- **Source:** #455

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | Skeletons in place of the summary and the days | — |
| Plant not found, or another community's | "Planta no encontrada" | — |
| Claim read failed | "No se pudo cargar la reclamación de excedentes." | Reintentar |
| Another month loading | The month shown so far, the selector on the new one | Month; download disabled |
| No warnings | The summary and the days; no count, no warnings | Month, format, download |
| With warnings (normal) | The count and its warning notices, warning style, no error colour | Ver avisos; download through the confirmation |
| Endesa without a CIL | The CIL notice in place of the download | Añadir CIL; another format |
| Downloading | "Descargando…", disabled | — |
| Download failed | The failure inside the summary | Reintentar |

## Accepted exceptions

None.
