---
target: sharing agreements pages
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:/mnt/Datos/workspaces/lucoenergia/sources/conluz-web/src/pages/production/SharingAgreementsPage.tsx"
target_fingerprint: "sha256:a953b4ed433499e6b3a52aa3e86366c63e2aeab59de2bca2c91f4999492ddc13"
target_path: /mnt/Datos/workspaces/lucoenergia/sources/conluz-web/src/pages/production/SharingAgreementsPage.tsx
timestamp: 2026-09-14T11-04-30Z
slug: src-pages-production-sharingagreementspage-tsx
---
**Method:** dual-agent (A: design review · B: detector + visual evidence)

**Target:** `src/pages/production/SharingAgreementsPage.tsx` + `SharingAgreementDetailPage.tsx` and their 12-component tree · **Mode: Operate** (community-admin only, `CommunityAdminRoute`) · Evidence: 28 desktop + 28 mobile Playwright goldens.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Publish/revert/delete close silently. `confirmPending` exists in `ConfirmationModal.tsx:30` with zero production callers. |
| 2 | Match System / Real World | 3 | Strong domain vocabulary, but the editor asks for `0,300000` where read views say `30,0000 %`. |
| 3 | User Control and Freedom | 2 | No undo after four irreversible acts; revert dialog is one sentence. |
| 4 | Consistency and Standards | 2 | Publish confirms in red (default `"error"`), revert in blue (explicit `"primary"`). Inverted. |
| 5 | Error Prevention | 3 | Publish/generate gated with stated reasons, but generate overwrites a delivered file unwarned. |
| 6 | Recognition Rather Than Recall | 2 | Whole lifecycle behind one unlabelled `MoreVertIcon` (`SharingAgreementDetailHeader.tsx:121`). |
| 7 | Flexibility and Efficiency | 2 | Batch `Acciones` menu holds one item. No keyboard path. |
| 8 | Aesthetic and Minimalist Design | 2 | "Faltan 25,0000 %" restated four times in three wordings. |
| 9 | Error Recovery | 3 | Upload-rejection dialog excellent; inline field errors weaker. |
| 10 | Help and Documentation | 3 | 5-stage disclosure real but collapsed, and its panel can't act. |
| **Total** | | **24/40** | **Needs work** |

## Design Specificity Verdict — partly authored

Authored domain logic wearing a category-interchangeable admin-template shell. `sharingAgreementStatus.ts` chooses `Vigente`/`Borrador`/`Histórico` over literal enum translations; `NextStepPanel.tsx:18-24` marks stage 3 "(fuera de Conluz)" because the app cannot observe an email; `formatCoefficientGapMessage` computes the exact shortfall. Real product character.

But the pixels are the 2021 MUI admin template: indigo gradient hero + three stat tiles + filter chips + card stack. The most product-specific fact — that the numbers must sum to exactly 100,000000 % — renders as a small pill at `body1/600`, while decorative counts `1 / 1 / 1` get 48px display type. Hierarchy inverted relative to what the domain cares about. The lifecycle has no visual weight: `SharingAgreementStatusChip.tsx:36/50/64` collapses all three `onDark` variants to the same `alphas.white.strong`, so even the pill's colour carries no state. `detail-published.png` and `detail-superseded.png` are the same page at squint distance.

**Deterministic scan: 0 findings, exit 0.** Lint 0 errors, 0 `no-restricted-syntax` in scope. All 6 IconButtons have `aria-label`. No `onClick` on non-interactive elements. Every substantive file has a spec. That clean sheet IS the finding: the surface passes every automated gate it has and still scores 24/40. Caveat: `impeccable detect` runs cascade analysis only on HTML; TSX gets regex matching only (verified with a deliberately-bad synthetic `.tsx` returning `[]`).

**Visual overlays:** none. Community-admin route guard redirects before re-evaluating, so no live browser pass; committed Playwright goldens used as fallback signal.

## Overall Impression

