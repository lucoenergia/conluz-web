# ADR-0003 — Size screenshot thresholds in absolute pixels per capture, below the smallest measured regression

- **Status:** Accepted
- **Date:** 2026-09-25
- **Deciders:** Víctor Cañizares
- **Applies to:** `lucoenergia/conluz-web`: the Playwright visual suite (`tests/visual/`, `playwright.config.ts`)

## Context

Until this change, `playwright.config.ts` set one screenshot threshold for the whole suite, `expect.toHaveScreenshot.maxDiffPixelRatio: 0.02`. A capture passed if at most 2% of its pixels differed from the baseline. The comment on it said the ratio "absorbs sub-pixel font rendering differences while still catching real color changes". Nobody had measured either half of that claim.

The suite captured almost every page in full until "Shrink the blast radius of the visual regression tests" moved it to region captures (PR 2). Measuring that work exposed what the ratio did. Every figure below comes from the tolerance-0 method described in the Decision, with two clean runs as a noise control.

- **The ratio hid real changes on large captures.** A header wordmark edit and a side-menu label edit both failed **0** baselines before and after PR 2, although at pixel level they changed 48 and 42 baselines at the PR 1 head. Earlier, a whole extra table column on the tall agreement detail page diffed under 2%, and a text assertion had to be added so the column's presence was actually checked. On the published agreement detail page (1164×2488), 2% is 57,920 px.
- **It was loose on small captures too.** On the two-item Acciones menu (198×64), 2% is 253 px, more than a relabelled item (175 px measured). A changed menu label could pass.
- **It made the chrome canary blind.** PR 2 added canaries whose only subject is the app bar and side menu. The side-menu edit reached exactly the two canaries that show the menu, at 175 px each, and both passed. PR 2 recorded AC10 ("a chrome change fails the canary") as not met.
- **It hid non-determinism.** At the PR 1 head, 8 captures differed between two identical runs, from a kWh figure the app renders with `Math.random()`. They passed on tolerance, not on determinism, for an unknown length of time. It also hid stale baselines: `login-page` differed from current rendering by 716 / 733 px and survived only inside the 2%.

Facts about how thresholds behave that made this harder to see:
- `maxDiffPixelRatio` is relative to the image, so the same regression is allowed on a tall page and caught on a small one.
- When a call sets `maxDiffPixels` and a ratio also applies, Playwright uses the smaller of the two pixel counts.
- A per-call option takes precedence over the config. So a config-level override cannot tighten a capture whose call sets its own value.
- Screenshots are compared at CSS scale, so a mobile capture is not multiplied by the device pixel ratio. The 175 px label signal is the same on both viewports.
- Playwright's per-pixel colour `threshold` (default 0.2) is applied before any pixel is counted. Colour shifts of a few levels per channel are counted neither by the suite nor by a "tolerance 0" measurement.

After PR 2 and the first part of PR 3 (the app bar is hidden in every non-chrome capture, and stale baselines are regenerated), the local noise floor is **0 of 130** tests between two identical clean runs.

## Decision

### 1. No global screenshot threshold

`playwright.config.ts` sets none. Every `toHaveScreenshot()` call carries its own threshold. Leaving one out would default to an exact match. That fails safe, but no call is meant to rely on it.

### 2. Absolute pixels, not a ratio

Thresholds are `maxDiffPixels`. A regression worth catching has an absolute size: a short label (175 px), the wordmark (316 px), a missing control or column. That size does not grow with the capture, so the allowance must not either.

### 3. Sized per capture category, below the smallest measured signal, above the measured noise

The values live in `tests/visual/fixtures/capture.ts`, and the helpers apply them:

| Category | Constant | Value | Used by |
|---|---|---|---|
| Components: dialogs, menus, drawer, panels, sections, bars, header | `COMPONENT_MAX_DIFF_PIXELS` | 100 | `hideAppBar()` |
| Page layouts: main region, full-page login | `LAYOUT_MAX_DIFF_PIXELS` | 100 | `mainRegion()`, `login-page` |
| Chrome canaries | `CANARY_MAX_DIFF_PIXELS` (`chrome-canary.spec.ts`) | 100 | the three canaries |

