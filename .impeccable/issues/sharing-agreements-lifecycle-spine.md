# Make the sharing-agreement lifecycle legible: promote the state-advancing action and stop misreporting state

## Context

A design critique of the sharing-agreements surface (`/production/sharing-agreements` and its detail page) scored it **24/40** on Nielsen's heuristics with **4 of 8 cognitive-load checks failing**. The full critique snapshot is committed at `.impeccable/critique/2026-09-14T11-04-30Z__src-pages-production-sharingagreementspage-tsx.md`.

The notable result is *where* the problems are. The surface passes every automated gate it has:

- `impeccable detect` — 0 findings, exit 0
- `npm run lint` — 0 errors, 0 `no-restricted-syntax` violations in scope
- All 6 `IconButton`s carry an `aria-label`; no `onClick` on non-interactive elements
- Every substantive component and page has a colocated `.spec.tsx`
- 56 committed Playwright goldens (28 desktop + 28 mobile) covering this surface

The defects are structural and semantic, and no linter can see them. They fall into two groups.

### 1. The lifecycle has no structure, so the workflow's terminal action is undiscoverable

`SharingAgreementNextStepPanel.tsx:18-24` already contains the admin's real mental model of this job — the five stages, correctly ordered, including the genuinely honest stage 3 (*"Fuera de Conluz, por email. La aplicación no puede comprobar este paso"*). That model is written down and correct, and it is hidden inside a collapsed accordion.

Because the page has no structure expressing where in the cycle you are, the actions scattered across it have no ranking. The consequence: `Editar`, `Poner en vigor`, `Volver a borrador` and `Eliminar` are all buried behind a single unlabelled white `MoreVertIcon` on the indigo banner (`SharingAgreementDetailHeader.tsx:125-136`). Meanwhile `Editar coeficientes`, `Descargar fichero`, `Generar fichero` and `Importar otro fichero` render as prominent buttons.

The one action the entire workflow exists to reach is invisible — and `SharingAgreementNextStepPanel` sits directly above the header *telling* the admin to put the agreement in force while offering no way to do it.

The project's kebab-menu convention in `CLAUDE.md` is explicitly about **table row actions**. It was never a licence to bury a page's primary verb.

**Walkthrough of a first-time community admin completing their first cycle:** define coefficients → generate the file → email it → the distributor confirms → now publish. There is no visible publish control anywhere on the page. This persona does not finish the cycle unaided.

Related hierarchy inversion: the single most product-specific fact on this surface — that coefficients must sum to exactly `100,000000 %` or the distributor rejects the file — renders as a small tinted pill at `body1/600`, while the decorative agreement counts (`1 / 1 / 1`) on the list page get 48px display type. `SharingAgreementStatusChip.tsx` collapses all three `onDark` variants to the same `alphas.white.strong` background, so `Vigente`, `Borrador` and `Histórico` differ only by icon and word — `sharing-agreement-detail-published.png` and `sharing-agreement-detail-superseded.png` are the same page at squint distance.

### 2. The UI states things about regulatory records that are not true

Two independent cases, both violating the product principle that regulated figures and state are reported honestly.

**Superseded agreements claim work is still in progress.** `SharingAgreementCoefficientSumCards.tsx:106-111` gates the caption *"Suma aplicada por debajo del 100 %: normal en transición mientras la distribuidora aplica los coeficientes pendientes"* on `!appliedSumIsFull` alone, with no status check. On `sharing-agreement-detail-superseded.png` this renders under a `75,0000 %` card on *Reparto original 2022*, an agreement explicitly marked "Sustituido por el acuerdo vigente". Nothing is in transition; nothing is pending. An admin auditing history could chase the distributor about coefficients closed years ago.

The tell that this is an oversight rather than a decision: the *file* gap message 70 lines above (`:37-40`) **is** correctly gated on `DRAFT`, with a comment explaining why. The pattern was understood and missed one card over.

The same page also keeps filter chips, select-all, per-row selection and per-row kebabs live on a closed record.

**Anomalous drafts render as ordinary drafts.** `SharingAgreementCoefficientSet.tsx:488` reads `const showStateColumns = !isDraft || hasAnomalousRow;` — and driving that boolean is the *only* thing `hasAnomalousRow` does. There is no warning anywhere in the anomalous path. When a `DRAFT` carries `APPLIED` coefficients — a state documented in `tests/visual/baseline.spec.ts:295-301` as one the backend guarantees cannot occur — the table silently grows two columns and three filter chips and displays `En vigor desde 1 de enero de 2024` beside an orange `Borrador` chip. `sharing-agreement-detail-draft-defensive.png` is indistinguishable from a normal draft to anyone who has not memorised that drafts have four columns.

