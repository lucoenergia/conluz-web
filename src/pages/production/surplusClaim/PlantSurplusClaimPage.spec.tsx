import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation, useNavigationType } from "react-router";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { query } from "../../../test/queryState";
import { apiError } from "../../../test/apiError";
import { declaredStyle } from "../../../test/declaredStyle";
import { expectNeutralStatusChip } from "../../../components/SharingAgreementStatusChip/expectNeutralStatusChip";
import { colors } from "../../../theme/tokens";
import {
  useGetPlantById,
  useGetPlantSurplusClaim,
  type getPlantById,
  type getPlantSurplusClaim,
} from "../../../api/plants/plants";
import { useGetAllSupplies } from "../../../api/supplies/supplies";
import {
  PlantSurplusClaimDayResponseState,
  type PlantSurplusClaimResponse,
  type PlantSurplusClaimWarningsResponse,
} from "../../../api/models";
import {
  buildPlant,
  buildPlantCapabilities,
  buildPlantSurplusClaim,
  buildPlantSurplusClaimSummary,
  buildPlantSurplusClaimWarnings,
  buildSupplyReference,
} from "../../../test/fixtures";
import { triggerBrowserDownload } from "../../../utils/triggerBrowserDownload";
import { downloadPlantSurplusClaimFile } from "./downloadPlantSurplusClaimFile";
import { claimDay, claimMonthDays } from "./surplusClaim.testData";
import { PlantSurplusClaimPage } from "./PlantSurplusClaimPage";

vi.mock(import("../../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetPlantById: vi.fn(),
  useGetPlantSurplusClaim: vi.fn(),
}));

// Read by the plant's edit form, which "Añadir CIL" opens.
vi.mock(import("../../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllSupplies: vi.fn(),
}));

// The file request: the one call that goes around the generated client.
vi.mock(import("./downloadPlantSurplusClaimFile"), async (importOriginal) => ({
  ...(await importOriginal()),
  downloadPlantSurplusClaimFile: vi.fn(),
}));

vi.mock(import("../../../utils/triggerBrowserDownload"), async (importOriginal) => ({
  ...(await importOriginal()),
  triggerBrowserDownload: vi.fn(),
}));

const COMMUNITY_ID = "community-a";
const PLANT_ID = "plant-a";
const OCTOBER = "2026-10";
const CIL = "ES0031405000000001AB1F001";
const FILE = new Blob(["PK"], { type: "application/zip" });
const FILENAME = `reclamacionMedidas_${CIL}_2026-10.zip`;

const PLANT = buildPlant({
  id: PLANT_ID,
  name: "Planta Solar Norte",
  community: { id: COMMUNITY_ID },
  nominalPowerKW: 100,
  capabilities: buildPlantCapabilities({ canManage: true }),
});

const supply = (id: string, name: string | null) =>
  buildSupplyReference({ id, code: `ES0031406900000${id}JN0F`, name });

/** Every warning raised, each list with two entries. */
function everyWarning(days = claimMonthDays(OCTOBER)): PlantSurplusClaimWarningsResponse {
  return buildPlantSurplusClaimWarnings({
    suppliesWithoutData: [
      { supply: supply("001", "Casa de Amparo"), coefficient: 0.042 },
      { supply: supply("002", "Taller de Toni"), coefficient: 0.0315 },
    ],
    suppliesWithGaps: [
      { supply: supply("003", "Panadería Climent"), days: ["2026-10-07", "2026-10-08"] },
      { supply: supply("004", null), days: ["2026-10-19"] },
    ],
    uncoveredShare: {
      largestShare: 0.08,
      days: ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-20"],
    },
    plantSupplyShare: 0.05,
    noAppliedCoefficients: true,
    hoursAboveNominalPower: [
      { startsAt: days[21].hours[12].startsAt, surplusKWh: 118.4 },
      { startsAt: days[24].hours[3].startsAt, surplusKWh: 104.25 },
    ],
  });
}

function octoberClaim(overrides: Partial<PlantSurplusClaimResponse> = {}): PlantSurplusClaimResponse {
  return buildPlantSurplusClaim({
    month: OCTOBER,
    cil: CIL,
    plant: { id: PLANT_ID, name: "Planta Solar Norte" },
    availableMonths: { firstMonth: "2026-08", latestPublishedMonth: OCTOBER },
    days: claimMonthDays(OCTOBER),
    summary: buildPlantSurplusClaimSummary({
      surplusKWh: 6961.25,
      surplusIncome: { amountEur: 412.37, unpricedSurplusKWh: 0 },
      realDays: 28,
      estimatedDays: 3,
      suppliesInScope: 27,
      suppliesWithData: 24,
    }),
    ...overrides,
  });
}

