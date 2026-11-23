import "@testing-library/jest-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { mutation, query } from "../../../test/queryState";
import { apiError } from "../../../test/apiError";
import { useGetPlantById, type getPlantById } from "../../../api/plants/plants";
import {
  useGetSharingAgreementById,
  useGetSharingAgreementObservation,
  useGetSharingAgreementPartitionCoefficients,
  usePreviewPartitionCoefficientDates,
  useSetPartitionCoefficientDates,
  type getSharingAgreementById,
  type getSharingAgreementObservation,
  type getSharingAgreementPartitionCoefficients,
} from "../../../api/sharing-agreements/sharing-agreements";
import {
  AgreementStatusChangeResponseStatusAfter,
  AgreementStatusChangeResponseStatusBefore,
  CoefficientObservationResponseStatus as Status,
  LeavingClosureChangeResponseSource,
  LeavingObservationResponseStatus as LeavingStatus,
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementReferenceResponseStatus,
  SharingAgreementResponseStatus,
  type CoefficientDatesEffectsResponse,
  type SetCoefficientDatesBody,
  type SharingAgreementResponse,
} from "../../../api/models";
import {
  buildCoefficient,
  buildCoefficientObservation,
  buildLeavingObservation,
  buildPlant,
  buildPlantCapabilities,
  buildSharingAgreement,
  buildSharingAgreementCapabilities,
  buildSharingAgreementObservation,
  buildSharingAgreementReference,
} from "../../../test/fixtures";
import { ApplicationDatesPage } from "./ApplicationDatesPage";
import { DRY_RUN_DELAY_MS } from "./dryRunDelay";

vi.mock(import("../../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetPlantById: vi.fn(),
}));

vi.mock(import("../../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSharingAgreementById: vi.fn(),
  useGetSharingAgreementPartitionCoefficients: vi.fn(),
  useGetSharingAgreementObservation: vi.fn(),
  usePreviewPartitionCoefficientDates: vi.fn(),
  useSetPartitionCoefficientDates: vi.fn(),
}));

const COMMUNITY_ID = "community-a";
const PLANT_ID = "plant-a";
const AGREEMENT_ID = "revised";
const PATH = `/plants/${PLANT_ID}/sharing-agreements/${AGREEMENT_ID}/application-dates`;
const FROM_OBSERVED = `${PATH}?desde=reparto-observado`;

const supply = (id: string, name: string) => ({ id: `s-${id}`, code: `ES0031000000000${id}JN0F`, name });
const NORTE = supply("001", "Casa Norte");
const SUR = supply("002", "Casa Sur");
const ESTE = supply("003", "Casa Este");
const OESTE = supply("004", "Casa Oeste");
const TALLER = supply("005", "Taller");
const BAR = supply("007", "Bar");
const KIOSCO = supply("008", "Kiosco");

const PREVIOUS = buildSharingAgreementReference({
  id: "initial",
  name: "Reparto inicial 2023",
  status: SharingAgreementReferenceResponseStatus.PUBLISHED,
});
const THIS = buildSharingAgreementReference({
  id: AGREEMENT_ID,
  name: "Reparto 2025",
  status: SharingAgreementReferenceResponseStatus.PUBLISHED,
});

function agreementFixture(overrides: Partial<SharingAgreementResponse> = {}): SharingAgreementResponse {
  return buildSharingAgreement({
    id: AGREEMENT_ID,
    plantId: PLANT_ID,
    name: "Reparto 2025",
    status: SharingAgreementResponseStatus.PUBLISHED,
    distributorFileSentOn: "2025-02-10",
    capabilities: buildSharingAgreementCapabilities({ canRead: true, canManage: true }),
    ...overrides,
  });
}

const { APPLIED, PENDING } = SharingAgreementPartitionCoefficientResponseApplicationState;

// Five coefficients of one agreement: four pending, one already dated
// (Casa Sur, 15/03/2025 in Madrid, written as the UTC instant of its midnight).
const COEFFICIENTS = [
  buildCoefficient({ coefficientId: "c-norte", supply: NORTE, coefficient: 0.0315, applicationState: PENDING }),
  buildCoefficient({
    coefficientId: "c-sur",
    supply: SUR,
    coefficient: 0.0325,
    applicationState: APPLIED,
    validFrom: "2025-03-14T23:00:00Z",
  }),
  buildCoefficient({ coefficientId: "c-este", supply: ESTE, coefficient: 0.05, applicationState: PENDING }),
  buildCoefficient({ coefficientId: "c-oeste", supply: OESTE, coefficient: 0.03, applicationState: PENDING }),
  buildCoefficient({ coefficientId: "c-taller", supply: TALLER, coefficient: 0.02, applicationState: PENDING }),
];

