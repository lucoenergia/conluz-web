# UI spec document — Data fetching

| | |
| --- | --- |
| **Prefix** | `UI-DATA` |
| **Status** | Active |
| **Routes** | Every route whose screen reads data through the generated API client |
| **Roles** | Every caller |
| **Domain rules** | n/a |
| **Design reference** | n/a |
| **Last reviewed against code** | #327 |

## Purpose

How the app consumes the generated API client. This document was created by #337 and covers only
the rules #337 and #327 touch, with no backfill. The subject is when a generated hook may send a
request, and when it sends one again, not what a screen shows with the answer.

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

### UI-DATA-002 — A read is retried only on a transport fault or a 5xx

- **Status:** Active
- **Rule:**
  - A read MUST be retried automatically only when the request got no response (a network failure
    or a timeout) or got a `5xx` response, and at most three times.
  - A `4xx` refusal, a cancellation or an error that is not an HTTP one MUST NOT be retried.
- **Rationale:** Only transport faults and server faults can be transient. A refusal or a
  client-side error repeats identically, so asking again only delays what the screen must show: a
  `404` that means "not configured yet", a refused capability check that redirects, an expired
  session. This is the app's default, so no read needs an opt-out of its own.
- **Implements:** n/a
- **Source:** #327

## States

Not applicable: these rules govern whether a request is sent, in every state of every screen that
reads data.

## Accepted exceptions

None.
