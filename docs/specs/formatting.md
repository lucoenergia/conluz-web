# UI spec document — Formatting of figures, dates and chart labels

| | |
| --- | --- |
| **Prefix** | `UI-FMT` |
| **Status** | Active |
| **Routes** | Every route that shows a figure with a unit, a date or a time chart: `/`, `/production`, `/production/:plantId`, `/supply-points`, `/supply-points/:supplyPointId`, and the sharing agreement screens |
| **Roles** | Every signed-in caller |
| **Domain rules** | n/a |
| **Design reference** | n/a |
| **Last reviewed against code** | #255 |

## Purpose

Show every figure, date and chart label the same way, wherever it appears and whatever device reads
it: Spanish number formatting with a decimal comma, one spacing between a value and its unit, and the
community's local time rather than the device's. The subject is how values are written, not which
values a screen shows.

## Rules

### UI-FMT-001 — Figures with units go through the shared formatters

- **Status:** Active
- **Rule:** A numeric value displayed with a unit (kWh, kW, %, €, €/kWh) MUST be formatted through the
  shared formatting helpers in `src/utils/` (`formatKilowattHours`, `formatAverageKilowattHours`,
  `formatKilowatts`, `formatPercentage`, `formatEuros`, `formatEurosPerKilowattHour`). Components MUST
  NOT format a displayed figure with `toFixed` or by interpolating the raw number. This includes chart
  axis labels and tooltips.
- **Rationale:** One formatting path keeps the decimal separator, the precision and the unit spacing
  consistent: a figure built by hand rendered "12.57 kWh" where the shared formatter writes "12,57 kWh". It is
  also the single place to make locale-aware later. A helper's input scale is part of its contract:
  `formatPercentage` takes a 0–1 share, so a caller holding a 0–100 number divides it first.
- **Implements:** n/a
- **Source:** #255

### UI-FMT-002 — Dates and chart time labels are in the app time zone

- **Status:** Active
- **Rule:** A displayed date, and a chart label for an hour, day, month or year, that is computed from
  an instant MUST be computed in `APP_TIME_ZONE` (`src/utils/formatCalendarDate.ts`), never in the
  device time zone. The same holds for a grouping that decides which day, month or year an instant
  belongs to. A local calendar date or local time the API sends without an offset is displayed as the
  date or time it names, with no time-zone conversion.
- **Rationale:** Community energy data is defined in the community's local time. Read in the device's
  zone, an instant near midnight lands on another day, a New Year's instant in another year, and an
  hourly chart is shifted, which makes it misleading. A value with no offset already names the
  community's local date or time, so converting it would move it instead.
- **Implements:** n/a
- **Source:** #255

### UI-FMT-003 — Each bar of an hourly chart carries its own hour

- **Status:** Active
- **Rule:** Each bar of an hourly chart MUST be labelled with the hour of its own data point, as the
  data point states it. A label MUST NOT be derived from the bar's position.
- **Rationale:** A day view where every bar shows the same hour cannot be read.
- **Implements:** n/a
- **Source:** #255

## States

Not applicable: these rules govern how values are written in every state of every screen that
shows them.

## Accepted exceptions

| Exception | Reason | Expires when | Source |
| --- | --- | --- | --- |
| The literal "100,0000 %" in the sharing agreement sentences (`sharingAgreementLifecycle.ts`, `sharingAgreementGapMessage.ts`) | Out of scope of #255. The literal already renders in the shared formatter's form. | #<issue> routes it through `formatPercentage` | #255 |