The code calls these rows anomalous; the interface calls them nothing. This defensive path exists precisely because such data would be a backend invariant breach — a data-integrity incident on a regulatory artifact. Rendering it as ordinary guarantees nobody reports it.

### 3. The publish confirmation reads as destruction

`PublishSharingAgreementConfirmationModal.tsx` omits `confirmColor`, so `ConfirmationModal.tsx:28` applies its default `"error"` — the confirm button renders in the same red as `Eliminar`. `RevertSharingAgreementToDraftConfirmationModal.tsx:22` explicitly passes `"primary"`. **The semantics are inverted:** the constructive, forward act is red; un-sealing a regulatory agreement is friendly blue.

The dialog also breaks the confirmation-dialog convention stated in `CLAUDE.md` ("Names the affected entity… Shows the new value"): it never says *which* agreement, and never restates the sum or the supply-point count. `DeleteSharingAgreementConfirmationModal` does name its entity.

And the flow ends in silence. `confirmPending` exists on `ConfirmationModal` (`:16`, `:31`, `:78`), is documented, and is spec'd — with **zero production callers anywhere in the repo**. On confirm the button greys, the dialog vanishes, the chip flips, and nothing confirms the change reached the server. `aria-live` count across the entire surface: **0**. The peak-end rule is violated at the end of the most consequential flow on the surface.

## Approach

Restructure the detail page around the five stages that `SharingAgreementNextStepPanel` already defines: a **persistent lifecycle rail** that the header, coefficient set and file panel hang from, with the current stage's action promoted to a labelled primary control on the rail itself.

This is deliberately one change rather than four. The reason publish is undiscoverable is that the page has no structure expressing position in the cycle — so the spine restructure *is* the fix for publish discoverability, not an addition to it. Fixing the buttons without the structure would just relocate the symptom.

## Acceptance Criteria

### A. Lifecycle spine

- [ ] The detail page presents the five stages from `SharingAgreementNextStepPanel.tsx:18-24` as a persistent, always-visible structure — not collapsed behind an accordion by default.
- [ ] The current stage is visually distinguished from completed and future stages.
- [ ] Stage 3 retains its honest external treatment: it is marked as happening outside Conluz, visually differentiated from the stages the app can observe, and is never rendered as something the app has verified.
- [ ] The rail renders correctly for all three lifecycle states: `DRAFT`, `PUBLISHED` and `SUPERSEDED`. A superseded agreement's rail reads as complete and closed, not as in progress.
- [ ] Existing `selectSharingAgreementNextStep.ts` logic is reused, not duplicated; if it needs to expose more, it is extended with tests rather than bypassed.

### B. The state-advancing action is visible

- [ ] `Poner en vigor` (for an eligible `DRAFT`) and `Volver a borrador` (for an eligible `PUBLISHED` agreement) render as a **labelled** control, not as an item inside an unlabelled icon menu.
- [ ] The panel that names the current step can perform it — the admin never reads an instruction with no adjacent means of acting on it.
- [ ] The kebab in `SharingAgreementDetailHeader` retains only `Editar` and `Eliminar`, with `Eliminar` still below a `Divider` in `color: "error.main"` per the `CLAUDE.md` table-actions convention.
- [ ] The existing disabled-with-reason behaviour is preserved in its new location: when publishing is gated, the control stays focusable, states the exact shortfall (e.g. *"Faltan 25,0000 % para llegar al 100,0000 %"*), and keeps that reason in the accessibility tree via `aria-describedby`. **This behaviour is a strength of the current implementation and must not regress.**
- [ ] The gating message uses the same six-decimal-equivalent percentage formatting as the rest of the surface. The string *"exactamente 100 %"* under `Generar fichero` is reconciled with the `100,0000 %` used elsewhere — one form, used consistently.
- [ ] The control does not shift position when its disabled-reason caption appears or disappears.

### C. Hierarchy

- [ ] The coefficient sum — the figure the distributor validates — carries more visual weight than the decorative agreement counts on the list page.
- [ ] `Vigente`, `Borrador` and `Histórico` are distinguishable from each other at a glance without reading the chip's text, including the `onDark` variants in `SharingAgreementStatusChip`.
- [ ] A `SUPERSEDED` agreement's detail page reads as a closed record: no batch selection bar, no select-all, no per-row action kebabs, no filter chips implying a live working state.

### D. Honest state

- [ ] The *"normal en transición mientras la distribuidora aplica los coeficientes pendientes"* caption renders **only** when `agreementStatus === PUBLISHED`. It never appears on a `SUPERSEDED` agreement.
- [ ] A `SUPERSEDED` agreement with an applied sum below 100 % shows a static closing figure with no advisory copy suggesting pending work.
- [ ] When `hasAnomalousRow` is true, a persistent, visible warning renders above the coefficient table stating that the draft contains coefficients marked as applied, that this should not be possible, and that the data should be reviewed before publishing or deleting.
- [ ] The extra state columns appearing remains the *consequence* of the anomaly; the warning is the message. A user who has never seen a normal draft can still tell something is wrong.

