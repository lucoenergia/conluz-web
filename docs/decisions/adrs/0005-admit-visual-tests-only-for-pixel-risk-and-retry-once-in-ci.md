# ADR-0005 — Admit visual tests only where a pixel change is the risk, and retry failed tests once in CI

- **Status:** Accepted
- **Date:** 2026-10-16
- **Deciders:** Víctor Cañizares
- **Applies to:** `conluz-web — test suites and CI`

## Context

conluz-web has three test levels in use:

- Vitest with jsdom (`src/**/*.spec.{ts,tsx}`), including the contract test specs in
  `src/contracts/`;
- type-level checks through `tsc -b`;
- Playwright visual regression (`tests/visual/`), Chromium only, with a `mobile` and a `desktop`
  project, plus a few Playwright assertions that take no screenshot.

No E2E tests against a real backend exist.

No document stated which level owns which risk, or when a visual test should be added. As measured
between 2026-09-01 and 2026-10-09, the visual baselines grew from 45 to 196, and the visual CI job
reached about 10 minutes. These figures describe the suite at that time, not a target.

Visual tests are the most expensive level. Each one drives a real browser against a dev server, and
runs once per viewport project. Many of the added tests captured state variants (validation
messages, disabled actions, partial sums) that a Vitest test can assert as text or as absence.
Without a rule, every new state of a screen tended to become a visual test, so CI time grew with
each feature and any speed-up was absorbed by the next features.

Until #263, `retries` was 0. A single failure, real or not, cost a full re-run of the visual job, and
a flake could not be told apart from a real diff: both showed up as one red run. #263 introduced one
retry in CI (none locally), flaky reporting in the job summary (`scripts/report-flaky-tests.mjs`),
and a manual run of the visual workflow, filtered and repeated. Its reasoning was recorded only in
that pull request.

Agent instructions (`AGENTS.md`, the testing skill) did not restrict when agents add visual tests,
and agents write most of the tests.

## Decision

The two decisions below are independent. Each can be revisited or superseded without the other.

### 1. Admission rule and level ownership

**Level ownership.** Vitest owns behaviour: what a state renders (texts, presence or absence of
actions, enabled or disabled controls, validation messages, capability gating, formatting) and hook,
utility and context logic. Playwright visual tests own appearance and layout: structure per
viewport, spacing, overflow, wrapping, theme application. Playwright assertions without screenshots
are reserved for behaviour that needs a real browser: real layout geometry, and the requests a
rendered page actually makes. Contract test specs in `src/contracts/` own architecture rules, and
`tsc -b` owns type-level checks. E2E against a real backend does not exist. It is a known gap,
planned after the MVP, not a level.

**Admission rule.** Add a visual test only when a pixel change is the risk. Assert the behaviour of
the state in Vitest first; the visual test adds only what Vitest cannot see. Capture one image per
distinct visual treatment, not one per occurrence: the error style of a field is captured once per
component, not once per validation rule. Ownership makes the rule decidable, because it says what
"what Vitest cannot see" means.

**Classifying existing visual tests.** Keep a test that captures the base state of a screen or
component, or a distinct visual treatment not captured elsewhere. Migrate to Vitest a test that
differs from an already captured state only in content or state Vitest can assert. Delete a test
whose baseline is byte-identical to another, or that is fully covered elsewhere. List borderline
cases for a decision; never migrate them silently.

**Navigation.** Each user flow has one test that reaches its state through UI navigation. Every
other state is reached by direct URL, so the cost of navigation is paid once per flow.

**Baselines.** Baselines are never auto-accepted. A maintainer regenerates them locally with
`--update-snapshots=changed`, reviews them and commits them. Agents never update them.

**Viewports.** Every visual test currently runs in `mobile` and `desktop`. Whether variants run on
mobile only is not decided here; it is open in #239.

### 2. Retry and flaky policy

Retry a failed test once in CI and never locally. A test that fails and then passes on its retry is
a flaky entry in the job summary, and every flaky entry gets an issue. Check a suspected flake with
the manual run; clean repetitions bound the failure rate only to about 3/N, so 20 clean runs do not
rule out a rare flake. A confirmed flaky test keeps running while its root cause is fixed in its own
issue. There is no quarantine. `--fail-on-flaky-tests` is not used.

One retry is enough to tell a flake from a real diff: a real diff fails both attempts, and a flake
passes the second. Zero retries locally keeps every local failure meaningful.

## Alternatives considered

**Selective execution by changed files.** Run only the visual tests that a change can affect. It was
rejected because visual tests reach the app by URL, not by importing source files, so the mapping
from source to tests would be maintained by hand and would drift. A test left out of the mapping
would stop running, and nothing would say so.

**A nightly full run.** It is only useful as a safety net for selective execution, which is rejected
above. On its own it moves failures away from the change that caused them.

**E2E or contract tests as a substitute for visual tests.** They cover different risks: E2E tests
cover integration with a real backend, and contract test specs cover architecture rules. Neither sees
a pixel, so neither can replace the visual tests that the admission rule keeps.

**`retries: 0` in CI.** It treats every failure as real, which is the strictest option. It was
rejected because it brings back a full re-run of the visual job for every flake, and a flake still
cannot be told from a real diff.

**`--fail-on-flaky-tests`.** It keeps the retry but fails the job when a test passes only on retry.
It was rejected because it brings back the cost of a full re-run for every flake. The flaky entry in
the job summary, followed by an issue, keeps the flake visible without that cost.

**Quarantine.** Move a flaky test out of the blocking run until it is fixed. It was rejected for
three reasons: the coverage of the quarantined test is lost, the quarantine is a mechanism that has
to be maintained, and quarantines tend to become permanent.

## Consequences

**Positive**

- The growth of the visual suite is limited by a rule rather than offset by one-off speed-ups.
- A flake no longer costs a full re-run of the visual job, and it no longer looks like a real diff.
- Flaky entries are visible in the job summary instead of being absorbed by a green run.

**Negative**

- A new visual test must be justified against the admission rule. A test added because a state
  exists, rather than because a pixel change is the risk, violates this decision.
- Every flaky entry needs an issue. A flaky entry without one violates this decision.
- A retry can hide nondeterminism that is never followed up. The retry turns a flake into a green
  job, so the issue for each flaky entry is the only thing that keeps it from being ignored.
- The existing visual tests are not yet classified against the rule, and that work is tracked under
  #239. Until it is done, the suite still contains tests this decision would not admit.

## Revisit if

**Decision 1 — Admission rule and level ownership**

- The median CI test job exceeds the 5-minute budget again after the existing visual tests are
  classified.
- Component-level visual testing is adopted (#239).

**Decision 2 — Retry and flaky policy**

- Flaky entries appear in more than 5% of visual runs in a calendar month.
- A flaky entry stays without an issue.

## References

- Strategy: `docs/testing/testing-strategy.md`.
- Projects, retries and `updateSnapshots`: `playwright.config.ts`.
- The visual job, its artifacts and the manual run: `.github/workflows/visual-regression.yml`.
- Flaky reporting: `scripts/report-flaky-tests.mjs`.
- Issue #239 — open decisions on viewports and component-level visual testing.
- Issue #263 — one retry in CI, flaky reporting and the manual run.
