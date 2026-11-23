import "@testing-library/jest-dom";
import { describe, expect, test } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/renderWithProviders";
import {
  CoefficientObservationResponseStatus,
  LeavingObservationResponseStatus,
  SharingAnomalyResponseType,
} from "../../../api/models";
import { ObservedSharingHelp } from "./ObservedSharingHelp";
import { ANOMALY_TYPE_LABEL, COEFFICIENT_STATUS_LABEL, LEAVING_STATUS_LABEL } from "./observedSharingLabels";

async function openHelp() {
  const user = userEvent.setup();
  renderWithProviders(<ObservedSharingHelp />);
  await user.click(screen.getByRole("button", { name: "Cómo leer el reparto observado" }));
  return { user, dialog: await screen.findByRole("dialog", { name: "Cómo leer el reparto observado" }) };
}

/** A section's terms with their meanings, in the order it lists them. */
const entries = (section: HTMLElement) =>
  within(section)
    .getAllByRole("term")
    .map((term) => [term.textContent, term.nextElementSibling?.textContent]);

const terms = (section: HTMLElement) => entries(section).map(([term]) => term);

describe("ObservedSharingHelp", () => {
  test("UI-AGR-038: the link 'Cómo leer el reparto observado' opens the dialog of the same name, with its four sections", async () => {
    const { dialog } = await openHelp();

    expect(within(dialog).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "Términos",
      "Estados de los coeficientes",
      "Estados de las salidas del reparto",
      "Anomalías",
    ]);
  });

  test("UI-AGR-038: defines the terms the figures rest on", async () => {
    const { dialog } = await openHelp();

    expect(entries(within(dialog).getByRole("region", { name: "Términos" }))).toEqual([
      ["β registrada", "el coeficiente guardado en el acuerdo."],
      [
        "β esperada",
        "el coeficiente registrado del punto en el acuerdo al que se atribuye la anomalía (0 si no tiene coeficiente en él).",
      ],
      [
        "β observada",
        "la parte de la producción de la planta que el punto recibió según Datadis, como mediana de sus días medibles.",
      ],
      [
        "Día medible",
        "un día con datos completos del punto y de la planta en Datadis, en el que la planta produjo al menos 12 kWh (o 0,5 kWh por kWp si es más). Solo estos días se usan para comparar; no indica que el día sea correcto o incorrecto. Por eso un periodo tiene menos días medibles que días naturales: se descartan los días de poca producción (sobre todo en invierno) y los días sin datos completos.",
      ],
      [
        "Periodo de aplicación del acuerdo",
        "desde la fecha en que Datadis lo ve aplicado en la mayoría de puntos hasta el día antes de que se aplique el siguiente acuerdo, o hasta el último dato disponible. La producción no atribuida se calcula sobre sus días medibles. Sus fechas se muestran junto a los días medibles.",
      ],
      [
        "Periodo de cada punto",
        "desde la fecha en que Datadis ve aplicado el coeficiente de ese punto hasta el final del periodo del acuerdo. Si el punto se ve aplicado antes que el resto, su periodo es más largo; si no tiene fecha observada, es el del acuerdo. Sus fechas se muestran junto a los días medibles.",
      ],
      [
        "Producción no atribuida (1 − Σβ)",
        "de toda la energía que produjo la planta en los días medibles en que se aplicaba el acuerdo, la parte que Datadis no muestra en ningún punto con datos. Σβ es la suma de lo que recibieron los puntos. Se divide en dos:" +
          "la parte registrada de los puntos que no tenían datos esos días, que es normal y no indica un error;" +
          "un resto. Cerca de 0 es redondeo. Positivo: producción que no llegó a ningún punto registrado (puede haber un punto sin registrar o coeficientes que no suman 100 %). Negativo: los puntos con datos recibieron más de lo registrado, y si la cifra total es negativa, algún dato de Datadis es erróneo.",
      ],
    ]);
  });

  test("UI-AGR-038: lists the agreement's period and each supply's period after 'Día medible', before the unattributed production", async () => {
    const { dialog } = await openHelp();

    expect(terms(within(dialog).getByRole("region", { name: "Términos" })).slice(3, 6)).toEqual([
      "Día medible",
      "Periodo de aplicación del acuerdo",
      "Periodo de cada punto",
    ]);
  });

  test("UI-AGR-038: 'Día medible' says why a period has fewer measurable days than calendar days", async () => {
    const { dialog } = await openHelp();

    const [, meaning] = entries(within(dialog).getByRole("region", { name: "Términos" })).find(([term]) => term === "Día medible")!;

    expect(meaning).toMatch(
      /Por eso un periodo tiene menos días medibles que días naturales: se descartan los días de poca producción \(sobre todo en invierno\) y los días sin datos completos\.$/,
    );
  });

  test("UI-AGR-038: lists every coefficient status of the client, under the label the view shows it with", async () => {
    const { dialog } = await openHelp();
    const section = within(dialog).getByRole("region", { name: "Estados de los coeficientes" });

    expect(terms(section)).toEqual(
      Object.values(CoefficientObservationResponseStatus).map((status) => COEFFICIENT_STATUS_LABEL[status]),
    );
    expect(entries(section)).toContainEqual([
      "No distinguible",
      "tiene el mismo valor que el coeficiente anterior, así que en Datadis no se ve cuándo cambió. La fecha que se muestra es una propuesta.",
    ]);
  });

  test("UI-AGR-038: lists every leaving status of the client, under the label the view shows it with", async () => {
    const { dialog } = await openHelp();
    const section = within(dialog).getByRole("region", { name: "Estados de las salidas del reparto" });

    expect(terms(section)).toEqual(
      Object.values(LeavingObservationResponseStatus).map((status) => LEAVING_STATUS_LABEL[status]),
    );
    expect(entries(section)).toContainEqual([
      "Salida · misma fecha",
      "Datadis muestra que el punto deja de recibir su coeficiente anterior desde la fecha de fin registrada.",
    ]);
  });

  test("UI-AGR-038: lists every anomaly type of the client, under the label the view shows it with", async () => {
    const { dialog } = await openHelp();
    const section = within(dialog).getByRole("region", { name: "Anomalías" });

    expect([...terms(section)].sort()).toEqual(
      Object.values(SharingAnomalyResponseType)
        .map((type) => ANOMALY_TYPE_LABEL[type])
        .sort(),
    );
    expect(entries(section)).toContainEqual([
      "Coeficiente no registrado",
      "el punto recibe un porcentaje que no coincide con ninguno de sus coeficientes registrados.",
    ]);
  });

  test("UI-AGR-038: every term has a meaning", async () => {
    const { dialog } = await openHelp();

    for (const [term, meaning] of entries(dialog)) {
      expect(meaning, `${term} has no meaning`).toMatch(/\S/);
    }
  });

  test("UI-AGR-038: closes with 'Cerrar', the one control of that name", async () => {
    const { user, dialog } = await openHelp();

    expect(screen.getAllByRole("button", { name: "Cerrar" })).toHaveLength(1);
    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  test("UI-AGR-039: 'Producción no atribuida (1 − Σβ)' says a negative share means wrong data", async () => {
    const { dialog } = await openHelp();

    expect(entries(within(dialog).getByRole("region", { name: "Términos" }))).toContainEqual([
      "Producción no atribuida (1 − Σβ)",
      expect.stringContaining("si la cifra total es negativa, algún dato de Datadis es erróneo."),
    ]);
  });
});
