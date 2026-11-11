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

  it("states the plants and their installed power, or that there are none yet", () => {
    expect(plantsSummary({ plants: [PABELLON, ESCUELAS, LAVADERO], installedPowerKWp: 112.5 })).toBe("3 plantas · 112,5 kWp instalados");
    expect(plantsSummary({ plants: [PABELLON], installedPowerKWp: 60 })).toBe("1 planta · 60 kWp instalados");
    expect(plantsSummary({ plants: [], installedPowerKWp: 0 })).toBe("sin plantas todavía");
  });

  it("UI-CAN-003 writes ratios and shares through the shared percentage formatter", () => {
    expect(wholePercent(0.58)).toBe(formatPercentage(0.58, { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    expect(sharePercent(0.5333)).toBe(formatPercentage(0.533, { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  });
});