type ClaimResult = ReturnType<typeof useGetPlantSurplusClaim>;

const success = (claim: PlantSurplusClaimResponse) => query.success<typeof getPlantSurplusClaim>(claim);

/** The default month without `month`; each named month as given; any other still loading. */
function serveClaims(byDefault: ClaimResult, byMonth: Record<string, ClaimResult> = {}) {
  vi.mocked(useGetPlantSurplusClaim).mockImplementation(
    (_plantId, params, options) =>
      (options?.query?.enabled === false
        ? query.disabled()
        : params?.month === undefined
          ? byDefault
          : (byMonth[params.month] ?? query.loading())) as ClaimResult,
  );
}

/** Where the page has taken the address, and how it got there. */
const AddressProbe = () => {
  const location = useLocation();
  return <div data-testid="address">{`${location.search}|${useNavigationType()}`}</div>;
};

const address = () => screen.getByTestId("address").textContent;

/** An element's text with every run of whitespace, the no-break space Intl puts before "%" included, as one space. */
const text = (element: Element | null | undefined) => element?.textContent?.replace(/\s+/g, " ");

function renderPage(search = "") {
  return renderWithProviders(
    <Routes>
      <Route
        path="/plants/:plantId/surplus-claim"
        element={
          <>
            <PlantSurplusClaimPage />
            <AddressProbe />
          </>
        }
      />
    </Routes>,
    { route: `/plants/${PLANT_ID}/surplus-claim${search}`, activeCommunityId: COMMUNITY_ID },
  );
}

const claimMonthsAskedFor = () => vi.mocked(useGetPlantSurplusClaim).mock.calls.map(([, params]) => params?.month);

const summary = () => screen.getByRole("region", { name: "Resumen de octubre de 2026" });
const warningsArea = () => screen.queryByRole("region", { name: "Avisos de octubre de 2026" });
const downloadButton = () => screen.queryByRole("button", { name: "Descargar fichero" });

async function chooseOption(user: ReturnType<typeof userEvent.setup>, field: string, option: string) {
  await user.click(screen.getByRole("combobox", { name: field }));
  await user.click(await screen.findByRole("option", { name: option }));
}

