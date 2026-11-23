import "@testing-library/jest-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { query } from "../../../test/queryState";
import { apiError } from "../../../test/apiError";
import { declaredStyle } from "../../../test/declaredStyle";
import { colors } from "../../../theme/tokens";
import { useGetPlantById, type getPlantById } from "../../../api/plants/plants";
import {
  useGetSharingAgreementObservation,
  type getSharingAgreementObservation,
} from "../../../api/sharing-agreements/sharing-agreements";
import {
  CoefficientObservationResponseStatus as Status,
  LeavingObservationResponseStatus as LeavingStatus,
  SharingAgreementObservationSummaryResponseRecommendationsItem as Recommendation,
  SharingAgreementReferenceResponseStatus,
  SharingAnomalyResponseType,
  type SharingAgreementObservationResponse,
} from "../../../api/models";
import {
  buildCoefficientObservation,
  buildLeavingObservation,
  buildObservationAnalysis,
  buildObservationStatusCounts,
  buildObservationSummary,
  buildPlant,
  buildPlantCapabilities,
  buildSharingAgreementObservation,
  buildSharingAgreementReference,
  buildSharingAnomaly,
  buildSharingAnomalyCounts,
} from "../../../test/fixtures";
import { SharingAgreementObservationPage } from "./SharingAgreementObservationPage";

vi.mock(import("../../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetPlantById: vi.fn(),
}));

vi.mock(import("../../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSharingAgreementObservation: vi.fn(),
}));

const COMMUNITY_ID = "community-a";
const PLANT_ID = "plant-a";
const AGREEMENT_ID = "revised";

const supply = (id: string, name: string) => ({ id, code: `ES0031000000000${id}JN0F`, name });
const NORTE = supply("001", "Casa Norte");
const SUR = supply("002", "Casa Sur");
const ESTE = supply("003", "Casa Este");
const OESTE = supply("004", "Casa Oeste");
const TALLER = supply("005", "Taller");
const ESCUELA = supply("006", "Escuela");
const BAR = supply("007", "Bar");
const KIOSCO = supply("008", "Kiosco");

const PREVIOUS = buildSharingAgreementReference({
  id: "initial",
  name: "Reparto inicial 2023",
  status: SharingAgreementReferenceResponseStatus.SUPERSEDED,
});

