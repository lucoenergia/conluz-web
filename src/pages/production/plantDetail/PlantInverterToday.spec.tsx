import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApexOptions } from "apexcharts";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { query } from "../../../test/queryState";
import { apiError } from "../../../test/apiError";
import { declaredStyleWithin } from "../../../test/declaredStyle";
import type { PlantInverterProductionTodayResponse } from "../../../api/models";

const { Chart } = vi.hoisted(() => ({
  Chart: vi.fn<(props: { type: string; series: { name: string; data: [number, number | null][] }[]; options: ApexOptions }) => null>(
    () => null,
  ),
}));
// ApexCharts cannot lay out in jsdom: the stub records what the chart is told to draw.
vi.mock("react-apexcharts", () => ({ default: Chart }));

vi.mock(import("../../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetPlantInverterProductionToday: vi.fn(),
}));

import { getPlantInverterProductionToday, useGetPlantInverterProductionToday } from "../../../api/plants/plants";
import { ENERGY_COLORS } from "../../../components/EnergyFigures/energyColors";
import { colors } from "../../../theme/tokens";
import { formatKilowattHours } from "../../../utils/formatEnergyFigures";
import { formatKilowatts } from "../../../utils/formatKilowatts";
import { PlantInverterToday } from "./PlantInverterToday";
import { NOT_AVAILABLE, NOT_STARTED, NO_DATA_TODAY, NOW, STALE, WITH_GAP, available, points } from "./inverterToday.testData";

const PLANT_ID = "plant-1";
const TITLE = "Hoy, según el inversor";
const at = (time: string) => Date.parse(`2026-11-12T${time}:00+01:00`);
const failed = query.error(apiError(500));

function renderBlock(answer: PlantInverterProductionTodayResponse | "loading" | "error") {
  vi.mocked(useGetPlantInverterProductionToday).mockReturnValue(
    answer === "loading" ? query.loading() : answer === "error" ? failed : query.success<typeof getPlantInverterProductionToday>(answer),
  );
  return renderWithProviders(<PlantInverterToday plantId={PLANT_ID} />);
}

const block = () => screen.getByRole("region", { name: TITLE });
const lastChart = () => Chart.mock.calls.at(-1)![0];
type XAnnotation = { x: number; x2?: number; borderColor?: string; label?: { text?: string; style?: { color?: string } } };
const xAnnotations = () => (lastChart().options.annotations?.xaxis ?? []) as XAnnotation[];
const nowMark = () => xAnnotations().find((annotation) => annotation.x2 === undefined)!;
const gapBands = () => xAnnotations().filter((annotation) => annotation.x2 !== undefined);

