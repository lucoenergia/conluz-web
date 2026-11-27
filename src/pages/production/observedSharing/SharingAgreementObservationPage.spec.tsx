import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
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
import { customInstance } from "../../../http/custom-instance";
import { overlayHistorySettled } from "../../../components/ResponsiveOverlay/overlayHistory";
import { SharingAgreementObservationPage } from "./SharingAgreementObservationPage";

/** The agreement's applied window, which a share's figures are computed over. */
const APPLIED_WINDOW = { from: "2025-03-01", to: "2026-04-26" };

vi.mock(import("../../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetPlantById: vi.fn(),
}));

vi.mock(import("../../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSharingAgreementObservation: vi.fn(),
}));

// Every generated request goes through it: the claim text must make none (UI-AGR-046).
vi.mock(import("../../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: vi.fn(),
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
      unallocatedShare: { days: 200, unallocated: 0.067, registeredShareWithoutData: 0.03, ...APPLIED_WINDOW },
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
        windowDays: 200,
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
        windowDays: 200,
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
        windowDays: 200,
        status: Status.NOT_DISTINGUISHABLE,
      }),
      buildCoefficientObservation({
        coefficientId: "c-oeste",
        supply: OESTE,
        coefficient: 0.03,
        storedValidFrom: null,
        observedBeta: null,
        observedValidDays: 0,
        windowDays: 200,
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
        windowDays: 200,
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
        windowDays: 150,
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
        windowDays: 150,
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
        windowDays: 200,
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

async function pickFilter(user: ReturnType<typeof userEvent.setup>, option: string) {
  await user.click(screen.getByRole("combobox", { name: "Estado" }));
  await user.click(await screen.findByRole("option", { name: option }));
}

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

    expect(supplyRow("Casa Oeste")).toHaveTextContent(/^Casa Oeste.*3,0000 %—0 de 200Sin fecha—Sin datos de Datadis$/);
    expect(within(leavingSection()).getByRole("row", { name: /Escuela/ })).toHaveTextContent("4,0000 %—0,0000 %");
    expect(within(leavingSection()).getByRole("row", { name: /Bar/ })).toHaveTextContent("1,0000 %—0,0000 %");
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
      "No está en este acuerdoAcuerdo anterior: Reparto inicial 20234,0000 %—0,0000 %90 de 15001/03/2025ObservadaFin registrado: 01/03/2025Salida · misma fecha",
    );
    expect(within(section).getByRole("row", { name: /Bar/ })).toHaveTextContent(
      "No está en este acuerdoAcuerdo anterior: Reparto inicial 20231,0000 %—0,0000 %75 de 15001/04/2025ObservadaFin registrado: sin fecha de finSalida · otra fecha",
    );
  });

  test("UI-AGR-023: 'Con avisos' keeps the rows with a different date, not distinguishable or with an anomaly, and counts them", async () => {
    renderPage();
    const user = userEvent.setup();

    expect(screen.getByRole("combobox", { name: "Estado" })).toHaveTextContent("Todos (8)");
    await pickFilter(user, "Con avisos (4)");

    expect(screen.getByRole("combobox", { name: "Estado" })).toHaveTextContent("Con avisos (4)");
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
      "Vuelve a un coeficiente anterior01/05/2025en cursoβ observada 4,1200 % · 21 días medibles",
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

  test("UI-AGR-026: β is feminine: the coefficient and leaving columns read 'β registrada', 'β observada' and 'β anterior'", () => {
    renderPage();
    const headers = (section: HTMLElement) =>
      within(section)
        .getAllByRole("columnheader")
        .map((header) => header.textContent)
        .filter((text) => text?.startsWith("β"));

    expect(headers(suppliesSection())).toEqual(["β registrada", "β observada"]);
    expect(headers(leavingSection())).toEqual(["β anterior", "β registrada", "β observada"]);
    expect(document.body.textContent).not.toMatch(/β (registrado|observado)|el β/);
  });

  test("UI-AGR-024: an anomaly's evidence is its observed β and the measurable days it rests on", () => {
    renderPage();
    const anomalies = screen.getByRole("region", { name: /^Anomalías de este acuerdo/ });

    expect(within(anomalies).getByText("β observada 4,1200 % · 21 días medibles")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/válid|Recibe \d/i);
  });

  test("UI-AGR-038: the header offers 'Cómo leer el reparto observado', which opens the help", async () => {
    renderPage();

    await userEvent.setup().click(screen.getByRole("button", { name: "Cómo leer el reparto observado" }));

    expect(await screen.findByRole("dialog", { name: "Cómo leer el reparto observado" })).toBeInTheDocument();
  });

  test("UI-AGR-038: the header link is the page's one way into the help: no column header opens it", () => {
    renderPage();

    expect(screen.getAllByRole("button", { name: /reparto observado|significa|ayuda/i })).toHaveLength(1);
    for (const header of screen.getAllByRole("columnheader")) {
      expect(within(header).queryByRole("button"), header.textContent ?? "").not.toBeInTheDocument();
    }
    expect(screen.getAllByRole("columnheader", { name: "Días medibles" })).toHaveLength(2);
  });

  test("UI-AGR-038: on a phone, 'Cómo leer el reparto observado' stays in the header and opens the help", async () => {
    const width = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 390 });
    // jsdom has no layout: answer the header's (max-width) query, and any (min-width) one, as a 390-px phone would.
    vi.stubGlobal("matchMedia", (query: string) => {
      const min = /min-width:\s*([\d.]+)px/.exec(query)?.[1];
      const max = /max-width:\s*([\d.]+)px/.exec(query)?.[1];
      return {
        matches: (min === undefined || Number(min) <= 390) && (max === undefined || 390 <= Number(max)),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as MediaQueryList;
    });
    try {
      renderPage();
      const heading = screen.getByRole("heading", { level: 1 });
      const link = screen.getByRole("button", { name: "Cómo leer el reparto observado" });

      // In the compact header the link sits in the title block, after the heading.
      expect(heading.parentElement?.parentElement).toContainElement(link);
      await userEvent.setup().click(link);

      expect(await screen.findByRole("dialog", { name: "Cómo leer el reparto observado" })).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
      Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
    }
  });

  describe("UI-AGR-039: an impossible unattributed production share", () => {
    const WARNING =
      "Imposible: los puntos reciben más energía de la que produce la planta. Algún dato de Datadis es erróneo; revisa las anomalías con β observada muy alta.";

    async function renderWithUnattributed(unallocated: number) {
      const fixture = observationFixture();
      renderPage({
        observation: query.success<typeof getSharingAgreementObservation>({
          ...fixture,
          summary: { ...fixture.summary, unallocatedShare: { days: 200, unallocated, registeredShareWithoutData: 0.03, ...APPLIED_WINDOW } },
        }),
      });
      await userEvent.setup().click(screen.getByRole("button", { name: /^Ver \d+ datos? más$/ }));
    }

    const findingTitles = () =>
      within(screen.getByRole("region", { name: "Qué revisar" }))
        .getAllByRole("listitem")
        .map((item) => item.firstElementChild?.nextElementSibling?.firstElementChild?.textContent);

    test("UI-AGR-039: −47,48 % keeps its value, in the warning tone, with the warning under it and the finding first", async () => {
      await renderWithUnattributed(-0.4748);

      expect(declaredStyle(screen.getByText("-47,5 %")).color).toBe(colors.warning.main);
      expect(screen.getByText(WARNING)).toBeInTheDocument();
      expect(findingTitles()[0]).toBe("Reparto mayor que la producción");
      expect(screen.getByText("Los puntos reciben un 47,5 % más de lo que produce la planta.")).toBeInTheDocument();
    });

    test("UI-AGR-039: −0,05 % is rounding: shown as it is, with no warning and no finding", async () => {
      await renderWithUnattributed(-0.0005);

      expect(declaredStyle(screen.getByText("-0,1 %")).color).toBeUndefined();
      expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
      expect(findingTitles()).not.toContain("Reparto mayor que la producción");
    });

    test("UI-AGR-039: 5,74 % shows with no warning and no finding", async () => {
      await renderWithUnattributed(0.0574);

      expect(declaredStyle(screen.getByText("5,7 %")).color).toBeUndefined();
      expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
      expect(findingTitles()).not.toContain("Reparto mayor que la producción");
    });
  });

  describe("the unattributed production in the header", () => {
    async function renderWithShare(unallocatedShare: { days: number; unallocated: number; registeredShareWithoutData: number }) {
      const fixture = observationFixture();
      renderPage({
        observation: query.success<typeof getSharingAgreementObservation>({
          ...fixture,
          summary: { ...fixture.summary, unallocatedShare: { ...unallocatedShare, ...APPLIED_WINDOW } },
        }),
      });
      await userEvent.setup().click(screen.getByRole("button", { name: /^Ver \d+ datos? más$/ }));
    }

    test("UI-AGR-040: it is 'Producción no atribuida', with what it is and over how many measurable days", async () => {
      await renderWithShare({ days: 422, unallocated: 0.0303, registeredShareWithoutData: 0.0437 });

      expect(screen.getByText("Producción no atribuida")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Parte de la producción de la planta que, según Datadis, no llegó a ningún punto con datos durante la aplicación de este acuerdo (422 días medibles del 01/03/2025 al 26/04/2026).",
        ),
      ).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/Σβ|sin explicar/i);
    });

    test("UI-AGR-041: 3,03 % with 4,37 % of supplies without data reads '4,4 %' and 'Resto: −1,3 pp' with its sentence", async () => {
      await renderWithShare({ days: 422, unallocated: 0.0303, registeredShareWithoutData: 0.0437 });

      expect(screen.getByText("4,4 % corresponde a puntos que no tenían datos esos días")).toBeInTheDocument();
      expect(screen.getByText("Resto: -1,3 pp. Los puntos con datos recibieron más de lo registrado.")).toBeInTheDocument();
    });

    test("UI-AGR-041: with no registered share of supplies without data, there is no such line", async () => {
      await renderWithShare({ days: 422, unallocated: 0.0574, registeredShareWithoutData: 0 });

      expect(screen.queryByText(/corresponde a puntos que no tenían datos/)).not.toBeInTheDocument();
      expect(screen.getByText("Resto: +5,7 pp. Producción que no llegó a ningún punto registrado.")).toBeInTheDocument();
    });
  });

  describe("the measurable days of each row", () => {
    // Each row's observedValidDays against its own windowDays.
    const EXPECTED = [
      ["Casa Norte", "120 de 200"],
      ["Casa Sur", "120 de 200"],
      ["Casa Este", "120 de 200"],
      ["Casa Oeste", "0 de 200"],
      ["Taller", "60 de 200"],
    ];

    test("UI-AGR-042: the table shows 'Días medibles', each row's N de M", () => {
      renderPage();
      const column = within(suppliesSection())
        .getAllByRole("columnheader")
        .findIndex((header) => header.textContent === "Días medibles");

      expect(column).toBeGreaterThan(-1);
      for (const [name, days] of EXPECTED) {
        // Cells and header cells, in the order of the column headers.
        const cells = supplyRow(name).querySelectorAll("td, th");
        expect(cells[column], name).toHaveTextContent(new RegExp(`^${days}$`));
      }
    });

    /** The fixture with Casa Norte observed before the agreement's window, and Casa Este the plant's own supply. */
    function renderWithOwnWindows() {
      const fixture = observationFixture();
      renderPage({
        observation: query.success<typeof getSharingAgreementObservation>({
          ...fixture,
          // The agreement's window: 335 measurable days.
          summary: { ...fixture.summary, unallocatedShare: { days: 335, unallocated: 0.03, registeredShareWithoutData: 0, ...APPLIED_WINDOW } },
          coefficients: fixture.coefficients.map((row) => {
            if (row.supply.id === NORTE.id) {
              return { ...row, observedDate: { from: null, to: "2025-01-09" }, observedValidDays: 426, windowDays: 426 };
            }
            if (row.supply.id === ESTE.id) {
              return { ...row, status: Status.NOT_OBSERVABLE, observedBeta: null, observedValidDays: 0, windowDays: 0 };
            }
            return row;
          }),
          leavingRows: fixture.leavingRows.map((row) =>
            row.supply.id === ESCUELA.id ? { ...row, observedValidDays: 410, windowDays: 426 } : row,
          ),
        }),
      });
    }

    const cellIn = (row: HTMLElement, section: HTMLElement) => {
      const column = within(section)
        .getAllByRole("columnheader")
        .findIndex((header) => header.textContent === "Días medibles");
      return row.querySelectorAll("td, th")[column];
    };

    test("UI-AGR-042: a row reads against its own window, '426 de 426', not the agreement's 335 days", () => {
      renderWithOwnWindows();

      expect(cellIn(supplyRow("Casa Norte"), suppliesSection())).toHaveTextContent(/^426 de 426$/);
      expect(cellIn(within(leavingSection()).getByRole("row", { name: /Escuela/ }), leavingSection())).toHaveTextContent(
        /^410 de 426$/,
      );
      expect(document.body.textContent).not.toMatch(/de 335/);
    });

    test("UI-AGR-042: a NOT_OBSERVABLE row shows no measurable days, in the table and on a phone", () => {
      renderWithOwnWindows();
      expect(cellIn(supplyRow("Casa Este"), suppliesSection())).toHaveTextContent(/^$/);
      cleanup();

      const width = window.innerWidth;
      Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 390 });
      try {
        renderWithOwnWindows();
        const list = screen.getByRole("list", { name: "Puntos de suministro del acuerdo" });
        const items = within(list).getAllByRole("listitem");
        const este = items.find((candidate) => candidate.textContent?.startsWith("Casa Este"))!;
        const norte = items.find((candidate) => candidate.textContent?.startsWith("Casa Norte"))!;

        expect(within(este).queryByText("Días medibles de su periodo")).not.toBeInTheDocument();
        expect(within(norte).getByText("Días medibles de su periodo")).toBeInTheDocument();
      } finally {
        Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
      }
    });

    test("UI-AGR-042: on a phone, each stacked row shows its 'Días medibles de su periodo'", () => {
      const width = window.innerWidth;
      Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 390 });
      try {
        renderPage();
        const list = screen.getByRole("list", { name: "Puntos de suministro del acuerdo" });
        for (const [name, days] of EXPECTED) {
          const item = within(list)
            .getAllByRole("listitem")
            .find((candidate) => candidate.textContent?.startsWith(name));
          expect(within(item!).getByText("Días medibles de su periodo").nextElementSibling, name).toHaveTextContent(new RegExp(`^${days}$`));
        }
      } finally {
        Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
      }
    });
  });

  test("UI-AGR-024: an attributed anomaly shows the backend's expected β before its observed one", () => {
    const fixture = observationFixture();
    renderPage({
      observation: query.success<typeof getSharingAgreementObservation>({
        ...fixture,
        summary: {
          ...fixture.summary,
          anomalies: fixture.summary.anomalies.map((anomaly) => ({ ...anomaly, expectedBeta: 0.0315 })),
        },
      }),
    });
    const anomalies = screen.getByRole("region", { name: /^Anomalías de este acuerdo/ });

    expect(within(anomalies).getByText("β esperada 3,1500 % · β observada 4,1200 % · 21 días medibles")).toBeInTheDocument();
  });

  test("UI-AGR-024: an expected β of 0, a supply with no coefficient in the agreement, is shown as 0", () => {
    const fixture = observationFixture();
    renderPage({
      observation: query.success<typeof getSharingAgreementObservation>({
        ...fixture,
        summary: {
          ...fixture.summary,
          anomalies: fixture.summary.anomalies.map((anomaly) => ({ ...anomaly, expectedBeta: 0 })),
        },
      }),
    });

    expect(screen.getByText("β esperada 0,0000 % · β observada 4,1200 % · 21 días medibles")).toBeInTheDocument();
  });

  describe("the window behind each row's measurable days", () => {
    /**
     * Casa Norte with its own window, Casa Sur with none (windowDays 0), Casa
     * Este the plant's own supply, dates and all, and Escuela leaving with its
     * own window.
     */
    function renderWithWindows() {
      const fixture = observationFixture();
      renderPage({
        observation: query.success<typeof getSharingAgreementObservation>({
          ...fixture,
          coefficients: fixture.coefficients.map((row) => {
            if (row.supply.id === NORTE.id) {
              return { ...row, observedValidDays: 410, windowDays: 426, windowFrom: "2025-01-09", windowTo: "2026-10-31" };
            }
            if (row.supply.id === SUR.id) return { ...row, observedValidDays: 0, windowDays: 0, windowFrom: null, windowTo: null };
            if (row.supply.id === ESTE.id) {
              return {
                ...row,
                status: Status.NOT_OBSERVABLE,
                observedBeta: null,
                observedValidDays: 0,
                windowDays: 426,
                windowFrom: "2025-01-09",
                windowTo: "2026-10-31",
              };
            }
            return row;
          }),
          leavingRows: fixture.leavingRows.map((row) =>
            row.supply.id === ESCUELA.id
              ? { ...row, observedValidDays: 380, windowDays: 400, windowFrom: "2025-04-01", windowTo: "2026-10-31" }
              : row,
          ),
        }),
      });
    }

    const daysCell = (row: HTMLElement, section: HTMLElement) => {
      const column = within(section)
        .getAllByRole("columnheader")
        .findIndex((header) => header.textContent === "Días medibles");
      return row.querySelectorAll("td, th")[column] as HTMLElement;
    };

    /** A stacked row's "Días medibles de su periodo" value, or undefined when it has none. */
    const stackedDays = (listName: string, name: string) => {
      const item = within(screen.getByRole("list", { name: listName }))
        .getAllByRole("listitem")
        .find((candidate) => candidate.textContent?.startsWith(name))!;
      return within(item).queryByText("Días medibles de su periodo")?.nextElementSibling;
    };

    test("UI-AGR-042: a coefficient row keeps 'N de M' and adds its window under it", () => {
      renderWithWindows();
      const cell = daysCell(supplyRow("Casa Norte"), suppliesSection());

      expect(cell).toHaveTextContent(/^410 de 426del 09\/01\/2025 al 31\/10\/2026$/);
    });

    test("UI-AGR-042: the interval wraps only before 'al', never inside a date", () => {
      renderWithWindows();
      const cell = daysCell(supplyRow("Casa Norte"), suppliesSection());

      for (const part of ["del 09/01/2025", "al 31/10/2026"]) {
        expect(declaredStyle(within(cell).getByText(part))["white-space"], part).toBe("nowrap");
      }
    });

    test("UI-AGR-042: a leaving row adds its own window", () => {
      renderWithWindows();
      const escuela = within(leavingSection()).getByRole("row", { name: /Escuela/ });

      expect(daysCell(escuela, leavingSection())).toHaveTextContent(/^380 de 400del 01\/04\/2025 al 31\/10\/2026$/);
    });

    test("UI-AGR-042: a row with no window (null dates, windowDays 0) shows no interval", () => {
      renderWithWindows();

      expect(daysCell(supplyRow("Casa Sur"), suppliesSection())).toHaveTextContent(/^0 de 0$/);
    });

    test("UI-AGR-042: a NOT_OBSERVABLE row shows neither its days nor its window, even when it has one", () => {
      renderWithWindows();

      expect(daysCell(supplyRow("Casa Este"), suppliesSection())).toHaveTextContent(/^$/);
      expect(document.body.textContent?.match(/del 09\/01\/2025 al 31\/10\/2026/g)).toHaveLength(1);
    });

    test("UI-AGR-042: on a phone, each stacked row gives its window under 'N de M'; none without one, nothing for NOT_OBSERVABLE", () => {
      const width = window.innerWidth;
      Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 390 });
      try {
        renderWithWindows();

        expect(stackedDays("Puntos de suministro del acuerdo", "Casa Norte")).toHaveTextContent(
          /^410 de 426del 09\/01\/2025 al 31\/10\/2026$/,
        );
        expect(stackedDays("Puntos de suministro del acuerdo", "Casa Sur")).toHaveTextContent(/^0 de 0$/);
        expect(stackedDays("Puntos de suministro del acuerdo", "Casa Este")).toBeUndefined();
        expect(stackedDays("Puntos que salen del reparto", "Escuela")).toHaveTextContent(
          /^380 de 400del 01\/04\/2025 al 31\/10\/2026$/,
        );
      } finally {
        Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
      }
    });

    test("UI-AGR-040: the explanatory line gives the agreement's applied window, from the backend's from and to", async () => {
      const fixture = observationFixture();
      renderPage({
        observation: query.success<typeof getSharingAgreementObservation>({
          ...fixture,
          summary: {
            ...fixture.summary,
            unallocatedShare: { days: 422, unallocated: 0.03, registeredShareWithoutData: 0, from: "2025-03-04", to: "2026-10-31" },
          },
        }),
      });

      await userEvent.setup().click(screen.getByRole("button", { name: /^Ver \d+ datos? más$/ }));

      expect(screen.getByText(/\(422 días medibles del 04\/03\/2025 al 31\/10\/2026\)\.$/)).toBeInTheDocument();
    });
  });

  describe("the period the measurable days cover", () => {
    test("UI-AGR-042: on a phone, a stacked row labels its figure 'Días medibles de su periodo', and no row says 'Días medibles' alone", () => {
      const width = window.innerWidth;
      Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 390 });
      try {
        renderPage();

        expect(within(suppliesSection()).getAllByText("Días medibles de su periodo").length).toBeGreaterThan(0);
        expect(within(leavingSection()).getAllByText("Días medibles de su periodo").length).toBeGreaterThan(0);
        expect(screen.queryByText("Días medibles")).not.toBeInTheDocument();
      } finally {
        Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
      }
    });

    test("UI-AGR-040: the explanatory line says the dates of the agreement's application period", async () => {
      renderPage();

      await userEvent.setup().click(screen.getByRole("button", { name: /^Ver \d+ datos? más$/ }));

      expect(screen.getByText(/días medibles del 01\/03\/2025 al 26\/04\/2026\)\.$/)).toBeInTheDocument();
    });
  });
  describe("supplies that drop to 0 %", () => {
    /**
     * Casa Sur flagged by the backend as leaving the distribution: 0 % here,
     * a little observed, seen applied on 04/03/2025. `leavingRows` replaces
     * the absent supplies when given.
     */
    function renderWithSurLeaving(leavingRows?: SharingAgreementObservationResponse["leavingRows"]) {
      const fixture = observationFixture();
      renderPage({
        observation: query.success<typeof getSharingAgreementObservation>({
          ...fixture,
          coefficients: fixture.coefficients.map((row) =>
            row.supply.id === SUR.id
              ? {
                  ...row,
                  coefficient: 0,
                  leavesDistribution: true,
                  observedDate: { from: "2025-03-04", to: "2025-03-04" },
                  observedBeta: 0.0002,
                }
              : row,
          ),
          leavingRows: leavingRows ?? fixture.leavingRows,
        }),
      });
    }

    test("UI-AGR-030: 'Salen del reparto' counts and lists both kinds, each with its reason", () => {
      renderWithSurLeaving();
      const section = leavingSection();

      expect(within(section).getByRole("heading", { name: "Salen del reparto (4)" })).toBeInTheDocument();
      expect(within(section).getAllByRole("columnheader").map((header) => header.textContent)).toContain("Motivo");
      expect(supplyNames(section)).toEqual(["Escuela", "Bar", "Kiosco", "Casa Sur"]);
      expect(within(section).getByRole("row", { name: /Escuela/ })).toHaveTextContent(/^Escuela\S+No está en este acuerdo/);
    });

    test("UI-AGR-030: a 'Pasa a 0 %' row shows its β registrada, β observada, observed date and status", () => {
      renderWithSurLeaving();

      expect(within(leavingSection()).getByRole("row", { name: /Casa Sur/ })).toHaveTextContent(
        "Pasa a 0 %—0,0000 %0,0200 %120 de 20004/03/2025ObservadaAplicado · otra fecha",
      );
    });

    test("UI-AGR-030: the 0 % row stays in 'Por punto de suministro', marked 'Sale del reparto'; the others are not", () => {
      renderWithSurLeaving();

      expect(supplyNames(suppliesSection())).toContain("Casa Sur");
      expect(within(supplyRow("Casa Sur")).getByText("Sale del reparto")).toBeVisible();
      expect(within(suppliesSection()).getAllByText("Sale del reparto")).toHaveLength(1);
    });

    test("UI-AGR-030: with absent supplies only, no row reads 'Pasa a 0 %' and none is marked", () => {
      renderPage();

      expect(within(leavingSection()).getByRole("heading", { name: "Salen del reparto (3)" })).toBeInTheDocument();
      expect(screen.queryByText("Pasa a 0 %")).not.toBeInTheDocument();
      expect(screen.queryByText("Sale del reparto")).not.toBeInTheDocument();
      expect(within(leavingSection()).getAllByText("No está en este acuerdo")).toHaveLength(3);
    });

    test("UI-AGR-030: with only a supply dropping to 0 %, the section lists it alone", () => {
      renderWithSurLeaving([]);
      const section = leavingSection();

      expect(within(section).getByRole("heading", { name: "Salen del reparto (1)" })).toBeInTheDocument();
      expect(supplyNames(section)).toEqual(["Casa Sur"]);
      expect(within(section).queryByText("No está en este acuerdo")).not.toBeInTheDocument();
    });

    test("UI-AGR-030: in the table, a β never wraps inside its figure, and an absent supply's registered end sits under its leaving", () => {
      renderWithSurLeaving();
      const section = leavingSection();
      const escuela = within(section).getByRole("row", { name: /Escuela/ });
      const sur = within(section).getByRole("row", { name: /Casa Sur/ });

      // The figure, or the span around it inside its cell, is kept on one line.
      const keptWhole = (figure: HTMLElement) => {
        for (let node: HTMLElement | null = figure; node && node.tagName !== "TD"; node = node.parentElement) {
          if (declaredStyle(node)["white-space"] === "nowrap") return true;
        }
        return false;
      };
      for (const figure of [within(escuela).getByText("4,0000 %"), within(sur).getByText("0,0000 %"), within(sur).getByText("0,0200 %")]) {
        expect(keptWhole(figure), figure.textContent ?? "").toBe(true);
      }
      expect(within(escuela).getByText("Fin registrado: 01/03/2025")).toBeInTheDocument();
      expect(within(section).queryByRole("columnheader", { name: "Fin registrado" })).not.toBeInTheDocument();
      expect(within(sur).queryByText(/^Fin registrado/)).not.toBeInTheDocument();
    });

    test("UI-AGR-030: on a phone, the 0 % row's stacked fields give its reason, β and observed leaving", () => {
      const width = window.innerWidth;
      Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 390 });
      try {
        renderWithSurLeaving();
        const item = within(screen.getByRole("list", { name: "Puntos que salen del reparto" }))
          .getAllByRole("listitem")
          .find((candidate) => candidate.textContent?.startsWith("Casa Sur"))!;
        const field = (label: string) => within(item).getByText(label).nextElementSibling;

        expect(field("Motivo")).toHaveTextContent(/^Pasa a 0 %$/);
        expect(field("β registrada")).toHaveTextContent(/^0,0000 %$/);
        expect(field("β observada")).toHaveTextContent(/^0,0200 %$/);
        expect(field("Salida observada")).toHaveTextContent(/^04\/03\/2025Observada$/);
        expect(within(item).queryByText("Acuerdo anterior")).not.toBeInTheDocument();
      } finally {
        Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
      }
    });
  });

  describe("not applied coefficients and swapped supplies (#451)", () => {
    // Modelled on the real case: Casa Luna and Casa Sol receive each other's
    // coefficient; Casa Luna also has a stretch not applied with no swap, and
    // Taller another kind of anomaly.
    const LUNA = supply("011", "Casa Luna");
    const SOL = supply("012", "Casa Sol");
    const notApplied = (id: string, of: typeof LUNA, swappedWith: typeof LUNA | null, observedBeta: number, days: number) =>
      buildSharingAnomaly({
        id,
        supply: of,
        type: SharingAnomalyResponseType.NOT_APPLIED,
        start: { from: "2025-03-01", to: "2025-03-01" },
        end: "2025-06-30",
        expectedBeta: of === LUNA ? 0.0315 : 0.0412,
        observedBeta,
        observedValidDays: days,
        swappedWith,
      });
    const ANOMALIES = [
      notApplied("na-luna-1", LUNA, SOL, 0.0412, 21),
      notApplied("na-luna-2", LUNA, SOL, 0.0411, 14),
      notApplied("na-luna-3", LUNA, null, 0.05, 9),
      notApplied("na-sol", SOL, LUNA, 0.0315, 35),
      buildSharingAnomaly({
        id: "uc-taller",
        supply: TALLER,
        type: SharingAnomalyResponseType.UNKNOWN_COEFFICIENT,
        observedBeta: 0.02,
        observedValidDays: 30,
      }),
    ];

    function renderWithSwaps(anomalies = ANOMALIES) {
      const fixture = observationFixture();
      renderPage({
        observation: query.success<typeof getSharingAgreementObservation>({
          ...fixture,
          summary: {
            ...fixture.summary,
            anomalies,
            anomalyCounts: buildSharingAnomalyCounts({ unknownCoefficient: 1, notApplied: 4 }),
            recommendations: [Recommendation.REVIEW_ANOMALIES],
          },
        }),
      });
      return screen.getByRole("region", { name: `Anomalías de este acuerdo (${anomalies.length})` });
    }
    const supplyAnomalies = (section: HTMLElement, name: string) => within(section).getByRole("region", { name: new RegExp(`^${name}`) });

    test("UI-AGR-043: a not applied coefficient reads 'Coeficiente no aplicado' with the expected and observed β and measurable days returned", () => {
      const section = renderWithSwaps();
      const rows = within(supplyAnomalies(section, "Casa Luna")).getAllByRole("row", { name: /^Coeficiente no aplicado/ });

      expect(rows).toHaveLength(3);
      expect(rows[0]).toHaveTextContent("β esperada 3,1500 % · β observada 4,1200 % · 21 días medibles");
      expect(rows[2]).toHaveTextContent("β esperada 3,1500 % · β observada 5,0000 % · 9 días medibles");
      expect(within(supplyAnomalies(section, "Casa Sol")).getByRole("row", { name: /^Coeficiente no aplicado/ })).toHaveTextContent(
        "β esperada 4,1200 % · β observada 3,1500 % · 35 días medibles",
      );
    });

    test("UI-AGR-043: not applied coefficients are counted under 'Qué revisar'", () => {
      renderWithSwaps();
      const findings = screen.getByRole("region", { name: "Qué revisar" });

      expect(within(findings).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
        "5 anomalías1 coeficiente no registrado · 4 coeficientes no aplicadosVer anomalías",
      ]);
    });

    test("UI-AGR-044: a swapped anomaly names the other supply and its CUPS, the name leading to its anomalies", async () => {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      const section = renderWithSwaps();
      const [swapped] = within(supplyAnomalies(section, "Casa Luna")).getAllByRole("row", { name: /^Coeficiente no aplicado/ });

      expect(swapped).toHaveTextContent(`Intercambiado con Casa Sol (${SOL.code})`);
      await userEvent.setup().click(within(swapped).getByRole("link", { name: "Casa Sol" }));

      const sol = within(section).getByRole("button", { name: /^Casa Sol/ });
      expect(sol).toHaveFocus();
      expect(sol).toHaveAttribute("aria-expanded", "true");
      expect(scrollIntoView).toHaveBeenCalled();
    });

    test("UI-AGR-044: the swap is named on both supplies, each leading to the other", () => {
      const section = renderWithSwaps();
      const sol = within(supplyAnomalies(section, "Casa Sol")).getByRole("row", { name: /^Coeficiente no aplicado/ });

      expect(sol).toHaveTextContent(`Intercambiado con Casa Luna (${LUNA.code})`);
      expect(within(sol).getByRole("link", { name: "Casa Luna" })).toHaveAttribute(
        "href",
        `#${within(section).getByRole("button", { name: /^Casa Luna/ }).id}`,
      );
    });

    test("UI-AGR-044: an anomaly with no swap names no supply", () => {
      const section = renderWithSwaps();
      const rows = within(supplyAnomalies(section, "Casa Luna")).getAllByRole("row", { name: /^Coeficiente no aplicado/ });

      expect(rows[2]).not.toHaveTextContent("Intercambiado");
      expect(within(rows[2]).queryByRole("link")).not.toBeInTheDocument();
      expect(within(supplyAnomalies(section, "Taller")).getByRole("row", { name: /^Coeficiente no registrado/ })).not.toHaveTextContent(
        "Intercambiado",
      );
    });

    test("UI-AGR-044: a supply whose anomalies are not on the page is named as plain text", () => {
      const section = renderWithSwaps([notApplied("na-luna-1", LUNA, ESTE, 0.0412, 21)]);
      const row = within(section).getByRole("row", { name: /^Coeficiente no aplicado/ });

      expect(row).toHaveTextContent(`Intercambiado con Casa Este (${ESTE.code})`);
      expect(within(row).queryByRole("link")).not.toBeInTheDocument();
    });

    test("UI-AGR-044: on a phone, the stacked anomaly gives its evidence and the swap on lines of their own", async () => {
      const width = window.innerWidth;
      Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 390 });
      try {
        const section = renderWithSwaps();
        const [swapped] = within(within(section).getByRole("list", { name: "Anomalías de Casa Luna" })).getAllByRole("listitem");

        expect(within(swapped).getByText("β esperada 3,1500 % · β observada 4,1200 % · 21 días medibles")).toBeInTheDocument();
        expect(within(swapped).getByText(/^Intercambiado con/)).toHaveTextContent(`Intercambiado con Casa Sol (${SOL.code})`);
        await userEvent.setup().click(within(swapped).getByRole("link", { name: "Casa Sol" }));
        expect(within(section).getByRole("button", { name: /^Casa Sol/ })).toHaveFocus();
      } finally {
        Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
      }
    });
  });
  describe("the claim text (#436)", () => {
    const CLAIM_BUTTON = "Preparar texto de reclamación";

    async function openClaim() {
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: CLAIM_BUTTON }));
      await act(() => overlayHistorySettled());
      return { user, dialog: screen.getByRole("dialog", { name: "Texto de reclamación" }) };
    }

    const withAnomalies = (anomalies: ReturnType<typeof buildSharingAnomaly>[]) => {
      const fixture = observationFixture();
      return query.success<typeof getSharingAgreementObservation>({
        ...fixture,
        summary: { ...fixture.summary, anomalies },
      });
    };

    afterEach(async () => {
      // An overlay left open gives its history entry back on unmount.
      cleanup();
      await act(() => overlayHistorySettled());
    });

    test("UI-AGR-046: 'Preparar texto de reclamación' is offered in the agreement's anomalies when one is claimable", () => {
      renderPage();

      const section = screen.getByRole("region", { name: "Anomalías de este acuerdo (1)" });
      expect(within(section).getByRole("button", { name: CLAIM_BUTTON })).toBeInTheDocument();
    });

    test("UI-AGR-046: the button is not rendered when the agreement has no anomaly", () => {
      renderPage({ observation: withAnomalies([]) });

      expect(screen.getByRole("heading", { name: "Anomalías de este acuerdo" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: CLAIM_BUTTON })).not.toBeInTheDocument();
    });

    test("UI-AGR-046: the button is not rendered when the agreement's only anomaly is APPLIED_BEFORE_SENT", () => {
      renderPage({
        observation: withAnomalies([
          buildSharingAnomaly({ supply: NORTE, type: SharingAnomalyResponseType.APPLIED_BEFORE_SENT, expectedBeta: 0.03 }),
        ]),
      });

      expect(screen.getByRole("heading", { name: "Anomalías de este acuerdo (1)" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: CLAIM_BUTTON })).not.toBeInTheDocument();
    });

    test("UI-AGR-047: the agreement's claim lists its claimable anomalies, in date order, and leaves out APPLIED_BEFORE_SENT", async () => {
      renderPage({
        observation: withAnomalies([
          buildSharingAnomaly({
            supply: NORTE,
            type: SharingAnomalyResponseType.NOT_APPLIED,
            start: { from: "2025-09-01", to: "2025-09-01" },
            end: null,
            expectedBeta: 0.0315,
            observedBeta: 0.0412,
          }),
          buildSharingAnomaly({
            supply: SUR,
            type: SharingAnomalyResponseType.APPLIED_BEFORE_SENT,
            start: { from: "2025-02-10", to: "2025-02-10" },
            end: "2025-02-19",
          }),
          buildSharingAnomaly({
            supply: NORTE,
            type: SharingAnomalyResponseType.NOT_APPLIED,
            start: { from: "2025-03-01", to: "2025-03-01" },
            end: "2025-06-30",
            expectedBeta: 0.0315,
            observedBeta: 0.0123,
          }),
        ]),
      });
      const { dialog } = await openClaim();

      const text = (within(dialog).getByRole("textbox", { name: "Texto de reclamación" }) as HTMLTextAreaElement).value;
      const items = text.split("\n\n").filter((block) => /^\d+\. CUPS /.test(block));
      expect(items).toEqual([
        `1. CUPS ${NORTE.code}.\nDel 01/03/2025 al 30/06/2025, no se le ha aplicado el coeficiente comunicado de 3,1500 %; recibe aproximadamente un 1,23 %.`,
        `2. CUPS ${NORTE.code}.\nDesde el 01/09/2025 hasta la fecha de los últimos datos publicados (31/10/2026), no se le ha aplicado el coeficiente comunicado de 3,1500 %; recibe aproximadamente un 4,12 %.`,
      ]);
      expect(text).not.toContain(SUR.code);
    });

    test("UI-AGR-046, UI-AGR-049: opening the dialog and copying make no request", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, "open");
      try {
        renderPage();
        const { user, dialog } = await openClaim();
        Object.defineProperty(navigator, "clipboard", {
          value: { writeText: vi.fn().mockResolvedValue(undefined) },
          configurable: true,
          writable: true,
        });
        await user.click(within(dialog).getByRole("button", { name: "Copiar texto" }));

        expect(within(dialog).getByRole("status")).toHaveTextContent("Texto copiado.");
        expect(customInstance).not.toHaveBeenCalled();
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(xhrSpy).not.toHaveBeenCalled();
      } finally {
        fetchSpy.mockRestore();
        xhrSpy.mockRestore();
      }
    });
  });
});