// A row of each kind the page treats apart: applied on its date, applied on
// another, not distinguishable, without data, with an anomaly on its supply,
// and three supplies leaving the distribution, one of them not yet seen to.
function observationFixture(overrides: Partial<SharingAgreementObservationResponse> = {}): SharingAgreementObservationResponse {
  return buildSharingAgreementObservation({
    analysis: buildObservationAnalysis({
      analysedFrom: "2023-04-01",
      analysedTo: "2026-10-31",
      suppliesWithValidDays: [NORTE, SUR, ESTE, TALLER, ESCUELA, BAR, KIOSCO],
      suppliesWithoutValidDays: [OESTE],
    }),
    summary: buildObservationSummary({
      sharingAgreement: buildSharingAgreementReference({
        id: AGREEMENT_ID,
        name: "Reparto 2025",
        status: SharingAgreementReferenceResponseStatus.PUBLISHED,
      }),
      distributorFileSentOn: "2025-02-10",
      mostFrequentObservedDate: { from: "2025-03-01", to: "2025-03-01" },
      coefficientStatusCounts: buildObservationStatusCounts({
        appliedSameDate: 2,
        appliedDifferentDate: 1,
        notDistinguishable: 1,
        noData: 1,
      }),
      leavingStatusCounts: buildObservationStatusCounts({ appliedSameDate: 1, appliedDifferentDate: 1, pendingApplication: 1 }),
      anomalies: [
        buildSharingAnomaly({
          id: "a-taller",
          supply: TALLER,
          type: SharingAnomalyResponseType.REVERTED,
          start: { from: "2025-05-01", to: "2025-05-01" },
          end: null,
          observedBeta: 0.0412,
          observedValidDays: 21,
        }),
      ],
      anomalyCounts: buildSharingAnomalyCounts({ reverted: 1 }),
      unallocatedShare: { days: 200, unallocated: 0.067, registeredShareWithoutData: 0.03 },
      recommendations: [Recommendation.SET_DATES, Recommendation.REVIEW_ANOMALIES],
    }),
    coefficients: [
      buildCoefficientObservation({
        coefficientId: "c-norte",
        supply: NORTE,
        coefficient: 0.0315,
        storedValidFrom: "2025-03-01",
        storedValidTo: null,
        observedDate: { from: "2025-03-01", to: "2025-03-01" },
        // 0.1 percentage points above the registered β: still equal.
        observedBeta: 0.0325,
        observedValidDays: 120,
        status: Status.APPLIED_SAME_DATE,
      }),
      buildCoefficientObservation({
        coefficientId: "c-sur",
        supply: SUR,
        coefficient: 0.0315,
        // Outside the observed range: a stored start within it is the same date.
        storedValidFrom: "2025-03-15",
        storedValidTo: "2026-01-01",
        observedDate: { from: "2025-02-26", to: "2025-03-04" },
        // Just beyond 0.1 percentage points: it differs.
        observedBeta: 0.032501,
        observedValidDays: 120,
        status: Status.APPLIED_DIFFERENT_DATE,
      }),
      buildCoefficientObservation({
        coefficientId: "c-este",
        supply: ESTE,
        coefficient: 0.05,
        storedValidFrom: "2025-03-01",
        observedDate: null,
        proposedDate: { from: "2025-03-01", to: "2025-03-01" },
        observedBeta: 0.05,
        observedValidDays: 120,
        status: Status.NOT_DISTINGUISHABLE,
      }),
      buildCoefficientObservation({
        coefficientId: "c-oeste",
        supply: OESTE,
        coefficient: 0.03,
        storedValidFrom: null,
        observedBeta: null,
        observedValidDays: 0,
        status: Status.NO_DATA,
      }),
      buildCoefficientObservation({
        coefficientId: "c-taller",
        supply: TALLER,
        coefficient: 0.02,
        storedValidFrom: "2025-03-01",
        observedDate: { from: null, to: "2025-03-01" },
        observedBeta: 0.02,
        observedValidDays: 60,
        status: Status.APPLIED_SAME_DATE,
      }),
    ],
    leavingRows: [
      buildLeavingObservation({
        previousCoefficientId: "l-escuela",
        supply: ESCUELA,
        previousSharingAgreement: PREVIOUS,
        previousCoefficient: 0.04,
        storedValidTo: "2025-03-01",
        observedLeavingDate: { from: "2025-03-01", to: "2025-03-01" },
        observedBeta: 0,
        observedValidDays: 90,
        status: LeavingStatus.APPLIED_SAME_DATE,
      }),
      buildLeavingObservation({
        previousCoefficientId: "l-bar",
        supply: BAR,
        previousSharingAgreement: PREVIOUS,
        previousCoefficient: 0.01,
        storedValidTo: null,
        observedLeavingDate: { from: "2025-04-01", to: "2025-04-01" },
        observedBeta: 0,
        observedValidDays: 75,
        status: LeavingStatus.APPLIED_DIFFERENT_DATE,
      }),
      // Not observed leaving: the supply has valid days before this agreement,
      // none in its window, so its observed β is null (OBS-009). An observed
      // leaving always has valid days and therefore a β.
      buildLeavingObservation({
        previousCoefficientId: "l-kiosco",
        supply: KIOSCO,
        previousSharingAgreement: PREVIOUS,
        previousCoefficient: 0.015,
        storedValidTo: "2025-03-01",
        observedLeavingDate: null,
        observedBeta: null,
        observedValidDays: 0,
        status: LeavingStatus.PENDING_APPLICATION,
      }),
    ],
    ...overrides,
  });
}

function renderPage({
  observation = query.success<typeof getSharingAgreementObservation>(observationFixture()),
  hash = "",
}: { observation?: ReturnType<typeof useGetSharingAgreementObservation>; hash?: string } = {}) {
  vi.mocked(useGetPlantById).mockReturnValue(
    query.success<typeof getPlantById>(
      buildPlant({
        id: PLANT_ID,
        name: "Planta Solar Norte",
        community: { id: COMMUNITY_ID },
        capabilities: buildPlantCapabilities({ canRead: true, canListSharingAgreements: true }),
      }),
    ),
  );
  vi.mocked(useGetSharingAgreementObservation).mockReturnValue(observation);
  return renderWithProviders(
    <Routes>
      <Route
        path="/plants/:plantId/sharing-agreements/observed/:sharingAgreementId"
        element={<SharingAgreementObservationPage />}
      />
    </Routes>,
    { route: `/plants/${PLANT_ID}/sharing-agreements/observed/${AGREEMENT_ID}${hash}`, activeCommunityId: COMMUNITY_ID },
  );
}

