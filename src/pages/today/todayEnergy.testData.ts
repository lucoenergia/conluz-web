import type {
  SupplyAssignedPowerPointResponse,
  SupplyEnergyTodayResponse,
  SupplyProductionTodayResponse,
  SupplyProductionTodayResponseStatus,
} from "../../api/models";

// Today's assigned production in the "Datos de hoy" specs (#432), typed to the
// generated models: the repository has no Orval mock factories (ADR-0001), so
// these builders stand in for them. Their defaults are deliberately synthetic
// sentinels: a spec overrides every value it asserts on. "Today" is Thursday
// 12 November 2026, in Madrid (+01:00).

/** 13:42 in Madrid: where the "Ahora" mark sits. */
export const NOW = "2026-11-12T13:42:00+01:00";

/** One 5-minute slot ending at `time` ("HH:mm" in Madrid, on 12 November). */
export const slot = (time: string, powerKW: number | null): SupplyAssignedPowerPointResponse => ({
  endsAt: `2026-11-12T${time}:00+01:00`,
  powerKW,
});

/** A slot every 5 minutes, from `from` to `to` (both "HH:mm" in Madrid, on 12 November), at `powerKW`. */
export function slots(from: string, to: string, powerKW: number | null): SupplyAssignedPowerPointResponse[] {
  const at = (time: string) => Date.parse(`2026-11-12T${time}:00+01:00`);
  const result: SupplyAssignedPowerPointResponse[] = [];
  for (let instant = at(from); instant <= at(to); instant += 5 * 60_000) {
    result.push(slot(new Date(instant + 3_600_000).toISOString().slice(11, 16), powerKW));
  }
  return result;
}

/** An AVAILABLE answer with sentinel values: override every value the test asserts on. */
export function available(overrides: Partial<SupplyProductionTodayResponse> = {}): SupplyProductionTodayResponse {
  return {
    status: "AVAILABLE",
    assignedPowerCurve: slots("08:00", "08:10", 90.001),
    assignedEnergyKWh: 90.002,
    currentAssignedPowerKW: 90.003,
    currentPlantPowerKW: 90.004,
    partitionCoefficient: 0.9005,
    lastUpdatedAt: "2026-11-12T08:10:00+01:00",
    stale: false,
    ...overrides,
  };
}

/** A status with nothing to show: every other field is null, as the contract says. */
export function withoutData(status: Exclude<SupplyProductionTodayResponseStatus, "AVAILABLE">): SupplyProductionTodayResponse {
  return {
    status,
    assignedPowerCurve: null,
    assignedEnergyKWh: null,
    currentAssignedPowerKW: null,
    currentPlantPowerKW: null,
    partitionCoefficient: null,
    lastUpdatedAt: null,
    stale: null,
  };
}

export const energyToday = (production: SupplyProductionTodayResponse): SupplyEnergyTodayResponse => ({ production });
