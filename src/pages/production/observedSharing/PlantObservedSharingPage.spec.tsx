import "@testing-library/jest-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { query } from "../../../test/queryState";
import { apiError } from "../../../test/apiError";
import { useGetPlantById, type getPlantById } from "../../../api/plants/plants";
import {
  useGetPlantSharingObservation,
  type getPlantSharingObservation,
} from "../../../api/sharing-agreements/sharing-agreements";
import {
  SharingAgreementObservationSummaryResponseRecommendationsItem as Recommendation,
  SharingAgreementReferenceResponseStatus,
  SharingAnomalyResponseType,
  type PlantSharingObservationResponse,
} from "../../../api/models";
import {
  buildObservationAnalysis,
  buildObservationStatusCounts,
  buildObservationSummary,
  buildPlant,
  buildPlantCapabilities,
  buildPlantSharingObservation,
  buildSharingAgreementReference,
  buildSharingAnomaly,
  buildSharingAnomalyCounts,
} from "../../../test/fixtures";
import { PlantObservedSharingPage } from "./PlantObservedSharingPage";

vi.mock(import("../../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetPlantById: vi.fn(),
}));

vi.mock(import("../../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetPlantSharingObservation: vi.fn(),
}));

const COMMUNITY_ID = "community-a";
const PLANT_ID = "plant-a";

const supply = (id: string, name: string) => ({ id, code: `ES0031000000000${id}JN0F`, name });
const NORTE = supply("001", "Casa Norte");
const SUR = supply("002", "Casa Sur");
const ESTE = supply("003", "Casa Este");
const OESTE = supply("004", "Casa Oeste");
const TALLER = supply("005", "Taller");

function plantFixture(canReadSupply = false) {
  return buildPlant({
    id: PLANT_ID,
    name: "Planta Solar Norte",
    community: { id: COMMUNITY_ID },
    supply: supply("900", "Punto de la planta"),
    capabilities: buildPlantCapabilities({ canRead: true, canListSharingAgreements: true, canReadSupply }),
  });
}

// Three agreements, in the order the analysis returns them (not by date), with
// anomalies on two supplies of one of them and one attributed to none.
const INITIAL = buildObservationSummary({
  sharingAgreement: buildSharingAgreementReference({
    id: "initial",
    name: "Reparto inicial 2023",
    status: SharingAgreementReferenceResponseStatus.SUPERSEDED,
  }),
  distributorFileSentOn: "2023-03-15",
  mostFrequentObservedDate: { from: null, to: "2023-04-01" },
  coefficientStatusCounts: buildObservationStatusCounts({ appliedSameDate: 3 }),
  unallocatedShare: { days: 400, unallocated: 0.012, registeredShareWithoutData: 0 },
  recommendations: [Recommendation.NONE],
});

const REVISED = buildObservationSummary({
  sharingAgreement: buildSharingAgreementReference({
    id: "revised",
    name: "Reparto 2025",
    status: SharingAgreementReferenceResponseStatus.SUPERSEDED,
  }),
  distributorFileSentOn: "2025-02-10",
  mostFrequentObservedDate: { from: "2025-02-26", to: "2025-03-04" },
  coefficientStatusCounts: buildObservationStatusCounts({ appliedSameDate: 1, appliedDifferentDate: 2, noData: 1 }),
  leavingStatusCounts: buildObservationStatusCounts({ appliedSameDate: 1, appliedDifferentDate: 1 }),
  anomalies: [
    buildSharingAnomaly({
      id: "a-norte",
      supply: NORTE,
      type: SharingAnomalyResponseType.UNKNOWN_COEFFICIENT,
      start: { from: "2025-05-01", to: "2025-05-01" },
      end: "2025-06-30",
      observedBeta: 0.0305,
      observedValidDays: 21,
    }),
    buildSharingAnomaly({
      id: "a-sur",
      supply: SUR,
      type: SharingAnomalyResponseType.REVERTED,
      start: { from: null, to: "2025-03-01" },
      end: null,
      observedBeta: 0.0412,
      observedValidDays: 1,
    }),
  ],
  anomalyCounts: buildSharingAnomalyCounts({ unknownCoefficient: 1, reverted: 1 }),
  unallocatedShare: { days: 200, unallocated: 0.067, registeredShareWithoutData: 0.03 },
  recommendations: [Recommendation.SET_DATES, Recommendation.REVIEW_ANOMALIES],
});

