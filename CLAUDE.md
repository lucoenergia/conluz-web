# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

```bash
# Development
npm run dev                   # Start development server on port 3001
npm run build                 # TypeScript compile + Vite production build
npm run preview               # Preview production build locally
npm run lint                  # Run ESLint
npm test                      # Vitest: watch mode in an interactive terminal, a single run in CI or non-interactive shells
npx vitest run                # Run all tests once in any terminal (same as npm test -- --run)
npm test -- --watch           # Run tests in watch mode
npm run generate-client       # Regenerate API client from api-docs.json
npm run test:visual           # Run visual tests
npm run test:visual:mobile    # Run visual tests for mobile screens
npm run test:visual:desktop   # Run visual tests for desktop screens
```

## Architecture Overview

### State Management Pattern
The application uses a layered state management approach:
- **Global State**: React Context providers (AuthContext, LoggedUserContext)
- **Server State**: TanStack React Query for API data caching and synchronization
- **Token Storage**: Dual storage system - localStorage for "remember me", sessionStorage for temporary

### Authentication Flow
1. Token is managed by `AuthProvider` context in `src/context/auth.context.tsx`
2. Custom Axios instance (`src/api/custom-instance.ts`) automatically injects `Authorization: Bearer ${token}` headers
3. Protected routes use `ProtectedRoute` component that checks authentication status
4. 401 responses trigger automatic logout via React Query's global error handler

### Multi-Community Model & Authorization

The app is **multi-community**. This is the single most important mental model for any data or gating work, and it supersedes any older single-community assumptions.

- **Two independent authorization axes.** There is no global user `role`. Instead:
  - `isPlatformAdmin` (boolean) — platform-level privilege.
  - The user's role **within the active community**, derived via `src/hooks/useActiveCommunityRole.ts` from the `memberships` map (`COMMUNITY_ADMIN` / `COMMUNITY_MEMBER`).
- **Golden rule (mirror of the backend):** `isPlatformAdmin` **never** grants access to a community's operational data. Platform admins manage users/communities and assign community admins; they do not get members' consumption/production data by virtue of the flag.
- **Active community context:** `src/context/community.context.tsx` selects and persists the active community (auto-selects when the user has exactly one; restores the persisted choice otherwise). `CommunitySelector` switches it.
- **Data endpoints are path-scoped:** `/communities/{communityId}/{supplies,consumption,production,plants,config}`. Data hooks must pass `communityId` and be **gated on its presence** — no active community → no call, and controls that submit community-scoped data disable when none is selected.
- **Route guards:** `PlatformAdminRoute` and `CommunityAdminRoute` (`src/components/Auth/`) gate pages by axis. Menu/profile gating derives from `isPlatformAdmin` + active-community role, not a global role.
- **Legacy `X-Community-Id` header removed:** the axios interceptor that injected this header was removed from `community.context.tsx`. Data endpoints carry `communityId` in the **path** — that is the sole scoping mechanism.

Deeper patterns (gating recipes, hook shapes, common pitfalls) live in the **`conluz-web-community-scope`** skill in `.claude/skills/`.

### API Client Architecture
The API layer is **completely auto-generated** from OpenAPI specification using Orval:
- **Input**: `api-docs.json` (OpenAPI spec from backend)
- **Output**: `src/api/` directory organized by OpenAPI tags
- **Generated artifacts**: TypeScript models and React Query hooks (Orval runs with `mock: false`)
- **Never manually edit** files in `src/api/` - they will be overwritten

To update API definitions (human maintainer workflow):
1. Get latest `api-docs.json` from backend Swagger UI
2. Run `npm run generate-client`

**For AI-agent tasks:** the updated `api-docs.json` and the regenerated Orval client under `src/api/` are **always provided as an input before implementation** — treat `src/api/` as already current. Do **not** include fetching `api-docs.json` or running `npm run generate-client` as a task step, and do not regenerate the client yourself. If `src/api/` appears out of sync with the task, stop and report it rather than regenerating.

