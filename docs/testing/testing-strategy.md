# Frontend test strategy

## Purpose

This document states which test level owns which risk in conluz-web, when a visual test may be
added, and the CI policy for retries, flaky tests and baselines. The reasoning behind the admission
rule and the retry policy, and the conditions for revisiting them, are recorded in
[ADR-0005](../decisions/adrs/0005-admit-visual-tests-only-for-pixel-risk-and-retry-once-in-ci.md).

It applies to every contributor. `AGENTS.md` and the testing skill
(`.claude/skills/conluz-web-testing/SKILL.md`) make it binding for agents.

Terminology follows the rest of the repository: a **spec document** is a file under `docs/specs/`,
and a **test spec** is a Vitest or Playwright test file.

## Test levels and what each owns

Each risk has one owning level. A test belongs at the level that owns its risk.

- **Vitest with jsdom** (`src/**/*.spec.{ts,tsx}`) owns behaviour:
  - what a state renders: texts, presence or absence of actions, enabled or disabled controls,
    validation messages, capability gating, formatting;
  - hook, utility and context logic.
- **Playwright visual tests** (`tests/visual/`) own appearance and layout: structure per viewport,
  spacing, overflow, wrapping, theme application.
- **Playwright assertions without screenshots** are reserved for behaviour that needs a real
  browser: real layout geometry, and the requests a rendered page actually makes.
- **Contract test specs** in `src/contracts/` own architecture rules.
- **`tsc -b`** owns type-level checks.
- **E2E tests against a real backend** do not exist. This is a known gap, planned after the MVP. It
  is not a level.

## When to add a visual test

A visual test is added only when a pixel change is the risk.

1. The behaviour of the state is asserted in Vitest first.
2. The visual test adds only what Vitest cannot see.

Capture one image per distinct visual treatment, not one per occurrence. For example, the error
style of a field is captured once per component, not once per validation rule.

## Classifying existing visual tests

Each existing visual test falls into one of three classes:

- **Keep:** it captures the base state of a screen or component, or a distinct visual treatment not
  captured elsewhere.
- **Migrate to Vitest:** it differs from an already captured state only in content or state that
  Vitest can assert.
- **Delete:** its baseline is byte-identical to another, or the test is fully covered elsewhere.

Borderline cases are listed for a decision and are never migrated silently.

Do not delete, merge or migrate existing visual tests outside an issue dedicated to classifying
them. If a visual test you touch appears to violate the admission rule, leave it unchanged and list
it in the final report.

## Navigation in visual tests

Each user flow has one test that reaches its state through UI navigation. Every other state is
reached by direct URL.

## Viewports

Every visual test currently runs in both Playwright projects, `mobile` and `desktop`. Whether
variants run on mobile only is an open decision, tracked in
[#239](https://github.com/lucoenergia/conluz-web/issues/239).

## Retries and flaky tests

- Retries are 1 in CI and 0 locally (`retries` in `playwright.config.ts`).
- A flaky entry in the job summary is a test that failed and then passed on its retry. Every flaky
  entry gets an issue.
- A suspected flake is checked with the manual run of the visual workflow. Clean repetitions bound
  the failure rate only to about 3/N, where N is the number of clean repetitions, so 20 clean runs
  do not rule out a rare flake.
- A confirmed flaky test keeps running while its root cause is fixed in its own issue. There is no
  quarantine.
- `--fail-on-flaky-tests` is not used.

How the job reports a flaky test, and how to start the manual run, are described in
[`CONTRIBUTE.md`](../../CONTRIBUTE.md), sections "Retries and flaky visual tests" and "Running visual
tests manually".

## Baselines

Baselines are never auto-accepted: `playwright.config.ts` sets `updateSnapshots: "none"`, so no run
writes a PNG unless a CLI flag says so. A maintainer regenerates them locally with
`--update-snapshots=changed`, reviews them and commits them. Agents never update them.

The maintainer procedure is in [`CONTRIBUTE.md`](../../CONTRIBUTE.md), section "Updating visual
regression baselines".

## Time budget

No CI test job may exceed 5 minutes at the median. The budget applies to every CI test job, the
Vitest job in `.github/workflows/test-n-build.yml` included.

The measurement source for the visual job is its JSON report artifact, `playwright-visual-results`.
For the other jobs, it is the job duration in GitHub Actions.

## Local feedback loop

Locally, run only the affected test spec files and project:

```bash
npx playwright test <spec> --project=<mobile|desktop>
```

If the change touches the theme, a layout or a component shared across screens, run the visual test
spec files of every screen that uses it. The final report lists the visual test spec files run and
why.

CI runs the full suite. Retries are 0 locally, so a local failure is always real.

## References

- [ADR-0005](../decisions/adrs/0005-admit-visual-tests-only-for-pixel-risk-and-retry-once-in-ci.md):
  the admission rule, level ownership, and the CI retry and flaky policy.
- [`CONTRIBUTE.md`](../../CONTRIBUTE.md): flaky reporting, the manual run, and baseline
  regeneration.
- [`playwright.config.ts`](../../playwright.config.ts): projects, retries, `updateSnapshots`.
- [`.github/workflows/visual-regression.yml`](../../.github/workflows/visual-regression.yml): the
  visual job, its artifacts and the manual run.
- [#239](https://github.com/lucoenergia/conluz-web/issues/239): open decisions on viewports and
  component-level visual testing.
- [#263](https://github.com/lucoenergia/conluz-web/issues/263): the CI retry policy, flaky reporting
  and the manual run.
