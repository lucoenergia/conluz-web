import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildCurrentUser,
  buildMemberRecord,
  buildSupply,
  buildSupplyCapabilities,
} from "../../test/fixtures";
import { colors } from "../../theme/tokens";
import { ENERGY_COLORS } from "../../components/EnergyFigures/energyColors";
import type { CurrentUserResponse, SupplyProductionTodayResponse, SupplyResponse } from "../../api/models";

// ApexCharts cannot lay out in jsdom, and the chart's drawing is not this spec's subject:
// the chart's accessible description is asserted instead.
// String form: the typed one cannot express this module's default export.
vi.mock("react-apexcharts", () => ({ default: () => null }));

vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
}));
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSupply: vi.fn(),
  useGetSupplyEnergyToday: vi.fn(),
}));
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));

const mockErrorDispatch = vi.fn();
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

let mockLoggedUser: CurrentUserResponse;
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => mockLoggedUser,
}));

import { getSuppliesByUserId, useGetSuppliesByUserId } from "../../api/users/users";
import { getSupply, getSupplyEnergyToday, useGetSupply, useGetSupplyEnergyToday } from "../../api/supplies/supplies";
import { getCommunityById, useGetCommunityById } from "../../api/communities/communities";
import { TodayPage } from "./TodayPage";
import { NOW, available, energyToday, slot, slots, withoutData } from "./todayEnergy.testData";

const COMMUNITY_ID = "community-a";
const CALLER_ID = "caller";
const community = { id: COMMUNITY_ID, name: "Comunidad A" };
const ownCapabilities = buildSupplyCapabilities({ canRead: true });

/** The caller's own supplies, in the order the listing returns them. */
const HOME = buildSupply({
  id: "own-home",
  name: "Casa",
  code: "ES0021000000000001AA",
  user: { id: CALLER_ID },
  community,
  capabilities: ownCapabilities,
});
const GARAGE = buildSupply({
  id: "own-garage",
  name: null,
  address: "Calle Mayor 3, garaje",
  code: "ES0021000000000002AA",
  user: { id: CALLER_ID },
  community,
  capabilities: ownCapabilities,
});
/** The caller's own supply that backs the community's plant: it receives no share, so it is never offered. */
const PLANT_SUPPLY = buildSupply({
  id: "own-plant-supply",
  name: "Cubierta del polideportivo",
  code: "ES0021000000000003AA",
  user: { id: CALLER_ID },
  community,
  plant: { id: "plant-1", name: "Planta Polideportivo" },
  capabilities: ownCapabilities,
});
/** The caller's own supply in another community: the listing spans every community. */
const ELSEWHERE = buildSupply({
  id: "own-elsewhere",
  name: "Casa del pueblo",
  code: "ES0021000000000004AA",
  user: { id: CALLER_ID },
  community: { id: "community-b", name: "Comunidad B" },
  capabilities: ownCapabilities,
});
/** Another member's supply in the active community, which opens its figures to a community admin. */
const MEMBERS = buildSupply({
  id: "members-supply",
  name: "Casa de Lucía",
  code: "ES0021000000000009AA",
  user: { id: "another-member" },
  ownerRecord: buildMemberRecord({ fullName: "Lucía Martínez Soler" }),
  community,
  capabilities: buildSupplyCapabilities({ canRead: true }),
});
const UNREADABLE: SupplyResponse = { ...MEMBERS, id: "unreadable", capabilities: buildSupplyCapabilities({}) };
const MEMBERS_PLANT_SUPPLY: SupplyResponse = { ...MEMBERS, id: "members-plant-supply", plant: { id: "plant-1", name: "Planta" } };

const admin = () => buildCurrentUser({ id: CALLER_ID, memberships: { [COMMUNITY_ID]: "COMMUNITY_ADMIN" } });
const plainMember = () => buildCurrentUser({ id: CALLER_ID, memberships: { [COMMUNITY_ID]: "COMMUNITY_MEMBER" } });

type Options = { query?: { enabled?: boolean } } | undefined;
const isEnabled = (options: unknown) => (options as Options)?.query?.enabled !== false;

let ownListing: SupplyResponse[];
let canManage: boolean;
let lookups: SupplyResponse[];
/** What GET /supplies/{id}/energy-today answers, per supply. */
let today: (supplyId: string) => ReturnType<typeof useGetSupplyEnergyToday>;

const answer = (production: SupplyProductionTodayResponse) => query.success<typeof getSupplyEnergyToday>(energyToday(production));