beforeEach(() => {
  vi.clearAllMocks();
  // Only the clock: "Ahora" is 13:42 in Madrid.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("UI-PLT-012 the block renders only for a plant with an enabled inverter integration (#406)", () => {
  it("UI-PLT-012 AC10 renders nothing when the inverter is NOT_AVAILABLE", () => {
    const { container } = renderBlock(NOT_AVAILABLE);

    expect(screen.queryByRole("region", { name: TITLE })).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("UI-PLT-012 renders nothing while the answer is unknown", () => {
    const { container } = renderBlock("loading");

    expect(container).toBeEmptyDOMElement();
  });

  it("UI-PLT-012 AC10 says there is no data today, with no chart, on NO_DATA_TODAY", () => {
    renderBlock(NO_DATA_TODAY);

    expect(within(block()).getByRole("note")).toHaveTextContent("Sin datos del inversor hoy");
    expect(Chart).not.toHaveBeenCalled();
    expect(within(block()).queryByText(/kWh/)).not.toBeInTheDocument();
  });

  it("UI-PLT-012 states that its data is the inverter's, apart from the distributor's", () => {
    renderBlock(available());

    expect(within(block()).getByText("Datos del inversor. Pueden ser distintos de los de la distribuidora.")).toBeInTheDocument();
  });

  it("UI-PLT-012 a failed read is an error with a retry", async () => {
    renderBlock("error");

    const alert = within(block()).getByRole("alert");
    expect(alert).toHaveTextContent("No se pudo cargar la producción de hoy del inversor. Comprueba tu conexión e inténtalo de nuevo.");
    await userEvent.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(failed.refetch).toHaveBeenCalled();
  });
});

describe("UI-PLT-012 producing (#406)", () => {
  it("UI-PLT-012 shows today's energy up to the latest snapshot, and when it was updated", () => {
    renderBlock(available());

    const figure = within(block()).getByRole("group", { name: "Hoy, hasta las 13:40" });
    expect(figure).toHaveTextContent(formatKilowattHours(118.9));
    expect(within(block()).getByText("Actualizado a las 13:40")).toBeInTheDocument();
    expect(within(block()).queryByRole("note")).not.toBeInTheDocument();
  });

  it("UI-PLT-012 draws the power curve as a line and area over the whole local day, the Ahora mark at now", () => {
    renderBlock(available());

    expect(lastChart().type).toBe("area");
    expect(lastChart().options.xaxis).toMatchObject({
      type: "numeric",
      min: Date.parse("2026-11-12T00:00:00+01:00"),
      max: Date.parse("2026-11-13T00:00:00+01:00"),
    });
    expect(nowMark()).toMatchObject({ x: Date.parse(NOW), label: { text: `Ahora · 13:42 · ${formatKilowatts(18.25)}` } });
    expect(gapBands()).toEqual([]);
  });

  it("UI-PLT-012 reads the latest snapshot's power at the Ahora mark, and says it in words", () => {
    renderBlock(available({ powerCurve: [...points("08:00", "13:35", 12.5), { endsAt: "2026-11-12T13:40:00+01:00", powerKW: 21.4 }] }));

    expect(nowMark().label?.text).toBe(`Ahora · 13:42 · ${formatKilowatts(21.4)}`);
    expect(within(block()).getByRole("img", { name: new RegExp(` Ahora, ${formatKilowatts(21.4)}\\.$`) })).toBeInTheDocument();
  });

  it("UI-PLT-012 reads 0 kW at the Ahora mark before the inverter starts producing", () => {
    renderBlock(NOT_STARTED);

    expect(nowMark().label?.text).toBe(`Ahora · 13:42 · ${formatKilowatts(0)}`);
  });

  it("UI-PLT-012 reads only the time at the Ahora mark when the latest snapshot is a gap", () => {
    renderBlock(available({ powerCurve: [...points("08:00", "13:30", 12.5), { endsAt: "2026-11-12T13:40:00+01:00", powerKW: null }] }));

    expect(nowMark().label?.text).toBe("Ahora · 13:42");
    expect(within(block()).getByRole("img", { name: /Sin datos de 13:30 a 13:40\.$/ })).toBeInTheDocument();
  });

  it("UI-PLT-012 describes the curve in words for a reader who cannot see it", () => {
    renderBlock(available());

    expect(within(block()).getByRole("img", { name: /^Potencia del inversor hoy, de 00:00 a las 13:42\. Máximo / })).toBeInTheDocument();
  });
});

describe("UI-PLT-012 a day with a gap (#406)", () => {
  it("UI-PLT-012 AC11 keeps the null points unconnected, bands the stretch as Sin datos, and draws nothing after now", () => {
    renderBlock(WITH_GAP);

    const data = lastChart().series[0].data;
    expect(data.filter(([, y]) => y === null).map(([x]) => x)).toEqual([at("10:50"), at("11:05")]);
    expect(gapBands()).toEqual([expect.objectContaining({ x: at("10:20"), x2: at("11:05"), label: expect.objectContaining({ text: "Sin datos" }) })]);
    expect(Math.max(...data.map(([x]) => x))).toBeLessThanOrEqual(nowMark().x);
    expect(nowMark().x).toBe(Date.parse(NOW));
  });

  it("UI-PLT-012 says which stretch is missing, and that today's figure still includes it", () => {
    renderBlock(WITH_GAP);

    expect(
      within(block()).getByText("Faltan datos de 10:20 a 11:05. La curva no muestra ese tramo, pero la cifra de hoy sí lo incluye."),
    ).toBeInTheDocument();
    expect(within(block()).getByRole("img", { name: /Sin datos de 10:20 a 11:05\.$/ })).toBeInTheDocument();
  });
});

describe("UI-PLT-012 not producing yet (#406)", () => {
  it("UI-PLT-012 AC12 reads Todavía no ha empezado a producir hoy, with the line flat at 0", () => {
    renderBlock(NOT_STARTED);

    expect(within(block()).getByRole("note")).toHaveTextContent("Todavía no ha empezado a producir hoy");
    expect(within(block()).getByRole("group", { name: "Hoy, hasta las 06:20" })).toHaveTextContent(formatKilowattHours(0));
    expect(new Set(lastChart().series[0].data.map(([, y]) => y))).toEqual(new Set([0]));
  });
});

describe("UI-PLT-012 stale (#406)", () => {
  it("UI-PLT-012 AC13 says in words that nothing new arrived for more than an hour, in neutral styling", () => {
    renderBlock(STALE);

    const note = within(block()).getByText(
      "Sin datos nuevos desde las 10:15, hace más de 1 hora. La cifra y la curva llegan hasta esa hora.",
    );
    expect(note.closest("[role='note']")).toBeInTheDocument();
    expect(within(block()).queryByRole("alert")).not.toBeInTheDocument();
    expect(within(block()).queryByText(/^Actualizado a las/)).not.toBeInTheDocument();
    // The mark stays at now, not at the latest snapshot, and reads no power: the latest is not now's.
    expect(nowMark()).toMatchObject({ x: Date.parse(NOW), label: { text: "Ahora · 13:42" } });
    expect(within(block()).getByRole("img", { name: (name) => !name.includes("Ahora,") })).toBeInTheDocument();
  });
});

describe("UI-PLT-013 production is gold, and gold is never text (#406)", () => {
  it("UI-PLT-013 AC15 draws the curve in ENERGY_COLORS.assigned and the Ahora mark in brand.main", () => {
    renderBlock(WITH_GAP);

    expect(lastChart().options.colors).toEqual([ENERGY_COLORS.assigned]);
    expect(lastChart().options.fill).toMatchObject({ opacity: 0.2 });
    expect(nowMark().borderColor).toBe(colors.brand.main);
    expect(nowMark().label?.style?.color).toBe(colors.brand.main);
    for (const band of gapBands()) expect(band.label?.style?.color).not.toBe(colors.marks.gold);
  });

  it("UI-PLT-013 AC15 sets no text in marks.gold: the figure is in the text colour, beside a gold swatch", () => {
    renderBlock(WITH_GAP);

    const gold = colors.marks.gold.toLowerCase();
    const texts = [...block().querySelectorAll("*")].filter((element) =>
      [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()),
    );
    expect(texts.length).toBeGreaterThan(3);
    for (const element of texts) {
      const textColours = declaredStyleWithin(element)
        .filter(([, property]) => property === "color")
        .map(([, , value]) => value.toLowerCase());
      expect(textColours, element.textContent ?? "").not.toContain(gold);
    }
    const swatches = [...block().querySelectorAll("[aria-hidden='true']")].flatMap((element) =>
      declaredStyleWithin(element)
        .filter(([, property]) => property === "background-color")
        .map(([, , value]) => value.toLowerCase()),
    );
    expect(swatches).toContain(gold);
  });
});
