import { describe, expect, it } from "vitest";
import { formatPercentage } from "../../utils/formatPercentage";
import { co2FactorText, coverageNotice, plantsSummary, sharePercent, unpricedSurplusText, wholePercent } from "./communityFigureTexts";
import { ESCUELAS, LAVADERO, PABELLON } from "./communityAnalysis.testData";

describe("community figure texts (#403)", () => {
  it("UI-CAN-004 says how many of the community's supplies have data", () => {
    expect(coverageNotice(12, 14)).toBe(
      "12 de 14 puntos de suministro tienen datos de este periodo. Las cifras pueden subir cuando lleguen los que faltan.",
    );
  });

  it("UI-CAN-005 states the unpriced exported energy through the kWh formatter", () => {
    expect(unpricedSurplusText(1.5)).toBe("1,5 kWh de energía que se fue a la red no tienen precio de mercado y no cuentan en el ingreso.");
  });

  it("UI-CAN-006 names the MITECO factor and every year applied", () => {
    expect(co2FactorText([2024, 2025])).toBe(
      "Calculado con el factor de emisión de MITECO para la electricidad sin garantía de origen de 2024 y 2025.",
    );
    expect(co2FactorText([2025])).toBe("Calculado con el factor de emisión de MITECO para la electricidad sin garantía de origen de 2025.");
  });

  it("states the plants and their peak and nominal power, or that there are none yet", () => {
    expect(plantsSummary({ plants: [PABELLON, ESCUELAS, LAVADERO], peakPowerKWp: 112.5, nominalPowerKW: 90 })).toBe(
      "3 plantas · Potencia pico 112,5 kWp · Potencia nominal 90 kW",
    );
    expect(plantsSummary({ plants: [PABELLON], peakPowerKWp: 60, nominalPowerKW: 48 })).toBe(
      "1 planta · Potencia pico 60 kWp · Potencia nominal 48 kW",
    );
    expect(plantsSummary({ plants: [], peakPowerKWp: 0, nominalPowerKW: 0 })).toBe("sin plantas todavía");
  });

  it("UI-CAN-003 writes ratios and shares through the shared percentage formatter", () => {
    expect(wholePercent(0.58)).toBe(formatPercentage(0.58, { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    expect(sharePercent(0.5333)).toBe(formatPercentage(0.533, { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  });
});
