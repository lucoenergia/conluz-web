# ADR-0006 - Use one responsive overlay for every create, edit, action and confirmation flow, and enforce it

- **Status:** Accepted
- **Date:** 2026-11-10
- **Deciders:** Víctor Cañizares Mata
- **Applies to:** `lucoenergia/conluz-web`: overlays (`src/components/ResponsiveOverlay/`, `src/components/Modals/`), the routing of create and edit flows (`src/App.tsx`), and the lint and contract checks that guard both

## Context

### How overlays worked before #368

An inventory of `conluz-web` at `6ddf215` found about 35 create, edit, action and confirmation flows, built in four different ways:

- **The modal family** (`BasicModal` → `AppModal` → `ConfirmationModal`): an MUI `Modal` with an absolutely centred box about 90 % wide on a phone. It never adapted to mobile.
- **Direct MUI `Dialog`s**: the member, admin, CSV import and Huawei dialogs. They used `inFlightDialogProps` to block closing while a request ran.
  - The Huawei dialog became full screen below 600 px.
  - The rest stayed centred at every width.
- **The contact channel editor**: the only flow with the pattern the product wanted. It was a dialog from `md` (900 px) up and a bottom sheet below, with an inline "unsaved changes" question in its footer. The code was contact-specific.
- **Pages**: six flows were their own routes and navigated away from the list:
  - `/supply-points/new` and `/supply-points/:supplyPointId/edit`;
  - `/production/new` and `/production/:plantId/edit`;
  - `/communities/new` and `/communities/:communityId/edit`.

Three widths decided "mobile or desktop" for overlays: 600 px (Huawei), 768 px (the coefficient history drawer) and 900 px (contact). Users saw the same kind of task look and behave differently depending on the screen.

### The mechanisms that made this costly

- **Back lost the user's input.** The app uses `BrowserRouter`, not a data router, so `useBlocker` is unavailable. No overlay was tied to the browser history. On a phone, the back gesture, the usual way to dismiss a sheet, left the page and discarded whatever had been typed, without a prompt.
- **Changes were discarded silently.** Only the contact editor asked before discarding them.
- **Double submits.** The supply and plant forms did not await their save and had no pending state.
- **An invalid plant submit was dropped** with no message.
- **Date pickers stacked a modal.** MUI X's responsive `DatePicker` opens `MobileDatePicker`, a modal dialog, on any coarse-pointer device. Inside an overlay that is a second modal layer, which the overlay's back and focus handling know nothing about.

### What made the problems hard to see

- **Tests passed without exercising anything.** After a focused button unmounts, jsdom leaves focus on `<body>`. A `user.keyboard("{Escape}")` then never reaches the dialog, and a negative assertion ("the dialog stays open") passes. Clicks on `.MuiDialog-container` stopped reaching the overlay's backdrop handler in the same way. Two UI-PAD-010 tests had passed like this.
- **jsdom hides focus restoration.** MUI restores focus to the opener by itself in jsdom. A page-level test cannot prove that the app's own focus-restoring code works; only a real browser can.
- **Chrome may skip history entries.** Chrome skips, on back, a history entry that a page added without a user interaction since its last entry. jsdom cannot reproduce this, so an overlay that opens on its own, for example after a request resolves, may lose its back handling on a real phone.
- **The visual comparison tolerates small diffs.** The threshold of 100 px per component capture let the removal of a close icon (28 px) pass unnoticed.

## Decision

The decision has four parts. They only work together:
- the component without the enforcement drifts back to four patterns within months;
- the enforcement without the component has nothing to point people to;
- the page conversions without the history handling would replace a page that back leaves with an overlay that back destroys.

### 1. One component, two sizes

Every create, edit, action and confirmation flow renders in `ResponsiveOverlay`:
- from the `md` breakpoint (900 px) up, it is a centred dialog;
- below `md`, it is a full-width bottom sheet with a grab handle;
- the dialog comes in two sizes: `form` (560 px) and `compact` (440 px), for confirmations and short actions.

`AppModal` and `ConfirmationModal` are built on it, so every flow migrated with its base component. `md` was chosen because it was the reference pattern's threshold, and keeping it left the contact editor visually unchanged.

### 2. One close path, owned by the overlay

All close attempts go through one path: Escape, the backdrop, a swipe, the close icon, the consumer's Cancelar, and browser or system back.

- **In flight:** nothing closes the overlay.
- **Dirty:** the overlay asks first, inline in its footer. "Seguir editando" keeps the input; "Descartar cambios" closes.
- **Otherwise:** it closes.

The overlay also owns these behaviours:

- **Back without a data router.** An open overlay pushes one history entry with the same URL. The entry copies React Router's state and adds an overlay marker, so on back the router sees the same location: nothing remounts or refetches. Closing by any other means gives the entry back, so no dead step is left. Stacked overlays consume one back each, top first.
- **Navigating on close.** A flow that leaves the page as its overlay closes uses `useOverlayNavigate`. It replaces the overlay's entry instead of racing an asynchronous `history.back()`.
- **Reload with unsaved changes** triggers the browser's leave-page prompt.
- **A second question in the footer.** A confirmation launched from inside an overlay (deleting a contact channel) is asked inline in its footer, never as a second modal.

