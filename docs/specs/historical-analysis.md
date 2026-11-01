# UI spec document — Historical analysis

| | |
| --- | --- |
| **Prefix** | `UI-HIS` |
| **Status** | Active |
| **Routes** | `/historical-analysis` |
| **Roles** | A caller who may read the active community (`canRead`): members and community admins |
| **Domain rules** | EPR-001, EPR-003, EPR-004 (lucoenergia/conluz#409); SEM-001 (lucoenergia/conluz#408); ADR-0005 in lucoenergia/conluz |
| **Design reference** | Claude Design round 2 copy deck; round 3 copy deck for the period (#248) |
| **Last reviewed against code** | #248 |

Scope: the page shell, its menu entry and its supply selector (#247), and the period: its anchor,
selector, custom range picker, header and query string (#248). The figures, charts, table and CSV
are specified by the later issues of lucoenergia/conluz#405 as they land; they read the period
through `useHistoricalPeriod` (`src/pages/historical-analysis/HistoricalPeriodContext.tsx`).

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
  publicado" is that month; "Este año" runs from January of its year to it; "Últimos 12 meses" is
  the 12 months ending with it; a custom range MUST NOT end after it. Bounds MUST be half-open, built
  from calendar days in `APP_TIME_ZONE`. "Este año" with the anchor in December MUST show the
  neutral state "Aún no hay datos de {año siguiente}" with a "Ver últimos 12 meses" button, and with
  no published month the page MUST show the neutral state "Todavía no hay datos publicados" and no
  period selector; neither uses alert colours.
- **Rationale:** Before publication, self-consumption reads as a measured zero, so a period that
  reaches past the published month shows invented figures. A supply's own month is used because its
  owner's membership may count a month another supply published. The current month is never
  published, so an anchor in December means the current year has nothing yet; without the device
  clock, an anchor in November during the first days of January still reads as the current year.
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

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | The title and a placeholder where the selector goes | None |
| Empty | The title and the neutral notice (UI-HIS-003) | None |
| Supplies, anchor pending | The title, the supply selector and a placeholder where the period selector goes | Choosing a supply |
| Supplies, nothing published | The title, the supply selector and the neutral "Todavía no hay datos publicados" (UI-HIS-005) | Choosing a supply |
| Supplies, anchor failed | The title, the supply selector and an error with "Reintentar" | Choosing a supply, retrying |
| Supplies, "Este año" before January is published | The selectors and the neutral "Aún no hay datos de {año}" (UI-HIS-005) | Choosing a supply or a period, "Ver últimos 12 meses" |
| Supplies, period | The selectors, the period header and the content region | Choosing a supply or a period |
| Error | The title only; the error is reported as on the supply list | None |

## Accepted exceptions

| Exception | Reason | Expires when | Source |
| --- | --- | --- | --- |
| Disabled supplies are hidden from the selector | What a disabled supply means is not decided yet | The disabled-supply decision is made | #247 |
| "Este año" reads the anchor's year unless the anchor is December, so in the first days of January it still shows the previous year | The device clock is never read, and the server does not report the current year | The server resolves the current year, or publication state per bucket (ADR-0005's revisit conditions) | #248 |
