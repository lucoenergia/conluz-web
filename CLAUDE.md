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

**Fast iteration (agents):**
- While iterating, run `npx tsc -b` plus `npx vitest related --run <changed files>`. `related` takes file paths (source or spec) and runs the specs that import them. When it resolves to nothing it prints "No test files found" and still exits 0, so in that case run the spec directly by path: `npx vitest run <path/to/File.spec.tsx>`.
- Run the full gates `npm run lint && npm test` once, at the end.
- Run `npm run test:visual` only at the end and only if the UI changed. If it fails, report which baselines differ; never regenerate them.

**Visual regression tests (Playwright):**
- **Framework**: Playwright (`@playwright/test`), configured in `playwright.config.ts`.
- **Location**: Specs live in `tests/visual/` (e.g. `tests/visual/baseline.spec.ts`); baseline screenshots live in `tests/visual/__screenshots__/{mobile,desktop}/`.
- **Projects**: Two viewports — `mobile` (iPhone 13: 390×844, DPR 3) and `desktop` (1440×900). Both run in **Chromium** on purpose: WebKit's text rendering couples to the host OS fonts and drifts between local and CI, while Chromium bundles its own renderer and produces identical screenshots across environments.
- **Commands**:
  - `npm run test:visual` — run all visual tests (both viewports)
  - `npm run test:visual:mobile` — mobile viewport only (`--project=mobile`)
  - `npm run test:visual:desktop` — desktop viewport only (`--project=desktop`)
- **Baselines are never updated by an agent (hard rule).** Never run `--update-snapshots` or otherwise rewrite the PNGs under `tests/visual/__screenshots__/`. When a visual test fails, report which screens differ and stop; regenerating baselines is a manual maintainer step documented in `CONTRIBUTE.md`.
- **Server**: Playwright starts (or reuses locally) the dev server on `http://localhost:3001` via the `webServer` config — no need to launch it yourself. In CI it always starts fresh.
- **No live backend**: Auth is faked by injecting a JWT into `localStorage` before load, and every `/api/v1/**` request is intercepted with fixed, hard-coded JSON fixtures. Data must be deterministic (no faker, no time-varying fields) so screenshots are byte-stable. Animations are disabled and `document.fonts.ready` is awaited before capture.
- **Tolerance**: `toHaveScreenshot` allows `maxDiffPixelRatio: 0.02` to absorb sub-pixel font rendering while still catching real color/layout changes.
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

Canonical reference: `src/pages/users/UsersPage.tsx`

**Required structure:**
1. State: `anchorEl: HTMLElement | null` + `selectedItem` typed to the row's data model.
2. Handlers: `handleMenuOpen(event, item)` / `handleMenuClose()`.
3. Actions cell: a single `IconButton` with `MoreVertIcon`; no visible labels.
4. `<Menu>` placed outside the table (after the Paper), with `PaperProps` arrow styling matching UsersPage.
5. Destructive items (delete) go below a `<Divider>` with `color: "error.main"`.

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