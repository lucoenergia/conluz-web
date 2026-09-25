# ADR-0002 — Select by role, then by visible text, and reserve test ids for unnamed regions

- **Status:** Accepted
- **Date:** 2026-09-25
- **Deciders:** Víctor Cañizares
- **Applies to:** `lucoenergia/conluz-web`: every spec (Vitest with Testing Library, and the Playwright visual suite under `tests/visual/`) and every `data-testid` attribute in `src/`

## Context

Until this change the specs located elements in two ways: by accessible role and name (`getByRole("button", { name: "Acciones" })`) and by visible text (`getByText("Sin periodos aplicados")`). `data-testid` existed in `src/` but was rare: 11 attributes across 8 components, mostly on decorative timeline parts (`sharing-agreement-timeline-dot`, `coefficient-history-connector`) and on the list and detail headers (`list-header` / `detail-header`, one attribute in `DetailHeader.tsx`).

The visual suite is moving from full-page screenshots to capturing the region a test is about ("Shrink the blast radius of the visual regression tests", PR 2). A region capture needs a locator for the region's container. The containers in question have neither a role nor an accessible name: the coefficient history section, the distributor file panel and the coefficient set are MUI `Paper`s, and the batch action bar is a fixed `Box`. The only non-test-id ways to reach them were structural, such as the nearest `.MuiPaper-root` ancestor of a heading. Those are coupled to MUI's class names and to DOM nesting that nobody reviews as a contract.

The modals had the same problem for a different reason. Every dialog in the app renders through `src/components/Modals/BasicModal.tsx`, a MUI `Modal` without `role="dialog"` and without an accessible name: `aria-labelledby="modal-modal-title"` points at an id that nothing renders. A browser probe on both viewports confirmed that `getByRole("dialog")` matches nothing on any of them. So a modal cannot be selected the way a user or an assistive technology would identify it, because it is not identified at all. That gap is reported separately as an accessibility issue, "BasicModal renders no dialog role".

What makes a test id tempting is that it always works, whatever the element's semantics. What makes it costly is the same property. A role-and-name selector fails when the element loses its role or its name, so every test that uses one also checks, at no extra cost, part of what a user of assistive technology perceives. A text selector does the same for what a sighted user reads. A test id checks nothing: an unlabelled button, a dialog without a role and a region with a misleading heading all still match their test id. Had the modals been given a test id and nothing else, the missing `role="dialog"` would have been buried under a green suite.

Two attributes already in `src/` show where the unconstrained habit leads. `csv-file-input` is a hidden `<input type="file">`, and `ImportPartnersModal.spec.tsx` drives it by test id. `drop-zone` is a clickable `Box` (`onClick={handleDropZoneClick}`) with no role, so it is neither keyboard-reachable nor announced. Both are interactive elements selected by test id, and the second hides a real keyboard-access defect.

## Decision

Selectors follow a strict priority, and a `data-testid` is allowed only at the bottom of it.

### 1. Accessible role, with its accessible name when it has one

`getByRole("menu")`, `getByRole("heading", { name: "Histórico de coeficientes" })`, `getByRole("main")`. This is the default. It holds for landmarks too: `main` is a role, so a page's content region is `getByRole("main")`, not a test id.

### 2. Visible text, when no role fits

`getByText("Sin periodos aplicados")`, for content that is read but carries no role of its own.

### 3. `data-testid`, only for a region container that has neither a role nor an accessible name

The allowed targets are containers whose only job is grouping: a card section, a panel, a bar. The test id marks the region as one that **lacks semantics**, not as one that is convenient to select. It is added only when a test needs to capture or scope to that region.

Never add a test id to a button, a link, a form field, a menu item, or anything else a user interacts with. If an interactive element can only be selected by test id, it is missing an accessible name or role. That is a production defect, to be reported and fixed, not worked around in the spec.

### 4. Interim test ids are marked as interim where they live

When a test id stands in for a missing role rather than for a genuinely unnamed region, a comment next to the attribute names the issue that will remove it. The first case is `modal-panel` on `BasicModal`. Once that issue lands, the specs select `getByRole("dialog", { name })` and the attribute is deleted.