### 3. Content, focus and controls

- **Content that changes inside one overlay.** A flow's later steps (a result, a confirmation code, the CSV import progress) render inside the same overlay and never open a new one. When the content changes, focus moves to the new content's main message or first control.
- **Focus on close.** It returns to the control that opened the overlay, through the shared `useOverlayOpener` hook.
- **One control per name.** An overlay that offers its own "Cerrar" hides the close icon, so no two controls share a name.
- **No modal over an overlay.** Date pickers inside an overlay use `DesktopDatePicker`, which opens in place.

### 4. Pages become overlays, without redirects

The six create and edit routes are removed. Their forms open as overlays over the list that offers them, so the URL does not change.

Old URLs get **no redirect**. A redirect route would itself end in `new` or `edit` and fail the route contract test in part 5. Edit forms are not bookmarked or shared in practice. Old URLs fall into the app's existing unknown-route handling (see the next section).

### 5. Enforcement from the first issue, as a ratchet

- **Lint.** `@typescript-eslint/no-restricted-imports` forbids importing `Dialog`, `Modal`, `Drawer` and `SwipeableDrawer` from `@mui/material` outside `ResponsiveOverlay`. Type-only imports are allowed. Exceptions live in one allowlist, each tagged `// permanent: <reason>` or `// temporary: #<issue>`.
- **Route contract.** A Vitest contract test reads the route tree in `App.tsx` and fails on any route path ending in `new` or `edit`, against its own allowlist.
- **Stale entries.** Both allowlists have a stale-entry check, so an exception cannot outlive its reason.
- **Agent instructions.** The "Overlays" section of `AGENTS.md` states the rules for anyone, person or agent, writing new code.

Enforcement was switched on in #368 with every unmigrated file allowlisted. Each migration issue removed its own entries. At the end of the epic the lint allowlist holds only permanent exceptions (the side menu, the coefficient history drawer, the historical-analysis pickers), and the route allowlist is empty.

## What overlay behaviours mean

Use this section to judge whether something seen in production is a defect.

- **Back on a phone closes the sheet and the page stays.** This is the rule (UI-OVL-004), not a navigation bug. With unsaved changes, back asks first.
- **A leave-page prompt on reload** appears only while an open overlay has unsaved changes (UI-OVL-005). While a platform-admin confirmation code shows, it counts as unsaved (UI-PAD-010), so the prompt appears then too.
- **An old create URL opens a "not found" state of the detail page:**
  - `/supply-points/new` shows "Punto de suministro no encontrado";
  - `/production/new` shows "Planta no encontrada".

  The detail route reads `new` as an id and gets a 404. This was accepted: no route may end in `new`. The page is one the user can leave normally.
- **Old edit URLs and `/communities/new` show the generic not-found page.** This is expected.
- **One extra back press after reloading with an overlay open.** The overlay's history entry survives the reload, inert. Entries cannot be removed, so this is accepted.
- **After deleting a record from its detail page, back may show the list once more.** The deleted page is replaced, never revisited, but the list can then appear twice in history. This is accepted.
- **The supply disable and enable success dialogs open after the request resolves,** not from a user interaction. If Chrome's history intervention lets back skip their entry on a phone, that is a known accepted exception (`overlays.md`), pending a phone check. It is not a regression of the back handling.
- **Inputs editable during a save inside an overlay are a defect of that flow.** The overlay locks closing, but each consumer must make its own inputs read-only (see the obligations below).

## Alternatives considered

**Keep pages for long forms.** Long forms such as the plant form (eight fields and a date) would have stayed pages, with overlays only for short flows. That was the cheapest option, and the one the product had drifted into. It was rejected because it keeps two patterns, and the dividing line ("long") is a judgement every new form would reopen. The plant form proved usable in a sheet once its date picker opened in place.

**A full-screen dialog on mobile, as Huawei had.** This is simple, and MUI supports it natively. It was rejected because it hides the page the user came from. It also matched neither the contact editor nor what the product wanted on a phone.

**Migrate to a data router to use `useBlocker`.** This is the standard way to guard navigation. It was rejected for its blast radius: it changes how every route loads. It is also unnecessary for overlays, because an open overlay is modal: no in-app link is reachable while it shows, so the only exits are close, back and reload, which the history entry and `beforeunload` cover. If the app adopts a data router for other reasons, this can be revisited (see "Revisit if").

**Redirect the old URLs to their list.** This keeps bookmarks working. It was rejected because a redirect route ends in `new` or `edit` and breaks the route contract test. Exempting redirect-only routes from the test was considered too. It was rejected as a loophole that weakens the check for a benefit (bookmarked edit forms) that nobody uses.

**Thresholds of 600 px or 768 px.** Both thresholds already existed in the code. They were rejected because `md` matched the reference pattern, and changing it would have altered the one flow that was already right.

**Stack confirmations over the overlay.** After #368 the stack mechanism supported this technically, and it was the smaller change. It was rejected because a sheet over a sheet is heavy on a small screen, and an inline question keeps one layer.

