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

---

## Coding

- The code must follow Clean Code standards.
- The code must be self explanatory adding comments when further explanation is required.
- The code must be in English.
- The code must be tested through automated tests to validate it works as expected.

---

## Maintainer Notes

These steps are for human maintainers only. Automated agents must never perform them.

### Updating visual regression baselines

When an intentional UI change alters a captured screen, regenerate the Playwright baselines manually:

```bash
npx playwright test --update-snapshots
```

Review every changed PNG under `tests/visual/__screenshots__/` before committing. An unreviewed baseline turns a regression into the new expected result.

### Regenerating the API client

Never set `clean: true` in `orval.config.js`. It empties `src/api/` before generating, which would delete the hand-written `src/api/custom-instance.ts`.

---

## Code of Conduct

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) to help create a welcoming and respectful community.

---

## Contact

If you have any questions, feel free to open an issue or contact the maintainers.

---

Happy coding! 🚀