/** A producing answer, every asserted value set here. */
const PRODUCING = available({
  currentAssignedPowerKW: 0.48,
  currentPlantPowerKW: 12.5,
  assignedEnergyKWh: 3.4,
  partitionCoefficient: 0.0425,
  assignedPowerCurve: slots("08:00", "13:40", 0.48),
  lastUpdatedAt: "2026-11-12T13:40:00+01:00",
  stale: false,
});

function serve() {
  vi.mocked(useGetSuppliesByUserId).mockImplementation((_userId, options) =>
    isEnabled(options) ? query.success<typeof getSuppliesByUserId>(ownListing) : query.disabled(),
  );
  vi.mocked(useGetCommunityById).mockImplementation((_id, options) =>
    isEnabled(options)
      ? query.success<typeof getCommunityById>(
          buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities({ canRead: true, canManage }) }),
        )
      : query.disabled(),
  );
  vi.mocked(useGetSupply).mockImplementation((supplyId, options) => {
    if (!isEnabled(options) || !supplyId) return query.disabled();
    const supply = lookups.find(({ id }) => id === supplyId);
    return supply ? query.success<typeof getSupply>(supply) : query.error(apiError(404));
  });
  vi.mocked(useGetSupplyEnergyToday).mockImplementation((supplyId, options) =>
    isEnabled(options) && supplyId ? today(supplyId) : query.disabled(),
  );
}

function CurrentLocation() {
  const { search } = useLocation();
  return <div data-testid="location">{search}</div>;
}
const currentSearch = () => screen.getByTestId("location").textContent;

function renderPage(search = "") {
  return renderWithProviders(
    <>
      <TodayPage />
      <CurrentLocation />
    </>,
    { route: `/today${search}`, activeCommunityId: COMMUNITY_ID },
  );
}

/** The supply ids the page asked today's data for. */
const askedFor = () =>
  new Set(
    vi
      .mocked(useGetSupplyEnergyToday)
      .mock.calls.filter(([supplyId, options]) => supplyId && isEnabled(options))
      .map(([supplyId]) => supplyId),
  );

// jsdom answers no media query, so the selector is its bottom sheet, as on a phone.
const selector = () => screen.getByRole("button", { name: /^Punto de suministro/ });
/** The supply the selector shows as chosen. */
const shown = () => selector().textContent;
async function openSheet() {
  await userEvent.click(selector());
  return screen.getByRole("dialog", { name: "Punto de suministro" });
}
const optionLabels = (sheet: HTMLElement) => within(sheet).getAllByRole("radio").map((radio) => radio.closest("label")!.textContent);
const HOME_LABEL = "Casa · ES0021000000000001AA";
const GARAGE_LABEL = "Calle Mayor 3, garaje · ES0021000000000002AA";
const MEMBERS_LABEL = "Casa de Lucía · ES0021000000000009AA · Lucía Martínez Soler";
const hero = () => screen.getByTestId("energy-flow-hero");
const conduit = () => within(hero()).getByTestId("conduit");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  vi.clearAllMocks();
  mockLoggedUser = plainMember();
  ownListing = [HOME, PLANT_SUPPLY, GARAGE, ELSEWHERE];
  canManage = false;
  lookups = [MEMBERS, UNREADABLE, MEMBERS_PLANT_SUPPLY];
  today = () => answer(PRODUCING);
  serve();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the supply selector", () => {
  it("UI-TDY-002 lists only the caller's own supplies in the active community, without the plant's own, by name and CUPS", async () => {
    renderPage();

    expect(shown()).toBe(HOME_LABEL);
    expect(optionLabels(await openSheet())).toEqual([HOME_LABEL, GARAGE_LABEL]);
  });

  it("UI-TDY-002 shows the first own supply without a parameter, and asks today's data for it alone", () => {
    renderPage();

    expect(askedFor()).toEqual(new Set([HOME.id]));
    expect(screen.getByRole("heading", { level: 1, name: "Datos de hoy" })).toBeInTheDocument();
  });

  it("UI-TDY-002 choosing another supply holds it in the address and asks its data", async () => {
    renderPage();

    await userEvent.click(within(await openSheet()).getByRole("radio", { name: GARAGE_LABEL }));

    expect(currentSearch()).toBe(`?supplyId=${GARAGE.id}`);
    expect(shown()).toBe(GARAGE_LABEL);
    expect(askedFor()).toContain(GARAGE.id);
  });

  it("UI-TDY-002 a caller whose only supply here backs the plant sees the neutral no-supply state, with no selector and no request", () => {
    ownListing = [PLANT_SUPPLY, ELSEWHERE];
    renderPage();

    expect(screen.getByRole("note")).toHaveTextContent("No tienes puntos de suministro en esta comunidad");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(askedFor()).toEqual(new Set());
  });
});