### E. Publish and revert confirmation

- [ ] `PublishSharingAgreementConfirmationModal` passes `confirmColor="primary"`. The constructive act is no longer styled identically to `Eliminar`.
- [ ] The publish dialog names the affected agreement, matching `DeleteSharingAgreementConfirmationModal`'s existing treatment.
- [ ] The publish dialog restates what is being sealed — the coefficient sum at the project's fixed precision, and the number of supply points.
- [ ] `RevertSharingAgreementToDraftConfirmationModal` names the affected agreement and states the point of no return (that reverting stops being possible once any coefficient is applied) — the rule currently explained only in the *publish* dialog, where the user does not yet need it.
- [ ] Both dialogs pass `confirmPending` so the confirm button shows the existing spinner while the mutation is in flight.
- [ ] Completing a publish or a revert produces a visible confirmation that the change succeeded. Success is not communicated solely by the dialog closing.
- [ ] The state change is announced to assistive technology (an appropriate live region), and focus is not dropped to `<body>` when the dialog closes.

### F. Regression safety

- [ ] `npm run lint` — 0 errors and 0 `no-restricted-syntax` violations. All new styling uses `src/theme/tokens.ts`, `theme.palette.*` or `src/theme/sx.ts`; no raw hex, rgba, hand-written shadows, rem/em font-size literals or Tailwind classNames.
- [ ] `npm test` passes. New behaviour has colocated `.spec.tsx` coverage; each new test is proven able to fail before being trusted.
- [ ] No files under `src/api/` are modified.
- [ ] `npm run test:visual` is run and the resulting diffs are **reported for review**. Baselines are **not** regenerated as part of this work — see Out of Scope.
- [ ] Mobile (390×844) is verified as a first-class case, not an afterthought: the detail page's first viewport contains actual agreement data rather than being fully consumed by the hero banner, and coefficient rows align consistently whether or not a given row is actionable (`SharingAgreementCoefficientSet.tsx:522-529` currently indents only actionable rows, so the eye cannot form a column).

## Out of Scope

- **i18n extraction.** There is no i18n layer anywhere in the app; the ~51 Spanish literals on this surface are a project-wide baseline, not a defect of this surface. New copy introduced here must stay extraction-friendly — no new Spanish-formatted numbers baked into sentence constants, no plurals built with template ternaries — but no extraction work happens in this issue.
- **Regenerating Playwright baselines.** This work will invalidate a large share of the 56 sharing-agreement goldens. Diffs are reported for human review; `npm run test:visual:update` is a separate, deliberate step once the new design is approved.
- **The coefficient editor's unit mismatch.** The editor accepts `0,300000` where every read view shows `30,0000 %`, and the toggle is labelled `Coeficiente`/`kW` rather than `% / kW`. This is a real 100× transcription risk in a number that reaches the distributor, but it is a separate change with its own testing surface. **Recommended as an immediate follow-up issue.**
- **The upload dialog.** `SharingAgreementUploadDialog`'s rejection handling is the strongest interaction on the surface — it states that the draft was not modified, names the offending line and CUPS, and offers retry in place. Leave it alone.
- Minor observations from the critique not listed above (draft-table column widths, the five vocabularies in the `Estado de fin` column, the single-item batch `Acciones` menu, the two kebabs hardcoding `minWidth/minHeight: 40` against the theme's 44px coarse-pointer rule, the empty-state CTA placement) — worth a follow-up housekeeping issue.

## References

- Critique snapshot: `.impeccable/critique/2026-09-14T11-04-30Z__src-pages-production-sharingagreementspage-tsx.md`
- Pages: `src/pages/production/SharingAgreementsPage.tsx`, `src/pages/production/SharingAgreementDetailPage.tsx`
- Key components: `SharingAgreementDetailHeader`, `SharingAgreementNextStepPanel`, `SharingAgreementCoefficientSet`, `SharingAgreementCoefficientSumCards`, `SharingAgreementStatusChip`
- Modals: `src/components/Modals/{Publish,RevertSharingAgreementToDraft}ConfirmationModal.tsx`, `ConfirmationModal.tsx`
- Conventions: `CLAUDE.md` (table row actions, confirmation dialogs, styling contract), `references/styling-conventions.md`, `references/theme-tokens.md`
- Visual evidence: `tests/visual/__screenshots__/{desktop,mobile}/sharing-agreement*.png`