**One dialog width.** It is simpler. It was rejected because confirmations rendered as a mostly empty 560 px box.

**Enforce at the end of the migration.** It would have meant no allowlist churn during the epic. It was rejected because every flow written while the migration ran could have reintroduced the old patterns. The ratchet made new code comply from the first day, at the cost of each migration issue editing the allowlists.

## Consequences

**Positive**

- Every create, edit, action and confirmation flow looks and behaves the same at every width. There is one threshold and two sizes.
- On a phone, back dismisses a sheet instead of discarding the user's input.
- Unsaved changes, double submits and silent invalid submits are handled the same way everywhere.
- Focus no longer falls outside an overlay when its content changes, and it returns to the opener on close.
- The lint rule and the contract test keep new code on the pattern without relying on review.
- `inFlightDialogProps`, `BasicModal`, `AlertModal`, the six create and edit pages and an unused capability scope were deleted.

**Negative**

- Create and edit forms can no longer be linked to: they have no URL.
- The history-entry mechanism is the app's own code around `BrowserRouter`, not a library feature, and it has known edges: the inert entry after a reload, and the duplicate list entry after deleting from a detail page.
- jsdom cannot prove focus restoration or Chrome's history intervention. Those guarantees rest on manual phone checks.

**Obligations for future work.** These rules are not obvious from reading the code. Breaking them half-applies this decision:

- New create, edit, action and confirmation flows MUST use `AppModal` or `ConfirmationModal` (or `ResponsiveOverlay`). They MUST NOT add a route ending in `new` or `edit`.
- An overlay consumer MUST report `dirty` when its inputs differ from what it opened with.
- An overlay consumer MUST make its own inputs read-only while a request is in flight. The overlay locks closing, not inputs.
- An overlay MUST open from a user interaction (a click, tap or key press). Opening one on load or after a request lets back skip its entry on Chrome.
- A flow that leaves the page as its overlay closes MUST navigate with `useOverlayNavigate`.
- A flow's later steps MUST render in the same overlay, with a `contentKey`, never in a new one.
- An overlay that offers its own "Cerrar" MUST set `hideCloseIcon`.
- Date pickers inside an overlay MUST be `DesktopDatePicker`. Nothing inside an overlay may open another modal.
- List pages that open form overlays MUST restore the opener's focus through `useOverlayOpener`.
- A test that asserts something does not happen after Escape, a backdrop click or back MUST prove the event reached the dialog: assert focus inside it, or dispatch on the dialog, using the helpers in `src/test/overlay.ts`.
- Adding an allowlist entry requires a reason or the issue that removes it, and a deliberate review.

**Operational**

- Most visual suites changed during the migration. Baselines are regenerated by a person after each change, and orphaned ones are deleted with `make visual-delete-orphans`.
- The Claude Design system needs a re-sync whenever a synced overlay component (`AppModal`, the confirmation and success modals) changes props or look.

## Revisit if

- The app adopts a data router for any reason. Then `useBlocker` can replace the history-entry mechanism, and guarding in-app navigation outside overlays becomes possible.
- A flow needs a shareable or bookmarkable form URL, for example a form linked from an email.
- A form grows into a multi-step wizard, or exceeds what fits comfortably in a sheet on a 390 px screen.
- The phone check of the supply success dialogs shows that back skips their entry. Then replace them with an `ActionStatus` announcement.
- MUI or MUI X changes how `Modal` restores focus, or how date pickers choose their variant.
- Chrome or another major browser changes how back treats entries added without a user interaction.
- A second overlay threshold, or a third dialog size, is proposed.

## References

- Shared overlay: `src/components/ResponsiveOverlay/` (`ResponsiveOverlay.tsx`, `overlayHistory.ts`, `useOverlayNavigate`, `focusTarget.ts`).
- Bases: `src/components/Modals/AppModal.tsx`, `ConfirmationModal.tsx`, `ConfirmationActions.tsx`.
- Opener focus: `src/hooks/useOverlayOpener.ts`.
- Form overlays:
  - `src/pages/supply-points/SupplyFormDialog.tsx`;
  - `src/pages/production/PlantFormDialog.tsx`;
  - `src/pages/communities/CommunityFormDialog.tsx`, `CommunityContactDialog.tsx`.
- Enforcement:
  - `eslint.config.js` (overlay import rule and allowlist);
  - `src/contracts/overlayImports.spec.ts`, `src/contracts/overlayRoutes.spec.ts`, `src/contracts/appRoutes.ts`;
  - `AGENTS.md`, "Overlays".
- Test helpers: `src/test/overlay.ts`.
- Specs:
  - `docs/specs/overlays.md` (UI-OVL-001…011);
  - `docs/specs/supplies.md` (UI-SUP-019…021);
  - `docs/specs/plants.md` (UI-PLS-004…008);
  - `docs/specs/communities.md` (UI-COM-001…004);
  - `docs/specs/contact.md` (UI-CTU-004);
  - `docs/specs/platform-admins.md` (UI-PAD-010).
- Issues: #368, #369, #370, #371, #372, #373, #374 and #398, and the "Unified overlay pattern" epic.