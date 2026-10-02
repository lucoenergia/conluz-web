# ADR-0004 — Make the signed-in user a live query, and end the session on its 401

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Víctor Cañizares
- **Applies to:** `conluz-web` — `LoggedUserContext`, `AuthenticatedLayout`, the permissions module

## Context

`LoggedUserProvider` held the signed-in user in `useState`. `AuthenticatedLayout` fetched
`GET /users/current` with `enabled: loggedUser === null` and copied the response in through an
effect. Once that landed, the query was disabled and the context never changed again;
`main.tsx` set `refetchOnWindowFocus: false` for every query. So `platformCapabilities` and the
caller's own `capabilities` were resolved once and held for the session.

That was harmless while `isPlatformAdmin` was a badge next to the user's name. It stopped being
harmless when the capability epic made platform capabilities decide what the router allows
(`CapabilityRoute`), what the side menu offers (`MENU_SECTIONS` + `selectVisibleSections`) and where
a caller lands after signing in (`resolveLandingRoute`). A platform admin whose flag was revoked kept
being offered the administration surface until they reloaded, with every call behind it answering
403. The backend was never wrong; the UI was.

Three facts about the old code were easy to misread, and all three shaped this decision:

- **The invalidations already in the tree did nothing — except by accident.**
  `invalidateQueries` defaults to `refetchType: "active"`, and a query whose every observer has
  `enabled: false` is not active, so invalidating the current-user key refetched nothing. But
  `Profile.tsx` calls `useGetCurrentUser()` with no options, so on `/profile` the key *did* have an
  active observer: the profile save's invalidation refetched, the layout's disabled observer received
  the cache update, and the effect copied it into the context. The user was not frozen for the whole
  session — it refreshed whenever somebody visited their profile. That accident is also what proved
  the copy-into-context path worked, leaving only the gate to fix.
- **The old gate did not keep the query off an unauthenticated page.**
  `enabled: loggedUser === null` is true precisely when there is no session, and `ProtectedRoute`
  renders *inside* the layout, below the hook — so a logged-out visit to a protected URL already
  fired the request, and only escaped a 401 because the redirect unmounted the observer first.
- **No in-app action can change the caller's own platform flag.**
  `RevokePlatformAdminController` is annotated
  `@PreAuthorize("hasRole('PLATFORM_ADMIN') and !@communityAccessGuard.isCurrentUser(#userId)")`, and
  `api-docs.json` documents `UserCapabilitiesResponse.canRevokePlatformAdmin` as "Always false when
  the user is the caller". `conluz-web#203` proposed, as its first task, invalidating the current
  user after grant and revoke. That task was already implemented — and could never have had an
  effect, because the change is always aimed at somebody else.

## Decision

### 1. The provider serves the query; the snapshot goes

`LoggedUserProvider` calls `useGetCurrentUser` and provides `data ?? null`. `useLoggedUser` keeps
returning `CurrentUserResponse | null`, so its eight reading consumers are untouched;
`useLoggedUserDispatch` is deleted, because nothing needs to write a value that comes from the cache
(`useLogout` empties it with `queryClient.clear()`, which it already called).

The value is never a copy and never gated on `isFetching`. React Query keeps the last successful
response across a refetch, and structural sharing returns the identical object when the payload has
not changed — so an unchanged refetch re-renders nothing, and a changed one never passes through
`null` on the way. Gating on `isFetching` would flash the app into its logged-out shape: the layout's
spinner, an empty menu, and every route guard through its pending branch.

This requires `QueryClientProvider` to move above `LoggedUserProvider` and `CommunityProvider` in
`main.tsx`, since the first is now a query and the second reads it. Both still sit above
`BrowserRouter`, so neither can navigate.

### 2. The token is the gate

`enabled: !!token`, read from `useAuth()`. Stricter than what it replaces, and it states the rule the
old gate only approximated: no session, no request.

### 3. Thirty seconds, plus a refetch on reconnect and on window focus

