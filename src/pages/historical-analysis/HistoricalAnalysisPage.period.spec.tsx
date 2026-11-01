import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navigate, useLocation } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import { buildCurrentUser } from "../../test/fixtures";
import { CAPTURED_SUPPLIES_BY_USER_ID } from "../../test/capturedResponses";
import type { CurrentUserResponse, SupplyResponse } from "../../api/models";

vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
}));
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetAllCommunities: vi.fn(),
}));
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSupplyEnergyMetrics: vi.fn(),
}));
vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMembershipEnergyMetrics: vi.fn(),
}));

let mockLoggedUser: CurrentUserResponse;
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => mockLoggedUser,
}));

import { getSuppliesByUserId, useGetSuppliesByUserId } from "../../api/users/users";
import { useGetAllCommunities } from "../../api/communities/communities";
import { getSupplyEnergyMetrics, useGetSupplyEnergyMetrics } from "../../api/supplies/supplies";
import { getMembershipEnergyMetrics, useGetMembershipEnergyMetrics } from "../../api/memberships/memberships";
import { useActiveCommunity } from "../../context/community.context";
import { useCommunitySwitchRedirect } from "../../hooks/useCommunitySwitchRedirect";
import { HistoricalAnalysisPage } from "./HistoricalAnalysisPage";
import {
  AUGUST_2026,
  COMMUNITY_ID,
  DECEMBER_2026,
  GARAGE,
  HOME,
  NOTHING_PUBLISHED,
  OWNER_ID,
  SEPTEMBER_2026,
  membershipLatest,
  supplyLatest,
} from "./historicalAnalysis.testData";

const [, CAPTURED_OTHER_COMMUNITY_SUPPLY] = CAPTURED_SUPPLIES_BY_USER_ID;
const OTHER_COMMUNITY_ID = CAPTURED_OTHER_COMMUNITY_SUPPLY.community.id;

const PERIOD = /^Periodo/;
const PUBLICATION_SEPTEMBER =
  "Los datos de cada mes se publican hacia el día 10 del mes siguiente, así que lo más reciente que puedes ver es septiembre de 2026.";
const RULE = "Hasta 62 días se ve por días; si eliges más, se ajusta a meses completos. Como máximo, 24 meses.";
const TOO_LONG = "El rango puede ser de 24 meses como máximo. Acorta las fechas.";
const CLAMPED_TO_AUGUST_SUPPLY = "Este punto tiene datos publicados hasta agosto de 2026, así que hemos ajustado el periodo.";
const CLAMPED_TO_AUGUST_ALL = "Tus puntos tienen datos publicados hasta agosto de 2026, así que hemos ajustado el periodo.";

type Period = { startDate: string | null; endDate: string | null };

/** Each scope's latest published month: the membership's per community, each supply's own. */
let membershipAnchors: Record<string, Period>;
let supplyAnchors: Record<string, Period>;

function serveAnchors() {
  vi.mocked(useGetMembershipEnergyMetrics).mockImplementation((communityId, _userId, _params, options) =>
    options?.query?.enabled === false
      ? query.disabled()
      : query.success<typeof getMembershipEnergyMetrics>(membershipLatest(membershipAnchors[communityId])),
  );
  vi.mocked(useGetSupplyEnergyMetrics).mockImplementation((supplyId, _params, options) => {
    if (options?.query?.enabled === false) return query.disabled();
    const supply = [HOME, GARAGE, CAPTURED_OTHER_COMMUNITY_SUPPLY].find(({ id }) => id === supplyId)!;
    return query.success<typeof getSupplyEnergyMetrics>(supplyLatest(supply, supplyAnchors[supplyId]));
  });
}

function serveSupplies(supplies: SupplyResponse[]) {
  vi.mocked(useGetSuppliesByUserId).mockImplementation((_userId, options) =>
    options?.query?.enabled === false ? query.disabled() : query.success<typeof getSuppliesByUserId>(supplies),
  );
}

function CurrentLocation() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{pathname + search}</div>;
}
const currentLocation = () => screen.getByTestId("location").textContent;
const currentSearch = () => new URLSearchParams(currentLocation()!.split("?")[1] ?? "");

/** As AuthenticatedLayout renders a routed page: the switch redirect first, then the page keyed on the community. */
function AsRouted() {
  const communityId = useActiveCommunity();
  const redirect = useCommunitySwitchRedirect();
  return (
    <>
      {redirect ? <Navigate to={redirect} replace /> : <HistoricalAnalysisPage key={communityId} />}
      <CurrentLocation />
    </>
  );
}