### Routing and Layout System
Routes are organized by authentication requirement:
- **LoginLayout**: Unauthenticated routes (login, password recovery)
- **AuthenticatedLayout**: Protected routes with sidebar navigation
- **DynamicLayout**: Routes that adapt based on auth status

Route definitions are in `src/App.tsx` with nested structure for supply points management.

### Testing Strategy

**Unit / component tests (Vitest):**
- **Framework**: Vitest with jsdom environment
- **Convention**: Test files use `.spec.tsx` extension (not `.test.tsx`)
- **Location**: Tests are colocated with components
- **Rendering**: render through `renderWithProviders` / `renderHookWithProviders` from `src/test/renderWithProviders.tsx`, not with hand-built wrappers. They compose the production providers (theme from `src/theme`, `MemoryRouter`, auth, logged user, community, error, success) around a real `QueryClient` with retries off, and **return that `queryClient`** so specs can spy on it. Options: `route` (render the page under a real `<Route>` to get route params instead of stubbing `useParams`), `queryClient` (inject one created with `createTestQueryClient()` when the spy must exist before render), and opt-in seeding of `token` and `activeCommunityId` (`null` means explicitly none). A seeded community can be switched mid-test with the returned `switchActiveCommunity(id)`; key the page on `useActiveCommunity()` to mirror the layout's keyed Outlet. A spec that mocks a context module must keep its Provider export: `vi.mock(import("…/error.context"), async (importOriginal) => ({ ...(await importOriginal()), useErrorDispatch: () => mockDispatch }))`.
- **API mocking follows two tiers** (decided in `docs/decisions/adrs/0001-keep-vi-mock-for-api-mocking-reject-msw-and-sanction-a-narrow-real-cache-tier.md`):
  - **Tier 1 (default): `vi.mock` of the generated `src/api/<tag>/<tag>` modules.** Use the typed form `vi.mock(import("…/api/users/users"), () => ({ useGetAllUsers: vi.fn() }))`; the factory result **must be typed**, never a string path with hand-written hook shapes. Set results in `beforeEach` with `vi.mocked(hook).mockReturnValue(...)` and the builders in `src/test/queryState.ts`: `query.success<typeof getAllUsers>(data)` (typed by the generated fetcher), `query.loading()`, `query.disabled()`, `query.error(err)`, `mutation.idle({ mutateAsync })`, `mutation.pending(variables)`. Build fixtures with `src/test/fixtures.ts` (`buildUser`, `buildMembership`, `buildCommunity`, `buildSupply`, `buildPlant`, `buildSharingAgreement`, `buildCoefficient`) and never cast a partial object to a response type (`as SupplyResponse`, `as unknown as …`): the cast hides missing required fields, the way the agreement fixtures hid `updatedAt`/`updatedBy`. Builder defaults are deliberately synthetic (`TEST-…`, non-zero sentinels, nullables null), so a spec overrides every value it asserts on. A partial literal such as `{ data: undefined, isLoading: false }` does not compile; `src/test/queryState.typecheck.ts` keeps that true under `tsc -b`. Assert invalidation by spying on the returned client (`vi.spyOn(queryClient, "invalidateQueries")`) and check the keys, not just the call count. References: `src/pages/users/UsersPage.spec.tsx` (list), `src/pages/members/MembersPage.spec.tsx` (flow with invalidation).
  - **Tier 2: a real `QueryClient` with `src/api/custom-instance.ts` mocked**, so the real generated hooks run. Use it **only when the subject of the test is cache behaviour**: invalidation, refetch, or a loading state that spans a refetch. Everything else stays in tier 1. Route requests with `routeRequests` from `src/test/requestRouter.ts`: one route per method + URL (a `RegExp` for sub-resources), and it rejects anything it does not match **and fails the test that sent it**, even when nothing awaits the rejection (TanStack Query would otherwise swallow it into query error state). A test whose subject is an unmatched request takes it with `router.takeUnmatched()`. Mock `custom-instance` by spreading the original and replacing only `customInstance`, because the harness's `AuthProvider` imports `AXIOS_INSTANCE` from it. References, all on `routeRequests`: `src/pages/production/SharingAgreementReopenInvalidation.spec.tsx`, `SupplyCoefficientHistoryInvalidation.spec.tsx`, `useSharingAgreementCoefficientMutations.staleness.spec.tsx`.
  - `vi.mock` is per test file, so a helper module shared between specs must not contain `vi.mock` calls. When several spec files mock the same modules the same way, keep each `vi.mock` call in the spec and move the factory into a mock-free module that the factory loads with `import()` (it must import nothing at runtime but `vitest`, so it cannot cycle back into a mocked module). Reference: `src/components/SharingAgreementCoefficientSet/SharingAgreementCoefficientSet.mocks.ts`.
