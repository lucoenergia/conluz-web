import { describe, expect, it } from "vitest";
import { conduitThickness, todayView, type AvailableView } from "./todayState";
import { available, slot, slots, withoutData } from "./todayEnergy.testData";

const asAvailable = (view: ReturnType<typeof todayView>): AvailableView => {
  if (view.kind !== "available") throw new Error(`expected an available view, got ${view.kind}`);
  return view;
};

const NOTE = "Datos del inversor de la planta. Pueden diferir un poco de los que publica la distribuidora.";

describe("conduitThickness", () => {
  it("UI-TDY-006 is the 3 px minimum at 0 kW", () => {
    expect(conduitThickness(0)).toBe(3);
  });

  it("UI-TDY-006 follows 3 + 3.2·log₂(1 + P/0.25) at 0.25 kW and at 1 kW", () => {
    expect(conduitThickness(0.25)).toBeCloseTo(6.2, 10);
    expect(conduitThickness(1)).toBeCloseTo(3 + 3.2 * Math.log2(5), 10);
    expect(conduitThickness(1)).toBeCloseTo(10.43, 2);
  });

  it("UI-TDY-006 is clamped to 14 px from 4 kW up, the same for every supply", () => {
    expect(conduitThickness(4)).toBe(14);
    expect(conduitThickness(12.5)).toBe(14);
    expect(conduitThickness(250)).toBe(14);
  });
});

describe("todayView", () => {
  it("UI-TDY-004 maps NO_DATA_TODAY to the not-started state, waiting", () => {
    expect(todayView(withoutData("NO_DATA_TODAY"))).toEqual({
      kind: "withoutData",
      heroMode: "waiting",
      title: "La planta aún no ha empezado a producir hoy",
      text: "En cuanto empiece, aquí verás la energía que te llega. Los datos se actualizan cada 5 minutos.",
      contactLink: null,
    });
  });

  it("UI-TDY-004 maps NOT_AVAILABLE to the not-connected state, with the plant unavailable", () => {
    expect(todayView(withoutData("NOT_AVAILABLE"))).toMatchObject({
      kind: "withoutData",
      heroMode: "unavailable",
      title: "Tu planta aún no envía datos de hoy",
      contactLink: null,
    });
  });

  it("UI-TDY-004 maps NO_COEFFICIENT_TODAY to the no-coefficient state, with the community's contact", () => {
    expect(todayView(withoutData("NO_COEFFICIENT_TODAY"))).toMatchObject({
      kind: "withoutData",
      heroMode: "waiting",
      title: "Hoy no te corresponde energía en este punto",
      contactLink: "/community/contact",
    });
  });

  it("UI-TDY-004 AVAILABLE with power flows, with both figures and the current power on the curve mark", () => {
    const view = asAvailable(
      todayView(available({ currentAssignedPowerKW: 0.48, assignedEnergyKWh: 3.456, lastUpdatedAt: "2026-11-12T13:40:00+01:00", stale: false })),
    );

    expect(view.heroMode).toBe("flowing");
    expect(view.statusSentence).toBe("Ahora te llegan 0,48 kW de la planta de la comunidad.");
    expect(view.currentFigure).toEqual({ label: "Te llega ahora", value: "0,48 kW" });
    expect(view.energyFigure).toEqual({ label: "Energía que te tocó hoy", value: "3,46 kWh" });
    expect(view.nowPowerKW).toBe(0.48);
    expect(view.lastUpdated).toBe("13:40");
    expect(view.staleAt).toBeNull();
    expect(view.staleNotice).toBeNull();
  });

  it("UI-TDY-004 AVAILABLE at 0 kW says the plant is not producing, idle, without the current figure, and the mark reads 0 kW", () => {
    const view = asAvailable(todayView(available({ currentAssignedPowerKW: 0, assignedEnergyKWh: 2.1, stale: false })));

    expect(view.heroMode).toBe("idle");
    expect(view.statusSentence).toBe("La planta no está produciendo ahora. Hoy te llegaron 2,1 kWh.");
    expect(view.currentFigure).toBeNull();
    expect(view.energyFigure.value).toBe("2,1 kWh");
    expect(view.nowPowerKW).toBe(0);
  });

  it("UI-TDY-004 AVAILABLE with no current power is its own state: no data, not 'not producing', and no kW on the mark", () => {
    const view = asAvailable(todayView(available({ currentAssignedPowerKW: null, assignedEnergyKWh: 2.1, stale: false })));

    expect(view.heroMode).toBe("idle");
    expect(view.statusSentence).toBe("Ahora mismo no hay dato de la planta. Hoy te llegaron 2,1 kWh.");
    expect(view.currentFigure).toBeNull();
    expect(view.nowPowerKW).toBeNull();
  });

  it("UI-TDY-004 stale data reads 'a las {hh:mm}', in a neutral notice, and the mark carries no kW", () => {
    const view = asAvailable(
      todayView(available({ currentAssignedPowerKW: 1.25, lastUpdatedAt: "2026-11-12T10:15:00+01:00", stale: true })),
    );

    expect(view.heroMode).toBe("flowing");
    expect(view.staleAt).toBe("10:15");
    expect(view.statusSentence).toBe("A las 10:15 te llegaban 1,25 kW de la planta de la comunidad.");
    expect(view.currentFigure).toEqual({ label: "Te llegaba a las 10:15", value: "1,25 kW" });
    expect(view.staleNotice).toBe(
      "Sin datos nuevos desde las 10:15. Lo seguimos intentando cada 5 minutos; las cifras y la curva llegan hasta esa hora.",
    );
    expect(view.nowPowerKW).toBeNull();
  });

  it("UI-TDY-005 shows the β line as a percentage with at most 2 decimals and one % sign", () => {
    expect(asAvailable(todayView(available({ partitionCoefficient: 0.0425 }))).coefficientLine).toBe(
      "Te corresponde el 4,25\u00A0% de la producción de la planta.",
    );
    expect(asAvailable(todayView(available({ partitionCoefficient: 0.123456 }))).coefficientLine).toBe(
      "Te corresponde el 12,35\u00A0% de la producción de la planta.",
    );
  });

  it("UI-TDY-005 hides the β line when the coefficient is null (several plants) or 0", () => {
    expect(asAvailable(todayView(available({ partitionCoefficient: null }))).coefficientLine).toBeNull();
    expect(asAvailable(todayView(available({ partitionCoefficient: 0 }))).coefficientLine).toBeNull();
  });

  it("UI-TDY-005 adds the gap sentence to the inverter note only when the curve has a null point", () => {
    const withGap = available({ assignedPowerCurve: [...slots("08:00", "08:10", 0.5), slot("08:15", null), slot("08:20", 0.5)] });
    const withoutGap = available({ assignedPowerCurve: slots("08:00", "08:20", 0.5) });

    expect(asAvailable(todayView(withGap)).note).toBe(`${NOTE} La cifra de hoy incluye los ratos sin dato de la curva.`);
    expect(asAvailable(todayView(withoutGap)).note).toBe(NOTE);
  });
});