describe("?supplyId=", () => {
  it("UI-TDY-003 preselects one of the caller's own supplies", () => {
    renderPage(`?supplyId=${GARAGE.id}`);

    expect(shown()).toBe(GARAGE_LABEL);
    expect(askedFor()).toEqual(new Set([GARAGE.id]));
  });

  it("UI-TDY-003 shows a supply the caller may read but does not own in the selector's own group, with its owner", async () => {
    mockLoggedUser = admin();
    canManage = true;
    renderPage(`?supplyId=${MEMBERS.id}`);

    expect(shown()).toBe(MEMBERS_LABEL);
    const sheet = await openSheet();
    expect(within(sheet).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "Punto que estás consultando",
      "Tus puntos",
    ]);
    expect(optionLabels(sheet)).toEqual([MEMBERS_LABEL, HOME_LABEL, GARAGE_LABEL]);
    expect(within(sheet).getByRole("radio", { name: MEMBERS_LABEL })).toBeChecked();
    expect(askedFor()).toEqual(new Set([MEMBERS.id]));
  });

  it("UI-TDY-003 a community admin with no own supply sees the viewed one, not the no-supply state", () => {
    mockLoggedUser = admin();
    canManage = true;
    ownListing = [];
    renderPage(`?supplyId=${MEMBERS.id}`);

    expect(shown()).toBe(MEMBERS_LABEL);
    expect(screen.queryByText("No tienes puntos de suministro en esta comunidad")).not.toBeInTheDocument();
    expect(askedFor()).toEqual(new Set([MEMBERS.id]));
  });

  it("UI-TDY-003 ignores a supply the caller may not read, as if there were no parameter", () => {
    mockLoggedUser = admin();
    canManage = true;
    renderPage(`?supplyId=${UNREADABLE.id}`);

    expect(shown()).toBe(HOME_LABEL);
    expect(askedFor()).toEqual(new Set([HOME.id]));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("UI-TDY-003 ignores an unknown id, without an error", () => {
    mockLoggedUser = admin();
    canManage = true;
    renderPage("?supplyId=no-such-supply");

    expect(shown()).toBe(HOME_LABEL);
    expect(askedFor()).toEqual(new Set([HOME.id]));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(currentSearch()).toBe("");
  });

  it("UI-TDY-003 ignores another member's supply for a caller the community grants no canManage", () => {
    renderPage(`?supplyId=${MEMBERS.id}`);

    expect(shown()).toBe(HOME_LABEL);
    expect(askedFor()).toEqual(new Set([HOME.id]));
    expect(vi.mocked(useGetSupply).mock.calls.filter(([supplyId, options]) => supplyId && isEnabled(options))).toEqual([]);
  });

  it("UI-TDY-003 ignores a supply that backs a plant, the caller's own or another member's", async () => {
    mockLoggedUser = admin();
    canManage = true;
    const { unmount } = renderPage(`?supplyId=${MEMBERS_PLANT_SUPPLY.id}`);
    expect(shown()).toBe(HOME_LABEL);
    expect(optionLabels(await openSheet())).toEqual([HOME_LABEL, GARAGE_LABEL]);
    expect(askedFor()).toEqual(new Set([HOME.id]));
    unmount();

    vi.clearAllMocks();
    serve();
    lookups = [...lookups, PLANT_SUPPLY];
    renderPage(`?supplyId=${PLANT_SUPPLY.id}`);
    expect(shown()).toBe(HOME_LABEL);
    expect(askedFor()).toEqual(new Set([HOME.id]));
  });
});

describe("the states of today's data", () => {
  it("UI-TDY-004 AVAILABLE: the flowing hero, its sentence announced politely, and both figures", () => {
    renderPage();

    expect(screen.getByText("Último dato: 13:40")).toBeInTheDocument();
    const sentence = screen.getByText("Ahora te llegan 0,48 kW de la planta de la comunidad.");
    expect(sentence).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Te llega ahora")).toBeInTheDocument();
    expect(screen.getAllByText("0,48 kW").length).toBeGreaterThan(0);
    expect(screen.getByText("Energía que te tocó hoy")).toBeInTheDocument();
    expect(screen.getByText("3,4 kWh")).toBeInTheDocument();
    expect(conduit()).toHaveAttribute("data-style", "solid");
    expect(within(hero()).getByText("te llegan ahora")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^Potencia que te llega hoy, de 00:00 a las 13:42\. .*Ahora, 0,48 kW\.$/ })).toBeInTheDocument();
  });

  it("UI-TDY-004 AVAILABLE at 0 kW: a dashed conduit, the not-producing sentence, and only today's energy", () => {
    today = () => answer(available({ ...PRODUCING, currentAssignedPowerKW: 0, currentPlantPowerKW: 0, assignedEnergyKWh: 2.1 }));
    renderPage();

    expect(screen.getByText("La planta no está produciendo ahora. Hoy te llegaron 2,1 kWh.")).toBeInTheDocument();
    expect(conduit()).toHaveAttribute("data-style", "dashed");
    expect(screen.queryByText("Te llega ahora")).not.toBeInTheDocument();
    expect(screen.getByText("Energía que te tocó hoy")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Ahora, 0 kW\.$/ })).toBeInTheDocument();
  });

  it("UI-TDY-004 AVAILABLE with no current power: its own sentence, a dashed conduit, no current figure and no kW on the mark", () => {
    today = () => answer(available({ ...PRODUCING, currentAssignedPowerKW: null, currentPlantPowerKW: null, assignedEnergyKWh: 2.1 }));
    renderPage();

    expect(screen.getByText("Ahora mismo no hay dato de la planta. Hoy te llegaron 2,1 kWh.")).toBeInTheDocument();
    expect(screen.queryByText(/no está produciendo/)).not.toBeInTheDocument();
    expect(conduit()).toHaveAttribute("data-style", "dashed");
    expect(screen.queryByText("Te llega ahora")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: (name) => name.startsWith("Potencia que te llega hoy") && !name.includes("Ahora,") })).toBeInTheDocument();
  });

  it("UI-TDY-004 stale: a neutral notice, never an alert, and the current values read 'a las {hh:mm}'", () => {
    today = () =>
      answer(
        available({
          ...PRODUCING,
          currentAssignedPowerKW: 1.25,
          currentPlantPowerKW: 30,
          assignedPowerCurve: slots("08:00", "10:15", 1.25),
          lastUpdatedAt: "2026-11-12T10:15:00+01:00",
          stale: true,
        }),
      );
    renderPage();

    const notes = screen.getAllByRole("note");
    expect(notes.map((note) => note.textContent)).toContain(
      "Sin datos nuevos desde las 10:15. Lo seguimos intentando cada 5 minutos; las cifras y la curva llegan hasta esa hora.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("A las 10:15 te llegaban 1,25 kW de la planta de la comunidad.")).toBeInTheDocument();
    expect(screen.getByText("Te llegaba a las 10:15")).toBeInTheDocument();
    expect(within(hero()).getByText("30 kW a las 10:15")).toBeInTheDocument();
    expect(within(hero()).getByText("te llegaban a las 10:15")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: (name) => name.startsWith("Potencia que te llega hoy") && !name.includes("Ahora,") })).toBeInTheDocument();
  });

  it("UI-TDY-004 NO_COEFFICIENT_TODAY: the no-coefficient state, with the community's contact", () => {
    today = () => answer(withoutData("NO_COEFFICIENT_TODAY"));
    renderPage();

    expect(screen.getByRole("heading", { name: "Hoy no te corresponde energía en este punto" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver el contacto de tu comunidad" })).toHaveAttribute("href", "/community/contact");
    expect(hero()).toHaveAttribute("data-mode", "waiting");
    expect(screen.queryByText("Energía que te tocó hoy")).not.toBeInTheDocument();
  });

  it("UI-TDY-004 NOT_AVAILABLE: the not-connected state, with the plant node greyed", () => {
    today = () => answer(withoutData("NOT_AVAILABLE"));
    renderPage();

    expect(screen.getByRole("heading", { name: "Tu planta aún no envía datos de hoy" })).toBeInTheDocument();
    expect(hero()).toHaveAttribute("data-mode", "unavailable");
    expect(within(hero()).getByTestId("plant-node")).toHaveAttribute("fill", colors.background.surface);
    expect(screen.queryByRole("link", { name: "Ver el contacto de tu comunidad" })).not.toBeInTheDocument();
  });

  it("UI-TDY-004 NO_DATA_TODAY: the not-started state", () => {
    today = () => answer(withoutData("NO_DATA_TODAY"));
    renderPage();

    expect(screen.getByRole("heading", { name: "La planta aún no ha empezado a producir hoy" })).toBeInTheDocument();
    expect(hero()).toHaveAttribute("data-mode", "waiting");
    expect(conduit()).toHaveAttribute("data-style", "dashed");
  });

  it("UI-TDY-004 the first load shows skeletons under the figures' labels, and no value", () => {
    today = () => query.loading();
    renderPage();

    expect(screen.getByText("Te llega ahora")).toBeInTheDocument();
    expect(screen.getByText("Energía que te tocó hoy")).toBeInTheDocument();
    expect(screen.queryByTestId("energy-flow-hero")).not.toBeInTheDocument();
    expect(screen.queryByText(/kWh$/)).not.toBeInTheDocument();
  });

  it("UI-TDY-004 a failed first load shows the error, and Reintentar asks again", async () => {
    const failed = query.error(apiError(500));
    today = () => failed;
    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudieron cargar los datos de hoy de este punto. Comprueba tu conexión e inténtalo de nuevo.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(failed.refetch).toHaveBeenCalledTimes(1);
  });
});

describe("the notes on inverter figures", () => {
  const NOTE = "Datos del inversor de la planta. Pueden diferir un poco de los que publica la distribuidora.";

  it("UI-TDY-005 shows the β line with the coefficient as a percentage", () => {
    renderPage();

    // The exact string, no-break space included: the default matcher would fold it into a space.
    expect(screen.getByText(/^Te corresponde el/).textContent).toBe("Te corresponde el 4,25\u00A0% de la producción de la planta.");
  });

  it("UI-TDY-005 hides the β line when the coefficient is null, with several plants", () => {
    today = () => answer(available({ ...PRODUCING, partitionCoefficient: null }));
    renderPage();

    expect(screen.queryByText(/Te corresponde el/)).not.toBeInTheDocument();
  });

  it("UI-TDY-005 hides the β line when the coefficient is 0", () => {
    today = () => answer(available({ ...PRODUCING, partitionCoefficient: 0 }));
    renderPage();

    expect(screen.queryByText(/Te corresponde el/)).not.toBeInTheDocument();
  });

  it("UI-TDY-005 always notes that the figures come from the inverter, without the gap sentence when the curve has none", () => {
    renderPage();

    expect(screen.getByText(NOTE)).toBeInTheDocument();
    expect(screen.queryByText("Sin datos")).not.toBeInTheDocument();
  });

  it("UI-TDY-005 adds the gap sentence, and the gap to the legend, when the curve has a slot with no value", () => {
    today = () =>
      answer(available({ ...PRODUCING, assignedPowerCurve: [...slots("08:00", "10:15", 0.48), slot("10:20", null), ...slots("10:25", "13:40", 0.48)] }));
    renderPage();

    expect(screen.getByText(`${NOTE} La cifra de hoy incluye los ratos sin dato de la curva.`)).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Leyenda" })).getByText("Sin datos")).toBeInTheDocument();
  });

  it("UI-TDY-005 labels the plant node for the community's production, true for one plant or several", () => {
    renderPage();

    expect(within(hero()).getByText("Producción de la comunidad")).toBeInTheDocument();
    expect(within(hero()).getByText("12,5 kW")).toBeInTheDocument();
    expect(within(hero()).getByText("Tu punto")).toBeInTheDocument();
    expect(within(hero()).getByText("Casa")).toBeInTheDocument();
  });
});

describe("colours", () => {
  it("UI-TDY-006 draws the flowing conduit and the plant node in the assigned-energy mark colour, and the dashed one in the inactive border", () => {
    const { unmount } = renderPage();
    expect(conduit().querySelector("line")).toHaveAttribute("stroke", ENERGY_COLORS.assigned);
    expect(within(hero()).getByTestId("plant-node")).toHaveAttribute("fill", ENERGY_COLORS.assigned);
    unmount();

    today = () => answer(available({ ...PRODUCING, currentAssignedPowerKW: 0 }));
    renderPage();
    expect(conduit().querySelector("line")).toHaveAttribute("stroke", colors.border.inactive);
    expect(conduit().querySelector("line")).toHaveAttribute("stroke-dasharray", "4 6");
  });
});