- **Browser storage**: storage is cleared before each render and after each test in any file that imports the harness; no spec cleans up by hand. Rendering with a single-membership user persists `activeCommunity:<userId>`, because that is what `CommunityProvider` does in production. Specs assert the active community through observable behaviour (what the UI shows, what the hook returns), never by reading the storage key. The specs that assert storage directly are the ones that own that behaviour: `src/context/community.context.spec.tsx` (persistence) and the harness's own `src/test/renderWithProviders.spec.tsx` and `src/test/storageCleanup.spec.tsx` (isolation).
- **No real network**: a spec must never reach the backend; an unmocked query hook shows up as `ECONNREFUSED` in the run output.
- **Pattern**: Use React Testing Library with `@testing-library/jest-dom` matchers

**Selector hierarchy (all specs, Vitest and Playwright):** pick the first level that works, in strict order. The reasoning, and the conditions for revisiting it, are in `docs/decisions/adrs/0002-select-by-role-then-text-and-reserve-test-ids-for-unnamed-regions.md`.
1. **Accessible role, with its name when it has one**, e.g. `page.getByRole("heading", { name: "Histórico de coeficientes" })` in `tests/visual/supplies.spec.ts`. Landmarks count as roles, so a page's content region is `getByRole("main")`. A role selector also checks what assistive technology perceives, for free.
2. **Visible text, when no role fits**, e.g. `page.getByText("Sin periodos aplicados")` in `tests/visual/supplies.spec.ts`.
3. **`data-testid`, only on a region container with neither a role nor an accessible name** (a card section, panel or bar whose only job is grouping), e.g. `page.getByTestId("coefficient-history-drawer")` in `tests/visual/sharing-agreement-dialogs.spec.ts`. A test id checks nothing a user perceives. It marks the region as lacking semantics, not as convenient.
- **Never put a `data-testid` on a button, link, form field, menu item or anything else a user interacts with.** If an interactive element can only be found by test id, it is missing an accessible name or role. That is a production defect: report it, don't route around it. `csv-file-input` and `drop-zone` in the import modals predate this rule and are grandfathered, not examples.
- A test id that stands in for a missing role is marked **interim** by a comment at the attribute, naming the issue that removes it (`modal-panel` in `BasicModal`, pending a real `role="dialog"`).
- A structural locator (MUI class, DOM nesting) is a last resort, and it needs a one-line justification in the spec.

**Fast iteration (agents):**
- While iterating, run `npx tsc -b` plus `npx vitest related --run <changed files>`. `related` takes file paths (source or spec) and runs the specs that import them. When it resolves to nothing it prints "No test files found" and still exits 0, so in that case run the spec directly by path: `npx vitest run <path/to/File.spec.tsx>`.
- Run the full gates `npm run lint && npm test` once, at the end.
- Run `npm run test:visual` only at the end and only if the UI changed. If it fails, report which baselines differ; never regenerate them.

