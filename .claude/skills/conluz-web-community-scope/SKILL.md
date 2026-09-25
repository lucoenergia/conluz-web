---
name: conluz-web-community-scope
description: >-
  Multi-community authorization and data-scoping model for conluz-web (React 19, MUI,
  TanStack Query, Orval client). ALWAYS use this whenever the work touches
  community-scoped data fetching, role-based UI gating, route protection, menus that
  differ by role, the active-community selector/context, or anything reading
  consumption/production/supplies/plants. Apply it even if the request only says
  "show the user's data" or "gate this page" without mentioning communities.
---

# conluz-web — Community scope & authorization

The app is multi-community. This model supersedes any older single-community
assumptions still lingering in fixtures, comments, or your own priors.

## Read the real code first

- `src/context/community.context.tsx` — active-community context/provider.
- `src/hooks/useActiveCommunityRole.ts` — derives the role in the active community.
- `src/components/Auth/PlatformAdminRoute.tsx`, `CommunityAdminRoute.tsx` — route guards.
- `src/components/CommunitySelector/`, `CommunityStatusChip/`.
- The generated hooks under `src/api/` (path-scoped by `communityId`).

## Two independent authorization axes

There is **no global user `role`**. Authorization is two separate dimensions:

1. `isPlatformAdmin: boolean` — platform privilege (manage users/communities, assign
   community admins).
2. Role **within the active community** — `COMMUNITY_ADMIN` / `COMMUNITY_MEMBER`,
   read via `useActiveCommunityRole` from the `memberships` map.

**Golden rule (mirror of the backend):** `isPlatformAdmin` never grants access to a
community's operational data. A platform admin does not see members' consumption/
production by virtue of the flag; they must go through community membership.

## Active community context

`community.context.tsx` selects and persists the active community: auto-selects when the
user has exactly one membership; restores the persisted choice when there are several.
`CommunitySelector` switches it. Most data views are meaningless without an active
community.

## Endpoints come in four scopes, not one

Path-scoping is only half the model. Getting this wrong is what produced the
community-switch bug, so classify an endpoint **before** using it:

1. **Community-path-scoped** — `/communities/{communityId}/{supplies,consumption,
   production,plants,config}`. The generated hook takes `communityId`, so it lands in the
   query key and **re-keys by itself** when the community changes. Nothing else to do.
   - **Gate on presence:** no active community → do not fire the query (`enabled` guard);
     controls that submit community-scoped data disable when none is selected. Never call
     a path-scoped hook with an empty/undefined `communityId`.
2. **Community-scoped by QUERY parameter** — `/supplies/import`, `/users/import`. The
   dangerous one: `communityId` is *optional* in the schema, so omitting it compiles,
   type-checks, and silently lets the backend choose the target community. Always pass it.
3. **Entity-scoped** — `/plants/{plantId}/…`, `/supplies/{supplyId}/…`, and every
   sharing-agreement endpoint. The community is **implicit**. Two consequences:
   - The backend authorises on *membership*, not on the active community, so these answer
     for any community the user belongs to. Not a leak — but not scoped either.
   - The id normally comes from `useParams()`, so the query key **cannot change** when the
     community does. `invalidateQueries()` merely refetches the same foreign entity.
4. **User-scoped / global** — `/users/{userId}/…`, `/users/current`, auth, prices, `/init`.
   Genuinely community-agnostic.

`src/contracts/endpointScope.spec.ts` classifies every path in `api-docs.json` and fails on
one it cannot place, so a newly generated endpoint forces this decision.

## Reacting to a community switch

- **`AuthenticatedLayout` keys the `<Outlet>` on the active community.** A switch remounts
  the routed page, clearing any state it had seeded from the previous community. This is why
  you do **not** need a per-page reset effect: write the page normally. Only the routed page
  remounts — the header, side menu and error/success providers sit outside the Outlet.
- **`useCommunitySwitchRedirect`** decides *during render* whether to leave the current
  route, and the layout renders `<Navigate>` **instead of** the Outlet. An effect-based
  redirect would mount the foreign page for one frame and fire its queries.
  `resolveCommunityScopedTarget` (`src/utils/routes.ts`) names the routes that cannot
  survive a switch.
- The provider's `null -> id` step on first load is **not** a switch. Deep links and
  bookmarks must survive it — which is exactly why entity pages still need a guard of their
  own.

## Guarding entity-scoped reads

Entity-scoped read hooks are restricted by `no-restricted-imports` in `eslint.config.js`.
Reach them through a wrapper that applies the guard:

- `usePlantInActiveCommunity` (`src/pages/production/`) — compares `plant.community.id`
  with the active community via `isPlantOutsideActiveCommunity`, and reports a foreign
  plant as `isNotFound` so pages reuse the existing "Planta no encontrada" empty state.
- `useSharingAgreementsData` / `useSharingAgreementDetailData` — same guard, folded into
  their existing `isNotFound`.
- `useSupplyInActiveCommunity` (`src/pages/supply-points/`) — **applies no guard yet**:
  `SupplyResponse` carries no community reference, so there is nothing to compare. It exists
  so that when the backend adds one, the fix lands in a single place.
- `selectPeriodsInCommunity` (`src/pages/production/coefficientHistory.ts`) — the other
  valid shape: filter an entity-keyed *response* by community at render time.

**Unresolved is never "foreign".** A plant still loading, or a community not yet restored
from storage, must not count as a mismatch — that would flash "not found" on every load.
Only two ids both present and different count.

Mutations are not restricted: they take an explicit id from a screen the keyed Outlet
already resets.

## Gating recipe

- Route level: wrap with `PlatformAdminRoute` or `CommunityAdminRoute`.
- Menu/profile/actions: derive visibility from `isPlatformAdmin` **and**
  `useActiveCommunityRole`, never from a global role field (it no longer exists).

## Sharp edges

- **Legacy `X-Community-Id` header removed:** the axios interceptor that injected this
  header was removed from `community.context.tsx`. Community-scoped data endpoints carry
  `communityId` in the **path**; entity-scoped ones carry no community at all (see above).
- **`invalidateQueries()` cannot re-scope anything.** `CommunitySelector` calls it on every
  switch, and it is correct for community-path-scoped queries. It does nothing for an
  entity-scoped one (same key, same foreign entity back) and nothing at all for data already
  copied into `useState`. The keyed Outlet is what handles both.
- **`CommunityProvider` sits outside `QueryClientProvider` and `BrowserRouter`** in
  `main.tsx`, so it can neither navigate nor touch the cache. Anything reacting to a switch
  must live inside the router.
- **Pre-epic artifacts:** older DTOs and hand-written test fixtures may predate the
  multi-community model and omit `isPlatformAdmin`/`memberships`. Fixtures built with
  `src/test/fixtures.ts` (`buildUser` and friends) always carry both, at least privilege by
  default. The ones that can still be stale are partial objects cast to a response type
  (`as UserResponse`, `as unknown as …`) in specs outside the test-harness migration, and the
  Playwright fixtures in `tests/visual/baseline.spec.ts`. If gating or a visual test misbehaves,
  suspect a stale fixture before suspecting the code.
- **No role selector:** user create/edit forms have no global role field, and rows show
  no role label; community role is assigned through membership, not a user field.

## API client is an input — do not regenerate

The updated `api-docs.json` and regenerated Orval client under `src/api/` are provided
**before** implementation. Treat `src/api/` as current; do not run `npm run
generate-client` or add it as a task step. If `src/api/` looks out of sync, stop and
report rather than regenerating.
