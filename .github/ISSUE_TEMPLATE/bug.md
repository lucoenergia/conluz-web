---
name: Bug
about: Something behaves incorrectly
labels: ''
---

## Problem

<!-- What happens, and what should happen instead. -->

## Rule

<!-- The rule in docs/specs/ this bug violates, by ID (e.g. UI-SUP-001). If no rule covers this
     behaviour, write "No rule covers this": the fix must add one. -->

## How to reproduce

<!-- The persona matters: a member, a community admin, a platform admin, or a caller with no
     community see different things, and most gating bugs only appear for one of them. Say which,
     and which community was active. -->

1. <!-- ... -->

## Visibility

**Mandatory for anything about what a user can see or do.** Write "not a visibility bug" if it is
genuinely unrelated.

| Question | Answer |
| --- | --- |
| Persona that sees the bug | <!-- member / community admin / platform admin / no community --> |
| Capability that should govern it | <!-- e.g. `supply.canEdit` --> |
| What the backend answers | <!-- the capability's value in the payload, if you have it --> |
| Is the UI offering something the backend refuses | <!-- yes / no — a 403 or 404 in the network tab is the tell --> |

## Severity

<!-- Does it expose another community's data, or offer an action that fails? Say so plainly: a
     defect that breaks users once a dependent change ships is a release blocker, not debt. -->
