# UI spec document — Page layout

| | |
| --- | --- |
| **Prefix** | `UI-LAY` |
| **Status** | Active |
| **Routes** | Every route rendered inside the authenticated layout |
| **Roles** | Every signed-in caller |
| **Domain rules** | n/a |
| **Design reference** | `DESIGN.md` → Layout |
| **Last reviewed against code** | #432 |

## Purpose

Give every screen of the app the same column: the same width, padding and spacing on a phone and on
a desktop, so moving between screens never shifts where the content starts and ends. The subject is
the page's own frame (its root and its page-level panels), not the layout of what a panel holds, and
the breadcrumb that tells a user where the page sits (#432).

## Rules

### UI-LAY-001 — Pages fill the main content area

- **Status:** Active
- **Rule:** Every page rendered inside the authenticated layout MUST fill the full width of the main
  content area; neither the page root nor its page-level panels MAY set a maximum width.
  Exceptions: Profile and Change password, which MAY cap their single centred form panel. Width
  limits MAY apply to individual controls inside a panel.
- **Rationale:** One consistent column across screens, as `DESIGN.md` → Layout states. Per-page caps
  drift, and leave empty space on wide screens. The two exceptions are single short forms that
  become unreadable when stretched. Enforced by the `no-restricted-syntax` page-width set in
  `eslint.config.js`, whose exemption list names the same two files.
- **Implements:** n/a
- **Source:** #415

### UI-LAY-002 — Pages use the shared page root

- **Status:** Active
- **Rule:** Every page rendered inside the authenticated layout MUST use the shared page root, so
  width, padding and spacing are identical across pages on every viewport. A page MUST NOT build
  its own root.
- **Rationale:** Hand-built roots drifted into two patterns with different padding and width caps;
  one shared root (`sxStyles.pageRoot`) makes the layout consistent and lets the lint rules enforce
  it. Enforced by the `no-restricted-syntax` page-root set in `eslint.config.js`, with no exemption.
- **Implements:** n/a
- **Source:** #415

### UI-LAY-003 — Every page shows a breadcrumb that starts at Inicio

- **Status:** Active
- **Rule:** Every authenticated page except Inicio MUST show a breadcrumb above its title, starting
  at 'Inicio' and ending at the page itself; a step for a page with a menu entry MUST use that
  entry's label.
  - "Inicio" is every landing a caller may be sent to from `/`: the member and management home
    views, the platform page of a platform admin with no membership, and the no-community page.
  - The breadcrumb depends on no data, so it shows in every state of the page.
  - A page's own step does not change with its query string: a community admin viewing another
    member's supply keeps the page's trail (UI-TDY-003, UI-HIS-001).
- **Rationale:** The same orientation on every page. The three energy pages, "Datos de hoy", "Mi
  consumo y ahorro" and "Energía de la comunidad", shipped without one because no rule required it.
  A label that matches the menu, in sentence case, names one place one way. Enforced by
  `src/contracts/pageBreadcrumbs.spec.ts`, which reads the routes from `src/App.tsx`; its
  exemptions are the landings above and the two redirects.
- **Implements:** n/a
- **Source:** #432

## States

| State | Rendered | Actions available |
| --- | --- | --- |
| Any page, any state | The shared page root, filling the main content area; a not-found state inside a detail page uses the same root; above the title, the page's breadcrumb, except on a landing (UI-LAY-003) | Those of the page |

## Accepted exceptions

| Exception | Reason | Expires when | Source |
| --- | --- | --- | --- |
| Profile and Change password cap their form panel | A single short form becomes unreadable when stretched | The form gains enough content to use the full width | #415 |
