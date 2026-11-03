import type { MembershipEnergyMetricsResponse, SupplyEnergyMetricsResponse } from "../../api/models";

/** The figures of one period, for the caller's membership or for one supply. */
export type PeriodEnergyMetrics = MembershipEnergyMetricsResponse | SupplyEnergyMetricsResponse;