The only query in the app that opts back into `refetchOnWindowFocus`; the global default stays
`false` for the heavy consumption and production queries. A short `staleTime` alone closes nothing —
nothing refetches a stale query until something triggers it, and with one long-lived observer there
is no trigger while a tab sits open.

Focus is the right trigger because of decision context above: the caller's flag can only be changed
by another administrator in another session, so the moment a stale answer misleads somebody is when
they come back to the tab. Reconnect alone never fires on a stable connection. The reasoning is
written at the call site, because the next reader will otherwise "fix" the deviation for
consistency.

### 4. A 401 on this query ends the session; it does not reach a boundary

The global `throwOnError` on 401 hands an expired token to the nearest error boundary, which is
`AuthErrorBoundry` inside `AuthenticatedLayout`. This provider sits above every boundary, so that
route is not available to it: the throw would take down the tree. It therefore sets
`throwOnError: false` and ends the session itself through `useEndSession`, which clears the auth
state and then the cache — in that order, because `clear()` destroys the query while the observer is
still mounted and a fresh one would refetch if `enabled` were still true.

Only 401. A 500 or an offline browser is an unanswered question, not an expiry; logging somebody out
over a backend blip would be worse than showing them a stale menu.

**Parts 3 and 4 only work together.** Before this change a mid-session expiry could not surface
through the current user at all, because it never refetched. Adding the focus refetch without the
401 handling would ship a new way to white-screen the app; adding the handling without the refetch
would be dead code.

### 5. The reason survives the redirect

`useEndSession` takes `"expired"` or `"logout"`. The provider cannot navigate, so `ProtectedRoute`
does it, and the reason has to outlive that redirect to be shown: `"expired"` sets a one-shot
`sessionStorage` flag that `Login` reads and clears, rendering the same literal the boundary uses
(`SESSION_EXPIRED_MESSAGE`). A deliberate logout passes `"logout"` and claims nothing.

### 6. Invalidation moves to where a change is actually reachable

Removed from `useUserActions`: a platform-admin change cannot be aimed at the caller, so the key it
invalidated carried nothing that could have changed. Added to `useMembershipActions`: the membership
endpoints gate only on `canManageMemberships(communityId)` and have no self rail, so a community
admin may re-role or remove **their own** membership — and `memberships` lives on the current user,
which is what `CommunitySelector` offers, what the role label reads and what `CommunityProvider`
resolves the active community from.

## What a stale answer now means

Before, "the menu is wrong" could only be fixed by reloading, and an operator reading a 403 behind a
visible menu entry was seeing the expected behaviour of a frozen cache. Now the bound is explicit: a
platform-admin change made by another administrator is reflected the next time the affected user's
tab regains focus, their browser reconnects, or any screen invalidates the key. A menu entry that
survives beyond that is a defect, not the design.

`pending` also changes meaning. It used to occur only before the first response, under the layout's
spinner, where no guard could observe it. It is now reachable mid-session — a refetch that fails
leaves the context on its last value, and a cleared cache leaves it null — so the four-state contract
in `capabilityOutcome.ts` is load-bearing rather than defensive.

## Alternatives considered

**Keep the context's `useState` and only fix the gate.** The smallest change: leave the layout
copying `data` in, but enable the query on the token instead of on the value being absent.
Invalidation would then refetch and the copy would follow. Rejected because the copy is a second
source of truth that is one render behind the cache, and because it keeps `useLoggedUserDispatch`
alive as a way to set a user that nothing fetched. The issue asked for the cache to be the source;
half-doing it leaves the next author unsure which it is.

**`staleTime` and reconnect only, as `conluz-web#203` literally proposed.** Tempting because it is
the issue's own wording and the smallest tuning. Rejected because it does not close the case it was
written for: with one long-lived observer and no focus refetch, a revoked admin sitting on a page
re-checks nothing until they navigate to `/profile` or their connection drops. It would have been
recorded as "cross-session case not closed", which is a worse outcome than one small query per tab
activation.

**Poll on an interval.** `refetchInterval: 60_000` gives a bound that does not depend on user
action. Rejected: it pays constant traffic in every open tab for an administrative event that
happens rarely, and it adds a request that can land during a Playwright capture, where the suite
settles on `networkidle`.

