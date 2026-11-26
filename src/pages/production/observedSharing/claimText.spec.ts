import { describe, expect, test } from "vitest";
import { SharingAgreementReferenceResponseStatus, SharingAnomalyResponseType as Type } from "../../../api/models";
import {
  buildObservationAnalysis,
  buildObservationSummary,
  buildPlant,
  buildPlantSharingObservation,
  buildSharingAgreementReference,
  buildSharingAnomaly,
} from "../../../test/fixtures";
import { buildClaimText } from "./claimText";

const supply = (id: string, name: string) => ({ id, code: `ES0031000000000${id}JN0F`, name });
const NORTE = supply("001", "Casa Norte");
const SUR = supply("002", "Casa Sur");
const ESTE = supply("003", "Casa Este");
const OESTE = supply("004", "Casa Oeste");
const TALLER = supply("005", "Taller");
const HUERTO = supply("006", "Huerto");
const SUPPLIES = [NORTE, SUR, ESTE, OESTE, TALLER, HUERTO];

const PLANT = buildPlant({ name: "Planta Solar Norte", regulatoryCode: "ES0031400000001JN0FA000" });

const day = (date: string) => ({ from: date, to: date });

// The agreement in force, sent on 20/02/2025. Its anomalies in the analysis's
// order, which is not the page's: Casa Norte's three parts are listed apart.
const BLOQUE_A = buildObservationSummary({
  sharingAgreement: buildSharingAgreementReference({ id: "bloque-a", name: "Reparto vecinos bloque A" }),
  distributorFileSentOn: "2025-02-20",
  anomalies: [
    buildSharingAnomaly({
      id: "norte-swapped-closed",
      supply: NORTE,
      type: Type.NOT_APPLIED,
      start: day("2025-03-01"),
      end: "2025-06-30",
      expectedBeta: 0.0315,
      observedBeta: 0.041234,
      swappedWith: SUR,
    }),
    buildSharingAnomaly({
      id: "este-applied-before-sent",
      supply: ESTE,
      type: Type.APPLIED_BEFORE_SENT,
      start: day("2025-02-10"),
      end: "2025-02-19",
      expectedBeta: 0.05,
      observedBeta: 0.05,
    }),
    buildSharingAnomaly({
      id: "sur-swapped",
      supply: SUR,
      type: Type.NOT_APPLIED,
      start: day("2025-03-01"),
      end: "2025-06-30",
      expectedBeta: 0.0412,
      observedBeta: 0.031456,
      swappedWith: NORTE,
    }),
    buildSharingAnomaly({
      id: "norte-swapped-open",
      supply: NORTE,
      type: Type.NOT_APPLIED,
      start: { from: "2025-08-25", to: "2025-09-01" },
      end: null,
      expectedBeta: 0.0315,
      observedBeta: 0.0412,
      swappedWith: SUR,
    }),
    buildSharingAnomaly({
      id: "norte-not-swapped",
      supply: NORTE,
      type: Type.NOT_APPLIED,
      start: day("2025-07-01"),
      end: "2025-08-24",
      expectedBeta: 0.0315,
      observedBeta: 0.012301,
    }),
    buildSharingAnomaly({
      id: "este-unknown",
      supply: ESTE,
      type: Type.UNKNOWN_COEFFICIENT,
      start: day("2025-09-15"),
      end: null,
      expectedBeta: 0.05,
      observedBeta: 0.061234,
    }),
    // Casa Sur's side of the open swap: it overlaps Casa Norte's from 01/09/2025.
    buildSharingAnomaly({
      id: "sur-swapped-open",
      supply: SUR,
      type: Type.NOT_APPLIED,
      start: day("2025-09-01"),
      end: null,
      expectedBeta: 0.0412,
      observedBeta: 0.0315,
      swappedWith: NORTE,
    }),
  ],
});

// A superseded agreement whose sent date was never recorded.
const INICIAL = buildObservationSummary({
  sharingAgreement: buildSharingAgreementReference({
    id: "inicial",
    name: "Reparto inicial 2023",
    status: SharingAgreementReferenceResponseStatus.SUPERSEDED,
  }),
  distributorFileSentOn: null,
  anomalies: [
    buildSharingAnomaly({
      id: "taller-reverted",
      supply: TALLER,
      type: Type.REVERTED,
      start: day("2024-05-01"),
      end: "2024-09-30",
      expectedBeta: 0.08,
      observedBeta: 0.065432,
    }),
    buildSharingAnomaly({
      id: "oeste-no-energy",
      supply: OESTE,
      type: Type.NO_ENERGY_IN_AGREEMENT,
      start: { from: "2024-01-10", to: "2024-01-15" },
      end: "2024-03-31",
      expectedBeta: 0.02,
      observedBeta: 0,
    }),
    buildSharingAnomaly({
      id: "huerto-outside",
      supply: HUERTO,
      type: Type.ENERGY_OUTSIDE_AGREEMENT,
      start: day("2024-02-01"),
      end: null,
      expectedBeta: 0,
      observedBeta: 0.015678,
    }),
  ],
});

