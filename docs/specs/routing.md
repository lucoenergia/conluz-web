# UI spec document — Routing

| | |
| --- | --- |
| **Prefix** | `UI-ROUTE` |
| **Status** | Active |
| **Routes** | `*` (any path no other route matches) |
| **Roles** | Every caller, with or without a session |
| **Domain rules** | n/a |
| **Design reference** | n/a |
| **Last reviewed against code** | #234 |

## Purpose

Tell someone who followed an old link or mistyped an address that the page does not exist, and
give them one way back into the app. The subject is what the router does with a path it does not
know, not the screens it does know.

## Rules

### UI-ROUTE-001 — An unknown path renders the not-found page

- **Status:** Active
- **Rule:** Any path that matches no route MUST render the not-found page, with a link to `/`.
- **Rationale:** Before this rule an unknown path rendered nothing, which looks like a broken app. The
  link goes to `/` and leaves the destination to it, so the page never decides where a caller
  belongs.
- **Implements:** n/a
- **Source:** #234

### UI-ROUTE-002 — The not-found page is public and sends nothing of its own

- **Status:** Active
- **Rule:** The not-found page MUST render in the public shell for every caller, with or without a
  session. Without a session, rendering it MUST send no request.
- **Rationale:** An unknown path says nothing about who may see it, so the page cannot depend on a
  session. Under an authenticated guard, a caller without a session would be sent to the login page
  instead of being told the address is wrong.
- **Implements:** n/a
- **Source:** #234

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Not found | Heading, a short explanation and the link, in neutral styling: no alert colour, since this is not a failure of the app | Follow the link to `/` |

## Accepted exceptions

None.
