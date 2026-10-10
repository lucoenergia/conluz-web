# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, Cursor, Copilot, Gemini CLI and
any other tool that reads `AGENTS.md`) when working with code in this repository. It is the single
source of truth for agent rules; tool-specific entry points such as `CLAUDE.md` only point here.

## Terminology

**Spec document**: a file under `docs/specs/` describing UI rules. **Test spec** or **test**: a
Vitest or Playwright file. Never write "spec" alone; if an instruction says "spec" without
qualification, ask which one is meant.

## Where the detail lives

This file holds the rules that apply to every task. Task-specific depth lives in skills — plain
Markdown under `.claude/skills/<name>/SKILL.md`; an agent with no skill mechanism reads the file
directly. **Read the matching one before starting:**

- **`conluz-web-community-scope`** — before any data-fetching, role-gating, route, action, or
  user-scoped-read work. Holds the full authorization model, the recipes for adding a screen, route,
  action or user-scoped read, and the data-fetching pattern.
- **`conluz-web-testing`** — before writing, changing or running any test spec or visual test: the
  rendering harness, the two API-mocking tiers, fixtures, the selector hierarchy, and the Playwright
  suite (captures, masking, thresholds, coverage).
- **`conluz-web-list-tables`** — before building a list table, a row menu or a row-action dialog.
- **`conluz-web-design-system`** — before adding, removing, renaming or changing a component under
  `src/components/`, or changing `src/theme/`, the provider stack in `src/main.tsx`, or the icons the
  app imports. Holds the recipes for keeping the Claude Design design system in `.design-sync/` in
  step with the code.
- Styling: `references/styling-conventions.md`, `references/theme-tokens.md`, `references/fonts.md`.
- Decisions and their revisit conditions: `docs/decisions/adrs/`.
- UI rules and their rationale: the spec documents under `docs/specs/`; conventions in
  `docs/specs/README.md`.

## Commands

Scripts are in `package.json`. What they do not tell you:

- `npm test` runs Vitest in watch mode in an interactive terminal and once in CI or non-interactive
  shells; `npx vitest run` runs once anywhere.
- `npm run generate-mutation-hook-list` re-derives the mutation-hook list from the `api-docs.json`
  already present. It does NOT regenerate the client, so the "agents never run `generate-client`"
  rule does not cover it — agents may run this.
- Never run the dev server after completing changes.

## Architecture rules

### Providers and the signed-in user
- **Provider order** (`src/main.tsx`, mirrored by the test harness): `AuthProvider → QueryClientProvider → LoggedUserProvider → CommunityProvider → Theme → BrowserRouter`. The query client is above the user because the user *is* a query, and `CommunityProvider` reads it.
- **The signed-in user is live, not a session snapshot.** `LoggedUserProvider` serves `GET /users/current` (`staleTime` 30 s, gated on a token, the one query that refetches on window focus). Invalidating `getGetCurrentUserQueryKey()` is how a screen makes its own change to the caller's record visible. `pending` is reachable mid-session: never fold "not yet known" into "no" (`src/hooks/permissions/capabilityOutcome.ts`). Decided in ADR 0004; details in the community-scope skill.
- **401 handling:** a 401 triggers logout via React Query's global error handler — except the current-user query, which sits above every error boundary and ends the session itself (`useEndSession`), recording why so the login page can say "Sesión expirada" (`src/utils/session.ts`).

### Multi-community authorization
The app is **multi-community**. This supersedes any older single-community assumption.

