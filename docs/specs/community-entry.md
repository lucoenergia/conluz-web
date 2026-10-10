# UI spec document — Community entry

| | |
| --- | --- |
| **Prefix** | `UI-ENT` |
| **Status** | Active |
| **Routes** | `/`, `/platform`, `/no-community` |
| **Roles** | Every signed-in caller |
| **Domain rules** | n/a |
| **Design reference** | n/a |
| **Last reviewed against code** | #237 |

## Purpose

Decide, on entry, which community is active and where the caller lands, so that someone who
belongs to a community starts working in it straight away. The subject is the entry itself: not the
home screens it leads to, and not the design of the community switch that changes it afterwards.

## Rules

### UI-ENT-001 — A single membership is the active community

- **Status:** Active
- **Rule:** A caller with exactly one membership MUST have that community active on entry, whatever
  community is remembered for them.
- **Rationale:** There is nothing to choose, and a remembered community from an earlier membership
  must not override the only one they have.
- **Implements:** n/a
- **Source:** #122

### UI-ENT-002 — Several memberships enter on the remembered community

- **Status:** Active
- **Rule:** A caller with several memberships MUST enter on the community they last worked in, when
  that community is still one of their memberships.
- **Rationale:** It is the community they were working in, so it is the best guess of where they want
  to continue.
- **Implements:** n/a
- **Source:** #122

### UI-ENT-003 — Otherwise, the first-time rule picks one

- **Status:** Active
- **Rule:** A caller with several memberships and nothing valid remembered (nothing remembered, or a
  remembered community that is no longer one of their memberships) MUST enter on a community chosen
  as follows. If they own supply points in one or more of their communities, the active community is
  the alphabetically first by name among those communities. If they own supply points in none, it
  is the alphabetically first by name among all their memberships. When the community names cannot
  be read, community id replaces the name in both orders. The community chosen is remembered, so the
  next entry follows UI-ENT-002.
- **Rationale:**
  - There is no screen asking the caller to choose. The community switch already lists every
    community and changes the active one, so a choose screen would be a second way to do the same
    thing. Entering directly and letting them switch costs less than asking, so a wrong guess is
    cheap.
  - A community where they own supply points comes first, because that is the one they are most
    likely to care about.
  - Alphabetical order among the communities where they own supply points is arbitrary, and accepted
    as such: the choice only matters on a first entry, and stops mattering as soon as the caller's
    last community is remembered. A finer tie-break, such as the most supply points, would refine a
    choice that is made once and then replaced by the caller's own.
  - A failed read of their supply points counts as owning none, not as an error. It only refines a
    preference, and failing it costs at most one switch.
- **Implements:** n/a
- **Source:** #237

### UI-ENT-004 — A caller with no membership leaves the landing

- **Status:** Active
- **Rule:** A caller with no membership MUST land on the platform overview (`/platform`) when they
  may administer the platform, and otherwise on the no-community screen (`/no-community`, "Sin
  comunidad asignada").
- **Rationale:** With no community there is no home to land on. Whether they may administer the
  platform is read from the capability the backend returns, not from the platform-admin flag, so the
  landing agrees with the guard on the platform overview.
- **Implements:** n/a
- **Source:** lucoenergia/conluz#292, #221

### UI-ENT-005 — Nothing is decided before the active community is

- **Status:** Active
- **Rule:** While the active community is not yet worked out, `/` and every route gated on the
  active community MUST render nothing, and MUST NOT deny access or redirect. The community switch
  reads as loading meanwhile, never as a prompt to choose.
- **Rationale:** For a caller with memberships, "not yet worked out" always ends with a community
  active. Deciding earlier would treat them as having none: a deep link would be refused, or a
  screen would flash before being replaced.
- **Implements:** n/a
- **Source:** #221, #237

### UI-ENT-006 — The community switch is the only way to change community

- **Status:** Active
- **Rule:** The community switch on the scope surface MUST be the only control that changes the
  active community.
- **Rationale:** One decision, one control. It already lists every community the caller belongs to,
  so a second control for the same decision is a second way to do one thing.
- **Implements:** n/a
- **Source:** #186, #237

### UI-ENT-007 — Losing the active membership mid-session sends the caller to the landing

- **Status:** Active
- **Rule:** When the active community stops being one of the caller's memberships during a session,
  another of their communities MUST become active, chosen as on entry: UI-ENT-001 when one remains,
  UI-ENT-003 when several remain. No screen asks them to choose. A caller on a page about a
  community MUST be sent to `/`, which lands them on the new community's home. A caller on a page
  that is not about a community (their profile, the platform pages) stays where they are.
- **Rationale:** They can no longer work in that community. Leaving them on the same page, now
  showing another community's data, would let them carry on working without noticing the community
  changed under them; landing on the new community's home makes the change visible. A page that is
  not about a community shows nothing that changed, so moving them off it would only interrupt
  them. This differs on purpose from a change the caller makes through the community switch: they
  asked for it, so they stay on the page they made it from, or on its section's list when that
  page is about one plant or supply point.
- **Implements:** n/a
- **Source:** #237

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading (active community not yet worked out) | Nothing at `/`; the community switch reads "Cargando comunidad…" | None |
| Resolved, with memberships | The caller's home for the active community | The community switch, when they have several |
| Resolved, no membership | The platform overview or the no-community screen | Those screens' own |
| Error (the active community's capabilities cannot be read) | A retry, and no redirect | Retry |

## Accepted exceptions

None.
