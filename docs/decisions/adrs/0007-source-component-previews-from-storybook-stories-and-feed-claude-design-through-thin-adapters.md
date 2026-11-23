# ADR-0007 - Source component previews from Storybook stories and feed Claude Design through thin adapters

- **Status:** Proposed
- **Date:** 2026-11-23
- **Deciders:** Víctor Cañizares Mata
- **Applies to:** `lucoenergia/conluz-web`: the component catalogue (`.storybook/`, `src/**/*.stories.tsx`) and the Claude Design inputs in `.design-sync/`

## Context

### How Claude Design is fed today

The presentational components are published to Claude Design by `/design-sync`, from the inputs in `.design-sync/` (#242, #442):

- **`pkg/`**: the entry package. `index.ts` exports every synced component plus `ConluzProvider` (theme, locale, router and an inert community context) and the `Mui` and `Icons` namespaces from `primitives.ts`. The sync bundles it once, as `window.ConluzWeb`.
- **`previews/`**: 94 hand-written previews, one per component. Each renders its component's states for the capture harness, with harness-specific workarounds: callback-ref anchors for overlays, a 300 ms delay before opening `MenuTemplate`, `cardMode: "column"` for page-width sections.
- **`config.json`**: `docsMap` groups, per-component `overrides` (card mode, viewport) and `projectId`, the design-system project the sync writes to.
- **`guidelines/data-shapes.md`**: realistic data for API-typed props, as prose. Nothing type-checks it.

### The problem

- **No catalogue for people.** The only browsable set of component states is in a format only Claude Design reads. Contributors to an open-source project, and the maintainer, have nothing to browse locally.
- **Lock-in.** The 94 previews have value only through one vendor's tooling. On 2026-11-13 Claude Design moved its design systems into claude.ai, and since then `/design-sync` refuses to update the existing one ("This design system moved to Claude. /design-sync can't send updates to Claude yet"). Keeping Claude Design current meant syncing into a new project. Nothing in the repo could be reused elsewhere.
- **No shared base for component tooling.** Accessibility checks, interaction tests and visual review have no common set of rendered states.

Adding Storybook *next to* the previews would give two catalogues of the same components, which would drift apart. #439 asks whether stories can be the single source, with Claude Design as one of their consumers.

### What was tested (#440)

Storybook 10.6.6 (`storybook`, `@storybook/react-vite`, pinned) was added with `ConluzProvider` as its global decorator, imported in place from `.design-sync/pkg/`. Five components got colocated CSF 3 stories, titled with their Claude Design group:

- `Data display/CommunityStatusChip`;
- `Dialogs/ConfirmationModal`, rendered open;
- `Navigation/MenuTemplate`, rendered open;
- `Layout/RecordList`;
- `Charts/EnergyEvolutionChart`.

The issue named `SupplyCard` inside `CardGrid` and `GraphBar`. Both had been deleted (#364, #408), so `RecordList` and `EnergyEvolutionChart` replaced them. The `CardGrid` fade-in workaround was therefore not tested.

`EnergyEvolutionChart` does render through `react-apexcharts`, a CommonJS-only package (`src/components/evolution/EvolutionCharts.tsx` imports it), so the spike exercised the sync's CommonJS shim:
- In Storybook, Vite unwraps the CommonJS default export.
- In the sync's adapter preview, `.design-sync/pkg/tsconfig.bundle.json` points `react-apexcharts` at `.design-sync/pkg/shims/react-apexcharts.ts`, and the preview bundler applies the same paths.
- A local rebuild on 2026-11-23 confirmed it: the compiled `_preview/EnergyEvolutionChart.js` (899 KB) contains the shim module.
- `EvolutionCharts.tsx` is not named after an exported component, so the preview bundled its own source copy of the chart rather than using the shipped one. It rendered correctly.
- The native route's compiled preview was not inspected for the shim.

During the trial syncs the `MenuTemplate` story carried the capture's 300 ms open delay as `parameters.designSync`, and the adapter passed the same value. Under the chosen route the delay belongs in the `MenuTemplate` adapter only (D2 in #439), so the story now opens the menu at once, with no Claude Design–specific logic.

#439 fixes the acceptance criteria for each route (decision D1):

- **Native route.** `/design-sync` reads Storybook directly. Accepted only if:
  - (a) Storybook input is documented in Anthropic's official documentation;
  - (b) every spike component is correctly themed;
  - (c) `ConfirmationModal` and `MenuTemplate` are captured open;
  - (d) there is at most one isolated, documented capture exception per component.
- **Adapter route**, tried if the native one fails. Each `.design-sync/previews/<Name>.tsx` only renders the matching story, with no markup or data of its own. Accepted only if (b), (c) and (d) hold and the bundle contains a single MUI instance.

The maintainer synced each route into its own new project:
- the native route into "Conluz Web (Storybook spike)" (`a0253e1b-cc57-4c90-adc6-57eeb9c63da2`);
- the adapter route into "Conluz Web (Storybook adapters)" (`d5ec4e10-6f20-474c-9e56-89be695582ae`).

The design system in use (`c57d92b8-c573-4efa-a806-ec3d4d0b9548`) was not written to.

### How the sync resolves imports, and why it mattered

The sync's preview bundler (`lib/story-imports.mjs` in the local sync tooling) treats every import in a preview, or in a story a preview reaches, by these rules:

1. The package name (`conluz-web`) and any entry listed in `cfg.extraEntries` go to `window.ConluzWeb`.
2. A file named after an exported component goes to `window.ConluzWeb`.
3. Everything else is bundled into the preview from source, `node_modules` included.
4. Every `@storybook/*` import is replaced with an inert stub.

Stories import `@mui/material` directly (`Stack`, `Box`, `Typography`, `Avatar`, `Chip`, `MenuItem`). Under rule 3 each preview carried its own MUI copy, which sees no `ThemeProvider`. This was measured locally with the sync's build script before any upload. The adapter previews compiled to 240 to 383 KB each, against 4.6 KB for a hand-written one, and the card pages rendered the story-local elements unthemed:
- avatars on `#1976d2` (MUI's default blue) instead of the Conluz primary;
- MUI's default green and red on the `RecordList` chips;
- Roboto in the `MenuTemplate` items and the `ConfirmationModal` body.

`.design-sync/NOTES.md` had warned of this risk. Rule 4 also means `composeStories` renders nothing inside a sync bundle. Each adapter therefore composed its story by hand in seven lines, rendering the meta args under the story args, the story's `render` or the meta component, inside the meta decorators. The tool's own Storybook wrapper does the same.

## Decision

### 1. Stories are the source of component previews

Storybook stays, and stories become the only artefact holding preview markup and data. Each `Foo.stories.tsx` sits next to `Foo.tsx`, and its `title` uses the component's Claude Design group. `.storybook/main.ts` collects `src/**/*.stories.tsx`. No app module imports a story, so `vite build` never includes one.

### 2. Claude Design consumes them through thin adapters

D1 rules the native route out on criterion (a) alone, and the adapter route meets all of its criteria:

| Route | Criterion | Result | Evidence |
|---|---|---|---|
| Native | (a) official documentation | **Fail** | None of these mentions Storybook as an input: [Set up your design system in Claude Design](https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design) (`/design-sync` "reads your tokens and components directly" from a React design system), [Get started with Claude Design](https://support.claude.com/en/articles/14604416-get-started-with-claude-design), [Claude Design stays on brand](https://claude.com/resources/articles/claude-design-stays-on-brand-for-daily-work), [Commands](https://code.claude.com/docs/en/commands) (`/design-sync` converts "your repo's React design system"; the whole page, 56,822 characters through "See also", was searched on 2026-11-23 and contains no "Storybook" in any case), and [Move from standalone Claude Design to Claude](https://support.claude.com/en/articles/17440474-migrate-from-standalone-claude-design-to-claude), which the Commands page links. |
| Native | (b) every component themed | Pass, with `extraEntries: ["@mui/material"]` | The maintainer's sync. Without the setting, the story-local MUI rendered unthemed (avatars in MUI's default blue). |
| Native | (c) dialog and menu captured open | Pass, checked by hand | `ConfirmationModal` could not be checked by the sync's comparison. That comparison waits for content inside `#storybook-root`, and the dialog renders into `document.body` through a portal. The maintainer compared the Storybook page with the preview by hand. The `MenuTemplate` menu is captured open, but the reference shot clips it at the root's bounds. |
| Native | (d) one documented exception per component | Pass | `ConfirmationModal`: the hand comparison above. `MenuTemplate`: `parameters.designSync.openDelayMs`, read by the story's own render during the trial. |
| Adapters | (b) every component themed | Pass, with `extraEntries: ["@mui/material"]` | The maintainer checked every story of the five adapters: Conluz indigo, Inter, complete renders. |
| Adapters | (c) dialog and menu captured open | Pass | Both adapters are graded like any other preview on this route. The portal problem of the native route does not arise. |
| Adapters | (d) one documented exception per component | Pass | `MenuTemplate` only: the 300 ms open delay, which lives in its adapter with a one-line comment. Opened at once, the menu lands about 120 px below its trigger in the capture. |
| Adapters | Single MUI instance | Pass, with `extraEntries: ["@mui/material"]`; **fail** without it | Without the setting: local build measurements, 240 to 383 KB per adapter, `#1976d2` avatars, Roboto. With it, the stories' MUI imports resolve to the themed copy in `window.ConluzWeb`. |

All 101 components uploaded on the adapter route with no broken render. The only warning was `RouteFallback`, which renders just a spinner, as `NOTES.md` expects.

### 3. `extraEntries` lands together with the adapters

The adapters and `"extraEntries": ["@mui/material"]` in `.design-sync/config.json` only work as a pair:
- adapters without the setting publish unthemed previews;
- the setting without adapters is unused, and it clears every component's grade, which means a full regrade.

#440 could change only the five previews, so the adapter commit was reverted on its branch, and both land together in the migration #439 plans. That migration rewrites every preview, so it pays the one full regrade anyway. The setting grows the code bundle from 3.6 MB to 4.1 MB.

### 4. Final locations (D4 in #439)

D4 planned to move `ConluzProvider` and `primitives` to a location shared by Storybook and the sync, and to turn the fixture data into typed shared fixtures. The spike confirms this, and settles which folder stays:

- **`ConluzProvider` and `primitives` move out of `.design-sync/`** during the migration, to a module under `src/`. Storybook is the vendor-neutral source and must not depend on the Claude Design sync folder; `.design-sync/pkg/index.ts` re-exports them from there, so the bundle's entry does not change. They stay where they are until then: `.storybook/preview.tsx` imports `ConluzProvider` from `.design-sync/pkg/` today, which the spike showed works, but that import is temporary.
- **`.design-sync/previews/` stays, holding only adapters** (one per story module), generated by a script committed to the repo from one template and a per-component list of capture overrides. The compose helper they share moves into one module in that folder rather than being repeated in each file. It was repeated in the spike, so whether the sync's preview discovery accepts a non-component module there was not tested. The migration checks it first.
- **`config.json`, `NOTES.md` and `conventions.md` stay.** `config.json` keeps `docsMap`, `overrides` and `projectId`, and gains `extraEntries`.
- **Fixtures.** The spike's stories carry their data inline, typed against `src/api/models` where an API type exists (`EnergyEvolutionChart`). Where shared typed fixtures should live was not tested, so the migration decides it. Confirmed only as a direction.

### 5. Adapters compose stories by hand, so stories that feed one use a subset of Storybook

`composeStories` cannot run in a sync bundle: the sync replaces every `@storybook/*` and `storybook/*` import with an inert stub (rule 4 above). The shared compose helper therefore re-implements part of Storybook's story composition. Exactly these features are supported:

- **Args:** the meta's `args` under the story's `args`, merged shallowly (a story key replaces the meta key).
- **Rendering:** the story's `render(args, context)`; without one, the meta's `render`; without either, `createElement(meta.component, args)`.
- **Decorators:** the story's `decorators` inside the meta's `decorators`. Within each array, the first entry is innermost, as in Storybook. Each decorator is called as `decorator(Story, context)`.
- **Context:** `context` holds `args` and `parameters`, nothing else. `parameters` holds the adapter's capture overrides only, never the story's or the meta's own.
- **Provider:** `ConluzProvider` comes from the sync's card harness, not from a decorator.

The spike's helper (`5da34738`) did not support the story's decorators or the meta's `render`; the migration's helper adds both.

Stories that feed an adapter must not use any other feature, because the helper ignores it silently and the Claude Design card renders differently from Storybook. Unsupported:

- `loaders`, and the `loaded` context they fill;
- `play`, `beforeEach`, `beforeAll` and `mount`;
- the story's or the meta's `parameters`, read from a `render` or decorator (only the adapter's overrides reach `context.parameters`);
- `argTypes`, including their defaults and their `mapping`;
- `globals`, and any other context field (`id`, `name`, `viewMode`, `globals`, `loaded`);
- project-level annotations in `.storybook/preview.tsx` other than the provider: its decorators, parameters, args, argTypes and loaders;
- any value imported from `storybook/*` or `@storybook/*` (`fn`, `expect`, `userEvent` from `storybook/test`), since the sync replaces it with a stub. Type-only imports (`Meta`, `StoryObj`) are fine.

The migration adds a check that fails when a story module feeding an adapter uses any of these.

## What the sync behaviours mean

- **Roboto, or avatars and chips in `#1976d2`, MUI's default green or default red in a Claude Design card** mean that preview reached a second MUI copy. Check that `extraEntries` still lists `@mui/material`, and that the story imports MUI from `@mui/material` rather than a deep path. An `@mui/icons-material/<Icon>` subpath import still bundles its own copy. Icons render the same that way, so it is not a defect.
- **Every component's grade cleared after a config change** is expected when the change touches the preview contract (`extraEntries` does). It is not a sign of broken previews.
- **The sync log reporting `found .storybook → shape=storybook`, then `cfg.shape=package overrides`** is expected. `.storybook/` exists, and `config.json` keeps `"shape": "package"`.

## Alternatives considered

**The native route.** `/design-sync` builds Storybook and reads its `index.json`, so stories would need no adapters at all. It was rejected on criterion (a) alone: no official Anthropic documentation describes Storybook input, so the route rests on an undocumented tool behaviour, after an unannounced change (2026-11-13) has already blocked syncing once. It met (b), (c) and (d) in the trial sync.

**Keep `.design-sync/` only.** This is zero work, and the previews keep working. It was rejected because it leaves contributors without a catalogue, and keeps every preview's value tied to one vendor's tooling.

**Storybook alongside the hand-written previews (two catalogues).** This is cheap to start: no adapters and no Claude Design risk. It was rejected because every component change would have to update two renderings of the same states, and they would drift. `AGENTS.md` already requires the preview update, so the burden would double.

**Sync-only duplicate stories.** Stories written for the capture, with its workarounds, kept apart from the stories people browse. This would isolate the vendor workarounds. It was rejected because it is two catalogues again, inside Storybook. D2 in #439 keeps workarounds in one removable place: the adapter file.

**Drop Claude Design.** This removes the adapters, the sync and its vendor risk. It was rejected because Claude Design is in use for design work, and #439 keeps it as a consumer of the stories.

## Consequences

**Positive**

- Contributors get a local catalogue (`npm run storybook`) rendered with the app's theme, Inter and Spanish locale.
- Preview markup and data move out of a vendor-specific folder into stories that compile against the components (`tsc -b`) and follow the app's lint rules. Leaving Claude Design would then cost five-line adapters, not 94 previews.
- Stories give later tooling (accessibility checks, interaction tests) one set of rendered states.

**Negative**

- Every story module needs an adapter file in `.design-sync/previews/`. A story without one is not synced. The migration must add a check that pairs them, as `designSystemSync.spec.ts` pairs components with exports today.
- **Adapters and stories must not lose `extraEntries: ["@mui/material"]`.** Removing it, or a story importing MUI some other way, silently publishes unthemed previews. No check catches this today.
- The compose helper re-implements part of what `composeStories` does. Stories that feed an adapter are limited to the features listed in Decision 5, and the check the migration adds is what keeps them there.
- The chart adapter renders a source copy of `EvolutionCharts.tsx`, not the shipped component, because the file is not named after the component it exports. A `storyImports.shim` entry in `config.json` would send it to the bundle; the migration decides.
- `.design-sync/` cannot be removed: `pkg/`, `previews/` (as adapters) and `config.json` stay.
- The colocated stories are now matched by `NOT_COMPONENT_FILES` in `src/contracts/designSystemSync.spec.ts`. Without that, the contract test reads every story as an unclassified component.

**Operational**

- The first sync after the migration regrades every component.
- The standalone claude.ai/design site, where `/design-sync` uploads, closes by 2026-12-14 ([Commands](https://code.claude.com/docs/en/commands)). The sync tooling may change around that date, and the import rules above with it.

## Revisit if

- Anthropic's official documentation describes Storybook as an input to `/design-sync` or its successor. Then evaluate the native route again against criteria (b) to (d).
- The sync tooling changes how preview imports resolve (rules 1 to 4 above), stops supporting `extraEntries`, or starts honouring `composeStories`.
- Claude Design is dropped. The adapters and `.design-sync/` can then be deleted, and the stories stay.

## References

- `.storybook/main.ts`, `.storybook/preview.tsx`, `.storybook/preview-head.html`
- `src/components/CommunityStatusChip/CommunityStatusChip.stories.tsx`
- `src/components/Modals/ConfirmationModal.stories.tsx`
- `src/components/Menu/MenuTemplate.stories.tsx`
- `src/components/RecordList/RecordList.stories.tsx`
- `src/components/evolution/EnergyEvolutionChart.stories.tsx`
- `src/contracts/designSystemSync.spec.ts` (`NOT_COMPONENT_FILES`)
- `.design-sync/config.json`, `.design-sync/pkg/`, `.design-sync/previews/`, `.design-sync/NOTES.md`
- The adapters: commit `5da34738`, reverted until they can land with `extraEntries`
- #439, #440, #442, #242