// Attributed to no agreement, starting on the first day of the data.
const UNATTRIBUTED = buildSharingAnomaly({
  id: "taller-unattributed",
  supply: TALLER,
  type: Type.UNKNOWN_COEFFICIENT,
  start: { from: null, to: "2023-04-01" },
  end: "2023-06-30",
  expectedBeta: null,
  observedBeta: 0.072,
});

const OBSERVATION = buildPlantSharingObservation({
  analysis: buildObservationAnalysis({ analysedFrom: "2023-04-01", analysedTo: "2025-10-31" }),
  sharingAgreements: [BLOQUE_A, INICIAL],
  unattributedAnomalies: [UNATTRIBUTED],
});

const EXPECTED = `Asunto: Revisión del reparto de autoconsumo colectivo – CAU ES0031400000001JN0FA000

Estimados señores de [NOMBRE DE LA DISTRIBUIDORA]:

Me dirijo a ustedes en nombre de [NOMBRE DE LA COMUNIDAD O DEL TITULAR], en relación con la instalación de autoconsumo colectivo con CAU ES0031400000001JN0FA000.

Según los datos de consumo y producción publicados en Datadis, en los siguientes puntos de suministro el reparto aplicado no coincide con los coeficientes comunicados:

1. CUPS ES0031000000000001JN0F.
No se le ha aplicado el coeficiente comunicado de 3,1500 %; recibe aproximadamente un 4,12 % (reparto «Reparto vecinos bloque A», fichero enviado el 20/02/2025). Este porcentaje coincide con el coeficiente comunicado para el punto CUPS ES0031000000000002JN0F, y a ese punto se le aplica el de este: los coeficientes de ambos puntos parecen intercambiados.
Periodo: del 01/03/2025 al 30/06/2025.

2. CUPS ES0031000000000001JN0F.
No se le ha aplicado el coeficiente comunicado de 3,1500 %; recibe aproximadamente un 1,23 % (reparto «Reparto vecinos bloque A», fichero enviado el 20/02/2025).
Periodo: del 01/07/2025 al 24/08/2025.

3. CUPS ES0031000000000001JN0F.
No se le ha aplicado el coeficiente comunicado de 3,1500 %; recibe aproximadamente un 4,12 % (reparto «Reparto vecinos bloque A», fichero enviado el 20/02/2025). Este porcentaje coincide con el coeficiente comunicado para el punto CUPS ES0031000000000002JN0F, y a ese punto se le aplica el de este: los coeficientes de ambos puntos parecen intercambiados.
Periodo: desde una fecha entre el 25/08/2025 y el 01/09/2025 hasta la fecha de los últimos datos publicados (31/10/2025).

4. CUPS ES0031000000000003JN0F.
Se le ha aplicado aproximadamente un 6,12 %, cuando el coeficiente comunicado es 5,0000 % (reparto «Reparto vecinos bloque A», fichero enviado el 20/02/2025).
Periodo: desde el 15/09/2025 hasta la fecha de los últimos datos publicados (31/10/2025).

5. CUPS ES0031000000000002JN0F.
No se le ha aplicado el coeficiente comunicado de 4,1200 %; recibe aproximadamente un 3,15 % (reparto «Reparto vecinos bloque A», fichero enviado el 20/02/2025). Este porcentaje coincide con el coeficiente comunicado para el punto CUPS ES0031000000000001JN0F, y a ese punto se le aplica el de este: los coeficientes de ambos puntos parecen intercambiados.
Periodo: del 01/03/2025 al 30/06/2025.

6. CUPS ES0031000000000002JN0F.
No se le ha aplicado el coeficiente comunicado de 4,1200 %; recibe aproximadamente un 3,15 % (reparto «Reparto vecinos bloque A», fichero enviado el 20/02/2025). Este porcentaje coincide con el coeficiente comunicado para el punto CUPS ES0031000000000001JN0F, y a ese punto se le aplica el de este: los coeficientes de ambos puntos parecen intercambiados.
Periodo: desde el 01/09/2025 hasta la fecha de los últimos datos publicados (31/10/2025).

7. CUPS ES0031000000000005JN0F.
Se le vuelve a aplicar aproximadamente un 6,54 %, que corresponde a un reparto anterior, en lugar del coeficiente comunicado de 8,0000 % (reparto «Reparto inicial 2023», fichero enviado el [FECHA DE ENVÍO]).
Periodo: del 01/05/2024 al 30/09/2024.

8. CUPS ES0031000000000004JN0F.
No recibe energía de la instalación, aunque su coeficiente comunicado es 2,0000 % (reparto «Reparto inicial 2023», fichero enviado el [FECHA DE ENVÍO]).
Periodo: desde una fecha entre el 10/01/2024 y el 15/01/2024 hasta el 31/03/2024.

9. CUPS ES0031000000000006JN0F.
Recibe aproximadamente un 1,57 % de la energía de la instalación, aunque no figura en el reparto comunicado.
Periodo: desde el 01/02/2024 hasta la fecha de los últimos datos publicados (31/10/2025).

10. CUPS ES0031000000000005JN0F.
Se le ha aplicado aproximadamente un 7,20 %, cuando el coeficiente comunicado es [COEFICIENTE COMUNICADO] % (reparto «[NOMBRE DEL REPARTO]»).
Periodo: desde el 01/04/2023 o antes hasta el 30/06/2023.

Les solicito que revisen la aplicación de los coeficientes en estos puntos de suministro, que corrijan el reparto conforme a los coeficientes comunicados y que, en su caso, regularicen la facturación del periodo afectado. [AÑADIR O QUITAR PETICIONES]

Quedo a la espera de su respuesta. Pueden contactar conmigo en [TELÉFONO O CORREO ELECTRÓNICO].

Atentamente,
[NOMBRE Y APELLIDOS]
[CARGO EN LA COMUNIDAD]

Nota: los porcentajes observados son aproximados y se han calculado a partir de los datos diarios publicados en Datadis.`;

