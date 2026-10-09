---
name: Feature
about: A change to what the app does
labels: ''
---

## Context

<!-- What is true today, and why that is a problem. -->

## Scope

<!-- What this covers, and what it deliberately does not. -->

## Visibility

**Mandatory.** Every affordance in this app is rendered from a capability the backend returns on the
resource it concerns. Decide who may see this *before* it is built, not in review.

| Question | Answer |
| --- | --- |
| Who may see or do this | <!-- e.g. a community admin of the plant's community; the supply's owner --> |
| Capability and scope | <!-- e.g. `plant.canManage` (resource), `community.canManage` (active community), `platform.canListUsers` --> |
| Does that capability exist yet | <!-- yes / no — if no, the backend issue it needs --> |
| Inventory row | <!-- the capability-inventory entry in `conluz`, or "new" --> |
| `routeAccess` / `endpointScope` entries needed | <!-- paths, or "none" --> |

If the honest answer is "any authenticated caller", say that and say why — it is a decision, and it
needs a reason that survives reading.

## Tasks

- [ ] <!-- ... -->

## Acceptance criteria

- <!-- Observable, and checkable by someone who did not write the code. -->

## Spec impact

<!-- UI rules in docs/specs/ that this issue adds, changes or removes. Cite existing rules by ID.
     New rules use placeholders (NEW-1, NEW-2…); the ID is assigned when the spec document is
     updated. Domain rules are cited by their ID in lucoenergia/conluz. If the screen has no spec
     document yet, write "Spec document created by this issue" and list only the rules this issue
     touches. If no behaviour changes, write "None" and why. -->

| Rule | Change | Statement | Rationale |
| --- | --- | --- | --- |
| <!-- UI-SUP-001 / NEW-1 --> | <!-- Added / Changed / Removed --> | <!-- MUST / MUST NOT / MAY … --> | <!-- why --> |