describe("UI-AGR-045: filtering the supply rows by status", () => {
  const point = (n: number) => supply(String(200 + n), `Punto ${String(n).padStart(2, "0")}`);
  const PLANT_SUPPLY = supply("999", "Planta Solar Norte");
  const points = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => point(from + index));
  const row = (target: ReturnType<typeof supply>, status: Status, overrides: Parameters<typeof buildCoefficientObservation>[0] = {}) =>
    buildCoefficientObservation({ coefficientId: `c-${target.id}`, supply: target, status, ...overrides });

  // Six statuses over 19 rows, more than the ten shown at first; none pending.
  // Points 01 to 06 have an anomaly, so "Con avisos" also keeps more than ten.
  // Point 14 drops to 0 % and point 20 is absent: both leave the distribution.
  const ROWS = [
    ...points(1, 11).map((target) => row(target, Status.APPLIED_SAME_DATE)),
    row(point(12), Status.APPLIED_DIFFERENT_DATE),
    row(point(13), Status.APPLIED_DIFFERENT_DATE),
    row(point(14), Status.APPLIED_DIFFERENT_DATE, { coefficient: 0, leavesDistribution: true }),
    row(point(15), Status.NOT_DISTINGUISHABLE),
    row(point(16), Status.NOT_DISTINGUISHABLE),
    row(point(17), Status.NOT_OBSERVED),
    row(point(18), Status.NO_DATA),
    row(PLANT_SUPPLY, Status.NOT_OBSERVABLE),
  ];
  const COUNTS = buildObservationStatusCounts({
    appliedSameDate: 11,
    appliedDifferentDate: 3,
    notDistinguishable: 2,
    notObserved: 1,
    noData: 1,
    notObservable: 1,
  });

  function statusObservation(coefficients = ROWS, coefficientStatusCounts = COUNTS): SharingAgreementObservationResponse {
    return buildSharingAgreementObservation({
      summary: buildObservationSummary({
        sharingAgreement: buildSharingAgreementReference({ id: AGREEMENT_ID, name: "Reparto 2025" }),
        coefficientStatusCounts,
        leavingStatusCounts: buildObservationStatusCounts({ appliedSameDate: 1 }),
        leavesDistributionStatusCounts: buildObservationStatusCounts({ appliedDifferentDate: 1 }),
        anomalies: points(1, 6).map((target) =>
          buildSharingAnomaly({ id: `a-${target.id}`, supply: target, type: SharingAnomalyResponseType.REVERTED }),
        ),
        anomalyCounts: buildSharingAnomalyCounts({ reverted: 6 }),
      }),
      coefficients,
      leavingRows: [
        buildLeavingObservation({
          previousCoefficientId: "l-20",
          supply: point(20),
          previousSharingAgreement: PREVIOUS,
          status: LeavingStatus.APPLIED_SAME_DATE,
        }),
      ],
    });
  }

  const renderStatusPage = (observation = statusObservation()) =>
    renderPage({ observation: query.success<typeof getSharingAgreementObservation>(observation) });

  const names = (section: HTMLElement) =>
    within(section)
      .getAllByRole("row")
      .slice(1)
      .map((tableRow) => tableRow.textContent?.match(/^(Punto \d\d|Planta Solar Norte)/)?.[0]);

  const optionLabels = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("combobox", { name: "Estado" }));
    const labels = (await screen.findAllByRole("option")).map((option) => option.textContent);
    await user.keyboard("{Escape}");
    return labels;
  };

  test("UI-AGR-045: each status with rows is offered with its count, after 'Todos' and 'Con avisos', in the card's order", async () => {
    renderStatusPage();

    expect(await optionLabels(userEvent.setup())).toEqual([
      "Todos (20)",
      "Con avisos (11)",
      "Aplicado · misma fecha (11)",
      "Aplicado · otra fecha (3)",
      "No distinguible (2)",
      "Sin observar (1)",
      "Sin datos de Datadis (1)",
      "No observable · punto de la planta (1)",
    ]);
  });

  test("UI-AGR-045: a status the agreement counts no row in is not offered", async () => {
    renderStatusPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("combobox", { name: "Estado" }));
    expect(await screen.findByRole("option", { name: "Sin observar (1)" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /^Pendiente/ })).not.toBeInTheDocument();
  });

  test("UI-AGR-045: selecting a status lists only its rows", async () => {
    renderStatusPage();
    const user = userEvent.setup();

    await pickFilter(user, "Aplicado · otra fecha (3)");

    expect(screen.getByRole("combobox", { name: "Estado" })).toHaveTextContent("Aplicado · otra fecha (3)");
    expect(names(suppliesSection())).toEqual(["Punto 12", "Punto 13", "Punto 14"]);
  });

  test("UI-AGR-045: the plant supply's row is offered as 'No observable · punto de la planta' and listed alone", async () => {
    renderStatusPage();

    await pickFilter(userEvent.setup(), "No observable · punto de la planta (1)");

    expect(names(suppliesSection())).toEqual(["Planta Solar Norte"]);
  });

  test("UI-AGR-045: 'Todos' lists every row, and 'Con avisos' the rows it kept before", async () => {
    renderStatusPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Mostrar todos" }));

    expect(names(suppliesSection())).toEqual([...points(1, 18).map((target) => target.name), "Planta Solar Norte"]);
    await pickFilter(user, "Con avisos (11)");
    expect(names(suppliesSection())).toEqual([
      ...points(1, 6).map((target) => target.name),
      "Punto 12",
      "Punto 13",
      "Punto 14",
      "Punto 15",
      "Punto 16",
    ]);
    await pickFilter(user, "Todos (20)");
    expect(names(suppliesSection())).toHaveLength(19);
  });

  test("UI-AGR-045: picking a status, or leaving one, starts over from the first ten rows", async () => {
    renderStatusPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Mostrar todos" }));

    await pickFilter(user, "Aplicado · misma fecha (11)");
    expect(names(suppliesSection())).toEqual(points(1, 10).map((target) => target.name));
    expect(screen.getByText("Mostrando 10 de 11 puntos ·")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mostrar todos" }));
    expect(names(suppliesSection())).toHaveLength(11);
    await pickFilter(user, "Todos (20)");
    expect(names(suppliesSection())).toHaveLength(10);
    expect(screen.getByText("Mostrando 10 de 19 puntos ·")).toBeInTheDocument();
  });

  test("UI-AGR-045: switching between 'Todos' and 'Con avisos' keeps every row shown", async () => {
    renderStatusPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Mostrar todos" }));

    await pickFilter(user, "Con avisos (11)");

    expect(names(suppliesSection())).toHaveLength(11);
    expect(screen.queryByRole("button", { name: "Mostrar todos" })).not.toBeInTheDocument();
  });

  test("UI-AGR-045: a status leaves 'Salen del reparto' as under 'Todos'", async () => {
    renderStatusPage();
    const user = userEvent.setup();
    const underAll = names(leavingSection());

    await pickFilter(user, "Sin observar (1)");

    expect(underAll).toEqual(["Punto 20", "Punto 14"]);
    expect(names(leavingSection())).toEqual(underAll);
    expect(within(leavingSection()).getByRole("heading", { name: "Salen del reparto (2)" })).toBeInTheDocument();
  });

  test("UI-AGR-045: when a refetch leaves the selected status with no row, the filter reads 'Todos'", async () => {
    const warn = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");
    try {
      const { rerender } = renderStatusPage();
      const user = userEvent.setup();
      await pickFilter(user, "Sin observar (1)");
      expect(names(suppliesSection())).toEqual(["Punto 17"]);

      // The supply that was not observed is now observed applied on its date.
      const refetched = statusObservation(
        ROWS.map((candidate) =>
          candidate.supply.id === point(17).id ? { ...candidate, status: Status.APPLIED_SAME_DATE } : candidate,
        ),
        { ...COUNTS, appliedSameDate: 12, notObserved: 0 },
      );
      vi.mocked(useGetSharingAgreementObservation).mockReturnValue(
        query.success<typeof getSharingAgreementObservation>(refetched),
      );
      rerender(
        <Routes>
          <Route
            path="/plants/:plantId/sharing-agreements/observed/:sharingAgreementId"
            element={<SharingAgreementObservationPage />}
          />
        </Routes>,
      );

      expect(screen.getByRole("combobox", { name: "Estado" })).toHaveTextContent("Todos (20)");
      await user.click(screen.getByRole("button", { name: "Mostrar todos" }));
      expect(names(suppliesSection())).toHaveLength(19);
      const logged = [...warn.mock.calls, ...error.mock.calls].map((call) => call.join(" "));
      expect(logged.filter((message) => /out-of-range/.test(message))).toEqual([]);
    } finally {
      warn.mockRestore();
      error.mockRestore();
    }
  });

  test("UI-AGR-045: on a phone, the status is picked in the 'Filtros' panel and the rows stay stacked", async () => {
    const width = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 390 });
    try {
      renderStatusPage();
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "Filtros" }));
      await user.click(screen.getByRole("radio", { name: "Sin observar (1)" }));

      const list = screen.getByRole("list", { name: "Puntos de suministro del acuerdo" });
      expect(within(list).getAllByRole("listitem").map((item) => item.textContent?.match(/^Punto \d\d/)?.[0])).toEqual([
        "Punto 17",
      ]);
      expect(within(suppliesSection()).queryByRole("table")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Estado: Sin observar (1)" })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Ver 1 punto" }));
      expect(screen.queryByRole("radio", { name: "Sin observar (1)" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Filtros, 1 activo" })).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
    }
  });
});
