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
  await user.click(screen.getByRole("button", { name: "¿Qué significa cada estado?" }));
  return { user, dialog: await screen.findByRole("dialog", { name: "Cómo leer el reparto observado" }) };
}

/** A section's terms with their meanings, in the order it lists them. */
const entries = (section: HTMLElement) =>
  within(section)
    .getAllByRole("term")
    .map((term) => [term.textContent, term.nextElementSibling?.textContent]);

const terms = (section: HTMLElement) => entries(section).map(([term]) => term);

describe("ObservedSharingHelp", () => {
  test("UI-AGR-038: '¿Qué significa cada estado?' opens 'Cómo leer el reparto observado' with its four sections", async () => {
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
        "β observada",
        "la parte de la producción de la planta que el punto recibió según Datadis, como mediana de sus días medibles.",
      ],
      [
        "Día medible",
        "un día con datos completos del punto y de la planta en Datadis, en el que la planta produjo al menos 12 kWh (o 0,5 kWh por kWp si es más). Solo estos días se usan para comparar; no indica que el día sea correcto o incorrecto.",
      ],
      [
        "Sin explicar (1 − Σβ)",
        "la parte de la producción que no se atribuye a ningún punto con datos. Si es negativa, los datos son erróneos: los puntos no pueden recibir más de lo que produce la planta.",
      ],
    ]);
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
});
