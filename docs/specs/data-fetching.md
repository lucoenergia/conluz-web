# UI spec document — Data fetching

| | |
| --- | --- |
| **Prefix** | `UI-DATA` |
| **Status** | Active |
| **Routes** | Every route whose screen reads data through the generated API client |
| **Roles** | Every caller |
| **Domain rules** | n/a |
| **Design reference** | n/a |
| **Last reviewed against code** | #337 |

## Purpose

How the app consumes the generated API client. This document was created by #337 and covers only
the rules #337 touches, with no backfill. The subject is when a generated hook may send a request,
not what a screen shows with the answer.

## Rules

### UI-DATA-001 — An empty id is gated explicitly

- **Status:** Active
- **Rule:** A call site that passes an empty string to a generated path-scoped query hook, to mean
  there is nothing to request, MUST pass `enabled` explicitly. The generated guard only disables the
  query for `null` and `undefined`.
- **Rationale:** Orval 8 changed the generated guard from `!!(id)` to a null/undefined check, so
  `""` no longer disables the query, and the hook requests the collection path (for example
  `GET /api/v1/plants/`).
- **Implements:** n/a
- **Source:** #337

## States

Not applicable: this rule governs whether a request is sent, in every state of every screen that
reads data.

## Accepted exceptions

None.
