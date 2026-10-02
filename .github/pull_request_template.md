## What this changes

<!-- The behaviour that is different after this PR, in a sentence or two. Not a list of files. -->

## Why

<!-- The problem this solves. Link the issue: #123 -->

## Visibility

**Mandatory. Delete no heading — write "none" and why, if that is the answer.**

Authorization in this app is the backend's answer, carried on the resource it concerns. Nothing in
`src/` may read a role or the platform-admin flag to decide what to render. If this PR adds or
changes a screen, a route, an action or a read, say so here.

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

## Verification

```bash
npx tsc -b
npm run lint
npx vitest run
npm run test:visual   # only if the UI changed
```

<!-- Paste what you ran and what it said. If a check was skipped, say which and why. -->

## Baselines

<!-- Which captures changed, which names are new, or "none". New names fail as missing until a
     maintainer regenerates them: that is expected, not a broken build. -->

## Anything the reviewer should push back on

<!-- Assumptions, trade-offs, things left undone and why. -->
