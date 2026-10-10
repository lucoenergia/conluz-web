import type { CommunityResponse, SupplyResponse } from "../api/models";

/**
 * The community the caller last worked in, when it is still one of theirs.
 *
 * A remembered id that is no longer a membership -- revoked, or the community
 * removed -- is no choice at all, so it reads as nothing remembered.
 */
export function rememberedCommunity(membershipIds: readonly string[], persisted: string | null): string | null {
  return persisted !== null && membershipIds.includes(persisted) ? persisted : null;
}

/**
 * The community a caller enters on when nothing valid is remembered (#237).
 *
 * Where they own supply points comes first: that is the community they are
 * most likely to care about. Among the communities where they own some, the
 * alphabetically first by name; owning none, the alphabetically first of all
 * their memberships. Without names to sort by, community id stands in, so the
 * choice is still the same one every time.
 *
 * `ownSupplies` is GET /users/{me}/supplies, which spans every community the
 * caller belongs to; a supply outside their memberships is not counted.
 * `undefined` -- the read failed -- counts as owning none: it only refines a
 * preference, and a wrong guess costs one switch.
 */
export function pickFirstTimeCommunity(
  membershipIds: readonly string[],
  communities: readonly Pick<CommunityResponse, "id" | "name">[] | undefined,
  ownSupplies: readonly Pick<SupplyResponse, "community">[] | undefined,
): string {
  const owned = new Set((ownSupplies ?? []).map((supply) => supply.community?.id));
  const ownedMemberships = membershipIds.filter((id) => owned.has(id));
  const candidates = ownedMemberships.length > 0 ? ownedMemberships : membershipIds;

  const names = new Map((communities ?? []).map((community) => [community.id, community.name]));
  const sortKey = (id: string) => names.get(id) ?? id;

  return candidates
    .slice()
    .sort(
      (a, b) =>
        sortKey(a).localeCompare(sortKey(b), "es", { sensitivity: "base" }) || a.localeCompare(b),
    )[0];
}