- **No global user `role`.** Two independent axes: `isPlatformAdmin`, and the role within the active community (`COMMUNITY_ADMIN` / `COMMUNITY_MEMBER`, from `memberships`).
- **Golden rule (mirror of the backend):** `isPlatformAdmin` **never** grants access to a community's operational data.
- **Data endpoints are path-scoped** (`/communities/{communityId}/…`). Data hooks pass `communityId` and are **gated on its presence**; controls that submit community-scoped data disable when none is selected. The legacy `X-Community-Id` header is gone — the path is the sole scoping mechanism.
- **Capabilities decide visibility, not roles.** Every response carries `capabilities`; `GET /users/current` carries `platformCapabilities`. Never re-derive a rule locally. `src/hooks/permissions/` is the only module allowed to read a role or the platform-admin flag (lint-enforced); reading `user.isPlatformAdmin` to **display** it is fine.
- **No exemptions.** No file under `src/` reads a role or the platform-admin flag to decide what to render, and none carries an `eslint-disable` for the permission rules. If you want one, the capability either exists on the payload or is missing from the backend — ask for it; do not approximate it with a role.
- **A capability says "may this caller ever", not "is this legal now".** Pair it with the resource's state (`isDraft && canDelete`). Opposite pairs (`canEnable`/`canDisable`, `canGrantPlatformAdmin`/`canRevokePlatformAdmin`) are **both** true for a caller who may do either; the row's own state picks one — resolve the pair once. Fixtures grant both halves.
- **Mutations go through `src/hooks/actions/` only.** No component imports a generated mutation hook (lint- and test-enforced over the whole tree). Action hooks return `undefined` for an action the caller may not perform; record each decision in `ACTION_COVERAGE` (`src/contracts/mutationHooks.spec.ts`).
- **Routes are a contract.** Wrap every route in `CapabilityRoute` and classify it in `ROUTE_ACCESS` (`src/contracts/routeAccess.spec.ts`); a menu entry names the same requirement as its page. `/` stays unguarded on purpose — every denial redirects there. Only `denied` redirects; a failed check renders a retry.
- **A capability gates the call; it does not scope the rows.** A user-scoped listing still gets filtered to the active community, and the filter is declared in `USER_SCOPED_LISTINGS` (`src/contracts/userScopedReads.spec.ts`). Conflating the two produced `lucoenergia/conluz#326` and `#336`.

### API client
- `src/api/` is **generated** by Orval from `api-docs.json`. **Never edit it.**
- **For AI-agent tasks:** the updated `api-docs.json` and regenerated client are **always provided before implementation** — treat `src/api/` as current. Do **not** fetch `api-docs.json` or run `npm run generate-client`, and do not list either as a task step. If `src/api/` looks out of sync, stop and report it.
- Reads use the generated hooks (or their community-scope wrappers); `getGet…QueryKey()` getters are importable everywhere. Invalidation is explicit after every mutation (`removeQueries` after a delete) — see `src/hooks/actions/useSharingAgreementActions.ts`.

### Routing
`LoginLayout` (unauthenticated), `AuthenticatedLayout` (protected, sidebar), `PublicLayout` (same for everyone, `/contact`). There is deliberately no auth-adaptive layout; the comment at `/contact` in `src/App.tsx` says why.

## Testing — rules that always apply
Full guide: the `conluz-web-testing` skill.

- Test specs use `.spec.tsx` (not `.test.tsx`), colocated, rendered through `renderWithProviders` / `renderHookWithProviders` (`src/test/renderWithProviders.tsx`), never a hand-built wrapper.
- **No real network**: a test spec must never reach the backend. A setup-file guard (`src/test/networkGuard.ts`) refuses every `XMLHttpRequest` and `fetch` and fails the test, naming the method and URL; fix it by mocking, never by taking the request.
- While iterating, run `npx tsc -b` plus `npx vitest related --run <changed files>`. `related` prints "No test files found" and still exits 0 when it resolves nothing — then run the test spec by path. Run `npm run lint && npm test` once at the end, and `npm run test:visual` only at the end and only if the UI changed.
- **Never put a `data-testid` on a button, link, form field, menu item or anything else a user interacts with.** If it can only be found by test id, it is missing an accessible name or role: report the defect, don't route around it.
- **Baselines are never updated by an agent (hard rule).** Never run `--update-snapshots` or rewrite the PNGs under `tests/visual/__screenshots__/`. When a visual test fails or a baseline is missing, report which screens differ and stop.
- Screenshot names are globally unique across all visual test specs. The warmup test `screenshot names are unique across the visual specs` (`tests/visual/warmup.setup.ts`) enforces it; to check locally, this must print nothing (it reads test spec files only, skips comments, and sees calls split over several lines):

  ```bash
  perl -0777 -ne 's{/\*.*?\*/}{}gs; s{^\s*//.*}{}gm; print "$1\n" while /\.toHaveScreenshot\(\s*"([^"]+)"/g' $(find tests/visual -name '*.spec.ts') | sort | uniq -d
  ```
- A green visual suite proves the UI is consistent with the capabilities it is *served*, not that the backend enforces them. Never cite it as an authorization guarantee.

## Spec documents

