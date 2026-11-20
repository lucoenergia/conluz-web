# design-sync notes (conluz-web)

## How this repo is synced

- conluz-web is an app, not a library: `dist/` is a Vite app build. The sync entry is the
  hand-written package under `.design-sync/pkg/` (`package.json` named `conluz-web`, `index.ts`
  re-exporting the curated components). `cfg.buildCmd` (`npx tsc -p .design-sync/pkg/tsconfig.json`)
  emits its `.d.ts` tree into `.design-sync/pkg/types/` (gitignored) — re-run it before every build.
- Build: `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --out ./ds-bundle`
  (the entry comes from `cfg.entry`; no `--entry` flag needed).
- Included = components that render with only `ConluzProvider`. Excluded on purpose: anything calling
  `src/hooks/actions/`, a generated query hook, auth/logged-user context or `useLogout`. The list of
  components that are not synced, each with its reason, is `NOT_SYNCED` in
  `src/contracts/designSystemSync.spec.ts`; that test fails on a component in neither place.
- `ConluzProvider` (`.design-sync/pkg/ConluzProvider.tsx`) mirrors `src/main.tsx`: ThemeProvider +
  StyledEngineProvider(enableCssLayer) + the shell's GlobalStyles + LocalizationProvider(dayjs, es) +
  MemoryRouter, plus an inert QueryClient and `CommunityProvider`. Without the last two, every
  confirmation modal (`DeleteSupplyConfirmationModal`, …) throws: those modals call
  `useActiveCommunityName` → `useActiveCommunityDispatch` (throws outside CommunityProvider) and
  `useQueryClient`. No user is provided, so no query is ever enabled — community names fall back to
  "la comunidad activa".
- MUI and icons reach previews/designs ONLY through the bundle: `Mui.*` (curated MUI components) and
  `Icons.*` (the ~120 Material icons the app imports), defined in `.design-sync/pkg/primitives.ts`.
  Importing `@mui/material` directly in a preview bundles a second MUI whose ThemeContext is empty →
  unthemed output. Both are excluded from cards via `componentSrcMap: null`.
- Grouping: `cfg.srcDir` is deliberately `"."` (the pkg dir). Pointing it at `src/` makes the
  converter derive groups from the component folder names (stat, cardgrid, …), which win over doc
  categories. Groups come from the stub files in `.design-sync/groups/*.md` via `docsMap`. Prompts were
  identical either way (JSDoc comes through the `.d.ts`).
- Fonts: Inter is self-hosted (`public/fonts/`); `.design-sync/pkg/fonts.css` is the `@font-face`
  copy of `index.html`'s inline declarations, wired through `cfg.extraFonts`.
- Validate needs playwright importable from `.ds-sync/`: `npm i playwright@<repo's playwright-core version>`
  there (it matches the cached `chromium-1223`).

## Re-sync quickstart

1. Stage the scripts (`.ds-sync/`, see the skill) and `cd .ds-sync && npm i esbuild ts-morph @types/react playwright@<node_modules/playwright-core version>`.
2. `npx tsc -p .design-sync/pkg/tsconfig.json` (cfg.buildCmd — emits the .d.ts the converter reads).
3. Fetch `_ds_sync.json` from the project into `.design-sync/.cache/remote-sync.json`, then
   `node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json`.
4. Type-check the previews without building: `npx tsc -p .design-sync/previews/tsconfig.json`
   (maps `conluz-web` to `pkg/index.ts`; catches previews left stale by a props change).
5. If a type named in `guidelines/data-shapes.md` changed, regenerate its block with
   `node .design-sync/scripts/data-shapes.mjs <TypeNames…>`.
- ESLint ignores `.design-sync/`, `.ds-sync/`, `ds-bundle/` (eslint.config.js globalIgnores): previews
  import a virtual `conluz-web` package and would otherwise fail lint.

## Authoring previews

- Import everything from `"conluz-web"`: components, `Mui`, `Icons`, tokens (`colors`, `fontSizes`,
  `radii`, `shadows`, `alphas`, `sxStyles`). React hooks from `"react"` are fine (shimmed).