**Visual regression tests (Playwright):**
- **Framework**: Playwright (`@playwright/test`), configured in `playwright.config.ts`.
- **Location**: Specs live in `tests/visual/`, one per feature area (`login-and-home`, `supplies`, `platform-and-users`, `sharing-agreements-list`, `sharing-agreement-detail`, `sharing-agreement-dialogs`, `coefficient-editor`, `plant-detail`, each `.spec.ts`), plus `chrome-canary.spec.ts` for the shared chrome. Auth setup, route mocks, JSON fixtures and navigation helpers are shared from `tests/visual/fixtures/` (import from `./fixtures`). Height and row budgets that capture no screenshot live in `tests/visual/layout-budgets.spec.ts`; prefer that measured-assertion pattern whenever a property can be measured. Baseline screenshots live in `tests/visual/__screenshots__/{mobile,desktop}/`.
- **Screenshot names are globally unique across all visual spec files.** `snapshotPathTemplate` is `{projectName}/{arg}`, where `{arg}` is the name passed to `toHaveScreenshot()`, and it does not include the spec file. Two specs that pass the same name would silently share, and overwrite, one baseline. Check with `grep -rhoP 'toHaveScreenshot\("\K[^"]+' tests/visual | sort | uniq -d` (must print nothing). The warmup project enforces it: `screenshot names are unique across the visual specs` in `tests/visual/warmup.setup.ts` fails on a repeated name, and on any `toHaveScreenshot()` call without a string-literal name.
- **What each baseline captures (capture the subject, not the page):**
  - **Component subject** (dialog, menu, drawer, panel, section, bar, header): capture that component's locator, chosen by the selector hierarchy above, with `await hideAppBar(page)` as the options, e.g. `await expect(page.getByRole("menu")).toHaveScreenshot("x.png", await hideAppBar(page))`.
  - **Page-layout subject**: `await expect(page).toHaveScreenshot("x.png", await mainRegion(page))` (`tests/visual/fixtures/capture.ts`). It captures `main` found by role, hides the fixed app bar that overlaps its top, and clips a full-page capture rather than taking an element screenshot, because the scroll an element screenshot does collapses the mobile detail header and never stabilises.
  - **Full page** only with a one-line reason at the call: `/login` (no `main`, no app bar) and the chrome canaries.
  - **The chrome (app bar, side menu) belongs to `tests/visual/chrome-canary.spec.ts` alone.** A header or menu change should fail the canaries, not every page baseline. Every other capture hides the app bar through `hideAppBar()` / `mainRegion()` (`visibility: hidden` from `tests/visual/fixtures/hide-app-bar.css` as the screenshot `stylePath`), never by masking it: a mask follows the bar's box, so a taller bar grows it, and an element capture scrolls its target under the fixed bar. The helpers assert the page has exactly one `<header>`, the banner, so the CSS cannot hide anything else silently.
  - **Masking policy.** Mask only content that cannot be made deterministic through fixtures (route mocks, fixture data, seeded storage). First fix the fixture if it can be fixed. When the variation comes from production code, the mask is an **interim**: the comment at the mask site states the reason and names the change request that removes it, and it is never accepted silently. The only one today is the kWh figure on supply cards (`Math.random()` in `SupplyPointsPage`), masked in `supplies.spec.ts` pending "Supply cards show members an invented consumption figure". Never rely on the tolerance to absorb non-determinism.
- **Baselines are only written by an explicit flag.** `playwright.config.ts` sets `updateSnapshots: "none"`: Playwright's default (`missing`) would write a PNG for any new screenshot name on a plain run, which is baseline generation. A new name therefore fails as missing until the maintainer regenerates with `npm run test:visual -- --update-snapshots=changed`, and the CLI flag overrides the config. Report the missing name; never pass the flag.
- **Workers**: `playwright.config.ts` pins `workers: 2`. With `fullyParallel: false`, Playwright runs one worker per spec file × project, so the default would put many specs against the single Vite dev server at once.
- **Projects**: Two viewports — `mobile` (iPhone 13: 390×844, DPR 3) and `desktop` (1440×900). Both run in **Chromium** on purpose: WebKit's text rendering couples to the host OS fonts and drifts between local and CI, while Chromium bundles its own renderer and produces identical screenshots across environments.
- **Commands**:
  - `npm run test:visual` — run all visual tests (both viewports)
  - `npm run test:visual:mobile` — mobile viewport only (`--project=mobile`)
  - `npm run test:visual:desktop` — desktop viewport only (`--project=desktop`)