const CURRENT = buildObservationSummary({
  sharingAgreement: buildSharingAgreementReference({
    id: "current",
    name: "Reparto 2026",
    status: SharingAgreementReferenceResponseStatus.PUBLISHED,
  }),
  distributorFileSentOn: null,
  mostFrequentObservedDate: null,
  coefficientStatusCounts: buildObservationStatusCounts({ notObserved: 4 }),
  unallocatedShare: null,
  recommendations: [Recommendation.DEACTIVATE],
});

function observationFixture(overrides: Partial<PlantSharingObservationResponse> = {}): PlantSharingObservationResponse {
  return buildPlantSharingObservation({
    analysis: buildObservationAnalysis({
      analysedFrom: "2023-04-01",
      analysedTo: "2026-10-31",
      suppliesWithValidDays: [NORTE, SUR, ESTE],
      suppliesWithoutValidDays: [OESTE],
      notComputableSupplies: [TALLER],
    }),
    sharingAgreements: [REVISED, INITIAL, CURRENT],
    unattributedAnomalies: [
      buildSharingAnomaly({
        id: "a-este",
        supply: ESTE,
        type: SharingAnomalyResponseType.ENERGY_OUTSIDE_AGREEMENT,
        start: { from: "2024-01-01", to: "2024-01-01" },
        end: "2024-01-31",
        observedBeta: 0.02,
        observedValidDays: 30,
      }),
    ],
    ...overrides,
  });
}

function renderPage({
  plant = query.success<typeof getPlantById>(plantFixture()),
  observation = query.success<typeof getPlantSharingObservation>(observationFixture()),
  activeCommunityId = COMMUNITY_ID,
}: {
  plant?: ReturnType<typeof useGetPlantById>;
  observation?: ReturnType<typeof useGetPlantSharingObservation>;
  activeCommunityId?: string;
} = {}) {
  vi.mocked(useGetPlantById).mockReturnValue(plant);
  vi.mocked(useGetPlantSharingObservation).mockReturnValue(observation);
  return renderWithProviders(
    <Routes>
      <Route path="/plants/:plantId/sharing-agreements/observed" element={<PlantObservedSharingPage />} />
    </Routes>,
    { route: `/plants/${PLANT_ID}/sharing-agreements/observed`, activeCommunityId },
  );
}