`docs/specs/` holds the living specification of UI rules: one document per screen or flow, written
as normative rules with stable IDs (`UI-SUP-001`). Domain rules live in `lucoenergia/conluz` and
are referenced by ID, never restated. Conventions: `docs/specs/README.md`.

- Before changing UI behaviour, read the spec document of the affected screen or flow.
- Update it in the same PR, in a separate commit: add, change or tombstone rules, each with
  Rationale and Source.
- If the spec document and the code disagree, stop and report. Never fix either side silently.
- Tests covering a rule start their title with the rule ID.
- Never reuse or renumber an ID.
- Spec documents are created lazily, covering only the rules the task touches. No backfill.

## UI conventions

- **Tables:** build with `ListTable` + `RowActionsMenu` (`src/components/ListTable`). Row actions live **only** in the kebab menu; never place a button, `<Select>` or toggle inline in a row. An action that changes server state opens a confirmation dialog. Details: the `conluz-web-list-tables` skill.
- **Forms:** controlled MUI inputs; `SupplyForm` is the reference for complex forms.
- **Environment variables** use the `CONLUZ_` prefix (`CONLUZ_API_URL`); `docker/env.sh` swaps them at container startup.

### Styling Contract

**Never** write raw hex colors, rgba strings, hand-written shadow strings, rem/em font-size literals, or Tailwind `className` in component code. ESLint enforces this with `no-restricted-syntax` rules, which match a colour **anywhere inside a string** — composite values like `1px solid #e5e7eb`, gradient stops, and template literals all count.

Use the tokens: `src/theme/tokens.ts` (`colors`, `alphas`, `shadows`, `radii`, `fontSizes`), the MUI theme in `src/theme/index.ts` (`"primary.main"` shorthands in `sx`), and `src/theme/sx.ts` (`sxStyles`). For a genuine one-off: `// eslint-disable-next-line no-restricted-syntax -- <reason>`.

**Colour roles.** A hue's `main` is the safe role (≥ 4.5:1 as type and behind white text). `vivid` is decorative only, never type. Two traps: `colors.brand.light` (`#667eea`) is decorative only, and `colors.text.disabled` is for disabled controls only. Never express a tint as an alpha overlay when type sits on it. Full table: `references/theme-tokens.md`. Fonts are self-hosted Inter — do not move them back to a CDN (`references/fonts.md`).

## Design system (Claude Design)

The presentational components are published to Claude Design from the inputs in `.design-sync/`
(README section "Design System (Claude Design)"; recipes in the `conluz-web-design-system` skill).

- **A component change carries its design-system change in the same PR.** Adding, removing or
  renaming a synced component, or changing its props, means updating `.design-sync/` as well:
  - its export in `.design-sync/pkg/index.ts`;
  - its `docsMap` group, plus any `overrides` / `dtsPropsFor` entries, in `.design-sync/config.json`;
  - its preview in `.design-sync/previews/<Name>.tsx`.
- **Only components that render with `ConluzProvider` alone are synced.** A component that uses
  `src/hooks/actions/`, a generated query hook, auth/logged-user context or `useLogout` is never
  exported to the design system. One that starts depending on them is removed from it.
- **Verify** with `npx tsc -p .design-sync/pkg/tsconfig.json` and
  `npx tsc -p .design-sync/previews/tsconfig.json`. ESLint ignores `.design-sync/` on purpose.
- **Never run `/design-sync` or upload to Claude Design unless the user asks.** Say in the PR
  description that a re-sync is needed. Never edit `ds-bundle/`, `.ds-sync/` or `.design-sync/.cache/`.

## Skills & documentation maintenance

- Which skill to read for which task is listed under **Where the detail lives** at the top of this file. When a section moves out of this file into a skill, leave the rules that must hold even when the skill is not loaded behind in this file.
- **Author skills, this file, and the reference docs against the real, merged code — never against a plan.** A convention describing code that has since changed misleads with authority and is worse than none.
- **Epic-closeout rule:** closing any epic includes updating `AGENTS.md`, the affected skills, the affected spec documents, and the reference docs to match the code that actually landed. This is part of "done," not a follow-up. This file drifted before — it described a single-community model long after multi-community shipped — precisely because that step was skipped.

# Language
All code and documentation must be in english.

## PR description
Once every work finishes on a branch, generate a PR description in english and markdown format ready to be pasted in GitHub. Generate it in a file on /tmp folder and give me the full path to the file.

## Referring to work in the code

