import type { PlantInverterPowerPointResponse, PlantInverterProductionTodayResponse } from "../../../api/models";

// Today's inverter production in the plant detail's specs (#406), typed to the
// generated models. "Today" is Thursday 12 November 2026, in Madrid (+01:00).

/** 13:42 in Madrid: where the "Ahora" mark sits. */
export const NOW = "2026-11-12T13:42:00+01:00";

/** A point every 5 minutes, from `from` to `to` (both "HH:mm" in Madrid, on 12 November), at `powerKW`. */
export function points(from: string, to: string, powerKW: number | null): PlantInverterPowerPointResponse[] {
  const at = (time: string) => Date.parse(`2026-11-12T${time}:00+01:00`);
  const result: PlantInverterPowerPointResponse[] = [];
  for (let instant = at(from); instant <= at(to); instant += 5 * 60_000) {
    const local = new Date(instant + 3_600_000).toISOString().slice(11, 16);
    result.push({ endsAt: `2026-11-12T${local}:00+01:00`, powerKW });
  }
  return result;
}

export function available(overrides: Partial<PlantInverterProductionTodayResponse> = {}): PlantInverterProductionTodayResponse {
  return {
    status: "AVAILABLE",
    todayEnergyKWh: 118.9,
    powerCurve: [...points("08:00", "10:00", 12.5), ...points("10:05", "13:40", 18.25)],
    lastUpdatedAt: "2026-11-12T13:40:00+01:00",
    stale: false,
    ...overrides,
  };
}

/** Producing, with the snapshots missing from 10:20 to 11:05: two null points, the line broken there. */
export const WITH_GAP = available({
  powerCurve: [
    ...points("08:00", "10:20", 12.5),
    { endsAt: "2026-11-12T10:50:00+01:00", powerKW: null },
    { endsAt: "2026-11-12T11:05:00+01:00", powerKW: null },
    ...points("11:10", "13:40", 18.25),
  ],
});

/** Before sunrise: snapshots arrive, all at zero. */
export const NOT_STARTED = available({
  todayEnergyKWh: 0,
  powerCurve: points("06:00", "06:20", 0),
  lastUpdatedAt: "2026-11-12T06:20:00+01:00",
});

/** The latest snapshot at 10:15, more than an hour before now. */
export const STALE = available({
  powerCurve: points("08:00", "10:15", 12.5),
  todayEnergyKWh: 31.4,
  lastUpdatedAt: "2026-11-12T10:15:00+01:00",
  stale: true,
});

export const NO_DATA_TODAY: PlantInverterProductionTodayResponse = {
  status: "NO_DATA_TODAY",
  todayEnergyKWh: null,
  powerCurve: null,
  lastUpdatedAt: null,
  stale: null,
};

export const NOT_AVAILABLE: PlantInverterProductionTodayResponse = { ...NO_DATA_TODAY, status: "NOT_AVAILABLE" };