100 sits 43% below the smallest measured regression (175 px) and 100 px above the local noise (0). The categories share a value today because the smallest regression worth catching is the same kind of thing in each (a label). They are separate constants so that one can move without the others when a measurement says it should.

### 4. Thresholds are measured, with a documented method

Every value is wrapped in `threshold()`, which returns 0 when `VISUAL_EXACT=1`. The method:
1. Run `VISUAL_EXACT=1 npx playwright test --reporter=json` twice on a clean tree. Any capture whose differing-pixel count changes between the two runs is noise, and is made deterministic before a threshold is chosen. It is fixed in a fixture if possible, or masked as a documented interim if the cause is production code.
2. Run it once per representative edit, made on a backed-up file and restored by copy. The capture's differing-pixel count is the signal.
3. Put the threshold below the smallest signal worth catching and above the noise, and record both figures at the value.

Thresholds are measured against the current baselines. Never calibrate against an image about to be regenerated, and never size a threshold to make a failing capture pass.

## Alternatives considered

**Keep one global ratio, set lower (e.g. 0.5%).** One line of config, no per-capture thinking. It was rejected because a ratio is wrong in the same direction at both ends whatever its value. 0.5% is still 14,480 px on the tallest page, while on the Acciones menu it is 63 px, tight enough that it would start failing on any anti-aliasing noise that ever appears.

**Per-capture ratios.** This keeps the familiar knob and can be tuned per area. It was rejected because the thing being bounded, the size of a regression, is absolute. Each ratio would have to be derived from the capture's current size and re-derived whenever the capture grows. That is the absolute value with an extra step and a new way to drift.

**A lower global default plus per-capture overrides (issue D2).** This is less code at each call. It was rejected because a default becomes the value nobody chose: a new capture would inherit a threshold it never measured. With no global value, the choice has to be made, and made with the method above.

**Exact match everywhere (`maxDiffPixels: 0`).** The simplest and strictest option, and locally it holds today (noise is 0). It was rejected because cross-environment rendering is unmeasured: a Chromium or font difference between a local machine and CI could fail every capture at once. 100 px of margin costs nothing against a 175 px smallest signal.

## Consequences

**Positive**

- The canaries detect a single relabelled menu item, which closes AC10. Demonstrated: the side-menu edit fails exactly the 2 canaries that show the menu, out of 130 tests.
- Every threshold is the same order of magnitude as a real regression, on every capture size.
- Non-determinism can no longer pass silently: any noise above 100 px fails the capture that has it.

**Negative**

- Every new capture needs a threshold choice. The helpers supply one, but a capture outside the categories must be measured.
- The threshold is only as good as the smallest-signal measurement. A category whose smallest meaningful regression is below 100 px (for example a one-pixel border colour, or a single icon swap) is not guaranteed to be caught. Those need text or attribute assertions, as the suite already uses for a column's presence or a control's focusability.
- Cross-environment noise is unmeasured locally. CI is the first place a threshold can fail for reasons other than a regression. If it does, the failure's pixel count is the measurement to size from, not a reason to raise the value blindly.
- Anyone changing a threshold must follow the method and record the figures at the value. Changing a number without a measurement recreates the old problem.

## Revisit if

- CI fails a capture while the same capture passes locally: the cross-environment noise then exceeds the 100 px margin for that capture. Measure it and resize, or remove the source of the difference.
- A regression that should have been caught passes under its threshold. Measure its pixel count and move the category below it.
- A category's smallest meaningful regression changes, for instance captures that can only regress by a few pixels.
- Playwright changes how `maxDiffPixels`, `maxDiffPixelRatio` or the per-pixel `threshold` combine, or changes its default comparator.
- The noise floor (two clean `VISUAL_EXACT=1` runs) stops being 0.

## References

- Values and `threshold()`: `tests/visual/fixtures/capture.ts`; canary value: `tests/visual/chrome-canary.spec.ts`.
- No global threshold: `playwright.config.ts`.
- Operational rule for agents: `CLAUDE.md`, "Screenshot thresholds (no global value)".
- The work that produced the measurements: "Shrink the blast radius of the visual regression tests", PRs 2 and 3.
- Related: ADR-0002 (selector hierarchy, which governs the locators the thresholds apply to).
