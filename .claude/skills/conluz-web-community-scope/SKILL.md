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

- `src/context/community.context.tsx` — active-community context/provider + the
  `X-Community-Id` axios interceptor.
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

## Data-fetching pattern (path-scoped + gated)

- Data endpoints are path-scoped: `/communities/{communityId}/{supplies,consumption,
  production,plants,config}`. The generated hooks take `communityId`.
- **Gate on presence:** no active community → do not fire the query (`enabled` guard);
  controls that submit community-scoped data disable when none is selected. Never call a
  path-scoped hook with an empty/undefined `communityId`.

## Gating recipe

- Route level: wrap with `PlatformAdminRoute` or `CommunityAdminRoute`.
- Menu/profile/actions: derive visibility from `isPlatformAdmin` **and**
  `useActiveCommunityRole`, never from a global role field (it no longer exists).

## Sharp edges

- **Legacy `X-Community-Id` header:** still injected by `community.context.tsx` and
  covered by a test, but data endpoints now carry `communityId` in the **path**. Treat
  the header as legacy/possibly-redundant — do not build new scoping on it, and verify
  before assuming any endpoint consumes it.
- **Pre-epic artifacts:** older DTOs, test fixtures (e.g. a `FIXED_USER` fixture), and
  MSW data may predate the multi-community model and omit `isPlatformAdmin`/`memberships`.
  If gating or a visual test misbehaves, suspect a stale fixture before suspecting the code.
- **No role selector:** user create/edit forms have no global role field, and rows show
  no role label; community role is assigned through membership, not a user field.

## API client is an input — do not regenerate

The updated `api-docs.json` and regenerated Orval client under `src/api/` are provided
**before** implementation. Treat `src/api/` as current; do not run `npm run
generate-client` or add it as a task step. If `src/api/` looks out of sync, stop and
report rather than regenerating.