## What a test id means

A `data-testid` in `src/` is a statement: this container has no role and no name, and a test needs to find it. It does not say the element is unimportant, and it does not say it is stable. If a region gains a landmark role or a name (for example, a `section` with `aria-labelledby` on its heading), its test id becomes redundant, and the specs should move up the hierarchy and drop it.

## Alternatives considered

**Structural locators, such as the nearest `.MuiPaper-root` ancestor of a heading.** These need no production change and were the first working option (probed on both viewports). They were rejected as the norm because they couple the suite to MUI's class names and to nesting depth. Both change in library upgrades and refactors that nobody reviews as test-facing, and a broken structural locator fails with "element not found", which says nothing about what changed. They remain acceptable only where no role, no text and no rule-3 region applies, and each one is justified in the spec that uses it.

**Test ids wherever a locator is needed.** This is the simplest rule and the one agents drift towards unprompted, because it never fails. It was rejected because it removes the accessibility check that role and text selectors provide for free (see Context), and because it would have covered over `BasicModal`'s missing role instead of surfacing it.

**Adding the missing roles (`role="dialog"`, `role="region"` with names) in the same change.** This is the better end state for the modals, and it is tracked as its own issue. It was kept out of this change because the visual-suite work allows only `data-testid` changes in `src/`: a role or name change alters what assistive technology announces, and it deserves its own review and its own accessibility test, not a ride-along inside a test refactor.

## Consequences

**Positive**

- Region captures have stable, reviewed anchors, independent of MUI internals.
- Selecting by role and text keeps checking the perceivable output in every test that does it.
- Each test id in `src/` now documents a semantic gap. Counting them measures the gap.

**Negative**

- Six attributes are added to production markup (see References). They cost nothing at runtime but are visible in the DOM.
- Contributors must follow an obligation that is not visible in the code: before adding a `data-testid`, check that no role and no name fits, and never add one to an interactive element.
- The `modal-panel` interim test id must be removed when the dialog-role issue is fixed. Otherwise the interim becomes permanent.
- Known pre-existing exceptions remain: `csv-file-input` and `drop-zone` in `ImportSuppliesModal.tsx` and `ImportPartnersModal.tsx`. They are on interactive elements and are grandfathered, not endorsed. `drop-zone` also marks a keyboard-access defect.

## Revisit if

- A `data-testid` appears on an interactive element other than the two grandfathered ones. Check with `grep -rnE 'data-testid' src --include=*.tsx --exclude=*.spec.tsx`, then inspect each element that also has `onClick`, or is a `Button`, `IconButton`, `MenuItem`, `Link`, `input` or `TextField`.
- The number of `data-testid` attributes in `src/` rises above 17 (the count when this ADR was accepted) without a matching new region capture or scoped query in a spec. Check with `grep -rho 'data-testid' src --include=*.tsx --include=*.ts --exclude='*.spec.*' | wc -l`.
- `BasicModal` gains `role="dialog"` and an accessible name. Then `modal-panel` and its comment go, and the modal captures move to `getByRole("dialog", { name })`.
- A region marked by test id gains a landmark role or accessible name, which makes its test id redundant.
- Testing Library or Playwright gains a selector that reaches unnamed regions semantically, which would remove the need for rule 3.

## References

- Rule for agents: `CLAUDE.md`, "Selector hierarchy".
- Test ids added by this decision:
  - `supply-coefficient-history` in `src/components/SupplyCoefficientHistorySection/SupplyCoefficientHistorySection.tsx`
  - `sharing-agreement-file-panel` in `src/components/SharingAgreementFilePanel/SharingAgreementFilePanel.tsx`
  - `sharing-agreement-coefficient-set` (both render branches) and `sharing-agreement-batch-bar` in `src/components/SharingAgreementCoefficientSet/SharingAgreementCoefficientSet.tsx`
  - `modal-panel` (interim) in `src/components/Modals/BasicModal.tsx`
- Region captures that use them: `tests/visual/*.spec.ts`.
- Related: ADR-0001 (API mocking tiers).