- **Baselines are never updated by an agent (hard rule).** Never run `--update-snapshots` or otherwise rewrite the PNGs under `tests/visual/__screenshots__/`. When a visual test fails, report which screens differ and stop; regenerating baselines is a manual maintainer step documented in `CONTRIBUTE.md`.
- **Server**: Playwright starts (or reuses locally) the dev server on `http://localhost:3001` via the `webServer` config — no need to launch it yourself. In CI it always starts fresh.
- **No live backend**: Auth is faked by injecting a JWT into `localStorage` before load, and every `/api/v1/**` request is intercepted with fixed, hard-coded JSON fixtures. Data must be deterministic (no faker, no time-varying fields) so screenshots are byte-stable. Animations are disabled and `document.fonts.ready` is awaited before capture.
- **Screenshot thresholds (no global value).** `playwright.config.ts` sets no screenshot threshold. Every `toHaveScreenshot()` call carries an absolute `maxDiffPixels`: through `hideAppBar()` / `mainRegion()` (`COMPONENT_MAX_DIFF_PIXELS`, `LAYOUT_MAX_DIFF_PIXELS` in `tests/visual/fixtures/capture.ts`), or stated at the call (`CANARY_MAX_DIFF_PIXELS` in `chrome-canary.spec.ts`, `login-page`). All are 100 today, and every value is wrapped in `threshold()`, so a new one must be too. The reasoning and its revisit conditions are in `docs/decisions/adrs/0003-size-screenshot-thresholds-in-absolute-pixels-per-capture.md`.
  - **Why absolute and per capture:** a regression has an absolute size (a changed short label measured 175 px, the header wordmark 316 px), while a ratio scales with the capture. The old global 2% was wrong at both ends: 253 px on the two-item Acciones menu, more than a relabelled item, and 57,920 px on the tallest detail page, enough for a whole table column. It also left the chrome canary blind, since a side-menu edit changed it by 175 px and passed.
  - **Choosing a value for a new capture:** use the helper's value when the capture fits its category. If it doesn't, measure before choosing, with the tolerance-0 method: (1) `VISUAL_EXACT=1 npx playwright test --reporter=json` compares every capture exactly (`threshold()` in `capture.ts` returns 0) and writes nothing (the config sets `updateSnapshots: "none"`); (2) run it twice clean, where any capture whose differing-pixel count changes between the runs is noise and must be made deterministic first (see the masking policy); (3) run it once per representative edit, made on a backed-up file and restored by copy, where the capture's differing-pixel count is the signal. For a past commit, run the same in a temporary git worktree. The threshold goes below the smallest signal worth catching and above the noise, and the comment at the value records both figures. Never size a threshold to make a failing capture pass. Measure against the current baselines, never against an image about to be regenerated.
  - **Limits of the method:** "tolerance 0" still applies Playwright's per-pixel colour threshold (0.2), so colour shifts of a few levels per channel are not counted by the measurement or by the suite. The noise figure is local, and CI is the check for cross-environment rendering.
- **Coverage is role-based**: fixtures map users to routes by authorization axis (member → home/supplies, platform admin → `/platform` and `/users`, no-community user → `/no-community`). `CommunityAdminRoute` pages (e.g. `/members`) are **not** directly Playwright-tested because the guard defers community selection to a `useEffect` that redirects before it re-evaluates — those are covered by unit tests instead.

### Environment Variables
- **Required prefix**: `CONLUZ_` for all environment variables
- **Main variable**: `CONLUZ_API_URL` (backend API endpoint)
- **Docker support**: Variables are hot-swappable at container startup via `docker/env.sh`

