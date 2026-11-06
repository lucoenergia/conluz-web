# UI spec document — Historical analysis

| | |
| --- | --- |
| **Prefix** | `UI-HIS` |
| **Status** | Active |
| **Routes** | `/historical-analysis` |
| **Roles** | A caller who may read the active community (`canRead`): members and community admins |
| **Domain rules** | EPR-001, EPR-003, EPR-004 (lucoenergia/conluz#409); EPR-005 (lucoenergia/conluz#545, #546); SEM-001 (lucoenergia/conluz#408); SEM-002, SEM-003, SEM-004, ENM-006, ENM-007, ENM-008 (lucoenergia/conluz#411); MCS-001, MCS-002 (lucoenergia/conluz#410); SCS-001 (lucoenergia/conluz#545); MCS-003 (lucoenergia/conluz#546); ADR-0005 in lucoenergia/conluz |
| **Design reference** | Claude Design round 2 copy deck; round 3 copy deck for the period (#248); the member consumption analysis design, option A, for the evolution charts (#250) and the data table and CSV (#251); its round 3, for the mobile charts and the paired terms (#361) |
| **Last reviewed against code** | #385 |

Scope: the page shell, its menu entry and its supply selector (#247), the period: its anchor,
selector, custom range picker, header and query string (#248), the period's card and totals
(#249), the energy and savings evolution charts (#250), and the data table with its CSV download
(#251), and a community admin's way in to a supply of the community from its detail page (#252),
including an admin who owns no supplies (#385);
the mobile charts and the terms paired across the charts, the table and the CSV (#361); a single
day shown hour by hour (#378).
All of them read the period through `useHistoricalPeriod`
(`src/pages/historical-analysis/HistoricalPeriodContext.tsx`).

## Purpose

Let a caller look back at what their own supplies consumed and saved in the community they are
working in, all of them together or one at a time. A community admin lists only their own supplies
here too, and opens another member's supply from its detail page, one at a time.

## Rules

### UI-HIS-001 — The selector lists the caller's own enabled supplies, and a community admin may open any enabled supply of the active community

- **Status:** Active
- **Rule:**
  - The page MUST list the caller's own enabled supplies in the active community and "Todos mis
    puntos", for members and community admins alike. The selector, labelled "Punto de suministro",
    MUST offer "Todos mis puntos" first among them, as the default, then one option per supply as
    "{nombre} · {CUPS}", the name falling back to the address as UI-SUP-010 does. An option MUST be
    tagged "Punto de planta" exactly when the supply's `plant` reference is non-null. The footer
    "Solo aparecen tus puntos activos en esta comunidad." MUST be shown under it. Below `sm` the
    selector MUST open as a bottom sheet.
  - A community admin MAY open any enabled supply of the active community through `?supplyId=`. It
    is looked up only when the active community reports `canManage`, and selectable only when it is
    enabled, belongs to the active community and reports `canRead`.
  - That supply MUST be shown in its own group, "Punto que estás consultando", above the caller's
    own, labelled "{nombre} · {CUPS} · {titular}" when the response carries the owner's member
    record and "{nombre} · {CUPS}" when it does not. Choosing any other option MUST remove it from
    the selector.
  - For a caller who owns no supplies, the selector MUST list only the viewed supply, with no
    "Todos mis puntos" and no footer, in the dropdown and in the bottom sheet alike.
  - "Todos mis puntos" MUST stay the caller's own supplies, read from the caller's own membership.
    For a caller who owns no supplies the membership MUST NOT be asked at all: not its latest
    published month, not its figures, not its series.
- **Rationale:** Supply management lives on another screen, and this one is about the caller's own
  energy, so the list is never the community's whole. A community admin still sees every figure of
  the supplies they manage, through this one analysis page, opened from the supply's detail page
  (UI-SUP-015), rather than a second analysis screen. The caller's own listing spans every
  community they belong to, so it is narrowed to the active one. A disabled supply is hidden until
  what a disabled supply means is decided, and the footer says so. The plant tag reads the
  reference the backend sets for a plant's own supply (lucoenergia/conluz#411), never the supply's
  name. The owner's member record, when the response carries one, says whose supply the admin is
  reading, with no second request. For a caller who owns no supplies, "Todos mis puntos" would
  always be empty and the footer would describe a list that is not there, so neither is offered,
  and the membership they would read is never asked.
- **Implements:** n/a
- **Source:** #247; changed in #252 (a community admin opens a supply of the community); changed
  in #385 (a community admin who owns no supplies)

### UI-HIS-002 — The selection is held in the address, and does not survive a community switch

- **Status:** Active
- **Rule:**
  - The selected supply MUST be held in `?supplyId=`.
  - An id the caller cannot select MUST fall back to "Todos mis puntos" without an error, or, for a
    caller who owns no supplies, to the neutral state (UI-HIS-003), and the parameter MUST be
    removed, only after it has been resolved: for one of the caller's own
    supplies, once the listing has succeeded; for any other id, once the active community's
    `canManage` and, where it is granted, the supply's lookup have answered. While any of them is
    pending, or the listing has failed, the parameter MUST be left as it is.
  - For a community admin, an enabled supply of the active community that reports `canRead` is
    selectable (UI-HIS-001). Somebody else's supply for a caller without `canManage`, a supply of
    another community, a disabled one, one that does not report `canRead`, an unknown id and a
    failed lookup are not.
  - A refused or missing lookup MUST NOT be retried.
  - A community switch MUST drop the parameter, and the page remounts on "Todos mis puntos".
- **Rationale:** Another page can link here with a supply preselected. A stale or foreign link is an
  ordinary case, not a failure, so it lands on the default instead of an error. Nothing is known
  about an id until what decides it has answered, so it is not removed early. Asking again for a
  supply that was refused or does not exist changes nothing and only delays the fallback. A supply
  belongs to one community, so its id cannot follow the caller into another.
- **Implements:** n/a
- **Source:** #247; changed in #252 (a community admin's selectable supplies); changed in #385 (the
  fallback for a caller who owns no supplies)

### UI-HIS-003 — No own supply here is a neutral state, not a failure

- **Status:** Active
- **Rule:**
  - The neutral notice "No tienes puntos de suministro en esta comunidad", with no alert colour and
    no controls, MUST be shown only when the caller owns no enabled supply in the active community
    and there is no selectable viewed supply (UI-HIS-001), and never while either is still being
    resolved: while the listing, the active community's `canManage` or the supply's lookup is
    pending, a placeholder MUST be shown instead. This holds for a member and a community admin
    alike.
  - A failed listing MUST NOT show that notice nor the selector, and MUST report the error as the
    supply list does.
  - For a caller who owns no supplies, a lookup of the viewed supply that failed (a server or
    network error, not a refusal) MUST be shown as an error with "Reintentar", which asks again,
    never as the neutral notice, and `?supplyId=` MUST be left as it is.
- **Rationale:** Owning no supply in a community is an ordinary situation, especially for an admin,
  who can still analyse the supplies they manage. A failed read says nothing about ownership or
  about the supply, so presenting it as "you have none" would be false; with no "Todos mis puntos"
  to fall back to, the caller is offered the retry instead.
- **Implements:** n/a
- **Source:** #247; changed in #385 (a community admin who owns no supplies opens a supply of the
  community)

### UI-HIS-004 — The community menu leads here right after Inicio

- **Status:** Active
- **Rule:** The community menu MUST list "Mi consumo y ahorro" right after "Inicio", requiring the
  active community's `canRead`, as the route does. The `/supply-points` entry MUST read "Puntos de
  suministro".
- **Rationale:** This page is the caller's own analysis, second only to the home. With it in the
  menu, "Consumo" no longer described the supply list, which manages supply points.
- **Implements:** n/a
- **Source:** #247

### UI-HIS-005 — Periods end at the latest month published for the selected scope, never at the device clock

- **Status:** Active
- **Rule:** Historical periods MUST end no later than the server-resolved latest published month of
  the selected scope, and MUST never be derived from the device clock or the device's time zone.
  "Todos mis puntos" MUST take that month from the membership's energy metrics with
  `period=LATEST_PUBLISHED_MONTH`, and a single supply from that supply's own. "Último mes
  publicado" is that month; "Año {año}" is named after its year and runs from January of that year
  to it; "Últimos 12 meses" is the 12 months ending with it; a custom range MUST NOT end after it.
  Bounds MUST be half-open, built from calendar days in `APP_TIME_ZONE`. With no published month the
  page MUST show the neutral state "Todavía no hay datos publicados", without alert colours, and no
  period selector.
- **Rationale:** Before publication, self-consumption reads as a measured zero, so a period that
  reaches past the published month shows invented figures. A supply's own month is used because its
  owner's membership may count a month another supply published. The year preset is the anchor's
  year rather than "this year", so its label never assumes today's date (#248, decided by the
  maintainer in review).
- **Implements:** EPR-001, EPR-003, SEM-001; ADR-0005 in lucoenergia/conluz
- **Source:** #248

### UI-HIS-006 — Granularity follows calendar days, and a snapped period is shown

- **Status:** Active
- **Rule:** Calendar days are counted in `APP_TIME_ZONE`.
  - A custom range of a single calendar day MUST be hourly, bounded by that day's 00:00 and the
    next day's 00:00.
  - A preset MUST never be hourly.
  - Any other period MUST be daily up to 62 calendar days, and whole months above.
  - A range longer than 62 days MUST be snapped to the whole months containing its first and last
    day.

  A snapped period MUST be shown to the user: the range picker announces the resulting period and
  granularity before it is applied, and the header says what was picked and what is shown. The
  range picker's rule MUST name all three granularities. The header's granularity chip MUST read
  "Por horas", "Por días" or "Por meses". Each preset MUST show the period it resolves to and its
  granularity.
- **Rationale:** Counting calendar days rather than elapsed time keeps the cut from moving with a
  daylight-saving change, and lets two full months (62 days) stay daily. A single day shown as one
  daily bar says nothing a member can act on. Hour by hour, it shows when the consumption happened,
  which a member needs in order to move it to the best hours more precisely than a monthly average
  allows. A preset always covers at least a whole month, longer than the 31 days the hourly series
  accepts. Snapping makes the totals and the monthly buckets cover the same period, and saying so
  keeps the widened range from surprising the user.
- **Implements:** ADR-0005 in lucoenergia/conluz; EPR-005 (lucoenergia/conluz#545, #546), under
  which the hourly series accepts at most 31 calendar days.
- **Source:** #248, #378

### UI-HIS-007 — A period spans 24 months at most, after snapping

- **Status:** Active
- **Rule:** A period MUST NOT exceed 24 calendar months after snapping. The range picker MUST NOT
  apply a longer one and MUST say "El rango puede ser de 24 meses como máximo. Acorta las fechas.";
  a longer one arriving in the address falls back to "Último mes publicado" (UI-HIS-009).
- **Rationale:** The snapped period is what gets requested, and the backend refuses a longer one.
- **Implements:** EPR-004
- **Source:** #248

### UI-HIS-008 — A custom range is clamped to the anchor it meets, and the user is told

- **Status:** Active
- **Rule:** When the anchor changes, a custom range MUST be clamped to it, and the user MUST be told.
  The same rule MUST apply whenever a custom range meets an anchor: a supply switch, a community
  switch, or a link. A range ending after the anchor month MUST end on its last day instead, with
  granularity and the cap evaluated again; one that would be empty MUST fall back to "Último mes
  publicado". Either way the notice "{Este punto tiene | Tus puntos tienen} datos publicados hasta
  {mes de año}, así que hemos ajustado el periodo." MUST be shown and announced, until the user
  picks another period.
- **Rationale:** A supply can be published up to an earlier month than the membership, so a range
  valid for one scope reaches into unpublished data for another. Arriving from a link or after a
  community switch is no different from switching supply: the page has not seen the range before
  either way.
- **Implements:** ADR-0005 in lucoenergia/conluz
- **Source:** #248

### UI-HIS-009 — The period is held in the address

- **Status:** Active
- **Rule:** The period MUST be held in the query string, next to `?supplyId=`: `?period=latest`,
  `year`, `last12` or `custom`, with `?from=` and `?to=` as `yyyy-MM-dd` calendar days, both
  included, for `custom`. No `?period=` is "Último mes publicado". Invalid values (an unknown
  period, a day that does not exist, a range running backwards) MUST fall back to the default
  silently, and the address MUST be corrected with `replace`, only once the anchor has resolved:
  never while it is pending, after it failed, or when nothing is published. A community switch
  keeps the period and drops `?supplyId=` (UI-HIS-002).
- **Rationale:** A period can be linked and survives a reload. Nothing is known about what can be
  shown until the anchor answers, so the address is not corrected early.
- **Implements:** n/a
- **Source:** #248

### UI-HIS-010 — The card and the totals show the energy metrics of the resolved period and scope

- **Status:** Active
- **Rule:** Every figure on the period card and the totals MUST come from the energy-metrics response
  for the resolved period and scope; the client never computes a ratio, share or sum shown as text.
  "Todos mis puntos" MUST ask the caller's membership, and a single supply MUST ask that supply,
  both by the period's explicit `startDate` and `endDate`. Only the selected scope's request MAY
  run, and none MAY run while the period is unknown. The estimate label under the savings MUST be
  keyed on `savings.estimatedPrice`, never on `tariffSource`. While the response is pending a
  placeholder stands in the card's place; a failed request MUST show an error with "Reintentar".
- **Rationale:** The server is the one place the ratios are defined, including which supplies they
  leave out; a ratio recomputed from rounded totals can disagree with it by a point, and one
  computed from the basis would silently diverge if the definition changes. The bar's split under
  the headline is drawn from the basis but never written, so no figure on screen depends on it.
  `tariffSource` reports ESTIMATE even where nothing was priced, so keying the label on it would
  state a price beside an amount that has none.
- **Implements:** SEM-004 and ENM-008 (lucoenergia/conluz#411): the response carries the basis
  of the self-consumption ratio so that the client shows the ratio with the energy it divides and
  never recomputes it.
- **Source:** #249

### UI-HIS-011 — One headline, and the coverage of the consumption as a sentence

- **Status:** Active
- **Rule:** The period card MUST show one headline percentage, "Usaste el {%}", from
  `selfConsumptionRatio`: the share of the energy assigned to the caller that they used. The
  coverage of their consumption, from `selfSufficiencyRatio`, MUST be expressed as a sentence of
  the form "Eso cubrió {n} de cada 10 kWh de tu consumo", following the fraction rule (UI-HIS-012),
  at body size with only the fraction emphasised. The words "autoconsumo", "autosuficiencia" and
  "excedentes", and any formula, MUST NOT appear on the period card or the totals, except in the
  tooltip of the card's caption. Elsewhere on the page, "autoconsumo" and "excedentes" MAY appear
  only as UI-HIS-027 allows.
- **Rationale:** Two percentages of equal weight invite comparing numbers that measure different
  things; one figure and its consequence in words read without knowing either technical term. The
  terms stay one tap away for whoever knows them. The card and the totals are read first, by every
  member, so they keep the home terms alone. The charts, the table and the file are read by members
  who look further, and meet the technical terms there next to the home terms (UI-HIS-027).
- **Implements:** n/a
- **Source:** #249, #361

### UI-HIS-012 — The headline and the fraction never state a share the ratio does not reach

- **Status:** Active
- **Rule:** With `n` the ratio times 10 rounded half up, the fraction MUST read "Tu consumo no se
  cubrió con energía de la comunidad" when the ratio is 0, "menos de 1 de cada 10 kWh" when the
  ratio is above 0 and `n` is 0, "{n} de cada 10 kWh" when `n` is 1 to 9, "casi todo" when `n` is
  10 and the ratio is below 1, and "todo" only when the ratio is exactly 1. When the ratio is null
  the coverage row MUST NOT be shown. A percentage above 0 that rounds to 0 MUST read "menos del
  1 %", and one below 1 that rounds to 100 MUST read "casi el 100 %", in the headline and in the
  coverage detail alike.
- **Rationale:** Rounding alone would print "0" for a share that exists and "todo" or "100 %" for one
  that falls short, both claims the data does not support.
- **Implements:** n/a
- **Source:** #249

### UI-HIS-013 — The card's states follow selfConsumptionRatioStatus, and excluded plant supplies are stated

- **Status:** Active
- **Rule:** The card's state MUST be decided by `selfConsumptionRatioStatus`, never by a null ratio.
  `NOT_APPLICABLE` MUST replace the headline with "No aplica al punto de la planta" and "En el punto
  de la planta, «se fue a la red» siempre es 0 kWh.", and hide the bar and the detail.
  `NOTHING_ASSIGNED` MUST replace the headline with "En este periodo no se te asignó energía", and
  hide the bar and the detail. In both, the coverage row stays. `AVAILABLE` with
  `selfConsumptionRatioBasis.excludedPlantSupplyCount` above 0 MUST say "No incluye {n} punto(s) de
  planta" under the detail. A plant's own supply, selected alone, MUST be introduced by "{punto} es
  el punto de suministro de la planta {planta}: «se fue a la red» siempre es 0 kWh.", and its
  surplus tile MUST read "Siempre 0 en el punto de la planta". No state uses an alert colour.
- **Rationale:** A null ratio means two different things, and only the status says which. A plant's
  own supply never sends assigned energy to the grid, so a usage share there is meaningless rather
  than zero; leaving those supplies out of "Todos mis puntos" changes what the headline counts, and
  the reader is told.
- **Implements:** lucoenergia/conluz#411:
  - SEM-002 and ENM-006: nothing assigned is a null ratio reported as having nothing assigned, never
    as 0.
  - SEM-003: for a plant's own supply the ratio is null and reported as not applicable,
    distinguishable from nothing assigned.
  - ENM-007: plants' own supplies are left out of the membership ratio, and when every supply is one,
    not applicable takes precedence over nothing assigned.
  - ENM-008: the basis reports how many plants' own supplies the ratio leaves out.
- **Source:** #249

### UI-HIS-014 — Incomplete coverage is stated in words

- **Status:** Active
- **Rule:** When the response's `coverage.hoursWithData` is below `coverage.expectedHours`, the page
  MUST say "Faltan datos de parte de este periodo: las cifras suman solo los datos disponibles."
  under the card, as a neutral note. Whether the note shows MUST be decided from the response's
  coverage only. When the evolution card shows its gaps notice (UI-HIS-015), the note MUST add
  "Consulta los días afectados en la evolución." ("los meses afectados" for a monthly period).
- **Rationale:** Totals summed over missing hours look like a quiet period. The design's notice names
  the missing dates, which the coverage counts do not give, so the note says only what is known.
  Once the evolution card names the missing days, the note points there instead of leaving the
  reader with two unrelated "faltan datos" messages.
- **Implements:** n/a
- **Source:** #249; the pointer to the evolution card, #250

### UI-HIS-015 — A gap, a measured zero and a partial bucket are told apart in words and marks

- **Status:** Active
- **Rule:** A gap, a measured zero and a partial bucket MUST be told apart with words in the
  charts' tooltips and with marks on the charts, never by colour alone. A gap MUST NOT be plotted
  as 0.
  - **Signals.** A slot is a gap when the series has no bucket for it, when a membership bucket has
    `savingsEur: null`, or when a supply bucket has `obtainMethod: null`, whose zeros are
    placeholders. A membership bucket with `suppliesWithData` below `supplyCount` is partial. A
    bucket whose `selfConsumptionKWh`, `gridImportKWh` and `surplusKWh` are all 0 is a measured
    zero.
  - **Precedence.** When several signals coincide, the first that applies decides:
    gap > partial > measuredZero > complete.
  - **Tooltip.** Each tooltip MUST state the slot's date and its state. It MUST give the slot's
    figures, except on a gap, with a measured 0 marked as measured. When a plant's own supply is
    selected, it MUST also say that its "se fue a la red" is always 0. A partial state MUST give how
    many of the caller's supplies reported, and MUST NOT name a supply.
  - **Marks and key.** Each state MUST have a mark of its own shape on the chart: one for a gap, one
    for a measured zero, one for a partial bucket. A key under the charts MUST explain the marks.
  - **Notices.** The card MUST state how many slots of the period have data. When there are gaps, it
    MUST name them with one date range per run of consecutive gaps. For "Todos mis puntos" only, it
    MUST name the partial slots and how many supplies reported on them.
- **Rationale:** A day with nothing stored is not a day that used or saved nothing. Drawn as a zero
  bar, it reads as one. A colour difference is lost on readers who cannot tell the colours apart.
  The API gives only how many supplies reported, never which, so a partial state cannot name one.
  The precedence follows what each signal proves:
  - A missing record makes every other signal meaningless.
  - Zeros on a partial bucket cover only some supplies, so they are not a measurement of the
    caller's consumption.

  The copy is the design's (the member consumption analysis copy deck), not part of the rule.
- **Implements:** MCS-001 (lucoenergia/conluz#410), under which a day no supply stored a record on
  has `savingsEur` and `tariffSource` null. MCS-002 (lucoenergia/conluz#410), under which a bucket
  reports how many supplies the membership has and how many stored data.
- **Source:** #250

### UI-HIS-016 — The chart axis covers every day or month of the period

- **Status:** Active
- **Rule:** The chart axis MUST cover every day of a daily period, or every month of a monthly one,
  built from the period's bounds in the app's time zone. That includes slots the series omits,
  which are shown as gaps (UI-HIS-015). The day or month at `endDate` MUST NOT get a slot. On a
  daily or monthly axis, buckets MUST be matched to slots by their `date`. An hourly axis follows
  UI-HIS-028 instead.
- **Rationale:** The supply monthly series leaves out a month with nothing stored. An axis built
  from the buckets would close that month up, with no gap and no mark to show it is missing.
- **Implements:** EPR-001 (lucoenergia/conluz#409), under which a period is half-open. MCS-001
  (lucoenergia/conluz#410), under which the membership daily series emits every local day of the
  period.
- **Source:** #250, #378

### UI-HIS-017 — The energy chart shows consumption as one stacked bar and unused assigned energy beside it

- **Status:** Active
- **Rule:** The energy chart MUST show each slot's consumption as one bar, with community energy
  stacked with grid energy. It MUST show the assigned energy that went to the grid unused as a
  separate bar beside it. The legend MUST group the series into the consumption bar and the unused
  assigned energy. A caption MUST say that the separate bar is not part of the caller's
  consumption, and where it sits: beside the consumption bar from `sm` up, and beneath it below
  `sm` (UI-HIS-025).
- **Rationale:** Energy that went to the grid unused is not part of what the caller consumed.
  Stacked onto the consumption bar, it would overstate consumption. The legend and the caption say
  so in words, rather than leaving the difference to the bars' positions. The two layouts put the
  bar in different places, and a caption naming the wrong place sends the reader looking for a bar
  that is not there.
- **Implements:** n/a
- **Source:** #250, design option A chosen by the maintainer; #361

### UI-HIS-018 — Bucket labels are calendar dates read from the bucket's date

- **Status:** Active
- **Rule:**
  - A daily or monthly bucket's labels MUST be calendar dates read from the bucket's `date` string
    (`yyyy/MM/dd`), formatted in `APP_TIME_ZONE`, on the axis, in the tooltips, on the rows and in
    the row detail. A `date` MUST never be parsed as an instant.
  - An hourly slot's labels follow UI-HIS-028.
  - The device's clock and zone MUST never be read.
  - From `sm` up, each chart MUST keep the width its slots need and scroll sideways inside its card
    when the card is narrower. The axis MUST label only every Nth slot, never rotated, so that no
    two labels overlap.
  - Below `sm`, every row MUST carry its own label (UI-HIS-025).
- **Rationale:** A bucket's `date` is a day in the community's calendar. Read as a midnight in the
  device's zone, it lands on the previous day east of Madrid (Kiritimati), and the label and the
  slot it is matched to move with it. A label on every one of 62 days does not fit along an axis
  narrower than the slots need. Below `sm` the charts are rows, so every slot's label fits, and the
  page scrolls only vertically.
- **Implements:** n/a
- **Source:** #250, #361, #378

### UI-HIS-019 — The series is requested for the selected scope, granularity and bounds

- **Status:** Active
- **Rule:** The evolution series MUST be asked by the period's explicit `startDate` and `endDate`,
  as follows:

  | Scope | Hourly | Daily | Monthly |
  | --- | --- | --- | --- |
  | "Todos mis puntos" | the membership hourly series | the membership daily series | the membership monthly series |
  | A single supply | the supply's hourly series | the supply's daily series | the supply's monthly series |

  Only the series for the selected scope and granularity MAY run, and none while the period is
  unknown. While it is pending, a placeholder MUST stand in the charts' place. A failed request
  MUST show an error with "Reintentar".
- **Rationale:** Asking by the period's own bounds keeps the buckets on the period that the card
  and the totals cover. One query at a time keeps a scope from fetching another scope's series.
- **Implements:** EPR-001 (lucoenergia/conluz#409), under which the bounds are half-open. SCS-001
  (lucoenergia/conluz#545) and MCS-003 (lucoenergia/conluz#546), the supply and membership hourly
  series.
- **Source:** #250, #378

### UI-HIS-020 — The savings legend states the estimated price from estimatedPrice, and the charts draw in the energy colour tokens

- **Status:** Active
- **Rule:** The savings chart's legend MUST state the estimated price only from the period's energy
  metrics' `savings.estimatedPrice`, never from `tariffSource`, as UI-HIS-010 does. Every series
  in both charts MUST take its colour from `ENERGY_COLORS` or `SAVINGS_COLOR`, and from nothing
  else.
- **Rationale:** `tariffSource` reports ESTIMATE even where nothing was priced, so keying the label
  on it would state a price beside an amount that has none. One colour per energy concept across
  the app keeps a reader's reading of one chart valid on the next.
- **Implements:** n/a
- **Source:** #250

### UI-HIS-021 — The data table has one row per chart slot, with the same states and words

- **Status:** Active
- **Rule:** The data table MUST have exactly one row per slot of the evolution charts, in the
  charts' axis order, with each slot's state in the same words the charts use; a gap MUST show no
  value. Each value column's header (below `sm`, each card's label) MUST name the column's unit, and
  its cells, the totals row included, MUST hold the bare figure without its unit. The headers and
  the labels pair the terms as UI-HIS-027 says.
- **Rationale:** The table is the accessible alternative to the charts, so it must say what they
  draw, slot for slot. Reading the rows from the charts' own slots, and the words from the one
  module that holds every state's short and long form (`slotStateText.ts`), keeps the two from
  drifting apart. A gap written as a figure would read as a measured 0, which UI-HIS-015 forbids on
  the charts for the same reason. A unit stated once per column leaves the cells as figures that
  line up and compare at a glance; repeated on every row, it crowds them.
- **Implements:** MCS-001 and MCS-002 (lucoenergia/conluz#410), through the slot states of
  UI-HIS-015.
- **Source:** #251, #250, #361

### UI-HIS-022 — The table's totals row is the energy metrics' totals

- **Status:** Active
- **Rule:** The table's totals row MUST show the energy-metrics totals for the same period and
  scope, never a sum of the rows.
- **Rationale:** Each bucket and the period are rounded separately by the server, so the rows can
  add up to a figure a cent or a thousandth of a kWh away from the period's. The totals row is the
  same figure the totals under the card show (UI-HIS-010), and two totals for one period would
  contradict each other. The client counts slots by state for the row's "Datos" sentence, which is
  not a figure.
- **Implements:** n/a
- **Source:** #251, #249 (UI-HIS-010)

### UI-HIS-023 — The CSV holds the table's rows, unrounded, with the estimate on every line

- **Status:** Active
- **Rule:** The CSV MUST contain the same rows as the table, with the API's unrounded values and a
  decimal comma, empty cells on a gap, the slot's state in `datos`, and, when `estimatedPrice` is
  present, the estimated price and its note on every line. The columns that hold community energy
  and unused assigned energy MUST carry both terms in their names (UI-HIS-027).
- **Rationale:** A file taken away must carry the measurements, not the screen's rounding of them,
  and must keep a gap distinct from a measured 0. A spreadsheet in Spanish reads `;`-separated
  columns with a decimal comma, and needs the UTF-8 byte order mark to keep accents. The price and
  its note repeat on every line so that any row copied out of the file still says its savings are
  an estimate; both stay empty without `estimatedPrice`, keyed as UI-HIS-020 keys the legend. A
  file is read without the page's labels, so its column names carry the same pairs the page shows.
- **Implements:** n/a
- **Source:** #251, #361

### UI-HIS-024 — The CSV file name is the scope's ASCII slug and the period's first and last day

- **Status:** Active
- **Rule:** The CSV file MUST be named `conluz-consumo-{punto}-{desde}-{hasta}.csv`, where
  `{punto}` is an ASCII slug of the scope and `{desde}` and `{hasta}` are the period's first and
  last day.
- **Rationale:** An ASCII name survives every file system and mail client. The scope and the days
  tell two downloads apart without opening them. The last day is the one shown, the day before the
  half-open `endDate`, so the name never states a day the file has no row for.
- **Implements:** EPR-001 (lucoenergia/conluz#409), under which a period is half-open.
- **Source:** #251

### UI-HIS-025 — Below sm, the evolution charts are rows, one per slot

- **Status:** Active
- **Rule:** Below `sm`, each evolution chart MUST be a list of rows, one per slot of the axis
  (UI-HIS-016), in axis order, with horizontal bars on one scale per chart. The energy row MUST show
  the consumption bar, community energy stacked with grid energy, with the unused assigned energy
  as a thinner bar beneath it, and the slot's consumption as a figure. The savings row MUST show
  one bar and the slot's savings. A gap MUST read "Sin datos" with its mark and no figure; a
  measured zero and a partial slot MUST carry their marks (UI-HIS-015). Neither the page nor a
  chart MAY scroll sideways.
- **Rationale:** At phone width a vertical-bar chart of 62 days fits only by scrolling it sideways,
  and a member then sees a few days at a time. Rows read top to bottom, like the rest of the page.
  The consumption figure is the bucket's community energy plus its grid energy, the bar the chart
  already draws. The bucket carries no total, so the client computes it, under the accepted
  exception to UI-HIS-010 recorded below. The figure is bare, because the scale above the rows names
  the unit.
- **Implements:** MCS-001 and MCS-002 (lucoenergia/conluz#410), through the slot states of
  UI-HIS-015.
- **Source:** #361, the member consumption analysis design (copy deck `chart.mobile`); #378

### UI-HIS-026 — Below sm, activating an energy row opens its detail beneath it

- **Status:** Active
- **Rule:** Below `sm`, each energy row MUST be a button, named by its date and value, that opens
  the slot's detail just below it and reports its state through `aria-expanded`. The detail MUST
  give what the tooltip gives (UI-HIS-015): the date, the state, the plant line for a plant's own
  supply, and the figures except on a gap. Activating the open row MUST close it, and opening a row
  MUST close any other.
- **Rationale:** A phone has no hover, so the tooltip's content needs a tap. One open row at a time
  keeps the list a list rather than a stack of open details.
- **Implements:** n/a
- **Source:** #361, the member consumption analysis design (copy deck `chart.mobile`)

### UI-HIS-027 — A technical term accompanies its home term, never stands alone

- **Status:** Active
- **Rule:** In the energy legend, the tooltips and the row detail, and the data table's headers and
  cards, "autoconsumo" MUST follow "De la comunidad", and "excedentes" MUST follow "Se fue a la
  red", in muted type. Neither MAY appear alone or in its home term's place. The CSV columns carry
  both terms in their names (UI-HIS-023).
- **Rationale:** Members read the home terms first. Members who know the technical terms, or meet
  them on a bill, find them next to the words they explain. Alone, a technical term would need the
  explanation that the home term already is.
- **Implements:** n/a
- **Source:** #361, the member consumption analysis design ("El término de la home va primero y
  manda; el técnico le acompaña en gris, nunca solo ni en su lugar.")

### UI-HIS-028 — The hourly axis covers every whole local hour of the day, keyed by its instant

- **Status:** Active
- **Rule:**
  - **Axis.** The hourly axis MUST have one slot per whole hour that starts inside the period, from
    `startDate` up to `endDate`, which is excluded, counted on the instant line. The day therefore
    has 23, 24 or 25 slots.
  - **Keys and matching.** Each slot MUST be keyed by its starting instant. Buckets MUST be matched
    to slots by their `startsAt` instant, never by their `date` and `time`.
  - **Labels.** Every label MUST be the hour that the clock in `APP_TIME_ZONE` shows at that
    instant, never the device's:
    - "14 h" on the axis and below `sm`;
    - "De 14:00 a 15:00" in the tooltip and the row detail;
    - "14:00–15:00" in the data table;
    - in the CSV's `fecha`, the hour's local start with its offset, "2026-09-01T14:00+02:00".
  - **Hour names.** An hour MUST be named by the clock, ending at the next hour's name.
  - **The repeated hour.** On the day the clocks go back, both hours the clock shows as 02:00 MUST
    add "(hora repetida por el cambio de hora)" in the tooltip, the row detail and the table.
- **Rationale:**
  - On the day the clocks go back, two hours share a `date` and a `time`. Only their instants tell
    them apart, so keying by anything else would merge them.
  - Stepping on the instant line mirrors how the backend emits the hours. A slot and its bucket
    therefore meet whatever the day's length, and an hour the series omits stays on the axis as a
    gap.
  - Naming an hour by the clock reads as members say it. The hour before the March change reads
    "De 01:00 a 02:00" although the clock jumps to 03:00.
  - Without the note, the two 02:00 hours would read as a duplicate. With an offset in the CSV, a
    spreadsheet keeps them apart.
- **Implements:** SCS-001 (lucoenergia/conluz#545) and MCS-003 (lucoenergia/conluz#546), under
  which each series emits every whole hour that starts inside the period, each with a unique
  `startsAt`.
- **Source:** #378

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | The title and a placeholder where the selector goes | None |
| Empty | The title and the neutral notice (UI-HIS-003) | None |
| No own supply, another supply being resolved | The title and a placeholder where the selector goes, with `?supplyId=` left as it is (UI-HIS-003) | None |
| No own supply, viewed supply failed to load | The title and an error with "Reintentar", with `?supplyId=` left as it is (UI-HIS-003) | Retrying |
| No own supply, viewed supply | The title, the supply selector holding only "Punto que estás consultando", with no "Todos mis puntos" and no footer (UI-HIS-001), and below it what any selected supply shows | Choosing a period |
| Supplies, another supply being resolved | The title and the supply selector on "Todos mis puntos", with `?supplyId=` left as it is (UI-HIS-002) | Choosing a supply |
| Supplies, anchor pending | The title, the supply selector and a placeholder where the period selector goes | Choosing a supply |
| Supplies, nothing published | The title, the supply selector and the neutral "Todavía no hay datos publicados" (UI-HIS-005) | Choosing a supply |
| Supplies, anchor failed | The title, the supply selector and an error with "Reintentar" | Choosing a supply, retrying |
| Supplies, period, figures pending | The selectors, the period header and a placeholder where the card goes (UI-HIS-010) | Choosing a supply or a period |
| Supplies, period, figures failed | The selectors, the period header and an error with "Reintentar" (UI-HIS-010) | Choosing a supply or a period, retrying |
| Supplies, period, figures | The selectors, the period header, the card in the state its status gives (UI-HIS-013) and the totals | Choosing a supply or a period |
| Supplies, period, series pending | Under the figures, a placeholder where the evolution charts go (UI-HIS-019) | Choosing a supply or a period |
| Supplies, period, series failed | Under the figures, an error with "Reintentar" (UI-HIS-019) | Choosing a supply or a period, retrying |
| Supplies, period, series | Under the figures, the evolution card: coverage line, notices, the energy chart (UI-HIS-017) and the savings chart, every slot complete, measured zero, gap or partial (UI-HIS-015), and the marks' key; below `sm`, the same as rows (UI-HIS-025) | Choosing a supply or a period; hovering a slot for its tooltip; below `sm`, activating an energy row for its detail (UI-HIS-026) |
| Supplies, period, table pending | Under the evolution card, a placeholder where the data table goes, and "Descargar CSV" disabled | Choosing a supply or a period |
| Supplies, period, table failed | Under the evolution card, the neutral line "La tabla estará disponible cuando se carguen tus datos." and "Descargar CSV" disabled; the failure itself is reported, with "Reintentar", only by the period card (UI-HIS-010) or the evolution charts (UI-HIS-019) that own the request | Choosing a supply or a period; retrying from the block that reports the failure |
| Supplies, period, table | Under the evolution card, "Tus datos": a row per slot (UI-HIS-021), the totals row (UI-HIS-022), seven rows until "Ver todos"; below `sm`, a card per row | Choosing a supply or a period; "Ver todos" / "Ver menos"; "Descargar CSV" (UI-HIS-023, UI-HIS-024) |
| Error | The title only; the error is reported as on the supply list | None |

## Accepted exceptions

| Exception | Reason | Expires when | Source |
| --- | --- | --- | --- |
| Disabled supplies are hidden from the selector | What a disabled supply means is not decided yet | The disabled-supply decision is made | #247 |
| Below `sm`, each energy row of the evolution card shows `consumptionKWh`, computed in the client as `selfConsumptionKWh + gridImportKWh` of the same bucket (`consumptionSeries.ts` `slotOf`, shown by `EvolutionRows.tsx`, UI-HIS-025) | Departs from UI-HIS-010, under which the client never computes a sum shown as text. Accepted because it adds two fields of one bucket, for one slot, never across buckets or periods. Since each field is rounded to 3 decimals, it can differ from a server total by at most 0.001 kWh. A backend field would add a column to the five consumption bucket schemas behind the six series operations for this one figure | A series bucket carries a server-computed consumption total, or another client needs that total | #378 |
