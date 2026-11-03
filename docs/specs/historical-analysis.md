# UI spec document — Historical analysis

| | |
| --- | --- |
| **Prefix** | `UI-HIS` |
| **Status** | Active |
| **Routes** | `/historical-analysis` |
| **Roles** | A caller who may read the active community (`canRead`): members and community admins |
| **Domain rules** | EPR-001, EPR-003, EPR-004 (lucoenergia/conluz#409); SEM-001 (lucoenergia/conluz#408); SEM-002, SEM-003, SEM-004, ENM-006, ENM-007, ENM-008 (lucoenergia/conluz#411); MCS-001, MCS-002 (lucoenergia/conluz#410); ADR-0005 in lucoenergia/conluz |
| **Design reference** | Claude Design round 2 copy deck; round 3 copy deck for the period (#248); the member consumption analysis design, option A, for the evolution charts (#250) |
| **Last reviewed against code** | #250 |

Scope: the page shell, its menu entry and its supply selector (#247), the period: its anchor,
selector, custom range picker, header and query string (#248), the period's card and totals
(#249), and the energy and savings evolution charts (#250). The table and CSV are specified by the
later issues of lucoenergia/conluz#405 as they land; they read the period through
`useHistoricalPeriod` (`src/pages/historical-analysis/HistoricalPeriodContext.tsx`).

## Purpose

Let a caller look back at what their own supplies consumed and saved in the community they are
working in, all of them together or one at a time. A community admin sees their own supplies here
too, never the other members'.

## Rules

### UI-HIS-001 — The selector lists only the caller's own enabled supplies in the active community

- **Status:** Active
- **Rule:** The historical analysis page MUST list only the caller's own enabled supplies in the
  active community, for members and community admins alike. The selector, labelled "Punto de
  suministro", MUST offer "Todos mis puntos" first, as the default, then one option per supply as
  "{nombre} · {CUPS}", the name falling back to the address as UI-SUP-010 does. An option MUST be
  tagged "Punto de planta" exactly when the supply's `plant` reference is non-null. The footer "Solo
  aparecen tus puntos activos en esta comunidad." MUST be shown under it. Below `sm` the selector
  MUST open as a bottom sheet.
- **Rationale:** Supply management lives on another screen; this one is about the caller's own
  energy, so an admin reading the community's whole list would analyse other members' supplies. The
  caller's own listing spans every community they belong to, so it is narrowed to the active one. A
  disabled supply is hidden until what a disabled supply means is decided, and the footer says so.
  The plant tag reads the reference the backend sets for a plant's own supply
  (lucoenergia/conluz#411), never the supply's name.
- **Implements:** n/a
- **Source:** #247

### UI-HIS-002 — The selection is held in the address, and does not survive a community switch

- **Status:** Active
- **Rule:** The selected supply MUST be held in `?supplyId=`. An id the caller cannot select
  (somebody else's supply, one in another community, a disabled one, or an unknown id) MUST fall
  back to "Todos mis puntos" without an error, and the parameter MUST be removed, once the listing
  has succeeded; while the listing is pending or has failed, the parameter MUST be left as it is. A
  community switch MUST drop the parameter, and the page remounts on "Todos mis puntos".
- **Rationale:** Another page can link here with a supply preselected. A stale or foreign link is an
  ordinary case, not a failure, so it lands on the default instead of an error. Nothing is known
  about an id until the listing answers, so it is not removed early. A supply belongs to one
  community, so its id cannot follow the caller into another.
- **Implements:** n/a
- **Source:** #247

### UI-HIS-003 — No own supply here is a neutral state, not a failure

- **Status:** Active
- **Rule:** With no own enabled supply in the active community, the page MUST show the neutral notice
  "No tienes puntos de suministro en esta comunidad", with no alert colour and no controls, for a
  member and a community admin alike. A failed listing MUST NOT show that notice nor the selector, and
  MUST report the error as the supply list does.
- **Rationale:** Owning no supply in a community is an ordinary situation, especially for an admin.
  A failed read says nothing about ownership, so presenting it as "you have none" would be false.
- **Implements:** n/a
- **Source:** #247

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
- **Rule:** Granularity MUST be daily up to 62 calendar days in `APP_TIME_ZONE`, and whole months
  above, for presets and custom ranges alike. A longer range MUST be snapped to the whole months
  containing its first and last day. A snapped period MUST be shown to the user: the range picker
  announces the resulting period and granularity before it is applied, and the header says what was
  picked and what is shown. Each preset MUST show the period it resolves to and its granularity.
- **Rationale:** Counting calendar days rather than elapsed time keeps the cut from moving with a
  daylight-saving change, and lets two full months (62 days) stay daily. Snapping makes the totals
  and the monthly buckets cover the same period; saying so keeps the widened range from surprising
  the user.
- **Implements:** ADR-0005 in lucoenergia/conluz
- **Source:** #248

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
  "excedentes", and any formula, MUST appear only in the tooltip of the card's caption.
- **Rationale:** Two percentages of equal weight invite comparing numbers that measure different
  things; one figure and its consequence in words read without knowing either technical term. The
  terms stay one tap away for whoever knows them.
- **Implements:** n/a
- **Source:** #249

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
  which are shown as gaps (UI-HIS-015). The day or month at `endDate` MUST NOT get a slot. Buckets
  MUST be matched to slots by their `date`.
- **Rationale:** The supply monthly series leaves out a month with nothing stored. An axis built
  from the buckets would close that month up, with no gap and no mark to show it is missing.
- **Implements:** EPR-001 (lucoenergia/conluz#409), under which a period is half-open. MCS-001
  (lucoenergia/conluz#410), under which the membership daily series emits every local day of the
  period.
- **Source:** #250

### UI-HIS-017 — The energy chart shows consumption as one stacked bar and unused assigned energy beside it

- **Status:** Active
- **Rule:** The energy chart MUST show each slot's consumption as one bar, with community energy
  stacked with grid energy. It MUST show the assigned energy that went to the grid unused as a
  separate bar beside it. The legend MUST group the series into the consumption bar and the unused
  assigned energy, and a caption MUST say that the separate bar is not part of the caller's
  consumption.
- **Rationale:** Energy that went to the grid unused is not part of what the caller consumed.
  Stacked onto the consumption bar, it would overstate consumption. The legend and the caption say
  so in words, rather than leaving the difference to the bars' positions.
- **Implements:** n/a
- **Source:** #250, design option A chosen by the maintainer

### UI-HIS-018 — Bucket labels are calendar dates read from the bucket's date

- **Status:** Active
- **Rule:** Bucket labels MUST be calendar dates read from the bucket's `date` string (`yyyy/MM/dd`),
  formatted in `APP_TIME_ZONE`, on the axis and in the tooltips. A `date` MUST never be parsed as
  an instant, and the device's clock and zone MUST never be read. Below `sm`, each chart MUST keep
  a width its slots need and scroll sideways inside its card, with a hint saying so, while the page
  MUST NOT scroll sideways. The axis MUST label only every Nth slot, never rotated, so that at 62
  daily slots on 390 px no two labels overlap.
- **Rationale:** A bucket's `date` is a day in the community's calendar. Read as a midnight in the
  device's zone, it lands on the previous day east of Madrid (Kiritimati), and the label and the
  slot it is matched to move with it. A label on every one of 62 days does not fit at 390 px.
- **Implements:** n/a
- **Source:** #250

### UI-HIS-019 — The series is requested for the selected scope, granularity and bounds

- **Status:** Active
- **Rule:** The evolution series MUST be asked by the period's explicit `startDate` and `endDate`,
  as follows:

  | Scope | Daily | Monthly |
  | --- | --- | --- |
  | "Todos mis puntos" | the membership daily series | the membership monthly series |
  | A single supply | the supply's daily series | the supply's monthly series |

  Only the series for the selected scope and granularity MAY run, and none while the period is
  unknown. While it is pending, a placeholder MUST stand in the charts' place. A failed request
  MUST show an error with "Reintentar".
- **Rationale:** Asking by the period's own bounds keeps the buckets on the period that the card
  and the totals cover. One query at a time keeps a scope from fetching another scope's series.
- **Implements:** EPR-001 (lucoenergia/conluz#409), under which the bounds are half-open.
- **Source:** #250

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

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | The title and a placeholder where the selector goes | None |
| Empty | The title and the neutral notice (UI-HIS-003) | None |
| Supplies, anchor pending | The title, the supply selector and a placeholder where the period selector goes | Choosing a supply |
| Supplies, nothing published | The title, the supply selector and the neutral "Todavía no hay datos publicados" (UI-HIS-005) | Choosing a supply |
| Supplies, anchor failed | The title, the supply selector and an error with "Reintentar" | Choosing a supply, retrying |
| Supplies, period, figures pending | The selectors, the period header and a placeholder where the card goes (UI-HIS-010) | Choosing a supply or a period |
| Supplies, period, figures failed | The selectors, the period header and an error with "Reintentar" (UI-HIS-010) | Choosing a supply or a period, retrying |
| Supplies, period, figures | The selectors, the period header, the card in the state its status gives (UI-HIS-013) and the totals | Choosing a supply or a period |
| Supplies, period, series pending | Under the figures, a placeholder where the evolution charts go (UI-HIS-019) | Choosing a supply or a period |
| Supplies, period, series failed | Under the figures, an error with "Reintentar" (UI-HIS-019) | Choosing a supply or a period, retrying |
| Supplies, period, series | Under the figures, the evolution card: coverage line, notices, the energy chart (UI-HIS-017) and the savings chart, every slot complete, measured zero, gap or partial (UI-HIS-015), and the marks' key | Choosing a supply or a period; hovering a slot for its tooltip |
| Error | The title only; the error is reported as on the supply list | None |

## Accepted exceptions

| Exception | Reason | Expires when | Source |
| --- | --- | --- | --- |
| Disabled supplies are hidden from the selector | What a disabled supply means is not decided yet | The disabled-supply decision is made | #247 |