// One row of each kind the prefill treats apart: an exact observed date on a
// pending row and on a dated one, a proposed date, a supply without data and
// an observed range; one supply leaving on an exact day, one on an open date.
const OBSERVATION = buildSharingAgreementObservation({
  coefficients: [
    buildCoefficientObservation({
      coefficientId: "c-norte",
      supply: NORTE,
      observedDate: { from: "2025-03-01", to: "2025-03-01" },
      status: Status.PENDING_APPLICATION,
    }),
    buildCoefficientObservation({
      coefficientId: "c-sur",
      supply: SUR,
      storedValidFrom: "2025-03-15",
      observedDate: { from: "2025-03-01", to: "2025-03-01" },
      status: Status.APPLIED_DIFFERENT_DATE,
    }),
    buildCoefficientObservation({
      coefficientId: "c-este",
      supply: ESTE,
      proposedDate: { from: "2025-03-01", to: "2025-03-01" },
      status: Status.NOT_DISTINGUISHABLE,
    }),
    buildCoefficientObservation({ coefficientId: "c-oeste", supply: OESTE, status: Status.NO_DATA }),
    buildCoefficientObservation({
      coefficientId: "c-taller",
      supply: TALLER,
      observedDate: { from: "2025-02-26", to: "2025-03-04" },
      status: Status.PENDING_APPLICATION,
    }),
  ],
  leavingRows: [
    buildLeavingObservation({
      supply: BAR,
      previousSharingAgreement: PREVIOUS,
      observedLeavingDate: { from: "2025-04-01", to: "2025-04-01" },
      status: LeavingStatus.APPLIED_DIFFERENT_DATE,
    }),
    buildLeavingObservation({
      supply: KIOSCO,
      previousSharingAgreement: PREVIOUS,
      observedLeavingDate: { from: null, to: "2025-03-01" },
      status: LeavingStatus.APPLIED_DIFFERENT_DATE,
    }),
  ],
});

/** Midnight in Madrid of a local day, as the backend writes an instant: "2025-03-01" → "2025-02-28T23:00:00Z". */
const madridMidnight = (day: string) => dayjs(`${day}T00:00:00+01:00`).toISOString();

function effects(overrides: Partial<CoefficientDatesEffectsResponse> = {}): CoefficientDatesEffectsResponse {
  return {
    coefficients: [
      {
        coefficient: { id: "c-norte" },
        supply: NORTE,
        validFromBefore: null,
        validFromAfter: madridMidnight("2025-03-01"),
        validToBefore: null,
        validToAfter: null,
      },
      {
        coefficient: { id: "c-este" },
        supply: ESTE,
        validFromBefore: null,
        // Before the file was sent on 10/02/2025: a note, never a block.
        validFromAfter: madridMidnight("2025-02-01"),
        validToBefore: null,
        validToAfter: madridMidnight("2025-06-01"),
      },
    ],
    neighbours: [
      {
        coefficient: { id: "prev-norte" },
        sharingAgreement: PREVIOUS,
        supply: NORTE,
        validToBefore: null,
        validToAfter: madridMidnight("2025-03-01"),
      },
    ],
    leavingClosures: [
      {
        coefficient: { id: "prev-bar" },
        sharingAgreement: PREVIOUS,
        supply: BAR,
        source: LeavingClosureChangeResponseSource.REQUEST,
        validToBefore: null,
        validToAfter: madridMidnight("2025-04-01"),
      },
    ],
    agreementStatuses: [
      {
        sharingAgreement: PREVIOUS,
        statusBefore: AgreementStatusChangeResponseStatusBefore.PUBLISHED,
        statusAfter: AgreementStatusChangeResponseStatusAfter.SUPERSEDED,
      },
      {
        sharingAgreement: THIS,
        statusBefore: AgreementStatusChangeResponseStatusBefore.PUBLISHED,
        statusAfter: AgreementStatusChangeResponseStatusAfter.PUBLISHED,
      },
    ],
    communityStart: { before: madridMidnight("2025-03-15"), after: madridMidnight("2025-02-01") },
    ...overrides,
  };
}

const previewAsync = vi.fn();
const setAsync = vi.fn();

function renderPage({
  route = PATH,
  agreement = agreementFixture(),
  coefficients = COEFFICIENTS,
  observation = OBSERVATION,
  reactStrictMode = false,
}: {
  reactStrictMode?: boolean;
  route?: string;
  agreement?: SharingAgreementResponse;
  coefficients?: typeof COEFFICIENTS;
  observation?: typeof OBSERVATION;
} = {}) {
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
  vi.mocked(useGetSharingAgreementById).mockReturnValue(query.success<typeof getSharingAgreementById>(agreement));
  vi.mocked(useGetSharingAgreementPartitionCoefficients).mockReturnValue(
    query.success<typeof getSharingAgreementPartitionCoefficients>(coefficients),
  );
  vi.mocked(useGetSharingAgreementObservation).mockReturnValue(
    query.success<typeof getSharingAgreementObservation>(observation),
  );
  vi.mocked(usePreviewPartitionCoefficientDates).mockReturnValue(mutation.idle({ mutateAsync: previewAsync }));
  vi.mocked(useSetPartitionCoefficientDates).mockReturnValue(mutation.idle({ mutateAsync: setAsync }));
  return renderWithProviders(
    <Routes>
      <Route path="/plants/:plantId/sharing-agreements/:sharingAgreementId/application-dates" element={<ApplicationDatesPage />} />
      <Route path="/" element={<p>Inicio</p>} />
    </Routes>,
    { route, activeCommunityId: COMMUNITY_ID, reactStrictMode },
  );
}

const dateGroup = (name: string) => screen.getByRole("group", { name: `Nueva fecha de inicio de ${name}` });
const closingGroup = (name: string) => screen.getByRole("group", { name: `Fecha de cierre de ${name}` });
const sections = (group: HTMLElement) => within(group).getAllByRole("spinbutton").map((section) => section.textContent);
const checkbox = (name: string) => screen.getByRole("checkbox", { name: `Seleccionar ${name}` });
/** The row a field sits in: its grid, the field's closest ancestor holding the row's checkbox. */
const rowOf = (name: string) => {
  let element: HTMLElement | null = dateGroup(name);
  while (element && !within(element).queryByRole("checkbox")) element = element.parentElement;
  return element!;
};

