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
- `src/hooks/permissions/` — capability hooks, and the only place a role is read.
- `src/components/Auth/CapabilityRoute.tsx` — the route guard.
- `src/contracts/` — the four contracts that hold all of this: `endpointScope`, `mutationHooks`,
  `routeAccess`, `userScopedReads`. Read these before changing a route, an action or a user-scoped
  read; they are what will fail.
- `src/components/CommunitySelector/`, `CommunityStatusChip/`.
- The generated hooks under `src/api/` (path-scoped by `communityId`).

## Two independent authorization axes

There is **no global user `role`**. Authorization is two separate dimensions:

1. `isPlatformAdmin: boolean` — platform privilege (manage users/communities, assign
   community admins).
2. Role **within the active community** — `COMMUNITY_ADMIN` / `COMMUNITY_MEMBER`,
   held in the `memberships` map.

Both are the *shape* of authorization, not how you read it: the backend answers
what the caller may do, per resource, and the app asks it rather than deriving
from either axis. See the gating recipe below.

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
- `useSupplyInActiveCommunity` (`src/pages/supply-points/`) — same guard, via
  `isSupplyOutsideActiveCommunity` (`src/pages/supply-points/supplyCommunityScope.ts`).
  `SupplyResponse.community` is a required reference, so there is something to compare.
- `selectPeriodsInCommunity` (`src/pages/production/coefficientHistory.ts`) — the other
  valid shape: filter an entity-keyed *response* by community at render time.

**Unresolved is never "foreign".** A plant still loading, or a community not yet restored
from storage, must not count as a mismatch — that would flash "not found" on every load.
Only two ids both present and different count.

Mutations are not restricted: they take an explicit id from a screen the keyed Outlet
already resets.

## Gating recipe — capabilities, not roles

Every response carries a `capabilities` object, and `GET /users/current` carries
`platformCapabilities`. The app reads those and never re-derives a rule locally.

- **`src/hooks/permissions/` is the only module allowed to read a role or the
  platform-admin flag.** `no-restricted-imports` and `no-restricted-syntax` in
  `eslint.config.js` enforce it, so reaching for `useActiveCommunityRole` or
  `useIsPlatformAdmin` elsewhere fails the build.
- **Route level:** one guard, `CapabilityRoute`, given the capability the page
  needs. Six scopes: `platform`; `community`, meaning the **active** one; and
  four read from a route parameter — `plant`, `supply`, `user` (`:userId`) and
  `communityById` (`:communityId`). The capability name is a key of the generated
  type for its scope, so a typo — or a real capability borrowed from the wrong
  resource — does not compile.
- **`communityById` is not `community`.** The active community is the one the
  caller is working in; a community they are merely administering is another
  resource, and a platform admin has no membership of it at all. Editing one
  gates on its own `canUpdate`, a platform-wide decision that being its admin
  does not confer. Asking the active community would answer about the wrong
  resource, or about none.
- **Menu:** entries in `MENU_SECTIONS` carry the same requirement as the route
  they lead to, which is what stops the menu offering pages the router refuses.
  `MenuRequirement` excludes every parameter-keyed scope: a menu entry is a fixed
  destination, so it has no `:userId` or `:communityId` to resolve.
- **Anything else:** `useActiveCommunityCapabilities`, `usePlatformCapabilities`,
  `usePlantCapabilities`, `useSupplyCapabilities`, `useUserCapabilities`,
  `useCommunityCapabilities`, and `<Can>` for conditional rendering. A screen
  that already holds the resource does not need any of them:
  `outcomeFromResource(row.capabilities, "canX")` reads the answer the payload
  came with, and an action hook's `forX(row)` does it for you.
- **An answer has four states, not two.** `pending` waits, `allowed` renders,
  `denied` redirects, and `error` means the check itself failed — that one shows
  a retry. Never fold `error` into `denied`: a network blip would tell somebody
  they lack access they actually have. A 403 or 404 *is* a denial, because the
  API hides what the caller may not see.
- **Displaying a role is still fine.** `user.isPlatformAdmin` as data, and
  `useActiveCommunityRoleLabel()` for the role's name, are the sanctioned reads.
- **There are no exemptions.** Nothing under `src/` reads a role or the
  platform-admin flag to decide what to render, and nothing carries an
  `eslint-disable` for the permission rules. If you want one, the capability you
  need either exists on the payload or is missing from the backend — ask for it
  rather than approximating it with a role.
- **Do not restate a payload answer as a prop.** A boolean threaded down from a
  screen is a second source of truth for something each row already carries, and
  it cannot express a list that spans several resources. The coefficient history
  had exactly that: one `showAgreementLinks` for a timeline spanning several
  plants, where the caller may administer one and not another. Each period now
  reads its own `capabilities.canReadSharingAgreement`.
- **Writes go through `src/hooks/actions/`, never a generated mutation hook.**
  An action hook hands back only what this caller may do: a denied action is
  `undefined`, and its `isPending` lives inside it, so there is no way to render
  a control — or a spinner — for one you were not given. Resource-scoped hooks
  expose `forX(resource)` rather than taking the resource, because a hook cannot
  run once per table row. Each also returns a `CapabilityOutcome` per action for
  the cases where `pending` must look different from `denied`. Reads are
  unrestricted; `getGet…QueryKey()` getters too. `no-restricted-imports`
  enforces it over every generated mutation hook, and
  `src/contracts/mutationHooks.spec.ts` fails if a new mutation arrives with
  nobody having decided who may perform it. No screen is exempt: the spec
  asserts over the whole tree that nothing outside the actions layer, the
  generated client and the specs imports one. Test helpers that name a hook they never
  call are recorded by file and hook in `TEST_HELPER_MUTATION_IMPORTS`.