Careful work with inverted emphasis. The thinking went into correctness — gap math, defensive paths, disabled-with-reason, an honest external step — and almost none into making the *state* of a regulatory artifact legible. Biggest opportunity: the five stages in `NextStepPanel.tsx:18-24` are the admin's real mental model, already written and correct, hidden in a collapsed accordion. Make them the spine and half the issues below dissolve.

## What's Working

1. **Upload rejection dialog** — answers "did it corrupt my draft?" (no, stated first), "what's wrong?" (`Línea 3: el CUPS … no pertenece a ningún suministro`), "what now?" (`Elegir otro fichero`, in place).
2. **Stage 3 admits the boundary of the app's knowledge** (`NextStepPanel.tsx:112-117`, `isExternal`). Structurally prevents the belief that Conluz sends the file.
3. **Disabled-with-reason** (`SharingAgreementDetailHeader.tsx:147-189`) — `aria-disabled`, focusable, `aria-describedby`, exact shortfall stated.

## Priority Issues

### [P0] Publish confirmation reads as destruction and never names what it seals
`PublishSharingAgreementConfirmationModal.tsx:21-28` omits `confirmColor`; `ConfirmationModal.tsx:27` defaults to `"error"` — same red as `Eliminar`. `Revert…:22` explicitly passes `"primary"`. Semantics inverted. Also breaks CLAUDE.md's own rule ("Names the affected entity… Shows the new value") — never says which acuerdo, never restates `100,0000 %` or the supply-point count, while the delete modal does name its entity. Info alert opens on a double negative at the moment of commitment.
**Fix:** `confirmColor="primary"`; add agreement name + restated sum block above the alert; pass `confirmPending={isPublishing}`; success confirmation on resolve. → `/impeccable clarify`

### [P0] The entire lifecycle is buried under an unlabelled three-dot icon
`SharingAgreementDetailHeader.tsx:119-132` hides Editar / Poner en vigor / Volver a borrador / Eliminar in one white `MoreVertIcon` on an indigo banner. CLAUDE.md's kebab convention is about *table row actions*, not a page's primary verb. NextStepPanel tells the admin to put the agreement in force and offers no way to do it.
**Fix:** promote the state-advancing action to a labelled contained header button; keep only Editar/Eliminar in the kebab; give NextStepPanel a `primaryAction` slot. → `/impeccable layout`

### [P1] A superseded agreement says the distributor is still working on it
`SharingAgreementCoefficientSumCards.tsx:106-111` gates "normal en transición mientras la distribuidora aplica los coeficientes pendientes" on `!appliedSumIsFull` alone, no status check. Shows under `75,0000 %` on a 2022 agreement marked superseded. The file gap message at `:37-40` IS correctly gated on DRAFT with a comment — the pattern was known and missed one card over. Superseded pages also keep filter chips, select-all, row selection and kebabs live.
**Fix:** gate the caption on PUBLISHED; for SUPERSEDED show static `Suma aplicada al cierre`. Give superseded detail a visibly closed treatment. → `/impeccable harden`

### [P1] The defensive path renders impossible data with no signal
`SharingAgreementCoefficientSet.tsx:488` — `hasAnomalousRow` drives `showStateColumns` and nothing else. No Alert anywhere in the anomalous path. A DRAFT carrying APPLIED coefficients (documented as backend-impossible in `baseline.spec.ts:295-301`) silently grows two columns and shows `En vigor desde…` beside an orange `Borrador` chip. The code calls these rows anomalous; the interface calls them nothing.
**Fix:** persistent `<Alert severity="warning">` above the table when `hasAnomalousRow`, naming the contradiction. Columns are the consequence; the warning is the message. → `/impeccable harden`

### [P2] The editor speaks a unit the rest of the product never uses
Editor inputs read `0,300000`; read views read `30,0000 %`. Precision rule is honoured (`formatPercentage.ts:5-6`) — this is a unit problem. Toggle at `CoefficientSet.tsx:670` is labelled `Coeficiente`/`kW`, never `%`. kW mode mixes both in one summary. An admin transcribing `30` into a field whose neighbours read `0,25` has a 100× error waiting, in a number that reaches the distributor.
**Fix:** label the toggle `% / kW`; percentage-mode input renders `30,0000` with `%` adornment; one name for the file sum. → `/impeccable clarify`

