---
name: conluz-web-design-system
description: >-
  How to keep the Claude Design design system (.design-sync/) in step with src/components when a
  component is added, removed, renamed, or has its props, dependencies or look changed. Use whenever
  a change touches a file under src/components/, src/theme/, the provider stack in src/main.tsx, or
  the set of @mui/icons-material icons the app imports.
---

# conluz-web — Keeping the design system in sync

The app's presentational components are published to Claude Design (claude.ai/design, project
**Conluz Web**) by Claude Code's `/design-sync` skill. The inputs are committed under
`.design-sync/`; the generated output (`ds-bundle/`) and the converter scripts (`.ds-sync/`) are
gitignored. What a user reads about it is the "Design System (Claude Design)" section of `README.md`;
repo-specific gotchas are in `.design-sync/NOTES.md`. Read NOTES.md before editing anything below.

## The files you may have to touch

| File | Holds |
|---|---|
| `.design-sync/pkg/index.ts` | The export list: **a component is synced only if it is exported here** |
| `.design-sync/config.json` | `docsMap` (component → group stub), `overrides` (card layout), `dtsPropsFor` (hand-written props) |
| `.design-sync/previews/<Name>.tsx` | The component's preview: each named export is one variant on its card |
| `.design-sync/pkg/primitives.ts` | `Mui.*` and `Icons.*` re-exported for previews and designs |
| `.design-sync/pkg/ConluzProvider.tsx` | The wrapper every card renders inside; mirrors `src/main.tsx` |
| `.design-sync/guidelines/data-shapes.md` | Shapes of the API records some components take |
| `.design-sync/conventions.md` | Guide for the Claude Design agent; names real components and tokens |
| `.design-sync/NOTES.md` | Excluded components and why, gotchas, re-sync risks |

## First: is the component synced, and can it be?

- **Synced** = exported from `.design-sync/pkg/index.ts`. Check with
  `grep -n "\b<Name>\b" .design-sync/pkg/index.ts`.
- **Eligible** = it renders with `ConluzProvider` alone. That means its module tree must not:
  - import `src/hooks/actions/`;
  - call a generated query or mutation hook (`src/api/<tag>/<tag>`);
  - read `AuthContext`, `LoggedUserContext`, `ErrorContext` or `SuccessContext`;
  - call `useLogout`.

  Reading the community name (`useActiveCommunityName`) is fine: the provider supplies an inert
  community context. Types from `src/api/models` are fine. Check the whole import tree, not just
  the component file: `SupplyCard` is only eligible because the dialogs it embeds are.

## Adding a component

1. Decide eligibility (above). If it is not eligible, do not sync it. Add it to the "Included =
   … Excluded on purpose" list in `NOTES.md` with the reason, and stop.
2. Export it from `.design-sync/pkg/index.ts`, following the existing lines:
   `export { <Name> } from "../../src/components/<Dir>/<File>";`.
3. Put it in a group: add `"<Name>": "../groups/<group>.md"` to `docsMap` in `config.json`. The
   groups are the files in `.design-sync/groups/`. Never create a group for a single component.
4. Write `.design-sync/previews/<Name>.tsx` following "Authoring previews" in `NOTES.md`:
   - Port realistic usages from `src/pages/` and the component's test specs.
   - Write 2–6 named exports: the canonical use, the main variant axis, and the static states
     (loading, empty, error, disabled).
   - Use Spanish content.
   - Import only from `"conluz-web"` and `"react"`, never `@mui/*`.
   - Don't name an export `Error`.
5. Card layout, when needed, goes in `config.json` → `overrides`:
   - Dialogs and open menus (portals): `{"cardMode":"single","viewport":"WxH"}`.
   - Page-width sections: `{"cardMode":"column"}`.
6. If its props take an API model or a local item type that `guidelines/data-shapes.md` does not
   describe yet, add it. Print the shape with
   `node .design-sync/scripts/data-shapes.mjs <TypeName>`; this needs the `.ds-sync/` deps installed.
   If you can't run it, say so in the PR.
7. If the preview needs an icon that `Icons.*` lacks, add it to `primitives.ts`, both the import and
   the object entry.

## Changing an existing synced component

- **Props renamed, removed or retyped.** Update its preview and any other preview that composes
  it (`grep -ln "<Name>" .design-sync/previews/`). Then:
  - If it has a `dtsPropsFor` entry in `config.json`, rewrite that entry. Today only `ListTable` has
    one.
  - If one of its types is in `data-shapes.md`, refresh that block.
- **New variant or state worth showing.** Add an export to its preview.
- **Now depends on something ineligible** (an action hook, a query hook, auth context): it can no
  longer render in Claude Design. Remove it from the sync (below), list it as excluded in
  `NOTES.md`, and say so in the PR.
- **Only the look changed** (styling, spacing, colours through tokens): no `.design-sync/` edit is
  needed; the next `/design-sync` re-captures it. Do check that `conventions.md` doesn't name a
  token, class or component you removed.

## Removing or renaming a component

- **Remove** it from:
  - `index.ts`;
  - `docsMap`, `overrides` and `dtsPropsFor` in `config.json`;
  - `previews/<Name>.tsx`;
  - every other preview that composes it;
  - any mention in `conventions.md` or `NOTES.md`.

  The next `/design-sync` deletes its card from the Claude Design project. Do not try to delete it
  there yourself.
- **Rename** = remove the old name + add the new one. Rename the preview file and every key in
  `config.json`.

## Changes outside src/components that affect the sync

- **`src/theme/` tokens renamed or removed.** `conventions.md` names real tokens
  (`colors.brand.main`, `radii.default`, `sxStyles.pageContainer` and others); keep every name in
  it true.
- **Provider stack or global styles in `src/main.tsx` changed.** Mirror the change in
  `ConluzProvider.tsx` if components rely on it (a new context, global CSS).
- **The app starts importing a new `@mui/icons-material` icon.** Add it to `primitives.ts` so
  designs can use it too.
- **A new MUI component becomes part of the app's vocabulary.** Add it to `Mui` in `primitives.ts`.

## Verify

Run both and report the output:

```bash
npx tsc -p .design-sync/pkg/tsconfig.json        # the entry package: every export resolves
npx tsc -p .design-sync/previews/tsconfig.json   # every preview type-checks against the real props
```

`npm run lint` does not cover `.design-sync/`; ESLint ignores it on purpose, because previews
import the virtual `conluz-web` package.

## What you must not do

- **Do not run `/design-sync` or upload to Claude Design unless the user asks.** The upload is
  outward-facing. In the PR description, say that a re-sync is needed and which components changed.
- **Do not edit `ds-bundle/` or `.ds-sync/`.** They are regenerated.
- **Do not edit anything under `.design-sync/.cache/`.**
- **Do not change `projectId` in `config.json`.**
- **Do not export an ineligible component "to see if it works".** A card that throws ships broken
  into every design the agent builds.
