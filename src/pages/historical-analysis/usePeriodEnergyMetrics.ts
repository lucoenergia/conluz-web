import { useGetMembershipEnergyMetrics } from "../../api/memberships/memberships";
import { useGetSupplyEnergyMetrics } from "../../api/supplies/supplies";
import type { MembershipEnergyMetricsResponse, SupplyEnergyMetricsResponse, SupplyResponse } from "../../api/models";
import { useActiveCommunity } from "../../context/community.context";
import { useLoggedUser } from "../../context/logged-user.context";
import { useHistoricalPeriod } from "./HistoricalPeriodContext";

export type PeriodEnergyMetrics = MembershipEnergyMetricsResponse | SupplyEnergyMetricsResponse;

export type PeriodEnergyMetricsState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; metrics: PeriodEnergyMetrics };

/**
 * The energy metrics of the selected period and scope (#249): every figure on
 * the period card and the totals comes from this one response.
 *
 * Asked by the period's explicit bounds, never by the anchor month: the bounds
 * are the period the page shows. "Todos mis puntos" asks the caller's
 * membership in the active community; a single supply asks that supply alone.
 * Only the query for the selected scope runs, and neither runs while the
 * period is unknown.
 */
export function usePeriodEnergyMetrics(selected: SupplyResponse | null): PeriodEnergyMetricsState {
  const period = useHistoricalPeriod();
  const communityId = useActiveCommunity();
  const userId = useLoggedUser()?.id;
  const bounds = period ? { startDate: period.startDate, endDate: period.endDate } : {};

  const membership = useGetMembershipEnergyMetrics(communityId ?? "", userId ?? "", bounds, {
    query: { enabled: !!period && selected === null && !!communityId && !!userId },
  });
  const supply = useGetSupplyEnergyMetrics(selected?.id ?? "", bounds, {
    query: { enabled: !!period && selected !== null },
  });

  const query = selected === null ? membership : supply;
  if (query.isError) return { status: "error", retry: () => void query.refetch() };
  if (!query.isSuccess) return { status: "loading" };
  return { status: "ready", metrics: query.data };
}