### Component Organization
Each component follows this structure:
```
components/ComponentName/
├── ComponentName.tsx       # Main component
├── ComponentName.spec.tsx  # Tests
└── index.tsx              # Re-export
```

### Key Development Patterns
1. **TypeScript-first**: Full type coverage with auto-generated API types
2. **Styling**: Material-UI components
3. **Mobile-responsive**: MIN_DESKTOP_WIDTH = 768px breakpoint
4. **Error boundaries**: Global error handling with automatic 401 processing
5. **Code splitting**: Rollup's automatic chunking — `vite.config.ts` deliberately sets no `manualChunks` (its comment records the measurements behind that)

### Critical Files to Understand
- `src/main.tsx`: Application bootstrap with provider hierarchy
- `src/api/custom-instance.ts`: Axios configuration with auth interceptor
- `orval.config.js`: API client generation configuration
- `src/context/auth.context.tsx`: Authentication state management
- `src/layouts/authenticated.layout.tsx`: Protected route implementation

## Project-Specific Conventions

### API Integration Pattern
When working with API endpoints:
1. Never modify files in `src/api/` directly
2. Use the auto-generated React Query hooks (e.g., `useGetSupplies`, `useCreateSupply`)
3. Handle loading/error states using React Query's built-in states
4. Invalidation is explicit: after a mutation, call `queryClient.invalidateQueries` (or `removeQueries` after a delete) with the generated `get…QueryKey()` getters — see `src/pages/production/useSharingAgreementMutations.ts`

### Table Row Actions Pattern

**All data tables must use a three-dot kebab menu for row actions.** Never place action buttons or interactive controls (selects, toggles) inline in table rows.

Build list tables with `ListTable` and `RowActionsMenu` from `src/components/ListTable`; do not copy a page's table markup. `ListTable` renders the header row, the loading and empty rows, row hover, and a trailing "Acciones" column whose kebab `IconButton` (`MoreVertIcon`, no visible label) calls `onRowActionsClick`. `RowActionsMenu` is the `<Menu>` that button opens, with the arrow styling and right anchoring. Real usage, from `src/pages/members/MembersPage.tsx`:

```tsx
const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
const [selectedMembership, setSelectedMembership] = useState<MembershipResponse | null>(null);
const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, membership: MembershipResponse) => { /* set both */ };
const handleMenuClose = () => setAnchorEl(null);

<ListTable
  rows={memberships}
  getRowKey={(membership) => membership.id}
  isLoading={isLoading}
  emptyMessage="No hay miembros en esta comunidad"
  rowActionsLabel={(membership) => `Más acciones para ${membership.user?.fullName ?? "el miembro"}`}
  onRowActionsClick={handleMenuOpen}
  columns={[
    { key: "role", header: "Rol", render: (membership) => <Typography variant="body2">{ROLE_LABELS[…]}</Typography> },
    // header: a string gets the standard header style; a node (TableSortLabel, icon + ListTableHeaderText) renders as is
  ]}
/>

<RowActionsMenu anchorEl={anchorEl} onClose={handleMenuClose}>
  <MenuItem onClick={handleChangeRoleClick}>…</MenuItem>
  <Divider />
  <MenuItem onClick={…}><ListItemText sx={{ color: "error.main" }}>Eliminar</ListItemText></MenuItem>
</RowActionsMenu>
```

The page keeps what differs: the `Paper` shell, the error `Alert`, `ResultStatus`, the narrow-viewport `RecordList`, pagination (`UsersPage`), the menu items, and the menu state (`anchorEl` + the selected row). Destructive items (delete) go last, below a `<Divider>`, with `color: "error.main"`.

**For actions that change server state** (role change, status toggle, etc.) the menu item must open a confirmation `<Dialog>` that:
- Names the affected entity.
- Shows the new value via a controlled select or clear text.
- Includes an `<Alert severity="info">` explaining consequences.
- Disables the confirm button while the mutation is pending or when the new value equals the current value.