**Leave the global `throwOnError` and report the white screen as a separate issue.** Rejected
because this change is what makes that path reachable: a token expiring mid-session now refetches
and 401s from a provider above every boundary. Shipping the first reachable instance of a defect in
the same change that opens the way to it is not a smaller diff, it is a worse one.

**Seed the current user through the test harness** (`renderWithProviders({ currentUser })`, writing
the cache). Rejected: a `setQueryData` seed is only fresh while the provider's `staleTime` says so,
hook options beat `setQueryDefaults`, and `invalidateQueries` marks a query stale regardless — so a
later tuning change would send every seeding spec to the network at once. Specs mock
`useGetCurrentUser` instead (ADR-0001, tier 1), which cannot reach the network and names the state
it is testing.

## Consequences

**Positive**

- A platform-admin change made by another administrator reaches the menu and the route guards within
  the staleness window, with no reload.
- Invalidating `getGetCurrentUserQueryKey()` means what it says, for every screen that changes the
  caller's own record. The membership self-change case is fixed by it.
- A mid-session token expiry ends the session with an explanation instead of a white screen.
- `DynamicLayout` works as intended for the first time: `/contact` has always rendered the public
  chrome, because nothing fetched the user outside `AuthenticatedLayout`. A signed-in caller now
  gets the authenticated chrome there.
- One fewer source of truth: no `useState` copy, no dispatch, and `ProfileMenu`'s `queryClient.clear()`
  on logout is now the whole of "forget the user".

**Negative**

- Every window focus costs one `GET /users/current` per tab once the data is 30 s old. Small, but no
  longer zero.
- The provider re-renders the whole tree below it when the payload changes. Structural sharing keeps
  an unchanged refetch free, which is why the context must keep serving `data` directly: anybody who
  introduces a copy, a `useMemo` over it, or a `select` reintroduces the cost and may reintroduce the
  freeze.
- **`CommunityProvider`'s auto-select effect can now run more than once per session.** Memberships
  change under it, and the branch that moves the active community is reachable mid-session for the
  first time. Its dependency is a *sorted* key for that reason — `Object.keys` follows the JSON, and
  a re-ordered identical map would otherwise move somebody out from under themselves.
- **Any new screen that changes the caller's own record must invalidate this key.** It is not
  automatic, and the symptom of forgetting is a stale menu rather than an error.
- `Profile.tsx` still holds a second observer of the same key with the default `staleTime: 0`, so
  `/profile` refetches the current user on every visit and keeps a third copy of the fields in
  `useState`. Harmless, and left alone deliberately, but it is the same shape this ADR removes
  elsewhere.

## Revisit if

- The backend gains a push channel (the SSE epic, `conluz-web#97`). A server-pushed capability change
  would make both the staleness window and the focus refetch unnecessary.
- A self rail appears on the membership endpoints. The in-app case this change fixes would disappear,
  and `useMembershipActions`' third invalidation — plus
  `MembershipSelfRemovalInvalidation.spec.tsx` — would be the thing to re-examine.
- The self rail on the platform flag is lifted. Then `useUserActions` needs its invalidation back,
  and the spec that asserts its absence is where to start.
- Focus refetching shows up as load. The next step is a longer `staleTime`, not removing the trigger:
  the trigger is what closes the case, the interval is only how fresh the answer has to be.

## References

- `src/context/logged-user.context.tsx`, `src/hooks/useEndSession.ts`, `src/utils/session.ts`,
  `src/queryClient.ts`
- `src/layouts/authenticated.layout.tsx` (the landing redirect, now once per user)
- `src/hooks/actions/useMembershipActions.ts`, `src/hooks/actions/useUserActions.ts`
- `src/context/loggedUserLiveness.spec.tsx`, `src/context/logged-user.context.session.spec.tsx`,
  `src/pages/members/MembershipSelfRemovalInvalidation.spec.tsx`,
  `src/layouts/authenticated.layout.landing.spec.tsx`
- `lucoenergia/conluz-web#203`; epic `lucoenergia/conluz#292`
