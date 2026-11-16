# UI spec document — Charts

| | |
| --- | --- |
| **Prefix** | `UI-CHT` |
| **Status** | Active |
| **Routes** | Every screen that draws a chart: `/home/member`, `/historical-analysis`, `/community-analysis`, `/plants/:plantId` |
| **Roles** | Whoever the screen is open to |
| **Domain rules** | n/a |
| **Design reference** | The member consumption analysis design, round 3, for the mobile charts (#361) |
| **Last reviewed against code** | #425 |

Scope: how a bar chart renders below `sm`, and which modules may draw one (#425). The rules of
each screen's own charts live in that screen's spec document: UI-HIS-025 and UI-HIS-026 for the
evolution card, UI-HOM-015 for the member home.

## Purpose

Let a member read every slot of a chart on a phone, where about 90 % of use happens, without
scrolling sideways and without missing the part of the series that does not fit.

## Rules

### UI-CHT-001 — Below sm, a bar chart is rows, and nothing scrolls sideways

- **Status:** Active
- **Rule:** Below `sm`, every bar chart MUST render as a list of rows, one per slot, in axis order,
  with horizontal bars on one scale per chart. Gaps, measured zeros and partial slots keep their
  marks. Neither the page nor a chart MAY scroll sideways. Area and line charts are not bar charts.
- **Rationale:** At phone width, vertical bars fit only by scrolling sideways, and they hide most of
  the series: the member home showed September to March and 0 h to 10 h, with nothing to say the
  rest was off-screen. Rows read top to bottom, like the rest of the page. Below `sm` the chart is
  not mounted at all, since a chart hidden with CSS still draws its bars.
- **Implements:** n/a
- **Source:** #425; first applied to the evolution card in #361 (UI-HIS-025)

### UI-CHT-002 — Bar-chart rows come from the shared components, and ApexCharts from an allowlist

- **Status:** Active
- **Rule:** Bar-chart rows MUST be built from the shared rows components in
  `src/components/evolution/`. A module MAY import `react-apexcharts` only if it is on the lint
  allowlist with its reason.
- **Rationale:** One pattern for every chart, so a phone shows a gap, a measured zero or a partial
  slot the same way everywhere. Each screen used to decide its own mobile layout, which is how the
  member home came to scroll sideways. The allowlist means a new chart module is reviewed before it
  ships, and each entry says why it complies: mounted only from `sm` up, or not a bar chart.
- **Implements:** n/a
- **Source:** #425

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| From `sm` up | Each screen's charts, as its own spec document describes them | Hovering a slot for its tooltip |
| Below `sm` | Each bar chart as rows: a scale, then a row per slot with its label, its bars, its marks and its figure (UI-CHT-001) | Activating a row that has a detail, where the screen's spec document gives it one |

## Accepted exceptions

None.