/** jsdom answers no media query, which reads as a phone; this answers every (min-width) query as a wide screen. */
function wideScreen() {
  vi.stubGlobal(
    "matchMedia",
    (mediaQuery: string) =>
      ({
        matches: mediaQuery.includes("min-width"),
        media: mediaQuery,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom implements no scrolling.
  Element.prototype.scrollIntoView = vi.fn();
  vi.mocked(useGetPlantById).mockReturnValue(query.success<typeof getPlantById>(PLANT));
  vi.mocked(useGetAllSupplies).mockReturnValue(query.loading());
  vi.mocked(downloadPlantSurplusClaimFile).mockResolvedValue({ blob: FILE, filename: FILENAME });
  serveClaims(success(octoberClaim()));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PlantSurplusClaimPage", () => {
  it("UI-LAY-003 shows the breadcrumb Inicio › Plantas › the plant › Reclamación de excedentes", () => {
    renderPage();

    const crumbs = within(screen.getByRole("navigation", { name: /breadcrumb/i })).getAllByRole("listitem");
    expect(crumbs.map((crumb) => crumb.textContent)).toEqual([
      "Inicio",
      "Plantas",
      "Planta Solar Norte",
      "Reclamación de excedentes",
    ]);
  });

  it("asks for the claim only once the plant is known to be the active community's", () => {
    vi.mocked(useGetPlantById).mockReturnValue(
      query.success<typeof getPlantById>({ ...PLANT, community: { id: "community-b" } }),
    );
    renderPage();

    expect(screen.getByRole("heading", { name: "Planta no encontrada" })).toBeVisible();
    for (const [, , options] of vi.mocked(useGetPlantSurplusClaim).mock.calls) {
      expect(options?.query?.enabled).toBe(false);
    }
  });

  it("shows a failed read with a retry in place of the page body", async () => {
    const user = userEvent.setup();
    const failed = query.error(apiError(500));
    serveClaims(failed as ClaimResult);
    renderPage();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("No se pudo cargar la reclamación de excedentes.");
    await user.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(failed.refetch).toHaveBeenCalled();
  });

  describe("the month", () => {
    it("UI-SCL-001 without a month asks for the server's default and leaves the address without one", () => {
      renderPage();

      expect(summary()).toBeVisible();
      expect(claimMonthsAskedFor()).not.toContain(expect.any(String));
      expect(address()).toBe("|POP");
    });

    it("UI-SCL-001 choosing a month writes it to the address, replacing the entry, and asks for it", async () => {
      const user = userEvent.setup();
      serveClaims(success(octoberClaim()), {
        "2026-09": success(octoberClaim({ month: "2026-09", days: claimMonthDays("2026-09") })),
      });
      renderPage();

      await chooseOption(user, "Mes", "Septiembre de 2026");

      expect(address()).toBe("?month=2026-09|REPLACE");
      expect(claimMonthsAskedFor()).toContain("2026-09");
      expect(await screen.findByRole("region", { name: "Resumen de septiembre de 2026" })).toBeVisible();
    });

    it("UI-SCL-001 drops a malformed month without asking for it, and shows the default month", async () => {
      renderPage("?month=2026-13");

      await waitFor(() => expect(address()).toBe("|REPLACE"));
      expect(claimMonthsAskedFor()).not.toContain("2026-13");
      expect(summary()).toBeVisible();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("UI-SCL-001 drops a month the server refuses as not closed, and shows the default month with no error", async () => {
      serveClaims(success(octoberClaim()), {
        "2026-11": query.error(apiError(400, { code: "SURPLUS_CLAIM_MONTH_NOT_CLOSED" })) as ClaimResult,
      });
      renderPage("?month=2026-11");

      await waitFor(() => expect(address()).toBe("|REPLACE"));
      expect(claimMonthsAskedFor()).toContain("2026-11");
      expect(summary()).toBeVisible();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("UI-SCL-001 shows the month in the address", () => {
      serveClaims(query.loading() as ClaimResult, {
        "2026-09": success(octoberClaim({ month: "2026-09", days: claimMonthDays("2026-09") })),
      });
      renderPage("?month=2026-09");

      expect(screen.getByRole("region", { name: "Resumen de septiembre de 2026" })).toBeVisible();
      expect(claimMonthsAskedFor()).toEqual(expect.arrayContaining(["2026-09"]));
      expect(claimMonthsAskedFor()).not.toContain(undefined);
    });

    it("UI-SCL-002 offers every month from the first to the latest published, newest first", async () => {
      const user = userEvent.setup();
      serveClaims(success(octoberClaim({ availableMonths: { firstMonth: "2025-03", latestPublishedMonth: OCTOBER } })));
      renderPage();

      await user.click(screen.getByRole("combobox", { name: "Mes" }));
      const options = (await screen.findAllByRole("option")).map((option) => option.textContent);
      expect(options).toHaveLength(20);
      expect(options.slice(0, 3)).toEqual(["Octubre de 2026", "Septiembre de 2026", "Agosto de 2026"]);
      expect(options.at(-1)).toBe("Marzo de 2025");
      expect(screen.getByText("Solo meses cerrados. La distribuidora publica cada mes hacia el día 10 del siguiente.")).toBeVisible();
    });

    it("UI-SCL-002 with no bounds offers only the month shown", async () => {
      const user = userEvent.setup();
      serveClaims(success(octoberClaim({ availableMonths: { firstMonth: null, latestPublishedMonth: null } })));
      renderPage();

      await user.click(screen.getByRole("combobox", { name: "Mes" }));
      expect((await screen.findAllByRole("option")).map((option) => option.textContent)).toEqual(["Octubre de 2026"]);
    });

    it("UI-SCL-002 offers a month shown outside the bounds", async () => {
      const user = userEvent.setup();
      serveClaims(query.loading() as ClaimResult, {
        "2025-01": success(
          octoberClaim({
            month: "2025-01",
            days: claimMonthDays("2025-01"),
            availableMonths: { firstMonth: "2025-03", latestPublishedMonth: "2025-04" },
          }),
        ),
      });
      renderPage("?month=2025-01");

      await user.click(screen.getByRole("combobox", { name: "Mes" }));
      expect((await screen.findAllByRole("option")).map((option) => option.textContent)).toEqual([
        "Abril de 2025",
        "Marzo de 2025",
        "Febrero de 2025",
        "Enero de 2025",
      ]);
    });
  });

  describe("the top summary", () => {
    it("UI-SCL-003 holds the month, the figures, the warning count, the format and the download, before the warnings", () => {
      serveClaims(success(octoberClaim({ warnings: everyWarning() })));
      renderPage();

      const top = summary();
      const controls = [
        within(top).getByRole("combobox", { name: "Mes" }),
        within(top).getByText("Excedentes del mes"),
        within(top).getByRole("link", { name: "Ver avisos" }),
        within(top).getByRole("combobox", { name: "Formato" }),
        within(top).getByRole("button", { name: "Descargar fichero" }),
      ];
      const warnings = warningsArea();
      expect(warnings).not.toBeNull();
      for (const control of controls) {
        expect(control.compareDocumentPosition(warnings!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    });

    it("UI-SCL-004 shows the month's figures, and the income with its market-price note and its unpriced energy", () => {
      serveClaims(
        success(
          octoberClaim({
            summary: buildPlantSurplusClaimSummary({
              surplusKWh: 6961.25,
              surplusIncome: { amountEur: 412.37, unpricedSurplusKWh: 12.4 },
              realDays: 28,
              estimatedDays: 3,
              suppliesInScope: 27,
              suppliesWithData: 24,
            }),
          }),
        ),
      );
      renderPage();

      const top = within(summary());
      expect(top.getByText("6961,25 kWh")).toBeVisible();
      expect(top.getByText("412,37 €")).toBeVisible();
      expect(
        top.getByText(
          "Estimación a precio de mercado (OMIE) del excedente de este fichero. Lo que pague la comercializadora puede ser distinto.",
        ),
      ).toBeVisible();
      expect(top.getByText("12,4 kWh sin precio de mercado: no cuentan en el importe.")).toBeVisible();
      expect(top.getByText("Días con datos reales").nextElementSibling).toHaveTextContent("28");
      expect(top.getByText("Días estimados").nextElementSibling).toHaveTextContent("3");
      expect(top.getByText("Puntos de suministro incluidos").nextElementSibling).toHaveTextContent("24 de 27");
    });

    it("UI-SCL-004 keeps the minus sign of a negative income, without alert colour, and no unpriced line at zero", () => {
      serveClaims(
        success(
          octoberClaim({
            summary: buildPlantSurplusClaimSummary({
              surplusKWh: 120,
              surplusIncome: { amountEur: -3.5, unpricedSurplusKWh: 0 },
              suppliesInScope: 27,
              suppliesWithData: 27,
            }),
          }),
        ),
      );
      renderPage();

      const amount = within(summary()).getByText("-3,50 €");
      expect(declaredStyle(amount).color).toBe(colors.text.primary);
      expect(screen.queryByText(/sin precio de mercado/)).not.toBeInTheDocument();
    });

    it("UI-SCL-004 reads a null total and income as \"—\", never 0", () => {
      serveClaims(
        success(
          octoberClaim({
            summary: buildPlantSurplusClaimSummary({ surplusKWh: null, surplusIncome: null, suppliesInScope: 27, suppliesWithData: 0 }),
          }),
        ),
      );
      renderPage();

      const top = within(summary());
      expect(top.getByText("Excedentes del mes").nextElementSibling).toHaveTextContent(/^—$/);
      expect(top.getByText("Importe estimado").nextElementSibling).toHaveTextContent(/^—$/);
    });

    it("UI-SCL-004 says \"Ninguno\" when no supply is in scope", () => {
      serveClaims(
        success(octoberClaim({ summary: buildPlantSurplusClaimSummary({ suppliesInScope: 0, suppliesWithData: 0 }) })),
      );
      renderPage();

      expect(within(summary()).getByText("Puntos de suministro incluidos").nextElementSibling).toHaveTextContent(/^Ninguno$/);
    });
  });

  describe("the warnings", () => {
    it("UI-SCL-005 shows each raised warning with its text and its list, unnumbered and in order", () => {
      serveClaims(success(octoberClaim({ warnings: everyWarning() })));
      renderPage();

      const notices = within(warningsArea()!).getAllByRole("note");
      const lines = (notice: HTMLElement) => within(notice).queryAllByRole("listitem").map(text);
      expect(notices.map((notice) => text(notice.querySelector("p")))).toEqual([
        "2 puntos de suministro no tienen datos este mes. Su excedente no se incluye.",
        "2 puntos tienen horas sin datos. Esos días van como estimados (E).",
        "Hasta un 8,0000 % del reparto no tiene punto de suministro en Conluz. Ese excedente no se reclama.",
        "El punto de la planta tiene un 5,0000 % del reparto. Esa parte no se reclama.",
        "La planta no tiene coeficientes aplicados en este mes. El fichero saldrá vacío.",
        "Hay horas con más excedente que la potencia nominal de la planta (100 kW). Puede haber datos duplicados.",
      ]);
      expect(lines(notices[0])).toEqual([
        "Casa de Amparo · ES0031406900000001JN0F · 4,2000 %",
        "Taller de Toni · ES0031406900000002JN0F · 3,1500 %",
      ]);
      expect(lines(notices[1])).toEqual([
        "Panadería Climent · ES0031406900000003JN0F · mié 07/10 y jue 08/10",
        "ES0031406900000004JN0F · lun 19/10",
      ]);
      expect(lines(notices[2])).toEqual(["Del 1 al 12 de octubre (12 días)", "El 20 de octubre (1 día)"]);
      expect(lines(notices[3])).toEqual([]);
      expect(lines(notices[4])).toEqual([]);
      expect(lines(notices[5])).toEqual(["jue 22/10 · 12–13 h · 118,4 kWh", "dom 25/10 · 02–03 h (2.ª) · 104,25 kWh"]);
    });

    it("UI-SCL-005 words one supply in the singular", () => {
      serveClaims(
        success(
          octoberClaim({
            warnings: buildPlantSurplusClaimWarnings({
              suppliesWithoutData: [{ supply: supply("001", "Casa de Amparo"), coefficient: 0.042 }],
              suppliesWithGaps: [{ supply: supply("003", "Panadería Climent"), days: ["2026-10-07"] }],
            }),
          }),
        ),
      );
      renderPage();

      expect(screen.getByText("1 punto de suministro no tiene datos este mes. Su excedente no se incluye.")).toBeVisible();
      expect(screen.getByText("1 punto tiene horas sin datos. Esos días van como estimados (E).")).toBeVisible();
      expect(within(summary()).getByText(/Este mes tiene 2 avisos/)).toBeVisible();
    });

    it("UI-SCL-003 counts the raised warnings, and \"Ver avisos\" moves focus to them", async () => {
      const user = userEvent.setup();
      serveClaims(success(octoberClaim({ warnings: everyWarning() })));
      renderPage();

      expect(within(summary()).getByText(/^Este mes tiene 6 avisos ·/)).toBeVisible();
      await user.click(screen.getByRole("link", { name: "Ver avisos" }));

      expect(document.activeElement).toBe(warningsArea());
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });

    it("UI-SCL-003 says \"1 aviso\" for one", () => {
      serveClaims(success(octoberClaim({ warnings: buildPlantSurplusClaimWarnings({ plantSupplyShare: 0.05 }) })));
      renderPage();

      expect(within(summary()).getByText(/^Este mes tiene 1 aviso ·/)).toBeVisible();
    });

    it("UI-SCL-005 shows no count and no warnings when none is raised", () => {
      renderPage();

      expect(screen.queryByText(/Este mes tiene/)).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Ver avisos" })).not.toBeInTheDocument();
      expect(warningsArea()).not.toBeInTheDocument();
    });
  });

  describe("the days", () => {
    const days = () => {
      const all = claimMonthDays(OCTOBER);
      all[0] = claimDay("2026-10-01", {
        surplusKWh: 214.5,
        peakHour: { startsAt: all[0].hours[13].startsAt, surplusKWh: 42.09 },
      });
      all[6] = claimDay("2026-10-07", { state: PlantSurplusClaimDayResponseState.ESTIMATED, surplusKWh: null, peakHour: null });
      return all;
    };

    it("UI-SCL-006 shows each day's date, state, total and peak hour, as rows on a narrow screen", () => {
      serveClaims(success(octoberClaim({ days: days() })));
      renderPage();

      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      const rows = within(screen.getByRole("list", { name: "Excedentes día a día" })).getAllByRole("listitem");
      expect(rows).toHaveLength(32);
      expect(rows[0]).toHaveTextContent("jue 01/10/2026");
      expect(rows[0]).toHaveTextContent("Real");
      expect(rows[0]).toHaveTextContent("Pico 13–14 h · 42,09 kWh");
      expect(rows[0]).toHaveTextContent("214,5");
      expect(rows[6]).toHaveTextContent("mié 07/10/2026");
      expect(rows[6]).toHaveTextContent("Pico —");
      expectNeutralStatusChip(within(rows[6]).getByText("Estimado"));
      expect(rows[31]).toHaveTextContent("Total del mes6961,25");
    });

    it("UI-SCL-006 shows a table on a wide screen, with the month total and the legend", () => {
      wideScreen();
      serveClaims(success(octoberClaim({ days: days() })));
      renderPage();

      const table = screen.getByRole("table", { name: "Excedentes día a día" });
      expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
        "Fecha",
        "Estado",
        "Total (kWh)",
        "Hora pico",
      ]);
      const first = within(table).getByRole("rowheader", { name: /jue 01\/10\/2026/ }).closest("tr")!;
      expect(within(first).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["Real", "214,5", "13–14 h · 42,09 kWh"]);
      const estimated = within(table).getByRole("rowheader", { name: /mié 07\/10\/2026/ }).closest("tr")!;
      expect(within(estimated).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["Estimado", "—", "—"]);
      expectNeutralStatusChip(within(estimated).getByText("Estimado"));
      expect(within(table).getByRole("rowheader", { name: "Total del mes" }).closest("tr")).toHaveTextContent("6961,25");
      expect(
        screen.getByText(
          "Real: todas las horas del día tienen datos de la distribuidora. Estimado: faltan horas; el día va al fichero marcado como estimado (E).",
        ),
      ).toBeVisible();
    });
  });

  describe("the hours", () => {
    const openDay = async (user: ReturnType<typeof userEvent.setup>, label: string) => {
      const button = screen.getByRole("button", { name: new RegExp(`^${label}`) });
      await user.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");
      return within(screen.getByRole("list", { name: `Horas del ${label}` })).getAllByRole("listitem");
    };

    it("UI-SCL-007 lists 25 hours on the day the clocks go back, the repeated one twice, with its label", async () => {
      const user = userEvent.setup();
      renderPage();

      const hours = await openDay(user, "dom 25/10/2026");
      expect(hours).toHaveLength(25);
      expect(hours.slice(1, 5).map((hour) => hour.firstChild?.textContent)).toEqual([
        "01–02 h",
        "02–03 h (1.ª)",
        "02–03 h (2.ª)",
        "03–04 h",
      ]);
      expect(screen.getAllByText("Cambio de hora: 25 horas").length).toBeGreaterThan(0);
      expect(screen.getByText("Horas del dom 25/10/2026 (kWh) · 25 horas")).toBeVisible();
    });

    it("UI-SCL-007 lists 23 hours on the day the clocks go forward, with its label", async () => {
      const user = userEvent.setup();
      serveClaims(
        success(octoberClaim({ month: "2026-03", days: claimMonthDays("2026-03"), availableMonths: { firstMonth: null, latestPublishedMonth: null } })),
      );
      renderPage();

      const hours = await openDay(user, "dom 29/03/2026");
      expect(hours).toHaveLength(23);
      expect(hours.slice(0, 3).map((hour) => hour.firstChild?.textContent)).toEqual(["00–01 h", "01–03 h", "03–04 h"]);
      expect(screen.getAllByText("Cambio de hora: 23 horas").length).toBeGreaterThan(0);
    });

    it("UI-SCL-007 reads an unrecorded hour as \"Sin datos\", and a measured zero as 0", async () => {
      const user = userEvent.setup();
      const all = claimMonthDays(OCTOBER);
      all[1] = claimDay("2026-10-02", {}, (_startsAt, index) => ({ surplusKWh: index === 0 ? null : index === 1 ? 0 : 3 }));
      serveClaims(success(octoberClaim({ days: all })));
      renderPage();

      const hours = await openDay(user, "vie 02/10/2026");
      expect(hours[0]).toHaveTextContent("00–01 hSin datos");
      expect(hours[1]).toHaveTextContent("01–02 h0");
      expect(screen.getAllByText("Sin datos")).toHaveLength(1);
    });

    it("UI-SCL-007 highlights an hour above the plant's nominal power and explains it", async () => {
      const user = userEvent.setup();
      const all = claimMonthDays(OCTOBER);
      all[21] = claimDay("2026-10-22", {}, (_startsAt, index) => ({ surplusKWh: index === 12 ? 118.4 : 3 }));
      serveClaims(
        success(
          octoberClaim({
            days: all,
            warnings: buildPlantSurplusClaimWarnings({
              hoursAboveNominalPower: [{ startsAt: all[21].hours[12].startsAt, surplusKWh: 118.4 }],
            }),
          }),
        ),
      );
      renderPage();

      const hours = await openDay(user, "jue 22/10/2026");
      expect(declaredStyle(hours[12])["background-color"]).toBe(colors.warning.surface);
      expect(declaredStyle(hours[11])["background-color"]).toBeUndefined();
      expect(
        screen.getByText("12–13 h: 118,4 kWh, más que la potencia nominal de la planta (100 kW). Puede haber datos duplicados."),
      ).toBeVisible();
    });
  });

  describe("the download", () => {
    it("UI-SCL-008 asks for the month shown and the selected format, and saves under the server's name", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(downloadButton()!);

      await waitFor(() => expect(triggerBrowserDownload).toHaveBeenCalledWith(FILE, FILENAME));
      expect(downloadPlantSurplusClaimFile).toHaveBeenCalledExactlyOnceWith(PLANT_ID, OCTOBER, "ENDESA");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("UI-SCL-008 asks for the generic format once chosen", async () => {
      const user = userEvent.setup();
      renderPage();

      await chooseOption(user, "Formato", "Genérico (CSV)");
      await user.click(downloadButton()!);

      await waitFor(() => expect(downloadPlantSurplusClaimFile).toHaveBeenCalledExactlyOnceWith(PLANT_ID, OCTOBER, "GENERIC"));
    });

    it("UI-SCL-008 offers no download while the month selected is loading and the month shown is another", () => {
      serveClaims(success(octoberClaim()), {
        "2026-09": query.placeholder<typeof getPlantSurplusClaim>(octoberClaim()),
      });
      renderPage("?month=2026-09");

      expect(downloadButton()).toBeDisabled();
      expect(screen.getByRole("combobox", { name: "Mes" })).toHaveTextContent("Septiembre de 2026");
    });

    it("UI-SCL-008 reads \"Descargando…\" and is disabled while the file downloads", async () => {
      const user = userEvent.setup();
      vi.mocked(downloadPlantSurplusClaimFile).mockReturnValue(new Promise(() => {}));
      renderPage();

      await user.click(downloadButton()!);

      expect(await screen.findByRole("button", { name: "Descargando…" })).toBeDisabled();
    });

    it("UI-SCL-009 confirms a month with warnings first, listing them; \"Cancelar\" asks for nothing", async () => {
      const user = userEvent.setup();
      serveClaims(success(octoberClaim({ warnings: everyWarning() })));
      renderPage();

      await user.click(downloadButton()!);
      const dialog = await screen.findByRole("dialog", { name: "Vas a descargar un fichero incompleto" });
      expect(within(dialog).getAllByRole("listitem").map(text)).toEqual([
        "2 puntos de suministro no tienen datos este mes. Su excedente no se incluye.",
        "2 puntos tienen horas sin datos. Esos días van como estimados (E).",
        "Hasta un 8,0000 % del reparto no tiene punto de suministro en Conluz. Ese excedente no se reclama.",
        "El punto de la planta tiene un 5,0000 % del reparto. Esa parte no se reclama.",
        "La planta no tiene coeficientes aplicados en este mes. El fichero saldrá vacío.",
        "Hay horas con más excedente que la potencia nominal de la planta (100 kW). Puede haber datos duplicados.",
      ]);
      expect(
        within(dialog).getByText("Tú decides si lo envías. Revisa los avisos antes de mandarlo a la comercializadora."),
      ).toBeVisible();

      await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

      await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());
      expect(downloadPlantSurplusClaimFile).not.toHaveBeenCalled();
    });

    it("UI-SCL-009 downloads once \"Descargar igualmente\" confirms it", async () => {
      const user = userEvent.setup();
      serveClaims(success(octoberClaim({ warnings: everyWarning() })));
      renderPage();

      await user.click(downloadButton()!);
      const dialog = await screen.findByRole("dialog", { name: "Vas a descargar un fichero incompleto" });
      await user.click(within(dialog).getByRole("button", { name: "Descargar igualmente" }));

      await waitFor(() => expect(triggerBrowserDownload).toHaveBeenCalledWith(FILE, FILENAME));
      expect(downloadPlantSurplusClaimFile).toHaveBeenCalledExactlyOnceWith(PLANT_ID, OCTOBER, "ENDESA");
      await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());
    });
  });

  describe("the CIL", () => {
    const CIL_NOTICE = "Falta el CIL de la planta. Endesa lo necesita para identificar la instalación.";

    /** A refusal as axios rejects a blob request with: its typed body still JSON text inside a Blob. */
    const cilRefusal = () =>
      Object.assign(new Error("Request failed with status code 409"), {
        status: 409,
        response: {
          status: 409,
          headers: {},
          data: new Blob(
            [JSON.stringify({ status: 409, errors: [{ code: "SURPLUS_CLAIM_CIL_REQUIRED", message: "raw backend message" }] })],
            { type: "application/json" },
          ),
        },
      });

    it("UI-SCL-010 replaces Endesa's download with the CIL notice when the plant has none", () => {
      serveClaims(success(octoberClaim({ cil: null })));
      renderPage();

      const notice = within(summary()).getByText(CIL_NOTICE).closest<HTMLElement>("[role='note']")!;
      expect(within(notice).getByRole("button", { name: "Añadir CIL" })).toBeVisible();
      expect(downloadButton()).not.toBeInTheDocument();
    });

    it("UI-SCL-010 never blocks the generic format", async () => {
      const user = userEvent.setup();
      serveClaims(success(octoberClaim({ cil: null })));
      renderPage();

      await chooseOption(user, "Formato", "Genérico (CSV)");

      expect(downloadButton()).toBeEnabled();
      expect(within(summary()).queryByRole("note")).not.toBeInTheDocument();
    });

    it("UI-SCL-010 \"Añadir CIL\" opens the plant's edit form", async () => {
      const user = userEvent.setup();
      serveClaims(success(octoberClaim({ cil: null })));
      renderPage();

      await user.click(screen.getByRole("button", { name: "Añadir CIL" }));

      expect(await screen.findByRole("dialog", { name: "Editar planta" })).toBeVisible();
    });

    it("UI-SCL-010 shows the CIL notice after a 409 SURPLUS_CLAIM_CIL_REQUIRED, and announces it", async () => {
      const user = userEvent.setup();
      vi.mocked(downloadPlantSurplusClaimFile).mockRejectedValue(cilRefusal());
      renderPage();
      const status = within(summary()).getByRole("status");

      await user.click(downloadButton()!);

      expect(await within(summary()).findByRole("note")).toHaveTextContent(CIL_NOTICE);
      expect(status).toHaveTextContent(CIL_NOTICE);
      expect(downloadButton()).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(triggerBrowserDownload).not.toHaveBeenCalled();
    });

    it("UI-SCL-010 drops the 409's notice once the claim is read again with another CIL", async () => {
      const user = userEvent.setup();
      vi.mocked(downloadPlantSurplusClaimFile).mockRejectedValue(cilRefusal());
      const { rerender } = renderPage();
      await user.click(downloadButton()!);
      expect(await within(summary()).findByRole("note")).toHaveTextContent(CIL_NOTICE);

      serveClaims(success(octoberClaim({ cil: "ES0031405000000002CD2F002" })));
      rerender(
        <Routes>
          <Route path="/plants/:plantId/surplus-claim" element={<PlantSurplusClaimPage />} />
        </Routes>,
      );

      expect(within(summary()).queryByRole("note")).not.toBeInTheDocument();
      expect(downloadButton()).toBeEnabled();
    });

    it("UI-SCL-010 drops the 409's notice once another month is chosen, and does not bring it back", async () => {
      const user = userEvent.setup();
      vi.mocked(downloadPlantSurplusClaimFile).mockRejectedValue(cilRefusal());
      serveClaims(success(octoberClaim()), {
        "2026-09": success(octoberClaim({ month: "2026-09", days: claimMonthDays("2026-09") })),
        [OCTOBER]: success(octoberClaim()),
      });
      renderPage();
      await user.click(downloadButton()!);
      expect(await within(summary()).findByRole("note")).toHaveTextContent(CIL_NOTICE);

      await chooseOption(user, "Mes", "Septiembre de 2026");
      expect(downloadButton()).toBeEnabled();
      await chooseOption(user, "Mes", "Octubre de 2026");

      expect(within(summary()).queryByRole("note")).not.toBeInTheDocument();
      expect(downloadButton()).toBeEnabled();
    });

    it("UI-SCL-010 drops the 409's notice once another format is chosen", async () => {
      const user = userEvent.setup();
      vi.mocked(downloadPlantSurplusClaimFile).mockRejectedValue(cilRefusal());
      renderPage();
      await user.click(downloadButton()!);
      expect(await within(summary()).findByRole("note")).toHaveTextContent(CIL_NOTICE);

      await chooseOption(user, "Formato", "Genérico (CSV)");
      await chooseOption(user, "Formato", "Endesa (Excel en ZIP)");

      expect(within(summary()).queryByRole("note")).not.toBeInTheDocument();
      expect(downloadButton()).toBeEnabled();
    });
  });

  describe("a failed download", () => {
    it("UI-SCL-011 shows the failure with a retry in the summary, and the retry repeats the same request", async () => {
      const user = userEvent.setup();
      vi.mocked(downloadPlantSurplusClaimFile).mockRejectedValueOnce(apiError(500));
      renderPage();

      await user.click(downloadButton()!);
      const alert = await within(summary()).findByRole("alert");
      expect(alert).toHaveTextContent("No se pudo descargar el fichero de octubre de 2026.");

      await user.click(within(alert).getByRole("button", { name: "Reintentar" }));

      await waitFor(() => expect(triggerBrowserDownload).toHaveBeenCalledWith(FILE, FILENAME));
      expect(vi.mocked(downloadPlantSurplusClaimFile).mock.calls).toEqual([
        [PLANT_ID, OCTOBER, "ENDESA"],
        [PLANT_ID, OCTOBER, "ENDESA"],
      ]);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