## Cognitive Load: 4 failures — critical

FAIL: single focus (four co-equal panels, no primacy) · chunking (7-column table) · visual hierarchy (highest-stakes control hidden, `1 / 1 / 1` largest type) · working memory (NextStepPanel names an action whose button is ~700px below).
PASS: visual grouping, one-thing-at-a-time, progressive disclosure.
>4 options: list toolbar 6 · published coefficient panel 7 · editor toolbar 6 · draft detail 7 unranked affordances.

## Emotional Journey

Peaks: upload rejection; gated publish turning a dead end into an instruction.
**Valley at the end of the most consequential flow:** confirm publish → button greys, no spinner, dialog vanishes, chip flips. No toast, no confirmation anything reached the server. `confirmPending` was built for this and never wired. Peak-end rule violated at the end.
Second valley: the revert dialog is the thinnest of three yet governs un-publishing a regulatory instrument, and never mentions the point of no return the publish dialog spent two paragraphs on.

## Persona Red Flags

**First-time community admin:** completes coefficients, generates file, emails it, distributor confirms — then must publish, and there is no visible publish control on the page. A white `⋮` on indigo is the only path and the one unlabelled element. Does not finish unaided.
**Admin under deadline:** generate dialog pre-fills year `2026` while the page shows `…_2025.txt`, unexplained, with no statement of what happens to the already-emailed file. Generate/Importar buttons jump ~340px apart when the disabled caption appears.
**Older admin on 390px:** hero banner consumes the entire first 844px screen — zero coefficient data in viewport one. Rows ragged: actionable rows indent ~46px, non-actionable don't (`CoefficientSet.tsx:522-529`); the eye can't form a column.
**Keyboard/screen reader:** only publish route is an IconButton labelled "Más opciones del acuerdo". `aria-disabled` + `aria-describedby` genuinely well done (`:149-150`), but on success focus is lost to `<body>` and nothing announces the state change. `aria-live` count on the surface: 0.

## Minor Observations

- `confirmPending` has zero production callers repo-wide — built, documented, spec'd, never wired.
- No i18n layer exists anywhere. 51 Spanish literals in scope; plurals via template ternaries (`CoefficientSet.tsx:519`) that can't survive extraction to non-binary-plural languages; `NextStepPanel.tsx:19` hard-codes Spanish-formatted `"100,0000 %"` inside a sentence constant. Multi-language is a committed goal — this is an extraction blocker.
- Two kebabs hardcode `minWidth/minHeight: 40` (`SharingAgreementCard.tsx:116`, `SharingAgreementDetailHeader.tsx:126`), possibly overriding the theme's deliberate 44px coarse-pointer rule (`src/theme/index.ts:98-116`).
- Draft table: ~480px dead space between CUPS and Coeficiente.
- `Estado de fin` mixes five vocabularies in one column (null marker, two status phrases, two date formats).
- Batch `Acciones` menu holds exactly one item — render it as the bar's button when `length === 1`.
- `Generar fichero` gating copy says "exactamente 100 %" while three sibling messages say "100,0000 %".
- Empty list has no CTA inside the empty state.

**Downgraded from Assessment A:** the mobile batch bar does NOT permanently occlude content — the exact-viewport golden shows it correctly at the bottom, and a dedicated regression test ("mobile batch bar doesn't cover the last card") passes. The apparent collision is a Playwright full-page artifact. Ragged row indentation and the low-contrast `Limpiar selección` text button remain real.

## Questions to Consider

1. Why are the five stages a collapsed accordion instead of the page's spine?
2. If a `Histórico` agreement can't be edited, selected, filtered or acted on, why does it render the same component tree as a live one? What is a sealed record, as opposed to a disabled form?
3. What if the 100 % constraint were a persistent gauge that physically fills, rather than a pill restated four times in three wordings?
4. What if the header carried one explicit lifecycle control instead of a menu that hides which way time is flowing?
5. Should "enviado el / a quién / con qué fichero" be a first-class recorded fact rather than an inference from the publish action?