## Gating a list

Every row carries its own answer, so a list may legitimately mix them. Four rules,
all of them learned by getting one wrong:

1. **Ask per row, from the row.** `forX(row).actions` and
   `outcomeFromResource(row.capabilities, …)` need no request. Destructure the
   actions so TypeScript narrows them, and hand the card or menu what it was
   given rather than a boolean you re-derived.
2. **No permitted action, no menu.** `ListTable`'s `hasRowActions` predicate
   drops that row's kebab — the button is a promise of something to do. The
   narrow-viewport `RecordList` takes a node, not a predicate, so apply the same
   answer by hand there or one layout becomes a way round the gate.
3. **Store the row's id, not the row.** A write invalidates the list, so a stored
   object answers from before the change. Resolve it from the list on every
   render, and mount each confirmation dialog inside the same gate as the item
   that opens it (`open={flag && !!action}`) so it cannot be left open across a
   write that revokes it.
4. **Never offer a choice the backend will refuse.** Filter a picker on the
   capability of the thing being picked — `ManageAdminsDialog` leaves out a
   member whose membership refuses a role change, and drops the whole section
   when that empties it.

**Status is not a capability.** `enabled` and a lifecycle `status` are data the
backend has already folded into its answer; gating on them instead reproduces a
rule rather than reading it. Where both genuinely apply, say so — a sharing
agreement card needs `isDraft && canDelete`. A spec whose fixtures let status and
capability agree everywhere cannot tell the two apart, and will pass against the
pre-capability code.

## A capability gates the call, not the rows

`canListSupplies` predicts whether `GET /users/{userId}/supplies` is **allowed**. It says nothing
about **what comes back**. Those are different questions, and conflating them produced two backend
bugs (`lucoenergia/conluz#326`, `#336`) where the guard admitted a caller on one rule and the query
picked rows by another.

The endpoints are scoped now: a listing returns only what the caller may read one by one. But "may
read" is **plural** — somebody administering two communities may read both — while the selector
names one. So a client reading a user-scoped listing still narrows it:

```tsx
// GET /users/{userId}/supplies answers for every community the caller administers.
const inCommunity = useMemo(
  () => userSupplies.filter((s) => !isSupplyOutsideActiveCommunity(s, activeCommunityId)),
  [userSupplies, activeCommunityId],
);
```

Gate the query on the active community too. The helper treats an unresolved community as "don't
know", which is right for a single resource and wrong for a list, where it would pass everything
through.

`src/contracts/userScopedReads.spec.ts` derives the user-scoped listings from `api-docs.json` and
requires every call site to declare the filter it applies, freezing the file/hook/filter triple. A
new call site fails until it declares one.

Community-scoped listings need none of this: their `communityId` is in the path, so they re-key
themselves when the selection changes.

## Routes are a contract

`src/contracts/routeAccess.spec.ts` parses `src/App.tsx` and requires every authenticated path to be
classified in `ROUTE_ACCESS` — either the capability its `CapabilityRoute` requires, or
`authenticated` with the reason any signed-in caller may see it. It also requires each
`MENU_SECTIONS` entry to name the same requirement as the page it leads to.

So adding a route is two edits, in this order: wrap it, then classify it. The suite failing in
between is the design working, not an obstacle.

Two things worth knowing before you touch it:

- **`/` is deliberately unguarded.** `CapabilityRoute` sends a denied caller there, so guarding it
  would redirect to itself.
- **A guard on a parent route counts.** The spec looks for the nearest enclosing `CapabilityRoute`,
  so moving one up does not silently un-guard its children — and does not make the spec demand a
  second guard on each of them.

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
  (`as UserResponse`, `as unknown as …`) in specs outside the test-harness migration. The
  Playwright fixtures are no longer among them: `tsconfig.tests.json` puts `tests/` in
  `tsc -b` and the response fixtures are annotated, so a missing field is a build error
  rather than a `false` that silently hides a control. If gating misbehaves, suspect a
  stale fixture before suspecting the code.
- **No role selector:** user create/edit forms have no global role field, and rows show
  no role label; community role is assigned through membership, not a user field.
- **A green visual suite is not an authorization guarantee.** The Playwright route mocks refuse what
  the served capabilities refuse, and `tests/visual/fixtures/test.ts` fails a test on any unexpected
  403/404 — so a green run shows the UI is consistent with the capabilities it is **served**. It
  does not show the backend enforces them. The backend's own policy-equivalence and
  endpoint-coverage tests are what prove that. Do not cite one for the other.
- **Another user's `memberships` is filtered to the caller.** Since `lucoenergia/conluz#336`,
  `GET /users` and `GET /users/{userId}` return only the memberships in communities the caller
  administers. The caller's own, from `GET /users/current`, are still complete — which is why the
  active-community context can rely on them. Do not read another user's `memberships` as their
  complete set.

## API client is an input — do not regenerate

The updated `api-docs.json` and regenerated Orval client under `src/api/` are provided
**before** implementation. Treat `src/api/` as current; do not run `npm run
generate-client` or add it as a task step. If `src/api/` looks out of sync, stop and
report rather than regenerating.
