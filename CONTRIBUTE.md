# Contributing to ConLuz

Thank you for your interest in contributing to **ConLuz**! This document provides guidelines and best practices for collaborating on the project.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Workflow](#workflow)
- [Branch Naming Convention](#branch-naming-convention)
- [Commit Message Format](#commit-message-format)
- [Pull Requests](#pull-requests)
- [Release notes](#release-notes)
- [Continuous integration](#continuous-integration)
- [Maintainer Notes](#maintainer-notes)
- [Code of Conduct](#code-of-conduct)
- [Contact](#contact)

---

## Prerequisites

- **Node 22 with npm 10 (`>=10.9.0 <11`)** — the npm bundled with Node 22, which is what CI (`actions/setup-node` with `node-version: "22"`) and the `node:22-alpine` Docker image use. `.nvmrc` selects Node 22 for `nvm use`.
- **This is a hard failure, not a warning.** `package.json` declares `engines.npm` and `.npmrc` sets `engine-strict=true`, so `npm install` and `npm ci` refuse to run on any other npm (npm 11 ships with Node 24; some Linux distributions package npm 9). If you are on another Node, install with the right npm without switching runtimes: `npx npm@10 ci`.
- **Why the pin exists:** npm 11 writes `libc` metadata into `package-lock.json` that npm 10 strips, so mixing the two produces lockfile churn on every install. CI runs `git diff --exit-code package-lock.json` after `npm ci` to catch any rewrite.
- **If a dependency's `engines` blocks the install:** `engine-strict` applies to every installed package's `engines` field, not only the root one, so a future dependency with a narrow range can fail the install outright. The remedy is to widen or remove the root `engines` range deliberately and regenerate `package-lock.json` with the matching npm — never to disable `engine-strict` locally, which only hides the mismatch until CI.

---

## Getting Started

To contribute, you will need:

- A GitHub account
- Git installed on your local machine
- A fork of this repository
- A properly configured local development environment (see project README for setup instructions)

The root `Makefile` wraps the common commands: run `make help` to list its targets. Every target
runs an npm script or a command documented in this repository, so those commands keep working
without `make`.

---

## Workflow

We follow the **GitFlow Workflow** for managing development.

1. Fork this repository.
2. Create a new branch from `main` for your changes.
3. Make your changes in that branch.
4. Push the branch to your fork.
5. Open a **Pull Request** (PR) against the `main` branch in this repository.

All contributions must be submitted via pull request — **no direct pushes to `main` are allowed**.

---

## Branch Naming Convention

Branches for new features must follow this pattern:

```
feature/conluzweb-XXX
```

- `XXX` refers to the issue or ticket number (e.g., `feature/conluz-123`).

---

## Commit Message Format

All commits must follow this format:

```
[conluzweb-XXX] Your commit message
```

**Examples:**

- `[conluzweb-101] Add login page`
- `[conluzweb-205] Fix energy consumption bug`

> This format helps maintain traceability between commits and issues.

---

## Pull Requests

- Pull requests must target the `main` branch.
- Use **Squash and Merge** as the merge strategy.
- Ensure your PR references the related issue (e.g., "Closes #123").
- Provide a clear description of the changes made.
- Ensure all CI checks pass and the code is properly tested.
- A PR that changes UI behaviour updates the affected spec document in `docs/specs/`, following [`docs/specs/README.md`](docs/specs/README.md).

---

## Release notes

Every merge to `main` produces one release. `.github/workflows/version-update.yml` pushes the next
version tag and then publishes a GitHub Release for it. GitHub generates the notes from the pull
requests merged since the previous tag, and groups them by PR label according to
`.github/release.yml`. Releases are created by CI only: never create or edit one by hand.

Each PR goes in the first category whose labels it carries:

| Label | Release notes category |
| --- | --- |
| `breaking` | ⚠️ Breaking / manual action on upgrade |
| `security` | Security |
| `enhancement` | Features |
| `bug` | Fixes |
| `refactor`, `tech-debt`, `testing`, `documentation` | Maintenance |
| anything else, or no label | Other |

Label every PR with exactly one type label. Take it from the Type of the issue the PR closes:

| Issue Type | PR label |
| --- | --- |
| Feature, Domain gap | `enhancement` |
| Bug | `bug` |
| Refactor | `refactor` |
| Chore | `tech-debt` |

Topic labels (e.g. `styles`, `production`) may be added too, but they do not decide the category.

Add `security` to a PR that fixes a security issue. Add `breaking` when upgrading to that version
needs manual action, such as a configuration or environment change, or a coordinated change in the
other repository, such as a minimum backend version. `breaking` always wins, so the PR lands in the
breaking section whatever its other labels.

---

## Coding

- The code must follow Clean Code standards.
- The code must be self explanatory adding comments when further explanation is required.
- The code must be in English.
- The code must be tested through automated tests to validate it works as expected.

---

## Continuous integration

Which test level owns which risk, when a visual test may be added, and the reasoning behind the CI
policy below: [`docs/testing/testing-strategy.md`](docs/testing/testing-strategy.md).

### Retries and flaky visual tests

The visual suite retries a failed test **once in CI** and **never locally** (`retries` in
`playwright.config.ts` follows the `CI` variable). A test that fails and then passes on its retry
does not fail the job; Playwright reports it as **flaky**. The *Visual regression tests* job then:

- lists it under "Flaky visual tests" in the job summary, with its project and title;
- emits a warning annotation for it;
- uploads `test-results/`, which holds the trace recorded on the retry, as `playwright-flaky-traces`.

A flaky entry is a defect, not noise. It means the same code produced two different screenshots or
outcomes, so a later run can fail for a reason that has nothing to do with the change under review.
Follow it up: confirm it with a manual run (below) and open an issue with the result. Do not treat a
green job as the end of it.

Every run that is not cancelled also uploads Playwright's JSON report as `playwright-visual-results`,
whatever the result.

### Running visual tests manually

To check a suspected flake, run the workflow by hand: **Actions → Visual regression tests → Run
workflow**. The run uses the HEAD of the branch you select there, as it is when you trigger it.

| Input         | Meaning                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `grep`        | Only tests whose title matches this pattern (Playwright `--grep`). Empty runs all. |
| `project`     | `all`, `mobile` or `desktop`.                                           |
| `repeat_each` | How many times to run each selected test.                               |
| `workers`     | Playwright `--workers`: a positive integer or a percentage (`1%`–`100%`). Empty uses the configured value. |

A manual run never retries, so every failure counts. To check a flake, set `grep` to the test's
title, `project` to the project it was reported in, and `repeat_each = 20`: any failure out of the
twenty confirms it.

To compare worker counts, run the whole suite several times on the same commit, changing only `workers`,
and compare the test-execution time, flaky entries and timeouts of each run.

The two `warmup` setup tests always run, whatever `grep` and `project` say, because the viewport
projects depend on them. They run **once**: `repeat_each` does not repeat them. A run of one test
with `repeat_each = 20` therefore reports 22 tests.

---

## Maintainer Notes

These steps are for human maintainers only. Automated agents must never perform them.

### Updating visual regression baselines

`playwright.config.ts` sets `updateSnapshots: "none"`, so nothing writes a PNG unless a CLI flag
says to. That is what makes "agents never touch baselines" enforceable rather than a matter of
discipline, and it is why a brand-new screenshot name fails as **missing** instead of quietly
creating its own baseline.

When an intentional UI change alters a captured screen, or a change adds a capture, regenerate the
baselines manually:

```bash
npm run test:visual -- --update-snapshots=changed
# or: make visual-update [SPEC=<spec>] [PROJECT=<mobile|desktop>]
```

`changed` also writes a baseline for a new screenshot name.

Review every changed PNG under `tests/visual/__screenshots__/` before committing. An unreviewed
baseline turns a regression into the new expected result — and a new name's first baseline is
accepted sight unseen unless you look, so check that a newly added capture shows a populated screen
rather than an empty table or a card still loading.

When a change removes a capture, its baselines stay behind: no Playwright run deletes a PNG.
`make visual-get-orphans` lists every baseline whose name no visual test spec captures any more,
and `make visual-delete-orphans` removes them with `git rm`. A baseline left for only one project,
by a test that now runs on the other alone, is not detected.

### Regenerating the API client

`orval.config.js` sets `clean: true`: every regeneration empties `src/api/` first, so a schema or endpoint the backend removes takes its generated files with it. Nothing hand-written may live under `src/api/`. The Orval mutator lives in `src/http/custom-instance.ts` for that reason.

---

## Code of Conduct

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) to help create a welcoming and respectful community.

---

## Contact

If you have any questions, feel free to open an issue or contact the maintainers.

---

Happy coding! 🚀
