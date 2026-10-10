# design-sync notes (conluz-web)

## How this repo is synced

- conluz-web is an app, not a library: `dist/` is a Vite app build. The sync entry is the
  hand-written package under `.design-sync/pkg/` (`package.json` named `conluz-web`, `index.ts`
  re-exporting the curated components). `cfg.buildCmd` (`npx tsc -p .design-sync/pkg/tsconfig.json`)
  emits its `.d.ts` tree into `.design-sync/pkg/types/` (gitignored) — re-run it before every build.
- Build: `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --out ./ds-bundle`
  (the entry comes from `cfg.entry`; no `--entry` flag needed).
- Included = components that render with only `ConluzProvider`. Excluded on purpose: anything calling
  `src/hooks/actions/`, a generated query hook, auth/logged-user context or `useLogout`
  (Header, ProfileMenu, PasswordChangeHeader, Auth routes, Errors/Success displays, PlantForm,
  SupplyForm, Csv/Import modals, SharingAgreement{CoefficientSet,DetailHeader,FilePanel,FormDialog,
  GenerateDialog,UploadDialog}, CoefficientHistoryDrawer, SupplyCoefficientHistorySection,
  ScopeContext, AddSupplyDialog).
- `ConluzProvider` (`.design-sync/pkg/ConluzProvider.tsx`) mirrors `src/main.tsx`: ThemeProvider +
  StyledEngineProvider(enableCssLayer) + the shell's GlobalStyles + LocalizationProvider(dayjs, es) +
  MemoryRouter, plus an inert QueryClient and `CommunityProvider`. Without the last two, every
  component that embeds a confirmation modal (SupplyCard, …) throws: those modals call
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
- Cards that sit in `CardGrid` in the app look cramped below ~420px — give them `maxWidth: 420–440`.
- Props typed with API models (`SharingAgreementResponse`, …) — build the object inline and cast
  `as any`; enum values are their string literals (`"DRAFT"`).
- Overlays (menus, dialogs): render open via `useRef` + `useEffect` anchor, and set
  `cfg.overrides.<Name> = {"cardMode":"single","viewport":"WxH"}`.

- Overlays: open them with a **callback ref** (`ref={setAnchor}`), not `useRef` + `useEffect`
  — the effect version misses the first captured cell (screenshot lands before Grow finishes).
  Components with no open prop (DisplayMenu, AppAccordion, DetailHeader's details) are opened by
  `.click()`ing their trigger from a wrapper ref in `useEffect`. MenuTemplate opens after 300 ms
  (opening immediately anchored it ~120 px low). In a flex wrapper add `alignItems: "flex-start"` or
  the trigger button stretches.
- Dialogs (portals) are one or two exports each, with `cardMode: "single"` + a measured viewport.
  Community-scoped dialogs read "Comunidad · cargando…" / "en la comunidad activa" — no user in the
  provider; expected.
- Capture width is 900px; the default grid cell is ~650–670px wide and clips at ~490px tall. Page-width
  sections (detail headers, CardGrid, SideMenu, UserForm, sharing-agreement panels) use
  `cardMode: "column"`; previews use `width: "100%"`, never a fixed 900.
- `CardGrid` fades/grows its cards in: pass `fadeTimeout={0}` and `animationDelay={0}` or a capture can
  come out blank.
- SideMenu: its paper is `position: fixed`; the preview wraps it in a `transform: translateZ(0)` frame so
  it stays in-cell at full height. Below 768px viewport it becomes a modal drawer. Selection comes from
  `useLocation()`; the harness router sits at `/`, so the preview's Inicio item points at `/`.
- Charts: `react-apexcharts` is CJS-only and the repo is `"type": "module"`, so esbuild's default import
  is the exports object ("Element type is invalid … got: object"). `cfg.tsconfig` →
  `.design-sync/pkg/tsconfig.bundle.json` aliases it to `.design-sync/pkg/shims/react-apexcharts.ts`.
  Charts animate (800 ms + 150 ms per bar) and expose no prop to turn it off, so a capture catches
  half-height bars. The chart previews (Graph, GraphBar, MultiSeriesBar, GraphCard) speed up
  `performance.now()` 20x behind a `window.__dsFastCharts` guard — ApexCharts times animations off it.
  Preview-only; an `animate` prop on the chart components would be the clean fix.
- Overlay first cells occasionally capture with the menu closed — spot-check overlay sheets.
- StatsCard's vertical Divider is absolutely positioned with no positioned ancestor (an app quirk);
  previews wrap the card in `position: relative`.
- `alphas` has no `primary` entry — use `alphas.info.light` for a primary-tinted circle.
- Don't name a preview export `Error` (shadows the global).
- Sharing-agreement banner/spine previews derive their state with the exported
  `selectSharingAgreementNextStep` / `selectSharingAgreementLifecycleView`; the spine's tones assume
  the banner's brand fill, so its previews sit in a `brand.main` box.
- Not previewable statically: GraphFilter ranges other than "Día" (no controlled prop), the
  banner/spine "Ver todos los pasos" expanded list.
- App facts noticed: PaginatedList and SupportCard have no usages in `src/`; PaginationOutlined passes
  Tailwind classes via `className` (no effect, no Tailwind loaded); LoadingStat requires `label`.

## Known render warns

- ActionStatus / ResultStatus are visually-hidden live regions (paint nothing). Their previews add a
  visible "Lector de pantalla: «…»" transcript beside the real component — preview-only scaffolding.

- `[RENDER_THIN]` RouteFallback: the component is only a centred spinner (no text) — legitimate.

## Re-sync risks

- `.design-sync/pkg/index.ts` is a hand-kept export list: a new presentational component in
  `src/components/` is NOT synced until it is added there (and to a `docsMap` group).
- `primitives.ts` icon list was taken from the app's imports on 2026-10-10; new icons the app starts
  using are missing until added.
- `ConluzProvider`'s GLOBAL_STYLES is a trimmed copy of `src/main.tsx`'s; drift there is not picked up.
- `.d.ts` for props typed with API models carries the bare model name (e.g. `SharingAgreementResponse`)
  without its shape.