const cards = () => screen.getAllByRole("article");
const card = (name: string) => screen.getByRole("article", { name });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlantObservedSharingPage", () => {
  test("UI-AGR-023: shows one card per agreement, in the order the analysis returned them", () => {
    renderPage();

    expect(cards().map((article) => within(article).getAllByRole("link")[0].textContent)).toEqual([
      "Reparto 2025",
      "Reparto inicial 2023",
      "Reparto 2026",
    ]);
  });

  test("UI-AGR-023: a card shows the sent date, the application, the status, leaving and anomaly counts, and the unexplained part", () => {
    renderPage();
    const revised = card("Reparto 2025");

    expect(within(revised).getByText("Fichero enviado el 10/02/2025")).toBeInTheDocument();
    expect(within(revised).getByText("Entre el 26/02/2025 y el 04/03/2025")).toBeInTheDocument();
    const counts = within(revised).getAllByRole("listitem").map((item) => item.textContent);
    expect(counts).toEqual(
      expect.arrayContaining([
        "Aplicado · misma fecha1",
        "Aplicado · otra fecha2",
        "Pendiente0",
        "No distinguible0",
        "Sin observar0",
        "Sin datos de Datadis1",
        "Coeficiente desconocido1",
        "Vuelve a un coeficiente anterior1",
      ]),
    );
    expect(within(revised).getByText("Salen del reparto: 2 · 1 con fecha distinta")).toBeInTheDocument();
    expect(within(revised).getByText("Anomalías · 2")).toBeInTheDocument();
    expect(within(revised).getByText("6,7 %")).toBeInTheDocument();
    expect(within(revised).getByText("3,0 % es del punto sin datos")).toBeInTheDocument();
  });

  test("UI-AGR-023: a card with nothing observed says so, and leaves out the leaving and anomaly figures it has none of", () => {
    renderPage();
    const current = card("Reparto 2026");

    expect(within(current).getByText("Sin registrar")).toBeInTheDocument();
    // The counts list "Sin observar" too; this is the application line.
    expect(within(current).getByText("Sin observar", { ignore: "li *" })).toBeInTheDocument();
    expect(within(current).getByText("Sin anomalías")).toBeInTheDocument();
    expect(within(current).queryByText(/^Salen del reparto/)).not.toBeInTheDocument();
    expect(within(current).getByText("—")).toBeInTheDocument();
  });

  test("UI-AGR-023: a card whose agreement is pending shows when its file was sent", () => {
    const pending = buildObservationSummary({
      sharingAgreement: buildSharingAgreementReference({ id: "pending", name: "Reparto 2027" }),
      distributorFileSentOn: "2026-10-15",
      coefficientStatusCounts: buildObservationStatusCounts({ pendingApplication: 4 }),
    });
    renderPage({
      observation: query.success<typeof getPlantSharingObservation>(observationFixture({ sharingAgreements: [pending] })),
    });

    expect(within(card("Reparto 2027")).getByText("Pendiente de aplicar · enviado el 15/10/2026")).toBeInTheDocument();
  });

  test("UI-AGR-023: an agreement in force shows its status chip", () => {
    renderPage();

    expect(within(card("Reparto 2026")).getByText("Vigente")).toBeInTheDocument();
    expect(within(card("Reparto 2025")).getByText("Histórico")).toBeInTheDocument();
  });

  test("UI-AGR-023: every recommendation shows in the order returned, with its sentence and its action", () => {
    renderPage();
    const revised = card("Reparto 2025");

    const items = within(revised)
      .getAllByRole("listitem")
      .filter((item) => item.textContent?.startsWith("Fijar fechas") || item.textContent?.startsWith("Revisar anomalías"));
    expect(items.map((item) => item.firstElementChild?.textContent)).toEqual(["Fijar fechas", "Revisar anomalías"]);
    expect(within(items[0]).getByText("En algunos puntos, Datadis observa fechas distintas de las registradas.")).toBeInTheDocument();
    expect(within(items[1]).getByText("Hay anomalías atribuidas a este acuerdo. Conluz no corrige coeficientes.")).toBeInTheDocument();
    expect(within(items[1]).getByRole("link", { name: "Revisar anomalías" })).toHaveAttribute(
      "href",
      `/plants/${PLANT_ID}/sharing-agreements/observed/revised#anomalias`,
    );

    const current = card("Reparto 2026");
    expect(within(current).getByText("No se observa ningún coeficiente de este acuerdo y no consta fecha de envío.")).toBeInTheDocument();
    expect(within(current).getByRole("link", { name: "Ir a desactivar" })).toHaveAttribute(
      "href",
      `/plants/${PLANT_ID}/sharing-agreements/current`,
    );

    expect(within(card("Reparto inicial 2023")).getByText("Recomendación: Ninguna")).toBeInTheDocument();
    // A card has no heading of its own for them: its label stays.
    expect(within(revised).getByText("Recomendaciones:")).toBeInTheDocument();
  });

  // The set-dates flow ships with #419; until then the recommendation is shown, with nothing to press.
  test("UI-AGR-023: 'Fijar fechas' offers no action", () => {
    renderPage();
    const revised = card("Reparto 2025");

    expect(within(revised).getAllByRole("link").map((link) => link.textContent)).toEqual(["Reparto 2025", "Revisar anomalías"]);
    expect(within(revised).queryByRole("button")).not.toBeInTheDocument();
  });

  test("UI-AGR-023: the header counts every agreement with a recommendation, 'Fijar fechas' included, as to review", async () => {
    // One agreement recommends only "Fijar fechas", one nothing, one "Desactivar".
    renderPage({
      observation: query.success<typeof getPlantSharingObservation>(
        observationFixture({
          sharingAgreements: [
            { ...INITIAL, recommendations: [Recommendation.SET_DATES] },
            { ...REVISED, recommendations: [Recommendation.NONE] },
            CURRENT,
          ],
        }),
      ),
    });

    expect(screen.getByText("Del 1 abr 2023 al 31 oct 2026")).toBeInTheDocument();
    expect(screen.getByText("3 de 4")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: /más/i }));
    expect(screen.getByText("2 de 3")).toBeInTheDocument();
  });

  test("UI-AGR-024: anomalies are grouped by agreement, in the analysis order, with those attributed to none last", () => {
    renderPage();
    const section = screen.getByRole("region", { name: "Anomalías (3)" });

    expect(within(section).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "Reparto 2025",
      "Sin acuerdo atribuido",
    ]);
    expect(within(section).getAllByRole("heading", { level: 4 }).map((heading) => heading.textContent)).toEqual([
      expect.stringContaining("Casa Norte"),
      expect.stringContaining("Casa Sur"),
      expect.stringContaining("Casa Este"),
    ]);
    expect(within(section).getByText("2 anomalías · 2 puntos")).toBeInTheDocument();
    expect(within(section).getByText("1 anomalía · 1 punto")).toBeInTheDocument();
  });

  test("UI-AGR-024: each supply's anomalies show their type, start, end and the β the backend observed", () => {
    renderPage();
    const section = screen.getByRole("region", { name: "Anomalías (3)" });

    expect(within(section).getByRole("button", { name: /Casa Norte.*1 anomalía/ })).toHaveAttribute("aria-expanded", "false");
    // Collapsed on this page, so the rows are reached with hidden: true.
    expect(within(section).getByRole("row", { name: /Coeficiente desconocido/, hidden: true })).toHaveTextContent(
      "Coeficiente desconocido01/05/202530/06/2025Recibe 3,0500 % en 21 días válidos.",
    );
    expect(within(section).getByRole("row", { name: /Vuelve a un coeficiente anterior/, hidden: true })).toHaveTextContent(
      "Vuelve a un coeficiente anterior01/03/2025 o antesen cursoRecibe 4,1200 % en 1 día válido.",
    );
  });

  test("names each supply's anomaly region after its supply (#418)", () => {
    // Casa Sur under a second agreement too: one supply, two regions, two ids.
    const second = buildObservationSummary({
      sharingAgreement: buildSharingAgreementReference({ id: "second", name: "Reparto 2026" }),
      anomalies: [buildSharingAnomaly({ id: "a-sur-2", supply: SUR, type: SharingAnomalyResponseType.NO_ENERGY_IN_AGREEMENT })],
      anomalyCounts: buildSharingAnomalyCounts({ noEnergyInAgreement: 1 }),
    });
    renderPage({
      observation: query.success<typeof getPlantSharingObservation>(
        observationFixture({ sharingAgreements: [REVISED, second], unattributedAnomalies: [] }),
      ),
    });
    const section = screen.getByRole("region", { name: "Anomalías (3)" });

    // Collapsed on this page, so the regions are reached with hidden: true.
    const norte = within(section).getByRole("region", { name: /^Casa Norte/, hidden: true });
    expect(within(norte).getByRole("row", { name: /Coeficiente desconocido/, hidden: true })).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: /^Casa Norte/ })).toHaveAttribute("aria-controls", norte.id);

    const sur = within(section).getAllByRole("region", { name: /^Casa Sur/, hidden: true });
    expect(sur).toHaveLength(2);
    expect(new Set(sur.map((region) => region.id)).size).toBe(2);
    expect(within(sur[1]).getByRole("row", { name: /No recibe energía en el acuerdo/, hidden: true })).toBeInTheDocument();
  });

  test("UI-AGR-028: supplies without data are named in the notice, and not computable ones say only 'No calculable'", () => {
    renderPage();

    expect(screen.getByRole("note")).toHaveTextContent(
      "Datos de Datadis del 1 abr 2023 al 31 oct 2026. 1 punto sin datos de Datadis: Casa Oeste. Su parte aparece como «sin explicar».",
    );
    const notComputable = screen.getByRole("region", { name: "No calculables" });
    expect(within(notComputable).getByRole("row", { name: /Taller/ })).toHaveTextContent(`Taller${TALLER.code}No calculable`);
  });

  test("UI-AGR-029: no text sets an order of work, proposes a coefficient or speaks of real time", () => {
    renderPage();
    const text = document.body.textContent ?? "";

    for (const phrase of ["primero", "después", "a continuación", "siguiente paso", "tiempo real", "en directo", "nuevo coeficiente", "te proponemos"]) {
      expect(text.toLowerCase()).not.toContain(phrase);
    }
  });

  test("says the analysis found nothing to look at when no agreement needs review and there is no anomaly", () => {
    renderPage({
      observation: query.success<typeof getPlantSharingObservation>(
        observationFixture({ sharingAgreements: [INITIAL], unattributedAnomalies: [] }),
      ),
    });

    expect(screen.getByRole("note")).toHaveTextContent("Todo aplicado, sin anomalías.");
    expect(within(screen.getByRole("region", { name: "Anomalías" })).getByText("Sin anomalías")).toBeInTheDocument();
  });

  test("shows its progress while the analysis computes, with no figure", () => {
    renderPage({ observation: query.loading() });

    expect(screen.getByText("Calculando el reparto observado…")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText("Periodo analizado")).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  test("blocks the view, with no agreement and no recommendation, when the plant supply has no data", () => {
    renderPage({
      plant: query.success<typeof getPlantById>(plantFixture(true)),
      observation: query.success<typeof getPlantSharingObservation>(
        observationFixture({
          analysis: buildObservationAnalysis({ computable: false, analysedFrom: null, analysedTo: null, notComputableReason: "PLANT_SUPPLY_WITHOUT_DATA" }),
          sharingAgreements: [{ ...CURRENT, recommendations: [] }],
          unattributedAnomalies: [],
        }),
      ),
    });

    expect(screen.getByRole("heading", { name: "No se puede calcular el reparto observado" })).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    // Nothing was analysed, so the header has no figure to give.
    expect(screen.getByText("Puntos con datos").nextElementSibling).toHaveTextContent(/^—$/);
    expect(screen.queryByText(/^Recomendaci/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver el punto de la planta" })).toHaveAttribute("href", "/supply-points/900");
  });

  test("offers no way to the plant supply when the caller may not read it", () => {
    renderPage({
      observation: query.success<typeof getPlantSharingObservation>(
        observationFixture({ analysis: buildObservationAnalysis({ computable: false, analysedFrom: null, analysedTo: null }) }),
      ),
    });

    expect(screen.getByRole("heading", { name: "No se puede calcular el reparto observado" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ver el punto de la planta" })).not.toBeInTheDocument();
  });

  test("offers a retry when the analysis fails to load", async () => {
    const refetch = vi.fn();
    renderPage({ observation: { ...query.error(apiError(500)), refetch } });

    expect(screen.getByText("No se pudo cargar el reparto observado.")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalled();
  });

  test("asks for the analysis only once the plant is known to be in the active community", () => {
    renderPage({ activeCommunityId: "community-b", observation: query.disabled() });

    expect(screen.getByText("Planta no encontrada")).toBeInTheDocument();
    expect(useGetPlantSharingObservation).toHaveBeenCalledWith(
      PLANT_ID,
      expect.objectContaining({ query: expect.objectContaining({ enabled: false }) }),
    );
  });
});