const suppliesSection = () => screen.getByRole("region", { name: "Por punto de suministro" });
const supplyRow = (name: string) => within(suppliesSection()).getByRole("row", { name: new RegExp(name) });
const leavingSection = () => screen.getByRole("region", { name: /^Salen del reparto/ });
const supplyNames = (section: HTMLElement) =>
  within(section)
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.textContent?.match(/^(Casa (Norte|Sur|Este|Oeste)|Taller|Escuela|Bar|Kiosco)/)?.[0]);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

describe("SharingAgreementObservationPage", () => {
  test("UI-AGR-026: a β is a percentage with 4 decimals, and an observed one within ±0.1 points reads as the registered one", () => {
    renderPage();
    const norte = supplyRow("Casa Norte");

    expect(within(norte).getByText("3,1500 %")).toBeInTheDocument();
    expect(declaredStyle(within(norte).getByText("3,2500 %")).color).toBeUndefined();
  });

  test("UI-AGR-026: an observed β beyond ±0.1 points of the registered one takes the warning style", () => {
    renderPage();

    expect(declaredStyle(within(supplyRow("Casa Sur")).getByText("3,2501 %")).color).toBe(colors.warning.main);
  });

  test("UI-AGR-031: every row shows the observed β the backend returned, and '—' when it returned none", () => {
    renderPage();

    expect(supplyRow("Casa Oeste")).toHaveTextContent(/^Casa Oeste.*3,0000 %—Sin fecha—Sin datos de Datadis$/);
    expect(within(leavingSection()).getByRole("row", { name: /Escuela/ })).toHaveTextContent("4,0000 %0,0000 %");
    expect(within(leavingSection()).getByRole("row", { name: /Bar/ })).toHaveTextContent("1,0000 %0,0000 %");
    expect(within(leavingSection()).getByRole("row", { name: /Kiosco/ })).toHaveTextContent("1,5000 %—");
  });

  test("UI-AGR-025: a registered period ends on its exclusive end, or is in progress", () => {
    renderPage();

    expect(supplyRow("Casa Norte")).toHaveTextContent("01/03/2025 – en curso");
    expect(supplyRow("Casa Sur")).toHaveTextContent("15/03/2025 – 01/01/2026");
  });

  test("UI-AGR-025: an observed date is exact, a range, or 'o antes', and is marked as observed", () => {
    renderPage();

    expect(supplyRow("Casa Norte")).toHaveTextContent("01/03/2025Observada");
    expect(supplyRow("Casa Sur")).toHaveTextContent("Entre el 26/02/2025 y el 04/03/2025Observada");
    expect(supplyRow("Taller")).toHaveTextContent("01/03/2025 o antesObservada");
  });

  test("UI-AGR-027: a row that cannot be distinguished shows the proposed date marked as proposed, never as observed", () => {
    renderPage();
    const este = supplyRow("Casa Este");

    expect(within(este).getByText("No distinguible")).toBeInTheDocument();
    expect(este).toHaveTextContent(
      "Mismo coeficiente que en el acuerdo anterior: en Datadis no se ve cuándo cambió." +
        "01/03/2025Propuesta" +
        "Propuesta: es la fecha de aplicación más frecuente entre los demás puntos de este acuerdo.",
    );
    expect(within(este).queryByText("Observada")).not.toBeInTheDocument();
  });

  test("UI-AGR-027: a row that cannot be distinguished, in an agreement with no other row observed, says there is no proposed date", () => {
    const fixture = observationFixture();
    renderPage({
      observation: query.success<typeof getSharingAgreementObservation>(
        observationFixture({
          summary: {
            ...fixture.summary,
            earliestObservedDate: null,
            mostFrequentObservedDate: null,
            coefficientStatusCounts: buildObservationStatusCounts({ notDistinguishable: 1, pendingApplication: 1 }),
            leavingStatusCounts: buildObservationStatusCounts(),
            anomalies: [],
            anomalyCounts: buildSharingAnomalyCounts(),
            // No row observed: the agreement has no applied window, so
            // neither Σβ nor any row's observed β (OBS-009).
            unallocatedShare: null,
            recommendations: [Recommendation.SET_DATES],
          },
          coefficients: [
            buildCoefficientObservation({
              coefficientId: "c-este",
              supply: ESTE,
              coefficient: 0.05,
              storedValidFrom: "2025-03-01",
              observedDate: null,
              proposedDate: null,
              observedBeta: null,
              observedValidDays: 0,
              status: Status.NOT_DISTINGUISHABLE,
            }),
            buildCoefficientObservation({
              coefficientId: "c-norte",
              supply: NORTE,
              coefficient: 0.0315,
              storedValidFrom: "2025-03-01",
              observedDate: null,
              observedBeta: null,
              observedValidDays: 0,
              status: Status.PENDING_APPLICATION,
            }),
          ],
          leavingRows: [],
        }),
      ),
    });
    const este = supplyRow("Casa Este");

    expect(este).toHaveTextContent(
      "Mismo coeficiente que en el acuerdo anterior: en Datadis no se ve cuándo cambió." +
        "Sin fecha propuesta: ningún otro punto de este acuerdo tiene fecha observada.",
    );
    expect(within(este).queryByText("Propuesta")).not.toBeInTheDocument();
    expect(within(este).queryByText("Observada")).not.toBeInTheDocument();
  });

  test("UI-AGR-028: a supply without data says 'Sin datos de Datadis' and nothing more", () => {
    renderPage();

    expect(within(supplyRow("Casa Oeste")).getAllByRole("cell").at(-1)).toHaveTextContent(/^Sin datos de Datadis$/);
  });

  test("UI-AGR-023: a row of a supply with an anomaly names it beside its status", () => {
    renderPage();

    expect(within(supplyRow("Taller")).getAllByRole("cell").at(-1)).toHaveTextContent(
      /^Aplicado · misma fechaVuelve a un coeficiente anterior$/,
    );
  });

  test("UI-AGR-030: supplies leaving the distribution show the agreement they leave, their β, their leaving and its status", () => {
    renderPage();
    const section = leavingSection();

    expect(within(section).getByRole("heading", { name: "Salen del reparto (3)" })).toBeInTheDocument();
    expect(within(section).getByRole("row", { name: /Escuela/ })).toHaveTextContent(
      "Reparto inicial 20234,0000 %0,0000 %01/03/2025Observada01/03/2025Salida · misma fecha",
    );
    expect(within(section).getByRole("row", { name: /Bar/ })).toHaveTextContent(
      "Reparto inicial 20231,0000 %0,0000 %01/04/2025ObservadaSin fecha de finSalida · otra fecha",
    );
  });

  test("UI-AGR-023: 'Con avisos' keeps the rows with a different date, not distinguishable or with an anomaly, and counts them", async () => {
    renderPage();
    const user = userEvent.setup();

    expect(screen.getByRole("button", { name: "Todos (8)" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Con avisos (4)" }));

    expect(screen.getByRole("button", { name: "Con avisos (4)" })).toHaveAttribute("aria-pressed", "true");
    expect(supplyNames(suppliesSection())).toEqual(["Casa Sur", "Casa Este", "Taller"]);
    expect(supplyNames(leavingSection())).toEqual(["Bar"]);
    expect(within(leavingSection()).getByRole("heading", { name: "Salen del reparto (1)" })).toBeInTheDocument();
  });

  test("UI-AGR-023: the findings show under 'Qué revisar' in the order returned, each with its link", () => {
    renderPage();
    const section = screen.getByRole("region", { name: "Qué revisar" });

    expect(within(section).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Fechas distintas de las registradas1 aplicado en otra fecha · 1 no distinguible · 1 salida en otra fechaFijar fechas",
      "1 anomalía1 vuelve a un coeficiente anteriorVer anomalías",
    ]);
    expect(within(section).getAllByRole("link").map((link) => link.textContent)).toEqual(["Fijar fechas", "Ver anomalías"]);
    expect(within(section).getByRole("link", { name: "Ver anomalías" })).toHaveAttribute(
      "href",
      `/plants/${PLANT_ID}/sharing-agreements/observed/${AGREEMENT_ID}#anomalias`,
    );
    expect(within(section).getByRole("link", { name: "Fijar fechas" })).toHaveAttribute(
      "href",
      `/plants/${PLANT_ID}/sharing-agreements/${AGREEMENT_ID}/application-dates?desde=reparto-observado`,
    );
  });

  test("UI-AGR-023: shows no 'Qué revisar' section when nothing is to review", () => {
    renderPage({
      observation: query.success<typeof getSharingAgreementObservation>(
        observationFixture({
          summary: buildObservationSummary({
            sharingAgreement: buildSharingAgreementReference({ id: AGREEMENT_ID, name: "Reparto 2025" }),
            recommendations: [Recommendation.NONE],
          }),
        }),
      ),
    });

    expect(screen.queryByRole("region", { name: "Qué revisar" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Ninguna/)).not.toBeInTheDocument();
  });

  test("UI-AGR-029: states nothing about what Conluz does with coefficients", () => {
    renderPage();
    const text = document.body.textContent ?? "";

    expect(text).not.toContain("Conluz no corrige coeficientes.");
    expect(text).not.toContain("Conluz no propone coeficientes: revisa el acuerdo o el fichero enviado.");
  });

  test("UI-AGR-024: the agreement's anomalies are open, by supply, with the β the backend observed", () => {
    renderPage();
    const section = screen.getByRole("region", { name: "Anomalías de este acuerdo (1)" });

    expect(within(section).getByRole("button", { name: /Taller/ })).toHaveAttribute("aria-expanded", "true");
    const region = within(section).getByRole("region", { name: /^Taller/ });
    expect(within(section).getByRole("button", { name: /Taller/ })).toHaveAttribute("aria-controls", region.id);
    expect(within(section).getByRole("row", { name: /Vuelve a un coeficiente anterior/ })).toHaveTextContent(
      "Vuelve a un coeficiente anterior01/05/2025en cursoRecibe 4,1200 % en 21 días medibles.",
    );
  });

  test("brings the anomalies into view and focus when it is opened on them (#418)", async () => {
    // jsdom implements no scrolling; the jump is observed through this spy.
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderPage({ hash: "#anomalias" });

    const heading = screen.getByRole("heading", { name: "Anomalías de este acuerdo (1)" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(scrollIntoView).toHaveBeenCalled();
  });

  test("shows only the first ten supplies until asked for all", async () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      buildCoefficientObservation({
        coefficientId: `c-${index}`,
        supply: supply(String(100 + index), `Casa ${index}`),
        status: Status.APPLIED_SAME_DATE,
      }),
    );
    renderPage({
      observation: query.success<typeof getSharingAgreementObservation>(observationFixture({ coefficients: many, leavingRows: [] })),
    });

    expect(within(suppliesSection()).getAllByRole("row")).toHaveLength(11);
    expect(screen.getByText("Mostrando 10 de 12 puntos ·")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Mostrar todos" }));
    expect(within(suppliesSection()).getAllByRole("row")).toHaveLength(13);
  });

  test("names the agreement and its application in the header", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Reparto 2025 según Datadis" })).toBeInTheDocument();
    expect(screen.getByText("10/02/2025")).toBeInTheDocument();
    expect(screen.getByText("Aplicado desde 01/03/2025")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver el acuerdo" })).toHaveAttribute(
      "href",
      `/plants/${PLANT_ID}/sharing-agreements/${AGREEMENT_ID}`,
    );
  });

  test("shows the catalogue's text when the agreement is not observable", () => {
    renderPage({
      observation: query.error(apiError(409, { code: "SHARING_AGREEMENT_NOT_OBSERVABLE", params: null })),
    });

    expect(screen.getByRole("note")).toHaveTextContent(
      "El reparto observado solo está disponible para acuerdos vigentes o históricos.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("says the agreement was not found when the analysis does not know it", () => {
    renderPage({ observation: query.error(apiError(404)) });

    expect(screen.getByText("Acuerdo no encontrado")).toBeInTheDocument();
  });

  test("offers a retry when the analysis fails to load", async () => {
    const refetch = vi.fn();
    renderPage({ observation: { ...query.error(apiError(500)), refetch } });

    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalled();
  });

  test("shows its progress, with no figure, while the analysis computes", () => {
    renderPage({ observation: query.loading() });

    expect(screen.getByText("Calculando el reparto observado…")).toBeInTheDocument();
    expect(screen.queryByText("Fichero enviado")).not.toBeInTheDocument();
  });
});