/** The numbered items of a claim, each as its lines. */
const items = (text: string) =>
  text
    .split("\n\n")
    .filter((block) => /^\d+\. CUPS /.test(block))
    .map((block) => block.split("\n"));

describe("buildClaimText", () => {
  test("UI-AGR-048: the claim equals the template filled from the observation, character for character", () => {
    expect(buildClaimText(OBSERVATION, PLANT)).toBe(EXPECTED);
  });

  test("UI-AGR-047: one item per claimable anomaly part, attributed and not, in page order, and no APPLIED_BEFORE_SENT", () => {
    const claimed = items(buildClaimText(OBSERVATION, PLANT));

    // Casa Norte's three parts together, Casa Este before Casa Sur as on the
    // page, then the superseded agreement, then the anomaly attributed to none.
    expect(claimed.map((lines) => lines[0])).toEqual([
      `1. CUPS ${NORTE.code}.`,
      `2. CUPS ${NORTE.code}.`,
      `3. CUPS ${NORTE.code}.`,
      `4. CUPS ${ESTE.code}.`,
      `5. CUPS ${SUR.code}.`,
      `6. CUPS ${SUR.code}.`,
      `7. CUPS ${TALLER.code}.`,
      `8. CUPS ${OESTE.code}.`,
      `9. CUPS ${HUERTO.code}.`,
      `10. CUPS ${TALLER.code}.`,
    ]);
    // Casa Este's only claimed item is its unknown coefficient.
    expect(claimed[3][1]).toMatch(/^Se le ha aplicado aproximadamente un 6,12 %/);
    expect(buildClaimText(OBSERVATION, PLANT)).not.toContain("Periodo: del 10/02/2025 al 19/02/2025.");
  });

  test("UI-AGR-047: a supply's parts are listed by start date, whatever order the analysis returns them in", () => {
    const part = (id: string, from: string | null, to: string, end: string | null) =>
      buildSharingAnomaly({
        id,
        supply: NORTE,
        type: Type.NOT_APPLIED,
        start: { from, to },
        end,
        expectedBeta: 0.0315,
        observedBeta: 0.0412,
      });
    const observation = buildPlantSharingObservation({
      analysis: OBSERVATION.analysis,
      sharingAgreements: [
        {
          ...BLOQUE_A,
          // Out of date order, with another supply's anomaly between Casa Norte's parts.
          anomalies: [
            part("norte-latest", "2025-06-01", "2025-06-01", null),
            buildSharingAnomaly({ id: "sur-earlier", supply: SUR, type: Type.REVERTED, start: day("2023-05-01"), end: "2023-05-31", expectedBeta: 0.04, observedBeta: 0.03 }),
            part("norte-range", "2025-01-10", "2025-01-15", "2025-05-31"),
            part("norte-data-start", null, "2024-11-01", "2025-01-09"),
          ],
        },
      ],
    });

    const claimed = items(buildClaimText(observation, PLANT));

    // Casa Norte keeps its place before Casa Sur, its parts ordered by the latest day each may start on.
    expect(claimed.map((lines) => [lines[0], lines[2]])).toEqual([
      [`1. CUPS ${NORTE.code}.`, "Periodo: desde el 01/11/2024 o antes hasta el 09/01/2025."],
      [`2. CUPS ${NORTE.code}.`, "Periodo: desde una fecha entre el 10/01/2025 y el 15/01/2025 hasta el 31/05/2025."],
      [
        `3. CUPS ${NORTE.code}.`,
        "Periodo: desde el 01/06/2025 hasta la fecha de los últimos datos publicados (31/10/2025).",
      ],
      [`4. CUPS ${SUR.code}.`, "Periodo: del 01/05/2023 al 31/05/2023."],
    ]);
  });

  test("UI-AGR-047: an observation whose only anomaly is APPLIED_BEFORE_SENT claims nothing", () => {
    const onlySentLate = buildPlantSharingObservation({
      analysis: OBSERVATION.analysis,
      sharingAgreements: [{ ...BLOQUE_A, anomalies: [BLOQUE_A.anomalies[1]] }],
    });

    expect(items(buildClaimText(onlySentLate, PLANT))).toEqual([]);
  });

  test("UI-AGR-048: a swap names the other supply by its CUPS, on each of the two supplies", () => {
    const claimed = items(buildClaimText(OBSERVATION, PLANT));
    const swapSentence = (code: string) => `para el punto CUPS ${code}, y a ese punto se le aplica el de este`;

    // The closed swap: Casa Norte's first part and Casa Sur's first part.
    expect(claimed[0][1]).toContain(swapSentence(SUR.code));
    expect(claimed[4][1]).toContain(swapSentence(NORTE.code));
    // The open swap: Casa Norte's open part and Casa Sur's, which overlap.
    expect(claimed[2][1]).toContain(swapSentence(SUR.code));
    expect(claimed[5][1]).toContain(swapSentence(NORTE.code));
    // Casa Norte's part that is not swapped names no other supply.
    expect(claimed[1][1]).not.toContain("intercambiados");
  });

  test("UI-AGR-048: the text holds no markup, no supply name and no plant name, and names every claimed CUPS", () => {
    const text = buildClaimText(OBSERVATION, PLANT);

    for (const character of ["*", "#", "|", "_", "`", "<"]) {
      expect(text).not.toContain(character);
    }
    for (const { name } of SUPPLIES) {
      expect(text).not.toContain(name);
    }
    expect(text).not.toContain(PLANT.name);
    for (const { code } of SUPPLIES) {
      expect(text).toContain(`CUPS ${code}.`);
    }
  });

  test("UI-AGR-048: the registered coefficient is the anomaly's expected β with 4 decimals, or the placeholder when it is null", () => {
    const withExpected = (expectedBeta: number | null) =>
      buildPlantSharingObservation({
        analysis: OBSERVATION.analysis,
        unattributedAnomalies: [
          buildSharingAnomaly({ supply: OESTE, type: Type.NO_ENERGY_IN_AGREEMENT, expectedBeta, observedBeta: 0 }),
        ],
      });
    const registered = (expectedBeta: number | null) => items(buildClaimText(withExpected(expectedBeta), PLANT))[0][1];

    expect(registered(0.123456)).toContain("su coeficiente comunicado es 12,3456 %");
    expect(registered(0)).toContain("su coeficiente comunicado es 0,0000 %");
    expect(registered(null)).toContain("su coeficiente comunicado es [COEFICIENTE COMUNICADO] %");
  });

  test("UI-AGR-048: a plant without a CAU, or with one that is only whitespace, leaves it as a placeholder", () => {
    for (const regulatoryCode of [null, "  "]) {
      const text = buildClaimText(OBSERVATION, { regulatoryCode });

      expect(text).toMatch(/^Asunto: Revisión del reparto de autoconsumo colectivo – CAU \[CAU\]\n/);
      expect(text).toContain("en relación con la instalación de autoconsumo colectivo con CAU [CAU].");
    }
  });
});
