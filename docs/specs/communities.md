# UI spec document — Communities

| | |
| --- | --- |
| **Prefix** | `UI-COM` |
| **Status** | Active |
| **Routes** | `/communities` and `/platform`; creating and editing a community open in the shared overlay over them |
| **Roles** | A platform admin (both pages require `canAdministerPlatform`). Creating a community: a caller whose platform capabilities report `canCreateCommunity`. Editing one: a caller to whom that community reports `canUpdate` |
| **Domain rules** | n/a |
| **Design reference** | The community form is on `AppModal` (`overlays.md`) |
| **Last reviewed against code** | #374 |

<!-- Domain rules are cited by ID; the prefix registry in lucoenergia/conluz → docs/specs/README.md maps each prefix to its file. -->

## Purpose

Let a platform admin create a community, or correct one, without leaving the page they started
from: the communities list, or the platform page, whose empty state asks for the first community.
Say what is wrong with a form that cannot be sent, and save it once however often the form is sent.

This document covers only the rules #374 introduced. Where a refused create or edit is shown is
[`api-errors.md`](api-errors.md)'s (UI-ERR-001, UI-ERR-002); a community's contact, offered from
the same row menu, is [`contact.md`](contact.md)'s (UI-CTU-004); its admins are
[`community-admins.md`](community-admins.md)'s.

## Rules

### UI-COM-001 — Creating and editing a community open over the page that offers them

- **Status:** Active
- **Rule:**
  - "Nueva Comunidad" on the communities list, and "Crear comunidad" on the platform page and in its
    empty state, MUST open the create form in the shared overlay over that page, and MUST leave the
    address unchanged.
  - "Editar" on a community's row menu MUST open the edit form in the shared overlay over the
    communities list, filled from that community's own read, and MUST leave the address unchanged.
  - The create actions MUST be offered only when the caller's platform capabilities report
    `canCreateCommunity`. "Editar" MUST be offered only when that community's
    `capabilities.canUpdate` is `true`.
  - The edit form MUST take its values from the community's first successful read. A later read
    while it is open MUST change neither the values nor what counts as a change (UI-OVL-003).
  - While the community loads, the overlay MUST show progress and nothing to submit. A read
    answered "not found" MUST show "Comunidad no encontrada", and any other failed read MUST say so,
    with "Reintentar".
  - After a save, the overlay MUST close, the page it was opened over MUST show the saved community
    without a reload, and focus MUST return to the control that opened the form: the create
    action, or the edited row's actions button. When a save from the platform page's empty state
    replaces it, focus MUST move to the create action that takes its place.
- **Rationale:** Creating and editing are flows over the page they belong to (UI-OVL-001,
  UI-OVL-008), so the admin keeps the list, or the platform overview, in view. The old pages are
  removed with no redirect: a redirect route would itself end in `new` or `edit`. A form reseeded
  by a refetch would overwrite what is being typed. The API answers "not found" both for a
  community that does not exist and for one the caller may not see, so the not-found state names
  both. The menu item that opened an edit is gone once the menu closes, so its row's actions button
  is where the admin was; the empty state's button is gone once the first community exists, and
  focus left on nothing would send a screen reader back to the top of the page.
- **Implements:** n/a
- **Source:** #374

### UI-COM-002 — An invalid community form says what is wrong and sends nothing

- **Status:** Active
- **Rule:** A community form submitted with "Nombre" or "Código" empty or blank MUST send nothing,
  MUST show an error on each failing input, and MUST move focus to the first failing input in the
  form's order.
- **Rationale:** The pages showed the errors but left focus where it was, so on a phone the failing
  input could be outside the sheet's visible part with nothing pointing at it.
- **Implements:** n/a
- **Source:** #374

### UI-COM-003 — A community save in flight sends nothing again, and the form is read-only

- **Status:** Active
- **Rule:**
  - While a community create or edit is in flight, submitting the form again MUST send no second
    request.
  - While a community create or edit is in flight, every input of the form MUST be read-only, and
    the submit MUST be disabled and read "Creando..." in create mode, "Guardando..." in edit mode.
- **Rationale:** A second tap, or Enter in an input, would otherwise send a second create, which the
  first one's stored code then refuses as a duplicate. The overlay itself cannot be closed while
  the save is in flight (UI-OVL-002).
- **Implements:** n/a
- **Source:** #374

### UI-COM-004 — The edit form's submit reads "Guardar"

- **Status:** Active
- **Rule:** In edit mode, the community form's submit MUST read "Guardar", whatever the community's
  name.
- **Rationale:** One label per mode across the supply, plant and community forms (UI-SUP-020,
  UI-PLS-008). The edit page read "Guardar cambios".
- **Implements:** n/a
- **Source:** #374

## States

The edit form, while the community cannot be shown yet (UI-COM-001):

| State | Rendered | Actions available |
| --- | --- | --- |
| Loading | A progress indicator labelled "Cargando..." in place of the inputs | "Cancelar"; "Guardar" is disabled |
| Not found | "Comunidad no encontrada" and "Esta comunidad no existe o no tienes acceso a ella.", in neutral styling | "Cancelar"; "Guardar" is disabled |
| Error | "No se pudo cargar la información de la comunidad." with "Reintentar" | "Reintentar", "Cancelar"; "Guardar" is disabled |

## Accepted exceptions

None.
