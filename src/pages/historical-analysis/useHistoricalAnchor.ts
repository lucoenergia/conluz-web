import { useGetMembershipEnergyMetrics } from "../../api/memberships/memberships";
import { useGetSupplyEnergyMetrics } from "../../api/supplies/supplies";
import {
  GetMembershipEnergyMetricsPeriod,
  GetSupplyEnergyMetricsPeriod,
  type SupplyEnergyMetricsPeriodResponse,
  type SupplyResponse,
} from "../../api/models";
import { useActiveCommunity } from "../../context/community.context";
import { useLoggedUser } from "../../context/logged-user.context";
import { anchorFromPeriodStart, type CalendarMonth } from "./historicalPeriod";

export type HistoricalAnchor =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  /** Nothing published yet for this scope. */
  | { status: "none" }
  | { status: "ready"; anchor: CalendarMonth };

const LATEST_MEMBERSHIP_MONTH = { period: GetMembershipEnergyMetricsPeriod.LATEST_PUBLISHED_MONTH };
const LATEST_SUPPLY_MONTH = { period: GetSupplyEnergyMetricsPeriod.LATEST_PUBLISHED_MONTH };

/**
 * The latest published month of the selected scope, as the server resolves it
 * (UI-HIS-005, ADR-0005): every period on the page ends no later than it.
 *
 * "Todos mis puntos" asks the caller's membership in the active community; a
 * single supply asks that supply alone, never its owner's membership, which
 * may count a month another supply published. Only the query for the selected
 * scope runs. The anchor is never derived from the device clock, nor taken to
 * be "the previous month".
 *
 * Null bounds mean nothing is published yet for the scope.
 */
export function useHistoricalAnchor(selected: SupplyResponse | null): HistoricalAnchor {
  const communityId = useActiveCommunity();
  const userId = useLoggedUser()?.id;

  const membership = useGetMembershipEnergyMetrics(communityId ?? "", userId ?? "", LATEST_MEMBERSHIP_MONTH, {
    query: { enabled: selected === null && !!communityId && !!userId },
  });
  const supply = useGetSupplyEnergyMetrics(selected?.id ?? "", LATEST_SUPPLY_MONTH, {
    query: { enabled: selected !== null },
  });

  const query = selected === null ? membership : supply;
  if (query.isError) return { status: "error", retry: () => void query.refetch() };
  if (!query.isSuccess) return { status: "loading" };
  return anchorOf(query.data.period);
}

function anchorOf({ startDate }: SupplyEnergyMetricsPeriodResponse): HistoricalAnchor {
  return startDate ? { status: "ready", anchor: anchorFromPeriodStart(startDate) } : { status: "none" };
}