**Never** show a `<Select>` or any mutable control directly inside a table row — it bypasses the confirmation step and is visually inconsistent.

### Form Handling
Forms use controlled components with Material-UI inputs. Supply forms (`SupplyForm`) serve as the primary reference for complex form patterns.

### Data Fetching Pattern
```typescript
// Use auto-generated hooks
const { data, isLoading, error } = useGetSupplies();

// Mutations with automatic cache invalidation
const mutation = useCreateSupply();
mutation.mutate(data, {
  onSuccess: () => {
    // Handle success
  }
});
```

### Docker Development
For containerized development:
```bash
cd docker
docker compose up -d  # Runs on port 3001
```

The Docker setup includes nginx configuration for proper SPA routing and dynamic environment variable injection.
- never run the server after completing changes

### Styling Contract

**Never** write raw hex colors, rgba strings, hand-written shadow strings, rem/em font-size literals, or Tailwind `className` in component code. ESLint enforces this with `no-restricted-syntax` rules, which match a colour **anywhere inside a string** — composite values like `1px solid #e5e7eb`, gradient stops, and template literals all count.

Token files (read these before touching any sx prop):
- `src/theme/tokens.ts` — `colors`, `alphas`, `shadows`, `radii`, `fontSizes`
- `src/theme/index.ts` — MUI theme (palette maps tokens; use `theme.palette.*` shorthands in sx)
- `src/theme/sx.ts` — shared `sxStyles` helpers (`pageContainer`, `flexRowCenter`, `softPanel`, …)

**Colour roles.** Every hue is a set of roles, not one value, and `main` is the
safe one: it clears 4.5:1 both as type on white and behind white text, so it
works as type, as an icon, and as a fill. `vivid` is decorative only (~3:1 —
chart marks and large fills, never type). `onBrand` is for type on
`colors.brand.panel`; `surface` is the explicit tint behind `main` type. Full
table in `references/theme-tokens.md`. Two traps worth naming:
`colors.brand.light` (`#667eea`) is decorative only — it is 3.66:1 and cannot
carry white text — and `colors.text.disabled` is for disabled controls only.
Never express a tint as an alpha overlay when type will sit on it: alpha makes
the effective contrast depend on whatever happens to be behind.

Key rules:
- Use `theme.palette.primary.main` / `"primary.main"` shorthand, **not** `"#667eea"`
- Use `colors.text.subtle` / `colors.error.dark` etc., **not** raw hex
- Use `alphas.white.soft` etc., **not** `rgba(255,255,255,0.2)`
- Use `shadows.soft` / `shadows.dataCard` etc., **not** hand-written shadow strings
- Use `fontSizes.md` etc., **not** `"0.875rem"`
- For genuine one-offs: `// eslint-disable-next-line no-restricted-syntax -- <reason>`

Full guide: `references/styling-conventions.md`
Full token catalogue: `references/theme-tokens.md`
Fonts (self-hosted Inter — do not move back to a CDN): `references/fonts.md`

Verification for styling changes follows the Fast iteration loop (see Testing Strategy):
while iterating, run `npx tsc -b` plus `npx vitest related --run <changed files>`; run the
full gates once, at the end:
```bash
npm run lint     # 0 no-restricted-syntax errors
npx vitest run   # all tests pass
```

## Skills & documentation maintenance

- Task-specific procedural knowledge lives in `.claude/skills/`. Load **`conluz-web-community-scope`** before any data-fetching or role-gating work. Styling depth lives in `references/styling-conventions.md` and `references/theme-tokens.md`.
- **Author skills, this file, and the reference docs against the real, merged code — never against a plan.** A convention describing code that has since changed misleads with authority and is worse than none.
- **Epic-closeout rule:** closing any epic includes updating `CLAUDE.md`, the affected skills, and the reference docs to match the code that actually landed. This is part of "done," not a follow-up. This file drifted before — it described a single-community model long after multi-community shipped — precisely because that step was skipped.

# Language
All code and documentation must be in english.