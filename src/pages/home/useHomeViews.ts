import { useGetSuppliesByUserId } from "../../api/users/users";
import { useActiveCommunity } from "../../context/community.context";
import { useLoggedUser } from "../../context/logged-user.context";
import { DENIED, PENDING, useActiveCommunityCapabilities, type CapabilityOutcome } from "../../hooks/permissions";
import type { SupplyResponse } from "../../api/models";
import { isSupplyOutsideActiveCommunity } from "../supply-points/supplyCommunityScope";

export type HomeView = "member" | "management";

export type HomeViews = Record<HomeView, CapabilityOutcome>;

const ALLOWED: CapabilityOutcome = { state: "allowed" };

/**
 * Which of the two home views the caller has in the active community (#197).
 *
 * The management view is the community admin's, and is exactly `canManage`:
 * nothing else decides it, so no other read can take it away.
 *
 * The member view is everybody else's, and an admin's too when they own
 * supplies in this community. Ownership is not a capability -- it is a fact
 * about the caller's data -- so it is read from GET /users/{me}/supplies,
 * which answers with the caller's own supplies in every community they belong
 * to, and narrowed to the active one here. It is only asked of an admin: for
 * anyone else the answer would change nothing.
 *
 * A failed ownership read is "unknown", not "owns none". The read exists only
 * to decide whether to offer the member view, so failing it offers the view
 * rather than hiding an admin's own data behind a transient error. An admin
 * who turns out to own nothing reaches a member view that says so, which is a
 * legitimate empty screen, not an action bound to fail.
 */
export function useHomeViews(): HomeViews {
  const management = useActiveCommunityCapabilities("canManage");
  const activeCommunityId = useActiveCommunity();
  const userId = useLoggedUser()?.id;

  const ownSupplies = useGetSuppliesByUserId(userId ?? "", {
    query: { enabled: management.state === "allowed" && !!userId && !!activeCommunityId },
  });

  return { management, member: memberView(management, ownSupplies, activeCommunityId) };
}

function memberView(
  management: CapabilityOutcome,
  ownSupplies: { data: SupplyResponse[] | undefined; error: unknown },
  activeCommunityId: string | null,
): CapabilityOutcome {
  if (management.state === "denied") return ALLOWED;
  if (management.state !== "allowed") return management;
  if (ownSupplies.error) return ALLOWED;
  if (ownSupplies.data === undefined) return PENDING;
  // GET /users/{userId}/supplies spans every community the caller belongs to.
  const ownsSuppliesHere = ownSupplies.data.some(
    (supply) => !isSupplyOutsideActiveCommunity(supply, activeCommunityId),
  );
  return ownsSuppliesHere ? ALLOWED : DENIED;
}