- Realistic Spanish content (the app's language): Valencian addresses, CUPS codes like
  `ES0031406912345678JN0F`, kWh/kW with comma decimals.
- Props typed with API models (`SharingAgreementResponse`, …) — build the object inline and cast
  `as any`; enum values are their string literals (`"DRAFT"`).
- Overlays (menus, dialogs): render open via `useRef` + `useEffect` anchor, and set
  `cfg.overrides.<Name> = {"cardMode":"single","viewport":"WxH"}`.

- Overlays: open them with a **callback ref** (`ref={setAnchor}`), not `useRef` + `useEffect`
  — the effect version misses the first captured cell (screenshot lands before Grow finishes).
  Components with no open prop (AppAccordion, DetailHeader's details) are opened by
  `.click()`ing their trigger from a wrapper ref in `useEffect`. MenuTemplate opens after 300 ms
  (opening immediately anchored it ~120 px low). In a flex wrapper add `alignItems: "flex-start"` or
  the trigger button stretches.
- Dialogs (portals) are one or two exports each, with `cardMode: "single"` + a measured viewport.
  Community-scoped dialogs read "Comunidad · cargando…" / "en la comunidad activa" — no user in the
  provider; expected.
- Capture width is 900px; the default grid cell is ~650–670px wide and clips at ~490px tall. Page-width
  sections (detail headers, SideMenu, sharing-agreement panels) use
  `cardMode: "column"`; previews use `width: "100%"`, never a fixed 900.
- SideMenu: its paper is `position: fixed`; the preview wraps it in a `transform: translateZ(0)` frame so
  it stays in-cell at full height. Below 768px viewport it becomes a modal drawer. Selection comes from
  `useLocation()`; the harness router sits at `/`, so the preview's Inicio item points at `/`.
- Charts: `react-apexcharts` is CJS-only and the repo is `"type": "module"`, so esbuild's default import
  is the exports object ("Element type is invalid … got: object"). `cfg.tsconfig` →
  `.design-sync/pkg/tsconfig.bundle.json` aliases it to `.design-sync/pkg/shims/react-apexcharts.ts`.
- Overlay first cells occasionally capture with the menu closed — spot-check overlay sheets.
- `alphas` has no `primary` entry — use `alphas.info.light` for a primary-tinted circle.
- Don't name a preview export `Error` (shadows the global).
- Sharing-agreement banner/spine previews derive their state with the exported
  `selectSharingAgreementNextStep` / `selectSharingAgreementLifecycleView`; the spine's tones assume
  the banner's brand fill, so its previews sit in a `brand.main` box.
- Not previewable statically: the banner/spine "Ver todos los pasos" expanded list.
- ResponsiveRecordList and ListPagination pick their layout from the window width (1024px), so a
  card narrower than that still shows the table unless the viewport is narrow.
- App facts noticed: SupportCard has no usages in `src/`; PaginationOutlined passes
  Tailwind classes via `className` (no effect, no Tailwind loaded); LoadingStat requires `label`.
- App fact noticed (2026-11-19): LoadingAppAccordion's title is a bare `<Skeleton/>` in a shrink-to-fit
  AccordionSummary, so it renders only a few px wide (in the app too). Not a preview defect.
- Dialog previews capture as bottom sheets: the 900px capture width is below `md`. Expected.
- ListTable and ResponsiveRecordList are `cardMode: "column"`: in the 3-column grid their member
  column collapsed to one character per line, though the per-story review sheets looked fine. When
  grading a list or table, look at the grid card `ds-bundle/_screenshots/<group>__<Name>.png` too.
  SupplyStatsCard is column for the same reason: its stat bar clipped the last two percentages.
- The per-story review sheets render narrower than a column card, so a column-mode component can look
  squeezed there (SharingAgreementCoefficientTableRow, SupplyStatsCard): judge it on the grid card.
- PeriodHeader is `cardMode: "column"`: in the 3-column grid its long titles wrapped under the
  calendar icon, which then stood alone on a line. PeriodUsageCard, PeriodTotals and PlantSection are
  column cards too (PeriodTotals shows its four tiles in one row only from `md`, which the 900px
  capture reaches).
- Energy previews take their colours from the exported `ENERGY_COLORS` / `SAVINGS_COLOR`, and their
  figures are consistent with each other (self-consumption / assigned = the headline ratio).
- Evolution previews build their view with the exported `toConsumptionSeriesView` from buckets shaped
  like the membership consumption endpoints, and their period with `resolvePeriod`; the period pickers
  take the exported presets (`LATEST`, `YEAR`, `LAST_12`, `LAST_7`, `LAST_30`, `DAY_YEAR`). Evolution,
  both charts, ChartScrollArea and the two form field sets are column cards; the rows previews sit in
  a 390px frame because the app draws rows only below `sm`.
- The validator fails a card with no text (`rootEmpty`): ChartScrollArea's preview labels its bars.
- Coefficients show four decimals of a percentage (`formatPercentage`, `12,3456 %`), which is six
  decimals of the 0–1 coefficient. Previews follow the app.

## Known render warns

- ActionStatus / ResultStatus are visually-hidden live regions (paint nothing). Their previews add a
  visible "Lector de pantalla: «…»" transcript beside the real component — preview-only scaffolding.

- `[RENDER_THIN]` RouteFallback: the component is only a centred spinner (no text) — legitimate.

## Re-sync risks

- `.design-sync/pkg/index.ts` is a hand-kept export list: a new presentational component in
  `src/components/` is NOT synced until it is added there (and to a `docsMap` group).
  `src/contracts/designSystemSync.spec.ts` catches a component that is in neither the list nor
  `NOT_SYNCED`, but only once the app's tests run.
- `primitives.ts` icon list was taken from the app's imports (last brought up to date on
  2026-11-20); new icons the app starts using are missing until added.
- `ConluzProvider`'s GLOBAL_STYLES is a trimmed copy of `src/main.tsx`'s; drift there is not picked up.
- `.d.ts` for props typed with API models carries the bare model name (e.g. `SharingAgreementResponse`)
  without its shape.
- The original project "Conluz Web" (`0f2a485c-…`) stopped accepting /design-sync writes (2026-11-13:
  HTTP 403, "This design system moved to Claude"); on 2026-11-19 it was readable but missing from the
  writable list. That run created "Conluz Web Design System" (`c57d92b8-…`) and pinned it in
  `config.json`. The old project keeps its last sync and receives no updates. If `list_projects`
  ever stops listing the pinned project, the same thing has happened again: ask before creating
  another.
- `guidelines/data-shapes.md` is hand-tidied (field order, `ReactNode` instead of the expanded union),
  so diff it against `scripts/data-shapes.mjs` output per type and ignoring order, not line by line.
