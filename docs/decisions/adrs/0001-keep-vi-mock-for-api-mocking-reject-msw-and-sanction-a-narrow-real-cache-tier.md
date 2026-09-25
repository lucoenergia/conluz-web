# ADR-0001 — Keep `vi.mock` for API mocking, reject MSW, and sanction a narrow real-cache tier

- **Status:** Accepted
- **Date:** 2026-09-24
- **Deciders:** Víctor Cañizares
- **Applies to:** `lucoenergia/conluz-web`, frontend test suite

## Context

Counts are as of commit `45af835`. The suite has 114 spec files. 37 specs mock the API: 17 under `src/pages`, 20 for components and hooks. The convention is `vi.mock` of the Orval-generated `src/api/<tag>/<tag>` modules, replacing the hook with a literal return value. Contexts are re-mocked per spec (`error` in 17 specs, `success` in 8, `community` in 8). 20 specs build their own `QueryClient`, 26 wrap the tree in `ThemeProvider` (one with a default MUI theme rather than the project theme), and 35 wrap it in a router while 12 mock `react-router` instead. 35 specs define their own local render helper (`renderPage`, `renderDialog`, `renderWithTheme`, …), each re-implementing the wrappers; the rest inline them.

Three specs already use a different approach: `SharingAgreementReopenInvalidation.spec.tsx`, `SupplyCoefficientHistoryInvalidation.spec.tsx` and `useSharingAgreementCoefficientMutations.staleness.spec.tsx` mock `src/api/custom-instance.ts` — the single axios function every generated hook calls — and run a real `QueryClient` with retries disabled. The two staleness tests assert that `isActivating` stays true through the refetch that invalidation triggers, not only through the POST. That behaviour cannot be observed when the hook itself is replaced.

What forced the decision: during issue #170, a mock of `useGetAllUsers` returning `{ data: undefined, isLoading: false }` was proposed. That combination cannot occur in a query that is enabled and resolved, and it would have passed, because a `vi.mock` factory is not type-checked against the module it replaces. Typing alone does not close this: in TanStack Query v5 the same combination is a legal type in `QueryObserverPendingResult` (`isLoading: boolean`), a real runtime state for a disabled query, and in `QueryObserverLoadingErrorResult`. What makes it wrong is using it to stand in for a resolved query. The suite would have been green against a state the application cannot produce.

Orval can emit MSW handlers. The generated ones were deleted in #170: nothing consumed them, no `setupServer` was ever wired, faker ran unseeded, and each handler carried a hardcoded 1 s delay. A time-boxed spike converted two specs (`UsersPage.spec.tsx`, 24 tests; `MembersPage.spec.tsx`, 7 tests) to MSW and measured both approaches against criteria fixed before measuring. Results, on a 10-core / 20-thread machine, two runs each:

