# [conluzweb-000] Short imperative title

<!-- Title: the issue code in brackets, then what the PR does in the imperative mood, under ~70
     characters. Use the code of the issue this PR closes: `[conluzweb-197]` for an issue in this
     repository, `[conluz-292]` for one in lucoenergia/conluz. Use the same line as the PR title,
     so the squash commit on main carries the code too. -->

<!-- Labels: label the PR with exactly one type label (enhancement, bug, refactor, tech-debt,
     testing or documentation), add `security` for security fixes, and add `breaking` when
     upgrading to this version needs manual action or a coordinated change in the other
     repository. Labels decide where the PR appears in the release notes. -->

Closes #000

<!-- Closes: the issue(s) this PR resolves, one GitHub closing keyword per line, so merging closes
     them: `Closes #123`, or `Closes lucoenergia/conluz#326` for an issue in another repository.
     If the PR only contributes to an issue without finishing it, write `Part of #123` instead,
     which links it without closing it. -->

## Summary

<!-- Summary: the behaviour that is different after this PR, and the problem it solves, in two or
     three sentences. Written for someone who has not read the issue. Not a list of files. -->

## Changes

<!-- Changes: what was done, grouped by concern rather than by file (e.g. "Actions layer",
     "Routes", "Tests", "Docs"). One bullet per meaningful change, saying what and why. Call out
     anything that is a pure refactor, so reviewers know which part carries behaviour. -->

-

## Spec changes

<!-- UI rules in docs/specs/ added, changed or removed by this PR, and the tests that cover each
     added or changed rule. Write "None" and why if no behaviour changed. -->

| Rule | Change | Statement | Tests |
| --- | --- | --- | --- |

## Visibility

<!-- Visibility: mandatory. Delete no row — write "none" and why, if that is the answer.
     Authorization in this app is the backend's answer, carried on the resource it concerns.
     Nothing in `src/` may read a role or the platform-admin flag to decide what to render. If
     this PR adds or changes a screen, a route, an action or a read, say so here. -->

| Question | Answer |
| --- | --- |
| Capability and scope it gates on | <!-- e.g. `plant.canManage`, or "none — any authenticated caller" --> |
| `routeAccess` entry added or changed | <!-- the path, or "none" --> |
| `endpointScope` entry added or changed | <!-- the path, or "none" --> |
| `ACTION_COVERAGE` entry for each new mutation | <!-- the hook names, or "none" --> |
| `USER_SCOPED_LISTINGS` entry, if a user-scoped listing is read | <!-- file → hook → filter, or "none" --> |

- [ ] No new role or `isPlatformAdmin` check decides what renders.
- [ ] Every new affordance is gated on the capability the backend returns for that resource, read
      per resource rather than once per screen.
- [ ] A capability gates the **call**; rows are still scoped to the active community where the
      endpoint answers for more than one.
- [ ] Routes and their menu entries name the same requirement.

## Findings

<!-- Findings: anything discovered while doing the work that is not the change itself — a bug
     found elsewhere, a backend behaviour that differs from api-docs.json, a stale doc, a wrong
     assumption in the issue. Say what was found and whether it was fixed here. A finding that
     is not fixed here gets a ready-to-file issue text (title + body) in this section, or the
     number of the issue already opened for it. Write "none" if there were none. -->

## Tests

<!-- Tests: which test specs were added or changed and what each one proves, and the exact commands
     that were run with their result (pass counts, failures). If a check was skipped, say which
     and why. For visual tests, list which captures changed and which screenshot names are new:
     new names fail as missing until a maintainer regenerates them, which is expected, not a
     broken build. Baselines are never regenerated in the PR by an agent. -->

```bash
npx tsc -b
npm run lint
npx vitest run
npm run test:visual   # only if the UI changed
```

## Risks & follow-ups

<!-- Risks & follow-ups: what could break or behave differently in production (other screens
     sharing the touched code, cache invalidation, a dependency on a backend release, data
     migrations), and how likely it is. Then the work deliberately left out of this PR, each with
     an issue number or a ready-to-file issue text — never "later" or "in the next PR". Also the
     assumptions and trade-offs the reviewer should push back on. -->

## How to verify

<!-- How to verify: numbered, reproducible steps a reviewer can follow in the running app to see
     the change — which persona to sign in as (member, community admin, platform admin), which
     community to select, which route to open, what to click, and what they should see. Include
     at least one step that shows what must NOT happen (e.g. a caller without the capability does
     not see the action). -->

1.
