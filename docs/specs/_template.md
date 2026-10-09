# UI spec document — <Screen or flow name>

| | |
| --- | --- |
| **Prefix** | `UI-<PREFIX>` |
| **Status** | Draft \| Active |
| **Routes** | `/<route>`, ... |
| **Roles** | <roles that can access it> |
| **Domain rules** | `lucoenergia/conluz`: <PREFIX>-NNN, ... |
| **Design reference** | <Claude Design link or design-system section> |
| **Last reviewed against code** | #<issue> |

<!-- Domain rules are cited by ID; the prefix registry in lucoenergia/conluz → docs/specs/README.md maps each prefix to its file. -->

## Purpose

<What the user achieves on this screen or flow. Assume mobile first (90% of usage).>

## Rules

<!--
UI behaviour only. Domain rules are referenced by ID, never restated.
Styling values come from the theme tokens (references/theme-tokens.md); never write colour codes or pixel values here.
A rule motivated by an architectural decision links its ADR (docs/decisions/adrs/) in its Rationale.
-->

### UI-<PREFIX>-001 — <Short title>

- **Status:** Active
- **Rule:** <Normative, testable statement about what is rendered or how it behaves.>
- **Rationale:** <Why.>
- **Implements:** <PREFIX>-NNN (domain), or `n/a` for UI-only rules
- **Source:** #<issue>

## States

<!-- Every state the screen can be in and what is rendered. Alert colouring only for real failures. -->

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | <...> | <...> |
| Empty | <...> | <...> |
| Incomplete (normal) | <neutral, no alert colour> | <...> |
| Error | <...> | <...> |

## Accepted exceptions

| Exception | Reason | Expires when | Source |
| --- | --- | --- | --- |
| <description> | <reason> | <condition> | #<issue> |

---

<!--
EXAMPLE (delete when using the template)

### UI-SUP-001 — Blocking reasons are visible text

- **Status:** Active
- **Rule:** When an action is unavailable, the reason MUST be rendered as visible text next to it, never only in a tooltip.
- **Rationale:** Most users are on mobile, where tooltips are not discoverable.
- **Implements:** n/a
- **Source:** #<issue>

### UI-SUP-002 — Actions that will fail are not rendered

- **Status:** Active
- **Rule:** An action whose outcome is guaranteed to fail MUST NOT be rendered.
- **Rationale:** Showing it only to return an error adds a dead end.
- **Implements:** SUP-001
- **Source:** #<issue>
-->
