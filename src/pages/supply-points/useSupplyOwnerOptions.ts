import { useMemo } from "react";
import type { MembershipResponse } from "../../api/models";
import { useGetMemberships } from "../../api/memberships/memberships";
import type { SupplyOwnerField } from "../../components/SupplyForm/supplyFields";
import { useActiveCommunity } from "../../context/community.context";
import { useActiveCommunityCapabilities } from "../../hooks/permissions";

/**
 * The owner options by the member record's name, as a Spanish reader sorts it
 * (case and accents aside), ties by membership id: getMemberships has no order
 * of its own (UI-SUP-016).
 */
function byFullName(a: MembershipResponse, b: MembershipResponse): number {
  return a.fullName.localeCompare(b.fullName, "es", { sensitivity: "base" }) || a.id.localeCompare(b.id);
}

/**
 * The owner input of a supply being created. The owner must be a member of the
 * supply's community, in any state (SUP-002), so the options are exactly its
 * memberships (UI-SUP-016).
 */
export function useSupplyOwnerOptions(): SupplyOwnerField {
  const activeCommunityId = useActiveCommunity();
  const canListMembers = useActiveCommunityCapabilities("canManageMemberships");
  const memberships = useGetMemberships(activeCommunityId ?? "", {
    query: { enabled: !!activeCommunityId && canListMembers.state === "allowed" },
  });
  const options = useMemo(() => (memberships.data ?? []).slice().sort(byFullName), [memberships.data]);
  return {
    mode: "choose",
    options,
    status:
      canListMembers.state === "pending" || (canListMembers.state === "allowed" && memberships.isLoading)
        ? "loading"
        : canListMembers.state !== "allowed" || memberships.isError
          ? "error"
          : "ready",
  };
}