- Setup lines: +10.9% and +11.9% for MSW, plus 39 lines of shared infrastructure.
- Wall-clock: +26.7% and +19.0% raw. In interleaved runs with the setup file loaded for both approaches, +8.5% and +3.9%. An estimated 2.5 s of every run is fixed Vitest startup (derived from Vitest's phase breakdown, not measured on its own), so the raw figures are noisy. Vitest's own test phase grew +34% and +28%.
- Determinism: identical results across three consecutive runs for both approaches.
- Contract fidelity: a deliberate rename of `UserResponse.fullName` to `displayName` in the spec, followed by regeneration, left **both** approaches green at test level. `tsc -b` failed on the pages themselves under both. At spec level, `tsc -b` flagged the MSW spec files (3 and 1 errors), because the generated handlers force typed fixtures, and flagged the `vi.mock` spec files not at all. The only fidelity gain observed therefore came from typing the fixtures, which does not require MSW.

Two facts made the fidelity question harder to see than it should have been. First, the criterion was unable to discriminate by construction: the hooks and the MSW handlers are generated from the same `api-docs.json`, so generated handlers can never disagree with the generated client. Neither approach can detect drift between `api-docs.json` and the running backend. Second, MSW's safety net does not work as advertised in this setup: with all generated handlers registered as defaults, `onUnhandledRequest: "error"` is inert. Removing the communities override left 23 of 24 tests green, answered silently by faker. The spike also found that generated default handlers shadow each other: `GET /users/current` is answered by the `/users/:userId` handler because of the order Orval emits them in. Nothing visible breaks today, because the shapes match.

MSW did exercise two behaviours `vi.mock` cannot: real refetches after invalidation (10 membership GETs across 7 tests) and assertions on the actual request body and URL. No current spec verifies either.

## Decision

Parts 1 to 3 only work together. Builders without type enforcement leave the wrong state discouraged rather than hard to write, which is the failure mode that prompted this ADR; type enforcement without builders leaves every spec writing its own state literals.

### 1. `vi.mock` of the generated modules stays the default

Specs continue to mock `src/api/<tag>/<tag>`. It is the cheapest option, it is already the convention in 37 specs, and the spike found no fidelity gain that justifies replacing it.

### 2. The mock factory result is typed against the real module

Factories are typed so a return value that is not a valid hook result fails `tsc -b`, for example by constraining the factory result against `typeof import("…/users")` or by using `vi.mocked` with a typed return. A shared harness supplies typed fixture builders (`satisfies <T>`) and query and mutation state builders.

Typing alone is not enough, because `{ data: undefined, isLoading: false }` is a legal type (see Context). The builders therefore make the spec name the state it wants: a success builder takes data of the response type and cannot carry `data: undefined`; the disabled-query state (pending, not fetching) and the error state have builders of their own. Mistaking one state for another then requires choosing the wrong builder by name, rather than omitting a field. Untyped, hand-written hook-state literals are the thing this closes.

### 3. Invalidation is asserted against a real `QueryClient`

`renderWithProviders` exposes the real `QueryClient` it creates, configured with retries disabled, and specs spy on it. Mocking `useQueryClient`, as `MembersPage.spec.tsx` does today, is discontinued: it verifies that a function was called, not that the cache reacted.

### 4. A narrow second tier: real `QueryClient` with `customInstance` mocked

This tier is used only when the subject of the test *is* cache behaviour — invalidation, refetch, or a loading state that spans a refetch. Everything else uses tier 1. The harness supplies a shared URL-router helper for `customInstance`, so specs stop hand-writing a `switch` over URL strings. The router must **reject any request whose method and URL it does not match**, so an unexpected or renamed route fails the test loudly. `SharingAgreementReopenInvalidation.spec.tsx` and `SupplyCoefficientHistoryInvalidation.spec.tsx` already do this; `useSharingAgreementCoefficientMutations.staleness.spec.tsx` routes on method alone and must be brought in line. The three existing specs listed in Context are this tier's reference implementations.

### 5. MSW is rejected

The pre-agreed criterion required all three of its conditions. The fidelity condition failed: MSW caught nothing that `vi.mock` missed. The setup-lines condition passed (+10.9% and +11.9%, against a 30% limit). The wall-clock condition failed on raw figures for one spec (+26.7%, against a 20% limit), but see Consequences on why that number does not carry the decision.

## What a green test now means

- **Tier 1 (`vi.mock`)** verifies rendering and behaviour given a stated hook state. After decision 2, that state is a valid hook result, and which state it is has been chosen explicitly by builder. It verifies nothing about the request, the cache, or refetching.
- **Tier 2 (`customInstance`)** additionally verifies that the right query keys were invalidated, that a refetch happened, and what URL, method and body were sent. Because the shared router rejects unmatched requests (decision 4), a renamed or unexpected route fails the test rather than returning `undefined` silently.
- **Neither tier** can detect drift between `api-docs.json` and the running backend. That is not a mocking problem and cannot be fixed by choosing a mocking library; it needs contract verification against the backend. `tsc -b` catches drift between the spec and the generated client, which is a different and narrower guarantee.

## Alternatives considered

**MSW with Orval-generated handlers.** Genuinely tempting: it is the industry default, Orval generates the handlers for free, and it exercises the real hook, the real cache and the real request. Rejected on measurement. It costs more setup, more wall-clock and more reading hops (2 to 3, against 1 for `vi.mock`), and its central promised benefit — catching contract drift — does not exist here, because handlers and hooks share one source. Migration was estimated at 3 to 3.5 days against 2 to 2.5, with two conventions to document either way. Its unique gains, request assertions and real refetches, are also available through tier 2, which needs no new dependency or mock server; tier 2's cost was not measured in the spike.

**Migrating everything to tier 2.** Rejected on cost and blast radius. Every spec would pay the real query lifecycle, including pure component specs with no data layer, and every spec would carry a URL router whose strings nothing type-checks. The value is concentrated in a small number of cache-behaviour specs.

**Keeping the status quo with no harness.** Rejected: it leaves 20 hand-rolled `QueryClient`s, 35 local render helpers, inline providers in dozens of specs, one spec rendering against a theme production never uses, and the 144 duplicated header lines created by the spec split in #170. It also leaves the impossible-state hole open.

**A lint rule banning hand-written hook-state literals in specs.** Deferred rather than rejected. Type enforcement covers the same ground for typed factories; the lint rule is the backstop if untyped factories keep appearing.

## Consequences

**Positive**

- A hook-state mock stops compiling unless it is a valid hook result, and the builders make the spec name which state it wants. `{ data: undefined, isLoading: false }` can no longer stand in for a resolved query by accident.
- Cache and invalidation behaviour becomes testable through a sanctioned, documented route instead of an undocumented local habit in three files.
- Provider setup moves to one place, so changing a provider, the theme or a context stops being an edit across dozens of specs.
- No new runtime dependency, no faker, no mock server, no per-file setup cost.

**Negative**

- Two conventions now exist. Every new spec requires a judgement about which tier applies, and the trigger for tier 2 must stay written down: **the subject of the test is cache behaviour**. Anything looser will pull specs into the slower tier.
- Tier 2 depends on the shared router rejecting unmatched requests. A spec that bypasses the router with its own `mockImplementation` loses that guarantee, as the staleness spec shows today.
- Migrating 37 specs risks quietly weakening assertions. Any migration must prove that test names and assertions are unchanged, by comparing JSON reporter output before and after. This is an obligation, not a suggestion.
- The decision rests on a fidelity argument, not on the timing figures. The raw wall-clock numbers (+26.7%, +19.0%) carry an estimated 2.5 s of fixed startup each and dropped to +8.5% and +3.9% when interleaved. They must not be cited on their own to defend this ADR.

**Operational**

- Anyone revisiting MSW must register **no** default handlers. With defaults registered, `onUnhandledRequest: "error"` is inert and unmocked endpoints are answered silently by faker.

## Revisit if

- The backend publishes its OpenAPI spec in CI so tests can be run spec-against-backend. That closes the drift neither tier can see, and changes the fidelity argument this ADR rests on.
- A production regression escapes because cache or invalidation behaviour was mocked away in tier 1. That is the gap this decision knowingly accepts.
- Tier 2 grows beyond 10 specs, or `routeRequests` acquires per-spec forks or special cases — that is, any spec needing routing behaviour the shared helper does not provide. Either is the point at which the cost gap against MSW narrows enough to re-measure.
- Orval changes how it emits mock handlers, specifically the route ordering that currently lets `/users/:userId` shadow `/users/current`.
- Any spec needs to assert on a request body or URL outside a cache-behaviour test. That would mean tier 2's trigger is too narrow.
- Casts of partial fixtures to API response types spread again: add an ESLint rule banning `as <…>Response` (and `as never` / `as unknown as …` escape hatches) in specs. The migration removed every such cast from the 38 spec files it touched (the 37 API-mocking specs and `Pagination.spec.tsx`), because a cast hides missing required fields the way untyped factories hide impossible hook states. Specs outside the migration still held **54** at closeout (2026-09-25, commit `450af81`). Trigger: the count below rises above 54, or any match appears in one of the 38 migrated specs. Reproduce the number with (this is the pattern of the `castcount.sh` helper used during the migration):

  ```bash
  rg -n --no-heading '\bas (unknown as )?(Supply|Plant|SharingAgreement|User|Membership|Community|PartitionCoefficient|PagedResult)\w*(\[\])?\b|\bas never\b|\bas unknown as (Awaited|ReturnType)\b|\bas ReturnType<' src -g '*.spec.ts' -g '*.spec.tsx' -g '*.testUtils.tsx' -g '*.mocks.ts' | wc -l
  ```

  The migrated specs are the spec files the migration changed, which `git diff --name-only 6b5ce1a..450af81 -- 'src/**/*.spec.ts' 'src/**/*.spec.tsx'` lists: the 38, plus the harness's own three specs under `src/test/`. All 41 held 0 matches at closeout.

## References

- `src/api/custom-instance.ts` — the single axios entry point every generated hook calls
- `src/pages/production/SharingAgreementReopenInvalidation.spec.tsx`, `SupplyCoefficientHistoryInvalidation.spec.tsx`, `useSharingAgreementCoefficientMutations.staleness.spec.tsx` — tier 2 reference implementations
- `src/theme/` — the theme `renderWithProviders` must use
- Issue #170 — the impossible-state mock that prompted this, and the removal of the generated MSW handlers
- The mocking spike report — measurements this ADR cites