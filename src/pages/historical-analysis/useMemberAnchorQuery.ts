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
import { anchorFromPeriodStart, monthAnchor, type Anchor } from "../../components/period/historicalPeriod";
import type { AnchorQueryState } from "../../components/period/useHistoricalAnchor";

const LATEST_MEMBERSHIP_MONTH = { period: GetMembershipEnergyMetricsPeriod.LATEST_PUBLISHED_MONTH };
const LATEST_SUPPLY_MONTH = { period: GetSupplyEnergyMetricsPeriod.LATEST_PUBLISHED_MONTH };

/**
 * The query for the latest published month of the selected scope (UI-HIS-005,
 * ADR-0005), the anchor of "Mi consumo y ahorro".
 *
 * "Todos mis puntos" asks the caller's membership in the active community; a
 * single supply asks that supply alone, never its owner's membership, which
 * may count a month another supply published. Only the query for the selected
 * scope runs.
 *
 * "Todos mis puntos" exists only for a caller who owns supplies here
 * (`allMine`): for one who owns none, the membership is never asked, and the
 * anchor stays loading until a supply is selected (#385).
 */
export function useMemberAnchorQuery(
  selected: SupplyResponse | null,
  { allMine }: { allMine: boolean },
): AnchorQueryState<{ period: SupplyEnergyMetricsPeriodResponse }> {
  const communityId = useActiveCommunity();
  const userId = useLoggedUser()?.id;

  const membership = useGetMembershipEnergyMetrics(communityId ?? "", userId ?? "", LATEST_MEMBERSHIP_MONTH, {
    query: { enabled: selected === null && allMine && !!communityId && !!userId },
  });
  const supply = useGetSupplyEnergyMetrics(selected?.id ?? "", LATEST_SUPPLY_MONTH, {
    query: { enabled: selected !== null },
  });

  return selected === null ? membership : supply;
}

/** The month the latest published period starts in, read in the app's time zone. Null bounds mean nothing is published yet. */
export function readMonthAnchor({ period }: { period: SupplyEnergyMetricsPeriodResponse }): Anchor | null {
  return period.startDate ? monthAnchor(anchorFromPeriodStart(period.startDate)) : null;
}