async function typeDay(user: ReturnType<typeof userEvent.setup>, group: HTMLElement, day: dayjs.Dayjs) {
  await user.click(within(group).getByRole("spinbutton", { name: "Dia" }));
  await user.keyboard(day.format("DD"));
  await user.keyboard(day.format("MM"));
  await user.keyboard(day.format("YYYY"));
}

const sentBody = (call: number) => (previewAsync.mock.calls[call][0] as { data: SetCoefficientDatesBody }).data;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  previewAsync.mockResolvedValue(effects());
  setAsync.mockResolvedValue(effects());
});

describe("ApplicationDatesPage", () => {
  describe("opened from the agreement", () => {
    test("UI-AGR-032: every date starts empty, unmarked, and only the undated rows are selected", () => {
      renderPage();

      for (const name of ["Casa Norte", "Casa Sur", "Casa Este", "Casa Oeste", "Taller"]) {
        expect(sections(dateGroup(name))).toEqual(["DD", "MM", "AAAA"]);
      }
      expect(screen.queryByText("Observada")).not.toBeInTheDocument();
      expect(screen.queryByText("Propuesta")).not.toBeInTheDocument();
      expect(checkbox("Casa Norte")).toBeChecked();
      expect(checkbox("Casa Este")).toBeChecked();
      expect(checkbox("Casa Sur")).not.toBeChecked();
      expect(rowOf("Casa Sur")).toHaveTextContent("15/03/2025");
      expect(useGetSharingAgreementObservation).toHaveBeenCalledWith(PLANT_ID, "", expect.objectContaining({ query: expect.objectContaining({ enabled: false }) }));
    });

    test("the undated agreement keeps its PUBLISHED status chip", () => {
      renderPage();

      expect(screen.getByRole("heading", { name: "Fijar fechas de aplicación" })).toBeInTheDocument();
      expect(screen.getByText("Vigente")).toBeInTheDocument();
    });

    test("UI-AGR-033: 'Ver vista previa' stays disabled, naming the rows without a date, until each has one or is unmarked", async () => {
      const user = userEvent.setup({ delay: null });
      renderPage({ coefficients: COEFFICIENTS.slice(0, 3) });
      const preview = screen.getByRole("button", { name: "Ver vista previa" });

      expect(preview).toBeDisabled();
      expect(preview).toHaveAccessibleDescription("Faltan 2 fechas: Casa Norte y Casa Este. Escríbelas o desmarca esos puntos.");

      await user.click(checkbox("Casa Este"));
      expect(screen.getByText("Falta 1 fecha: Casa Norte. Escríbela o desmarca ese punto.")).toBeVisible();

      await typeDay(user, dateGroup("Casa Norte"), dayjs("2025-03-01"));
      expect(preview).toBeEnabled();
    });

    test("UI-AGR-033: a typed future date keeps 'Ver vista previa' disabled with a visible reason", async () => {
      const user = userEvent.setup({ delay: null });
      renderPage({ coefficients: COEFFICIENTS.slice(0, 1) });

      await typeDay(user, dateGroup("Casa Norte"), dayjs().add(1, "day"));

      expect(screen.getByRole("button", { name: "Ver vista previa" })).toBeDisabled();
      expect(screen.getByText("Hay 1 fecha no válida o futura. Corrígela o desmarca ese punto.")).toBeVisible();
      expect(screen.getByText("No puede ser una fecha futura")).toBeVisible();
    });

    test("UI-AGR-033: with nothing marked, 'Ver vista previa' says to mark a row", async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();

      await user.click(screen.getByRole("checkbox", { name: "Seleccionar todos los puntos" }));
      await user.click(screen.getByRole("checkbox", { name: "Seleccionar todos los puntos" }));

      expect(screen.getByRole("button", { name: "Ver vista previa" })).toBeDisabled();
      expect(screen.getByText("Marca al menos un punto para ver la vista previa.")).toBeVisible();
      expect(previewAsync).not.toHaveBeenCalled();
    });

    test("UI-AGR-034: the dry run sends only the selected rows, each with its own day as YYYY-MM-DD", async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();

      await typeDay(user, screen.getByRole("group", { name: "Misma fecha para todos" }), dayjs("2025-03-01"));
      await user.click(screen.getByRole("button", { name: "Aplicar la misma fecha a todos" }));
      await typeDay(user, dateGroup("Taller"), dayjs("2025-02-27"));
      await user.click(checkbox("Casa Oeste"));
      await user.click(screen.getByRole("button", { name: "Ver vista previa" }));

      await waitFor(() => expect(previewAsync).toHaveBeenCalledTimes(1));
      expect(previewAsync.mock.calls[0][0]).toMatchObject({ plantId: PLANT_ID, sharingAgreementId: AGREEMENT_ID });
      expect(sentBody(0)).toEqual({
        coefficients: [
          { coefficientId: "c-norte", validFrom: "2025-03-01" },
          { coefficientId: "c-este", validFrom: "2025-03-01" },
          { coefficientId: "c-taller", validFrom: "2025-02-27" },
        ],
        leavingClosures: [],
      });
      expect(setAsync).not.toHaveBeenCalled();
    });
  });

  describe("opened from observed sharing", () => {
    test("UI-AGR-032: an exact observed date is prefilled, marked 'Observada', and its row selected", () => {
      renderPage({ route: FROM_OBSERVED });

      expect(sections(dateGroup("Casa Norte"))).toEqual(["01", "03", "2025"]);
      expect(within(rowOf("Casa Norte")).getByText("Observada")).toBeVisible();
      expect(checkbox("Casa Norte")).toBeChecked();
    });

    test("UI-AGR-032: a proposed date is prefilled, marked 'Propuesta' with the observed sharing page's explanation, never 'Observada'", () => {
      renderPage({ route: FROM_OBSERVED });
      const este = rowOf("Casa Este");

      expect(sections(dateGroup("Casa Este"))).toEqual(["01", "03", "2025"]);
      expect(within(este).getByText("Propuesta")).toBeVisible();
      expect(
        within(este).getByText("Propuesta: es la fecha de aplicación más frecuente entre los demás puntos de este acuerdo."),
      ).toBeVisible();
      expect(within(este).queryByText("Observada")).not.toBeInTheDocument();
      expect(checkbox("Casa Este")).toBeChecked();
    });

    test("UI-AGR-032: an observed range is left empty and unselected, with the range as its hint and 'Elige una fecha'", () => {
      renderPage({ route: FROM_OBSERVED });
      const taller = rowOf("Taller");

      expect(sections(dateGroup("Taller"))).toEqual(["DD", "MM", "AAAA"]);
      expect(checkbox("Taller")).not.toBeChecked();
      expect(within(taller).getByText("Elige una fecha")).toBeVisible();
      expect(screen.getByText("1 punto necesita que escribas la fecha.", { exact: false })).toBeVisible();
    });

    test("UI-AGR-032: an already dated row is listed unselected, so a correction is an explicit choice", () => {
      renderPage({ route: FROM_OBSERVED });

      expect(checkbox("Casa Sur")).not.toBeChecked();
      expect(
        within(rowOf("Casa Sur")).getByText("Registrada 15/03/2025 · Observada 01/03/2025. Márcalo para corregirla."),
      ).toBeVisible();
    });

    test("UI-AGR-032: a row with no observation keeps its stored date, or none, unmarked", () => {
      renderPage({ route: FROM_OBSERVED });
      const oeste = rowOf("Casa Oeste");

      expect(sections(dateGroup("Casa Oeste"))).toEqual(["DD", "MM", "AAAA"]);
      expect(checkbox("Casa Oeste")).not.toBeChecked();
      expect(within(oeste).queryByText("Observada")).not.toBeInTheDocument();
    });

    test("UI-AGR-032: an edited date shows the observed one beside it", async () => {
      const user = userEvent.setup({ delay: null });
      renderPage({ route: FROM_OBSERVED });

      await typeDay(user, dateGroup("Casa Norte"), dayjs("2025-03-05"));

      expect(within(rowOf("Casa Norte")).getByText("Editada · la observada es 01/03/2025")).toBeVisible();
      expect(within(rowOf("Casa Norte")).queryByText("Observada")).not.toBeInTheDocument();
    });

    test("UI-AGR-032: one leaving supply is announced in the singular, with the agreement it leaves", () => {
      renderPage({ route: FROM_OBSERVED, observation: { ...OBSERVATION, leavingRows: OBSERVATION.leavingRows.slice(0, 1) } });

      expect(
        screen.getByText(
          (_content, element) =>
            element?.getAttribute("role") === "note" &&
            /Bar sale del reparto: estaba en Reparto inicial 2023 y no está en este acuerdo\. Revisarás su fecha de cierre en la vista previa\./.test(
              element.textContent ?? "",
            ),
        ),
      ).toBeVisible();
    });

    test("UI-AGR-034: a leaving supply observed on an exact day is sent as a listed closure; one with an open date is not", async () => {
      const user = userEvent.setup({ delay: null });
      renderPage({ route: FROM_OBSERVED });

      expect(screen.getByText(/Bar y Kiosco salen del reparto/)).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Ver vista previa" }));

      await waitFor(() => expect(previewAsync).toHaveBeenCalledTimes(1));
      expect(sentBody(0)).toEqual({
        coefficients: [
          { coefficientId: "c-norte", validFrom: "2025-03-01" },
          { coefficientId: "c-este", validFrom: "2025-03-01" },
        ],
        leavingClosures: [{ supplyId: BAR.id, closedOn: "2025-04-01" }],
      });
    });
  });

  describe("why an unselected row is unselected", () => {
    // Casa Sur and Casa Este already dated on 15/03/2025; the others pending.
    const DATED_ON_15_MARCH = { applicationState: APPLIED, validFrom: "2025-03-14T23:00:00Z" };
    const coefficients = [
      buildCoefficient({
        coefficientId: "c-norte",
        supply: NORTE,
        coefficient: 0.0315,
        applicationState: PENDING,
      }),
      buildCoefficient({
        coefficientId: "c-sur",
        supply: SUR,
        coefficient: 0.0325,
        ...DATED_ON_15_MARCH,
      }),
      buildCoefficient({
        coefficientId: "c-este",
        supply: ESTE,
        coefficient: 0.05,
        ...DATED_ON_15_MARCH,
      }),
      buildCoefficient({
        coefficientId: "c-oeste",
        supply: OESTE,
        coefficient: 0.03,
        applicationState: PENDING,
      }),
      buildCoefficient({
        coefficientId: "c-taller",
        supply: TALLER,
        coefficient: 0.02,
        applicationState: PENDING,
      }),
    ];
    const observation = buildSharingAgreementObservation({
      coefficients: [
        buildCoefficientObservation({
          coefficientId: "c-norte",
          supply: NORTE,
          observedDate: { from: null, to: "2023-04-01" },
          status: Status.PENDING_APPLICATION,
        }),
        buildCoefficientObservation({
          coefficientId: "c-sur",
          supply: SUR,
          storedValidFrom: "2025-03-15",
          observedDate: { from: "2025-03-15", to: "2025-03-15" },
          status: Status.APPLIED_SAME_DATE,
        }),
        buildCoefficientObservation({
          coefficientId: "c-este",
          supply: ESTE,
          storedValidFrom: "2025-03-15",
          observedDate: { from: "2025-03-01", to: "2025-03-01" },
          status: Status.APPLIED_DIFFERENT_DATE,
        }),
        buildCoefficientObservation({
          coefficientId: "c-oeste",
          supply: OESTE,
          status: Status.NOT_OBSERVABLE,
        }),
        buildCoefficientObservation({
          coefficientId: "c-taller",
          supply: TALLER,
          observedDate: { from: "2025-02-26", to: "2025-03-04" },
          status: Status.PENDING_APPLICATION,
        }),
      ],
      leavingRows: [],
    });
    const renderReasons = () => renderPage({ route: FROM_OBSERVED, coefficients, observation });

    test("UI-AGR-032: an open observed date says Datadis has no earlier data and to choose the real date", () => {
      renderReasons();

      expect(checkbox("Casa Norte")).not.toBeChecked();
      expect(
        within(rowOf("Casa Norte")).getByText(
          "Observada el 01/04/2023 o antes: Datadis no tiene datos anteriores. Elige la fecha real y márcalo.",
        ),
      ).toBeVisible();
    });

    test("UI-AGR-032: an observed range says between which days, and to choose one", () => {
      renderReasons();

      expect(checkbox("Taller")).not.toBeChecked();
      expect(
        within(rowOf("Taller")).getByText("Observada entre el 26/02/2025 y el 04/03/2025. Elige una fecha y márcalo."),
      ).toBeVisible();
    });

    test("UI-AGR-032: a dated row observed on its stored day says the stored date is correct, and its field stays empty", () => {
      renderReasons();

      expect(checkbox("Casa Sur")).not.toBeChecked();
      expect(within(rowOf("Casa Sur")).getByText("Fecha registrada correcta.")).toBeVisible();
      expect(sections(dateGroup("Casa Sur"))).toEqual(["DD", "MM", "AAAA"]);
      expect(within(rowOf("Casa Sur")).queryByText("Observada")).not.toBeInTheDocument();
    });

    test("UI-AGR-032: a dated row observed on another day names both, and its field does not show the observed one", () => {
      renderReasons();
      const este = rowOf("Casa Este");

      expect(checkbox("Casa Este")).not.toBeChecked();
      expect(
        within(este).getByText("Registrada 15/03/2025 · Observada 01/03/2025. Márcalo para corregirla."),
      ).toBeVisible();
      expect(sections(dateGroup("Casa Este"))).toEqual(["DD", "MM", "AAAA"]);
      expect(within(este).queryByText(/Editada/)).not.toBeInTheDocument();
    });

    test("UI-AGR-032: marking a dated row prefills its observed date, marked 'Observada'; unmarking it empties the field again", async () => {
      const user = userEvent.setup({ delay: null });
      renderReasons();

      await user.click(checkbox("Casa Este"));
      expect(sections(dateGroup("Casa Este"))).toEqual(["01", "03", "2025"]);
      expect(within(rowOf("Casa Este")).getByText("Observada")).toBeVisible();

      await user.click(checkbox("Casa Este"));
      expect(sections(dateGroup("Casa Este"))).toEqual(["DD", "MM", "AAAA"]);
      expect(within(rowOf("Casa Este")).queryByText("Observada")).not.toBeInTheDocument();
    });

    test("UI-AGR-032: marking every row prefills each dated row's observed date", async () => {
      const user = userEvent.setup({ delay: null });
      renderReasons();

      await user.click(screen.getByRole("checkbox", { name: "Seleccionar todos los puntos" }));

      expect(sections(dateGroup("Casa Sur"))).toEqual(["15", "03", "2025"]);
      expect(sections(dateGroup("Casa Este"))).toEqual(["01", "03", "2025"]);
    });

    test("UI-AGR-032: the plant's own supply says Datadis cannot observe its date, and to mark it and write it", () => {
      renderReasons();

      expect(checkbox("Casa Oeste")).not.toBeChecked();
      expect(
        within(rowOf("Casa Oeste")).getByText(
          "Punto de la planta: Datadis no permite observar su fecha. Normalmente es la misma que la del resto del acuerdo; márcalo y ponla a mano.",
        ),
      ).toBeVisible();
    });

    test("UI-AGR-032: a row with no observation keeps 'Sin cambios'; one without data or not observed says why instead", () => {
      renderPage({
        route: FROM_OBSERVED,
        coefficients,
        observation: buildSharingAgreementObservation({
          coefficients: [
            buildCoefficientObservation({
              coefficientId: "c-sur",
              supply: SUR,
              status: Status.NO_DATA,
            }),
            buildCoefficientObservation({
              coefficientId: "c-este",
              supply: ESTE,
              status: Status.NOT_OBSERVED,
            }),
          ],
          leavingRows: [],
        }),
      });

      expect(
        within(rowOf("Casa Sur")).getByText("Sin datos de Datadis: no se puede comprobar. Pon la fecha a mano si la conoces."),
      ).toBeVisible();
      expect(
        within(rowOf("Casa Este")).getByText(
          "Datadis nunca muestra este coeficiente aplicado. Compruébalo en el reparto observado antes de fijar una fecha.",
        ),
      ).toBeVisible();
      // Casa Norte is in no observation row at all.
      expect(checkbox("Casa Norte")).not.toBeChecked();
      expect(within(rowOf("Casa Norte")).getByText("Sin cambios")).toBeVisible();
    });

    test("UI-AGR-032: opened from the agreement, an unselected row keeps 'Sin cambios'", () => {
      renderPage({ coefficients, observation });

      expect(checkbox("Casa Este")).not.toBeChecked();
      expect(within(rowOf("Casa Este")).getByText("Sin cambios")).toBeVisible();
      expect(sections(dateGroup("Casa Este"))).toEqual(["DD", "MM", "AAAA"]);
    });
  });

  describe("the preview", () => {
    async function openPreview(route = FROM_OBSERVED) {
      const user = userEvent.setup({ delay: null });
      const rendered = renderPage({ route });
      await user.click(screen.getByRole("button", { name: "Ver vista previa" }));
      await screen.findByRole("heading", { name: "Resumen de cambios" });
      return { user, ...rendered };
    }

    test("each step starts at its heading; arriving on the first moves no focus", async () => {
      const user = userEvent.setup({ delay: null });
      renderPage({ route: FROM_OBSERVED, reactStrictMode: true });

      expect(screen.getByRole("heading", { name: "Fechas de inicio" })).not.toHaveFocus();
      await user.click(screen.getByRole("button", { name: "Ver vista previa" }));

      await waitFor(() => expect(screen.getByRole("heading", { name: "Resumen de cambios" })).toHaveFocus());
    });

    test("UI-AGR-034: shows what the dry run returned: the counts, each new period, the neighbour's new end and every status change", async () => {
      await openPreview();

      expect(screen.getByText("coeficientes de este acuerdo reciben fecha").previousSibling).toHaveTextContent("2");
      expect(screen.getByText("coeficiente anterior cambia su fin").previousSibling).toHaveTextContent("1");
      expect(screen.getByText("punto sale del reparto y se cierra").previousSibling).toHaveTextContent("1");
      const coefficients = screen.getByRole("region", { name: "Coeficientes de este acuerdo" });
      const norte = within(coefficients).getByRole("row", { name: /Casa Norte/ });
      expect(norte).toHaveTextContent("01/03/2025 – en curso");
      expect(norte).toHaveTextContent("Reparto inicial 2023 · Fin en curso → 01/03/2025");
      expect(within(coefficients).getByRole("row", { name: /Casa Este/ })).toHaveTextContent("01/02/2025 – 01/06/2025");
      expect(within(coefficients).getByRole("row", { name: /Casa Este/ })).toHaveTextContent("Sin cambios");
      expect(screen.getByText("Reparto inicial 2023: Vigente → Histórico")).toBeVisible();
      // An agreement whose status stays is no change, and is not listed.
      expect(screen.queryByText(/Reparto 2025: Vigente → Vigente/)).not.toBeInTheDocument();
      expect(setAsync).not.toHaveBeenCalled();
    });

    test("UI-AGR-034: a previous coefficient of a supply no listed coefficient names still shows its new end", async () => {
      previewAsync.mockResolvedValue(
        effects({
          neighbours: [
            {
              coefficient: { id: "prev-oeste" },
              sharingAgreement: PREVIOUS,
              supply: OESTE,
              validToBefore: madridMidnight("2025-06-01"),
              validToAfter: madridMidnight("2025-03-01"),
            },
          ],
        }),
      );
      await openPreview();

      expect(screen.getByText("Coeficientes anteriores que cambian su fin")).toBeVisible();
      expect(screen.getByText("Casa Oeste · Reparto inicial 2023 · Fin 01/06/2025 → 01/03/2025")).toBeVisible();
    });

    test("UI-AGR-034: a date before the agreement's sent date is a note that does not block confirming", async () => {
      await openPreview();
      const coefficients = screen.getByRole("region", { name: "Coeficientes de este acuerdo" });

      expect(within(coefficients).getByRole("row", { name: /Casa Este/ })).toHaveTextContent(
        "Esta fecha es anterior al envío del fichero (10/02/2025). No impide confirmar.",
      );
      expect(within(coefficients).getByRole("row", { name: /Casa Norte/ })).not.toHaveTextContent("anterior al envío");
      expect(screen.getByRole("button", { name: "Confirmar y aplicar" })).toBeEnabled();
    });

    test("UI-AGR-034: the community start date change is explained as moving the payback", async () => {
      await openPreview();

      expect(
        screen.getByText(
          "La fecha de inicio de la comunidad pasa del 15/03/2025 al 01/02/2025. El retorno de la inversión se calculará desde esa fecha.",
        ),
      ).toBeVisible();
    });

    test("UI-AGR-034: a closure the backend applies by default is marked as such, prefilled with its day", async () => {
      previewAsync.mockResolvedValue(
        effects({
          leavingClosures: [
            {
              coefficient: { id: "prev-kiosco" },
              sharingAgreement: PREVIOUS,
              supply: KIOSCO,
              source: LeavingClosureChangeResponseSource.DEFAULT,
              validToBefore: null,
              validToAfter: madridMidnight("2025-03-01"),
            },
          ],
        }),
      );
      await openPreview();
      const leaving = screen.getByRole("region", { name: /^Salen del reparto/ });

      expect(sections(within(leaving).getByRole("group", { name: "Fecha de cierre de Kiosco" }))).toEqual(["01", "03", "2025"]);
      expect(within(leaving).getByText("Cierre por defecto: fecha más temprana del acuerdo")).toBeVisible();
    });

    test("UI-AGR-034: a leaving supply observed on an exact day is marked 'Observada'; one observed on an open date stays empty with its hint", async () => {
      previewAsync.mockResolvedValue(effects());
      await openPreview();
      const leaving = screen.getByRole("region", { name: /^Salen del reparto/ });

      expect(sections(closingGroup("Bar"))).toEqual(["01", "04", "2025"]);
      expect(within(leaving).getByText("Observada")).toBeVisible();
      expect(sections(closingGroup("Kiosco"))).toEqual(["DD", "MM", "AAAA"]);
      expect(within(leaving).getByText("01/03/2025 o antes")).toBeVisible();
      expect(within(leaving).getByText("Elige una fecha")).toBeVisible();
    });

    test("UI-AGR-034: editing a closing date runs the dry run again with it as a listed closure", async () => {
      const { user } = await openPreview();
      await waitFor(() => expect(previewAsync).toHaveBeenCalledTimes(1));

      await typeDay(user, closingGroup("Kiosco"), dayjs("2025-02-20"));
      await act(() => new Promise((resolve) => setTimeout(resolve, DRY_RUN_DELAY_MS + 50)));

      await waitFor(() => expect(previewAsync).toHaveBeenCalledTimes(2));
      expect(sentBody(1).leavingClosures).toEqual([
        { supplyId: BAR.id, closedOn: "2025-04-01" },
        { supplyId: KIOSCO.id, closedOn: "2025-02-20" },
      ]);
    });

    test("UI-AGR-034: a refused dry run shows each row's error in the catalogue's words and blocks 'Confirmar y aplicar'", async () => {
      previewAsync.mockRejectedValue(
        apiError(409, {
          code: "SHARING_AGREEMENT_COEFFICIENT_PERIOD_OVERLAP",
          params: { coefficientId: "c-norte", cups: NORTE.code },
        }),
      );
      await openPreview();

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("1 punto tiene un error");
      expect(alert).toHaveTextContent(
        `Casa Norte: CUPS ${NORTE.code}: con esa fecha, su periodo se solaparía con otro coeficiente del mismo suministro.`,
      );
      expect(screen.getByRole("button", { name: "Confirmar y aplicar" })).toBeDisabled();
      expect(screen.getByText("Corrige el error de Casa Norte o desmárcalo para confirmar.")).toBeVisible();
    });

    test("UI-AGR-034: two refused rows are counted in the plural, and confirming says to fix the errors", async () => {
      previewAsync.mockRejectedValue(
        Object.assign(apiError(409), {
          response: {
            status: 409,
            headers: {},
            data: {
              status: 409,
              errors: [
                { code: "SHARING_AGREEMENT_DATE_IN_FUTURE", message: "raw", params: { coefficientId: "c-norte", cups: NORTE.code } },
                { code: "SHARING_AGREEMENT_DATE_IN_FUTURE", message: "raw", params: { coefficientId: "c-este", cups: ESTE.code } },
              ],
            },
          },
        }),
      );
      await openPreview();

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("2 puntos tienen un error");
      expect(alert).toHaveTextContent("Corrígelos o desmárcalos para poder confirmar.");
      expect(screen.getByText("Corrige los errores o desmarca esos puntos para confirmar.")).toBeVisible();
    });

    test("UI-AGR-034: back on the dates, a refused row shows its error under its field", async () => {
      previewAsync.mockRejectedValue(
        apiError(409, { code: "SHARING_AGREEMENT_DATE_IN_FUTURE", params: { coefficientId: "c-este", cups: ESTE.code } }),
      );
      const { user } = await openPreview();
      await screen.findByRole("alert");

      await user.click(screen.getByRole("button", { name: "Volver a las fechas" }));

      expect(
        within(rowOf("Casa Este")).getByText(`La fecha indicada no puede ser una fecha futura (afecta a ${ESTE.code}).`),
      ).toBeVisible();
    });

    test("UI-AGR-034: a refused leaving supply shows the new codes' copy at its closing date", async () => {
      previewAsync.mockRejectedValue(
        apiError(409, { code: "SHARING_AGREEMENT_NO_COEFFICIENT_TO_CLOSE", params: { supplyId: BAR.id, cups: BAR.code } }),
      );
      await openPreview();

      const message = `Este punto no tiene ningún coeficiente anterior que cerrar (afecta a ${BAR.code}).`;
      expect(await screen.findByRole("alert")).toHaveTextContent(`Bar: ${message}`);
      expect(within(screen.getByRole("region", { name: /^Salen del reparto/ })).getByText(message)).toBeVisible();
    });

    test("UI-AGR-034: a 400 with no detail reads as the fallback and still blocks confirming", async () => {
      previewAsync.mockRejectedValue(apiError(400));
      await openPreview();

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "No se han podido comprobar las fechas. Revísalas y vuelve a intentarlo.",
      );
      expect(screen.getByRole("button", { name: "Confirmar y aplicar" })).toBeDisabled();
    });

    test("UI-AGR-034: a dry run that fails on the network offers a retry, and confirming stays disabled", async () => {
      previewAsync.mockRejectedValueOnce(new Error("Network Error"));
      const { user } = await openPreview();

      expect(await screen.findByText("No se pudo calcular la vista previa.", { selector: ".MuiAlert-message" })).toBeVisible();
      expect(screen.getByRole("button", { name: "Confirmar y aplicar" })).toBeDisabled();

      await user.click(screen.getByRole("button", { name: "Reintentar" }));
      expect(await screen.findByRole("button", { name: "Confirmar y aplicar" })).toBeEnabled();
      expect(previewAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe("the result", () => {
    async function confirm(route = FROM_OBSERVED) {
      const user = userEvent.setup({ delay: null });
      const rendered = renderPage({ route });
      await user.click(screen.getByRole("button", { name: "Ver vista previa" }));
      await user.click(await screen.findByRole("button", { name: "Confirmar y aplicar" }));
      return { user, ...rendered };
    }

    test("UI-AGR-035: success lists the effects as the write returned them, not as previewed", async () => {
      setAsync.mockResolvedValue(
        effects({
          coefficients: [
            {
              coefficient: { id: "c-norte" },
              supply: NORTE,
              validFromBefore: null,
              validFromAfter: madridMidnight("2025-03-02"),
              validToBefore: null,
              validToAfter: null,
            },
          ],
          neighbours: [],
          agreementStatuses: [],
          communityStart: { before: madridMidnight("2025-03-15"), after: madridMidnight("2025-03-15") },
        }),
      );
      await confirm();

      expect(await screen.findByText("Fechas aplicadas en Reparto 2025.", { selector: ".MuiAlert-message" })).toBeVisible();
      expect(screen.getByText("1 coeficiente tiene ya fecha de aplicación: desde el 02/03/2025.")).toBeVisible();
      expect(screen.getByText("Bar sale del reparto: su coeficiente se ha cerrado el 01/04/2025.")).toBeVisible();
      expect(screen.queryByText(/terminan ahora/)).not.toBeInTheDocument();
      expect(screen.queryByText(/fecha de inicio de la comunidad/)).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Volver al reparto observado" })).toHaveAttribute(
        "href",
        `/plants/${PLANT_ID}/sharing-agreements/observed/${AGREEMENT_ID}`,
      );
    });

    test("UI-AGR-035: the write sends the previewed request", async () => {
      await confirm();

      await waitFor(() => expect(setAsync).toHaveBeenCalledTimes(1));
      expect(setAsync.mock.calls[0][0]).toEqual(previewAsync.mock.calls[0][0]);
    });

    test("UI-AGR-036: a write refused with 409 applies nothing, shows each row's error and keeps the dates entered", async () => {
      setAsync.mockRejectedValue(
        apiError(409, { code: "SHARING_AGREEMENT_DATE_IN_FUTURE", params: { coefficientId: "c-este", cups: ESTE.code } }),
      );
      const { user } = await confirm();

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("No se han aplicado las fechas");
      expect(alert).toHaveTextContent("No se ha cambiado ningún dato.");
      expect(alert).toHaveTextContent(`Casa Este: La fecha indicada no puede ser una fecha futura (afecta a ${ESTE.code}).`);
      expect(screen.getByText("Tus fechas se conservan: no tendrás que volver a escribirlas.")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "Volver a la vista previa" }));
      await waitFor(() => expect(previewAsync).toHaveBeenCalledTimes(2));
      expect(sentBody(1)).toEqual(sentBody(0));

      await user.click(screen.getByRole("button", { name: "Volver a las fechas" }));
      expect(sections(dateGroup("Casa Norte"))).toEqual(["01", "03", "2025"]);
      expect(sections(dateGroup("Casa Este"))).toEqual(["01", "03", "2025"]);
    });

    test("UI-AGR-036: a write whose answer never arrives says its outcome is unknown and offers the preview again", async () => {
      setAsync.mockRejectedValue(new Error("timeout of 30000ms exceeded"));
      await confirm();

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("No se ha podido confirmar si las fechas se han aplicado.");
      expect(screen.getByRole("button", { name: "Volver a la vista previa" })).toBeVisible();
    });
  });

  describe("access", () => {
    test("a caller the agreement does not let manage it is sent home", () => {
      renderPage({ agreement: agreementFixture({ capabilities: buildSharingAgreementCapabilities({ canRead: true }) }) });

      expect(screen.getByText("Inicio")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Fijar fechas de aplicación" })).not.toBeInTheDocument();
    });

    test("a draft agreement offers no dates to set, saying why", () => {
      renderPage({ agreement: agreementFixture({ status: SharingAgreementResponseStatus.DRAFT }) });

      expect(screen.getByText("Este acuerdo es un borrador. Publícalo antes de fijar sus fechas de aplicación.")).toBeVisible();
      expect(screen.queryByRole("button", { name: "Ver vista previa" })).not.toBeInTheDocument();
    });
  });
});