Comments, `eslint-disable` justifications, `TODO`s and test names may reference **issues**, never
the way work was organised while it was being done.

Use a durable identifier: an issue number (`#412`) or its URL. Those resolve to something a reader
can open, years later, from a repo they have just cloned.

Never use:

- an epic's internal ordering — "epic PR 5", "PR 3 of 10", "the second PR of the capabilities epic";
- a branch name (`feature/conluz-294`) — branches could be deleted after merge;
- a commit hash for future work — it does not exist yet;
- a person, a sprint, a milestone, or a date as the only pointer.

The test: someone reading this line in two years, with no access to the plan that produced it, must
be able to find what it refers to. "Migrates in epic PR 6" fails. "Migrates in #418" passes.

`gh issue list` and `gh issue view` are there precisely so the number can be checked rather than
invented. If the issue does not exist yet, ask for it: a temporary exemption with no issue behind it
is a permanent one.

## GitHub CLI

`gh` is authenticated with a **read-only** credential and is available for reading. Use it whenever
it saves a guess: checking an issue number before referencing it, reading a pull request's review
comments, looking at why a workflow run failed, listing releases, labels or tags.

**Never perform a write.** That covers creating, editing, closing, commenting on, reviewing or
merging issues and pull requests; labels, releases and milestones; running, re-running or cancelling
workflows; changing repository or organisation settings; and any `gh api` call with a method other
than GET, GraphQL mutations included. `gh auth login`, `gh auth refresh`, `gh alias set` and
`gh extension install` are equally off limits — they are ways to change what the tool can do.

Writes fail twice over for Claude Code: the credential has no write permission, and
`permissions.deny` in `.claude/settings.json` blocks the commands. Other agents are stopped by the
credential alone. Do not work around either. If a command is refused, report it; do not look for a spelling
that gets through, and never propose changing the deny rules or the credential.

When a task appears to need a write — "open an issue for this", "comment on that PR", "merge it" —
produce the content and say exactly where it goes (repository, issue or PR number, and the label or
milestone if relevant), so a human can post it in one paste. Do not treat the restriction as a
blocker to report and stop at: the deliverable is the text, not the API call.

`git push` is likewise not yours to run. Commit locally, and leave pushing and opening pull requests
to a human.

## Git workflow

### Never create a branch

**Do not run `git checkout -b`, `git branch`, `git switch -c` or `git worktree add`.** Branches are
created by a human, usually from the right remote base and often before the work is handed over.

Work on the branch that is already checked out. If the task needs a branch that is not there:
**stop and ask for it by name**, saying which base it should come from. Do not create it "to
unblock yourself" — that is the slowest option available, not the fastest.

The same staleness rule applies to reading git facts at all: establish them from `git fetch` plus
`git ls-remote` or `origin/<branch>`, never from a local branch ref that may not have moved in
weeks.

### Never rewrite a commit that has been pushed

Before `git reset`, `git commit --amend`, `git rebase`, or anything else that replaces an existing
commit, establish which commits are actually yours to replace:

```bash
git fetch origin
git log --oneline @{u}..HEAD    # only these are unpublished
```

A commit reachable from `origin/<branch>` is published, and published commits are **append only**.
Correct them with a **new commit** that states what changed and why — never by rebuilding the branch.
This holds even when the rewrite would be tidier: a rewritten branch diverges from its remote, breaks
`git pull` for anyone who has it, orphans review comments anchored to the old SHA, and can only be
repaired by a force-push, which is not yours to run. "The history reads better" is not a reason; if
the result reads oddly — one commit adding what the next removes — say so in the new commit's
message. That is what the message is for.

New instructions arriving mid-task are the trap: the work already committed may have been pushed
while you were working. Re-check `@{u}` at that moment, not from memory of how the branch looked when
you started.

**If a branch has already diverged, do not `git pull`.** That merges the superseded commits back in
and resurrects whatever they contained. Stop, report the divergence with the exact content difference
(`git diff @{u} HEAD --stat`), say whether anything on the remote would be lost, and let a human
choose between re-sequencing onto the remote tip and force-pushing.

The same fetch-first rule applies to the **base**: read it from `git fetch` plus `origin/<branch>`,
never from a local ref that may not have moved in weeks, and re-read it before quoting any "before"
figure — test counts, baselines, timings. A long task can have its base changed underneath it, and a
number measured against the wrong base is worse than no number.

