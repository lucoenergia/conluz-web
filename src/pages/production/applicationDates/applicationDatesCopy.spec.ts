import { describe, expect, it } from "vitest";
import {
  datedCoefficientsLabel,
  datesToChoose,
  fixRowsHint,
  leavingSuppliesLabel,
  moreRows,
  movedEndsLabel,
  rowsWithErrors,
  selectedOfTotal,
} from "./applicationDatesCopy";

// Every counted sentence of the flow, in both forms: never "(s)" or "(n)".
describe("the set application dates flow's counted sentences", () => {
  it.each([
    ["datesToChoose", datesToChoose, "1 punto necesita que escribas la fecha.", "2 puntos necesitan que escribas la fecha."],
    ["moreRows", moreRows, "Y 1 punto más", "Y 2 puntos más"],
    ["datedCoefficientsLabel", datedCoefficientsLabel, "coeficiente de este acuerdo recibe fecha", "coeficientes de este acuerdo reciben fecha"],
    ["movedEndsLabel", movedEndsLabel, "coeficiente anterior cambia su fin", "coeficientes anteriores cambian su fin"],
    ["leavingSuppliesLabel", leavingSuppliesLabel, "punto sale del reparto", "puntos salen del reparto"],
    ["rowsWithErrors", rowsWithErrors, "1 punto tiene un error", "2 puntos tienen un error"],
    ["fixRowsHint", fixRowsHint, "Corrígelo o desmárcalo para poder confirmar.", "Corrígelos o desmárcalos para poder confirmar."],
  ] as const)("%s agrees with its count", (_name, sentence, one, two) => {
    expect(sentence(1)).toBe(one);
    expect(sentence(2)).toBe(two);
  });

  it("the marked count agrees with the total, not with how many are marked", () => {
    expect(selectedOfTotal(0, 1)).toBe("0 de 1 punto marcado");
    expect(selectedOfTotal(1, 2)).toBe("1 de 2 puntos marcados");
  });

  it("no sentence carries a parenthesised plural", () => {
    const all = [0, 1, 2].flatMap((n) => [
      datesToChoose(n),
      moreRows(n),
      datedCoefficientsLabel(n),
      movedEndsLabel(n),
      leavingSuppliesLabel(n),
      rowsWithErrors(n),
      fixRowsHint(n),
      selectedOfTotal(n, n),
    ]);
    expect(all.filter((text) => /\((s|n|es)\)/.test(text))).toEqual([]);
  });
});