function renderPage(search = "") {
  return renderWithProviders(<AsRouted />, { route: `/historical-analysis${search}`, activeCommunityId: COMMUNITY_ID });
}

const heading = () => screen.getByRole("heading", { level: 2 });

/** Below sm (jsdom answers no media query): the period sheet's options, each as its text. */
async function openPeriodSheet() {
  await userEvent.click(screen.getByRole("button", { name: PERIOD }));
  return screen.getByRole("dialog", { name: "Periodo" });
}

async function chooseInSheet(name: RegExp) {
  const sheet = await openPeriodSheet();
  await userEvent.click(within(sheet).getByRole("radio", { name }));
}

const grid = (month: string) => screen.getByRole("grid", { name: month });
const dayIn = (month: string, day: number) => within(grid(month)).getByRole("gridcell", { name: String(day) });

function stubWideScreen() {
  // jsdom has no layout: answer every (min-width) query as a wide screen would.
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
  mockLoggedUser = buildCurrentUser({
    id: OWNER_ID,
    memberships: { [COMMUNITY_ID]: "COMMUNITY_MEMBER", [OTHER_COMMUNITY_ID]: "COMMUNITY_MEMBER" },
  });
  vi.mocked(useGetAllCommunities).mockReturnValue(query.disabled());
  serveSupplies([HOME, GARAGE, CAPTURED_OTHER_COMMUNITY_SUPPLY]);
  membershipAnchors = { [COMMUNITY_ID]: SEPTEMBER_2026, [OTHER_COMMUNITY_ID]: AUGUST_2026 };
  supplyAnchors = { [HOME.id]: AUGUST_2026, [GARAGE.id]: SEPTEMBER_2026, [CAPTURED_OTHER_COMMUNITY_SUPPLY.id]: AUGUST_2026 };
  serveAnchors();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("UI-HIS-005 the period ends no later than the latest month published for the selected scope (#248)", () => {
  it("UI-HIS-005 opens on the latest published month, with its granularity and when data is published", () => {
    renderPage();

    expect(heading()).toHaveTextContent("Datos de septiembre de 2026");
    expect(screen.getByText("Por días")).toBeInTheDocument();
    expect(screen.getByText(PUBLICATION_SEPTEMBER)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: PERIOD })).toHaveTextContent("Último mes publicado");
  });

  it("UI-HIS-005 offers each preset with the period it resolves to and its granularity", async () => {
    renderPage();

    const sheet = await openPeriodSheet();
    const options = within(sheet)
      .getAllByRole("radio")
      .map((radio) => radio.closest("label")!.textContent);
    expect(options).toEqual([
      "Último mes publicadoSeptiembre de 2026 · por días",
      "Este añoDe enero a septiembre de 2026 · por meses",
      "Últimos 12 mesesDe octubre de 2025 a septiembre de 2026 · por meses",
      "Rango personalizadoElige las fechas, hasta 24 meses",
    ]);
  });

  it("UI-HIS-005 a supply's presets end at its own latest published month", async () => {
    renderPage(`?supplyId=${HOME.id}&period=last12`);

    expect(heading()).toHaveTextContent("Datos de septiembre de 2025 a agosto de 2026");
    expect(screen.getByText("Por meses")).toBeInTheDocument();
  });

  it("UI-HIS-005 with nothing published shows the neutral state and no period selector", () => {
    membershipAnchors[COMMUNITY_ID] = NOTHING_PUBLISHED;
    const { container } = renderPage();

    expect(screen.getByRole("note")).toHaveTextContent("Todavía no hay datos publicados");
    expect(screen.queryByRole("button", { name: PERIOD })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    expect(container.querySelector(".MuiAlert-root")).toBeNull();
  });

  it("UI-HIS-005 AC4 -- anchor December 2026: 'Este año' is a neutral state that leads to the last 12 months", async () => {
    membershipAnchors[COMMUNITY_ID] = DECEMBER_2026;
    const { container } = renderPage("?period=year");

    const note = screen.getByRole("note");
    expect(note).toHaveTextContent("Aún no hay datos de 2027");
    expect(note).toHaveTextContent("Los datos de enero se publican hacia el 10 de febrero. Mientras tanto, puedes ver tus últimos 12 meses.");
    expect(container.querySelector(".MuiAlert-root")).toBeNull();
    expect(screen.getByRole("button", { name: PERIOD })).toHaveTextContent("Este año");

    await userEvent.click(screen.getByRole("button", { name: "Ver últimos 12 meses" }));

    expect(currentSearch().get("period")).toBe("last12");
    expect(heading()).toHaveTextContent("Datos de enero a diciembre de 2026");
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});

describe("UI-HIS-006 granularity is daily up to 62 calendar days, whole months above, and a snapped range says so (#248)", () => {
  beforeEach(stubWideScreen);

  async function openRangePicker() {
    await userEvent.click(screen.getByRole("combobox", { name: "Periodo" }));
    await userEvent.click(screen.getByRole("option", { name: /^Rango personalizado/ }));
    return screen.getByRole("dialog", { name: "Rango personalizado" });
  }

  it("UI-HIS-006 AC6 -- the days after the anchor month cannot be picked, and the month says why", async () => {
    renderPage();
    await openRangePicker();

    expect(dayIn("Septiembre de 2026", 30)).toBeEnabled();
    for (const day of [1, 15, 31]) expect(dayIn("Octubre de 2026", day)).toBeDisabled();
    expect(screen.getByText("Octubre de 2026 aún no está publicado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeDisabled();
  });

  it("UI-HIS-006 announces the period and granularity before applying, and the header says what was snapped", async () => {
    renderPage();
    const picker = await openRangePicker();

    await userEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    await userEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    await userEvent.click(dayIn("Julio de 2026", 10));
    await userEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    await userEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    await userEvent.click(dayIn("Septiembre de 2026", 25));

    expect(within(picker).getByRole("button", { name: "Desde 10/07/2026" })).toBeInTheDocument();
    expect(within(picker).getByRole("button", { name: "Hasta 25/09/2026" })).toBeInTheDocument();
    // The visible line; the live region below repeats it for screen readers.
    expect(within(picker).getByText("78 días: se mostrará por meses, de julio a septiembre de 2026.", { selector: "p" })).toBeInTheDocument();
    expect(within(picker).getByText(RULE)).toBeInTheDocument();
    await waitFor(() =>
      expect(within(picker).getByRole("status")).toHaveTextContent("78 días: se mostrará por meses, de julio a septiembre de 2026."),
    );
    expect(currentSearch().get("period")).toBeNull();

    await userEvent.click(within(picker).getByRole("button", { name: "Aplicar" }));

    expect(currentSearch().toString()).toBe("period=custom&from=2026-07-10&to=2026-09-25");
    expect(heading()).toHaveTextContent("Datos de julio a septiembre de 2026");
    expect(screen.getByText("Por meses")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Elegiste del 10 de julio al 25 de septiembre de 2026. Como son más de 62 días, lo mostramos por meses completos: " +
          "de julio de 2026 a septiembre de 2026 (3 meses).",
      ),
    ).toBeInTheDocument();
  });

  it("UI-HIS-006 AC1 -- 62 days are applied as picked, day by day, with nothing snapped", async () => {
    renderPage("?period=custom&from=2026-07-01&to=2026-08-31");

    expect(heading()).toHaveTextContent("Datos del 1 de julio al 31 de agosto de 2026");
    expect(screen.getByText("Por días")).toBeInTheDocument();
    expect(screen.queryByText(/^Elegiste/)).not.toBeInTheDocument();
  });

  it("UI-HIS-006 cancelling leaves the period as it was", async () => {
    renderPage("?period=year");
    const picker = await openRangePicker();

    await userEvent.click(dayIn("Septiembre de 2026", 1));
    await userEvent.click(within(picker).getByRole("button", { name: "Cancelar" }));

    expect(currentSearch().toString()).toBe("period=year");
    expect(heading()).toHaveTextContent("Datos de enero a septiembre de 2026");
  });
});

describe("UI-HIS-006 below sm", () => {
  it("UI-HIS-006 the period and the custom range open as bottom sheets, the range on one month at a time", async () => {
    renderPage();

    const sheet = await openPeriodSheet();
    expect(sheet).toHaveClass("MuiDrawer-paperAnchorBottom");
    await userEvent.click(within(sheet).getByRole("radio", { name: /^Rango personalizado/ }));

    const picker = screen.getByRole("dialog", { name: "Rango personalizado" });
    expect(picker).toHaveClass("MuiDrawer-paperAnchorBottom");
    expect(within(picker).getAllByRole("grid")).toEqual([within(picker).getByRole("grid", { name: "Septiembre de 2026" })]);
    expect(within(picker).getByRole("button", { name: "Mes siguiente" })).toBeDisabled();
  });
});

describe("UI-HIS-007 a period over 24 months once snapped cannot be applied (#248)", () => {
  beforeEach(stubWideScreen);

  it("UI-HIS-007 AC6 -- one day more than 24 whole months says so, and Aplicar stays disabled", async () => {
    renderPage("?period=custom&from=2024-10-01&to=2026-09-30");
    expect(heading()).toHaveTextContent("Datos de octubre de 2024 a septiembre de 2026");

    await userEvent.click(screen.getByRole("combobox", { name: "Periodo" }));
    await userEvent.click(screen.getByRole("option", { name: /^Rango personalizado/ }));
    const picker = screen.getByRole("dialog", { name: "Rango personalizado" });
    expect(within(picker).getByRole("button", { name: "Aplicar" })).toBeEnabled();

    await userEvent.click(within(picker).getByRole("button", { name: /^Desde/ }));
    for (let month = 0; month < 24; month++) await userEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    await userEvent.click(dayIn("Septiembre de 2024", 30));

    expect(within(picker).getByText(TOO_LONG, { selector: "p" })).toBeInTheDocument();
    await waitFor(() => expect(within(picker).getByRole("status")).toHaveTextContent(TOO_LONG));
    expect(within(picker).getByRole("button", { name: "Aplicar" })).toBeDisabled();
    // Paging back two years is 24 clicks, each re-rendering two calendars.
  }, 15_000);

  it("UI-HIS-007 a link to a range over 24 months falls back to the latest published month, silently", async () => {
    renderPage("?period=custom&from=2024-09-30&to=2026-09-30");

    await waitFor(() => expect(currentSearch().get("period")).toBe("latest"));
    expect(heading()).toHaveTextContent("Datos de septiembre de 2026");
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});

describe("UI-HIS-008 a custom range is clamped to the anchor it meets, and the user is told (#248)", () => {
  it("UI-HIS-008 AC7 -- switching to a supply published up to an earlier month clamps the range and says so", async () => {
    renderPage("?period=custom&from=2026-07-10&to=2026-09-20");
    expect(heading()).toHaveTextContent("Datos de julio a septiembre de 2026");

    const sheet = await (async () => {
      await userEvent.click(screen.getByRole("button", { name: /^Punto de suministro/ }));
      return screen.getByRole("dialog", { name: "Punto de suministro" });
    })();
    await userEvent.click(within(sheet).getByRole("radio", { name: new RegExp(`^Casa`) }));

    await waitFor(() => expect(currentSearch().get("to")).toBe("2026-08-31"));
    expect(currentSearch().get("from")).toBe("2026-07-10");
    expect(screen.getByRole("note")).toHaveTextContent(CLAMPED_TO_AUGUST_SUPPLY);
    // 53 days once clamped: the granularity is evaluated again.
    expect(heading()).toHaveTextContent("Datos del 10 de julio al 31 de agosto de 2026");
    expect(screen.getByText("Por días")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(CLAMPED_TO_AUGUST_SUPPLY));
  });

  it("UI-HIS-008 AC7 -- a range that would be empty once clamped falls back to the latest published month, and says so", async () => {
    renderPage(`?supplyId=${GARAGE.id}&period=custom&from=2026-09-02&to=2026-09-20`);
    expect(heading()).toHaveTextContent("Datos del 2 al 20 de septiembre de 2026");

    await userEvent.click(screen.getByRole("button", { name: /^Punto de suministro/ }));
    await userEvent.click(within(screen.getByRole("dialog", { name: "Punto de suministro" })).getByRole("radio", { name: /^Casa/ }));

    await waitFor(() => expect(currentSearch().get("period")).toBe("latest"));
    expect(currentSearch().has("from")).toBe(false);
    expect(heading()).toHaveTextContent("Datos de agosto de 2026");
    expect(screen.getByRole("note")).toHaveTextContent(CLAMPED_TO_AUGUST_SUPPLY);
  });

  it("UI-HIS-008 a link whose range ends after the anchor is clamped on arrival, and says so", async () => {
    renderPage(`?supplyId=${HOME.id}&period=custom&from=2026-07-10&to=2026-09-20`);

    await waitFor(() => expect(currentSearch().get("to")).toBe("2026-08-31"));
    expect(screen.getByRole("note")).toHaveTextContent(CLAMPED_TO_AUGUST_SUPPLY);
    expect(heading()).toHaveTextContent("Datos del 10 de julio al 31 de agosto de 2026");
  });

  it("UI-HIS-008 a community switch clamps a range past the new community's anchor, and says so", async () => {
    const { switchActiveCommunity } = renderPage("?period=custom&from=2026-07-10&to=2026-09-20");
    expect(heading()).toHaveTextContent("Datos de julio a septiembre de 2026");

    switchActiveCommunity(OTHER_COMMUNITY_ID);

    await waitFor(() => expect(currentSearch().get("to")).toBe("2026-08-31"));
    expect(currentSearch().get("from")).toBe("2026-07-10");
    expect(screen.getByRole("note")).toHaveTextContent(CLAMPED_TO_AUGUST_ALL);
  });

  it("UI-HIS-008 the notice goes once the user picks another period", async () => {
    renderPage(`?supplyId=${HOME.id}&period=custom&from=2026-07-10&to=2026-09-20`);
    await waitFor(() => expect(screen.getByRole("note")).toHaveTextContent(CLAMPED_TO_AUGUST_SUPPLY));

    await chooseInSheet(/^Este año/);

    expect(screen.queryByText(CLAMPED_TO_AUGUST_SUPPLY)).not.toBeInTheDocument();
  });

  it("UI-HIS-008 a range inside the new anchor is kept, with no notice", async () => {
    renderPage("?period=custom&from=2026-07-10&to=2026-08-20");

    await userEvent.click(screen.getByRole("button", { name: /^Punto de suministro/ }));
    await userEvent.click(within(screen.getByRole("dialog", { name: "Punto de suministro" })).getByRole("radio", { name: /^Casa/ }));

    await waitFor(() => expect(currentSearch().get("supplyId")).toBe(HOME.id));
    expect(currentSearch().get("to")).toBe("2026-08-20");
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});

describe("UI-HIS-009 the period is held in the query string (#248)", () => {
  it("UI-HIS-009 a chosen preset is written next to the supply, and read back on arrival", async () => {
    renderPage(`?supplyId=${GARAGE.id}`);

    await chooseInSheet(/^Este año/);

    expect(currentSearch().toString()).toBe(`supplyId=${GARAGE.id}&period=year`);
    expect(heading()).toHaveTextContent("Datos de enero a septiembre de 2026");
  });

  it.each(["?period=bogus", "?period=custom&from=2026-02-30&to=2026-03-02", "?period=custom&from=2026-08-02&to=2026-08-01", "?from=2026-08-01"])(
    "UI-HIS-009 %s falls back to the latest published month, and the address is corrected, silently",
    async (search) => {
      renderPage(search);

      await waitFor(() => expect(currentSearch().toString()).toBe("period=latest"));
      expect(heading()).toHaveTextContent("Datos de septiembre de 2026");
      expect(screen.queryByRole("note")).not.toBeInTheDocument();
    },
  );

  it.each([
    ["pending", () => query.loading()],
    ["failed", () => query.error(apiError(500))],
  ])("UI-HIS-009 leaves the address untouched while the anchor is %s", async (_case, answer) => {
    vi.mocked(useGetMembershipEnergyMetrics).mockImplementation((_c, _u, _p, options) =>
      options?.query?.enabled === false ? query.disabled() : (answer() as ReturnType<typeof useGetMembershipEnergyMetrics>),
    );
    renderPage("?period=bogus&from=2026-13-01");

    // Give a normalising effect the chance to run before asserting it did not.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(currentLocation()).toBe("/historical-analysis?period=bogus&from=2026-13-01");
  });

  it("UI-HIS-009 leaves the address untouched when nothing is published", async () => {
    membershipAnchors[COMMUNITY_ID] = NOTHING_PUBLISHED;
    renderPage("?period=bogus");

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(currentLocation()).toBe("/historical-analysis?period=bogus");
  });

  it("UI-HIS-009 a community switch keeps the period and drops the supply", async () => {
    const { switchActiveCommunity } = renderPage(`?supplyId=${HOME.id}&period=custom&from=2026-07-01&to=2026-07-31`);
    expect(heading()).toHaveTextContent("Datos de julio de 2026");

    switchActiveCommunity(OTHER_COMMUNITY_ID);

    await waitFor(() => expect(currentLocation()).toBe("/historical-analysis?period=custom&from=2026-07-01&to=2026-07-31"));
    expect(heading()).toHaveTextContent("Datos de julio de 2026");
  });
});
