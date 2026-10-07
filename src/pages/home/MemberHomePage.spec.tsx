import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import {
  useGetMembershipEnergyMetrics,
  useGetMembershipHourlyProfile,
  useGetMembershipMonthlyConsumption,
  useGetMembershipPayback,
  type getMembershipEnergyMetrics,
  type getMembershipHourlyProfile,
  type getMembershipMonthlyConsumption,
  type getMembershipPayback,
} from "../../api/memberships/memberships";
import {
  CommunityRole,
  type MembershipEnergyMetricsResponse,
  type MembershipHourlyProfileResponse,
  type MembershipMonthlyConsumptionBucketResponse,
  type MembershipPaybackResponse,
} from "../../api/models";
import { customInstance } from "../../api/custom-instance";
import { useLoggedUser } from "../../context/logged-user.context";
import { CAPTURED_MEMBERSHIP_MONTHLY_CONSUMPTION, wireShapeOf } from "../../test/capturedResponses";
import {
  buildCurrentUser,
  buildMembershipEnergyMetrics,
  buildMembershipHourlyProfile,
  buildMembershipHourlyProfileBucket,
  buildMembershipMonthlyConsumptionBucket,
  buildMembershipPayback,
} from "../../test/fixtures";
import { query } from "../../test/queryState";
import { renderWithProviders } from "../../test/renderWithProviders";
import { MemberHomePage } from "./MemberHomePage";
import { answerCommunities } from "./homeViews.mocks";

vi.mock(import("../../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: vi.fn(),
}));
vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMembershipEnergyMetrics: vi.fn(),
  useGetMembershipHourlyProfile: vi.fn(),
  useGetMembershipMonthlyConsumption: vi.fn(),
  useGetMembershipPayback: vi.fn(),
}));
// ApexCharts cannot lay out in jsdom; what the charts are told to draw is
// asserted in TwelveMonthSeries.spec.tsx and BestHours.spec.tsx.
vi.mock("react-apexcharts", () => ({ default: () => null }));
// The view switch asks the active community what the caller may do there.
vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetCommunityById: vi.fn(),
}));
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: vi.fn(),
}));

const USER_ID = "member-user";
const COMMUNITY_ID = "member-community";

/** August 2026 in Europe/Madrid, as the backend bounds it. */
const AUGUST: MembershipEnergyMetricsResponse["period"] = {
  startDate: "2026-07-31T22:00:00Z",
  endDate: "2026-08-31T21:00:00Z",
};

/** A complete month: 180 of 268 assigned kWh used, 180 of 412 consumed kWh from the community. */
function monthWith(overrides: Partial<MembershipEnergyMetricsResponse> = {}): MembershipEnergyMetricsResponse {
  return buildMembershipEnergyMetrics({
    period: AUGUST,
    coverage: { hoursWithData: 1488, expectedHours: 1488, supplyCount: 2, suppliesWithData: 2 },
    energy: {
      assignedProductionKWh: 268,
      selfConsumptionKWh: 180,
      surplusKWh: 88,
      totalConsumptionKWh: 412,
      gridImportKWh: 232,
    },
    savings: { amountEur: 27, tariffSource: "REAL_TARIFF", estimatedPrice: null },
    selfConsumptionRatio: 0.6716,
    selfSufficiencyRatio: 0.4369,
    ...overrides,
  });
}

/** A member who has recovered 40 % of a 500 € investment. */
function paybackWith(overrides: Partial<MembershipPaybackResponse> = {}): MembershipPaybackResponse {
  return buildMembershipPayback({
    investmentEur: 500,
    savedEur: 200,
    remainingEur: 300,
    progressRatio: 0.4,
    startDate: "2025-03-01",
    estimatedRemainingMonths: 14,
    tariffSource: "REAL_TARIFF",
    estimatedPrice: null,
    ...overrides,
  });
}

/** July 2026, the month before AUGUST, as the comparison requests it. */
const JULY: MembershipEnergyMetricsResponse["period"] = {
  startDate: "2026-07-01T00:00:00+02:00",
  endDate: "2026-07-31T23:00:00+02:00",
};

/**
 * The month before (#200), complete: 22,50 € saved, 52 % of the assigned
 * energy used and 49 % of the consumption from the community -- against
 * monthWith(), a rise, a rise and a fall.
 */
function previousMonthWith(overrides: Partial<MembershipEnergyMetricsResponse> = {}): MembershipEnergyMetricsResponse {
  return monthWith({
    period: JULY,
    savings: { amountEur: 22.5, tariffSource: "REAL_TARIFF", estimatedPrice: null },
    selfConsumptionRatio: 0.5216,
    selfSufficiencyRatio: 0.4869,
    ...overrides,
  });
}

/** The twelve months ending at AUGUST (#201), every one stored and complete. */
function twelveMonths(): MembershipMonthlyConsumptionBucketResponse[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = ((8 + index) % 12) + 1;
    const year = month >= 9 ? 2025 : 2026;
    return buildMembershipMonthlyConsumptionBucket({
      date: `${year}/${String(month).padStart(2, "0")}/01`,
      consumptionKWh: 200 + index,
      selfConsumptionEnergyKWh: 150 + index,
      savingsEur: 20 + index,
      tariffSource: "REAL_TARIFF",
      supplyCount: 2,
      suppliesWithData: 2,
    });
  });
}

/** AUGUST's average day (#201): every hour with consumption, the daylight hours with assigned production. */
function augustProfile(): MembershipHourlyProfileResponse {
  return buildMembershipHourlyProfile({
    period: AUGUST,
    coverage: { hoursWithData: 1488, expectedHours: 1488, supplyCount: 2, suppliesWithData: 2 },
    buckets: Array.from({ length: 24 }, (_, hour) =>
      buildMembershipHourlyProfileBucket({
        hour,
        averageConsumptionKWh: 0.3,
        consumptionSampleCount: 62,
        ...(hour >= 8 && hour <= 19 ? { averageAssignedProductionKWh: 0.5, assignedProductionSampleCount: 62 } : {}),
      }),
    ),
  });
}

type EnergyAnswer = MembershipEnergyMetricsResponse | "error" | "loading";

function energyQuery(answer: EnergyAnswer, failure: string) {
  if (answer === "error") return query.error(new Error(failure));
  if (answer === "loading") return query.loading();
  return query.success<typeof getMembershipEnergyMetrics>(answer);
}

/**
 * Serves the page's reads. The energy-metrics hook is called twice -- for the
 * reference month, by period, and for the month before, by explicit dates --
 * so it answers by the params it is asked with. Each result is built once, so
 * every call for the same month returns the same refetch.
 */
function answer({
  metrics = monthWith(),
  previous = previousMonthWith(),
  payback = paybackWith(),
  monthly = twelveMonths(),
  hourly = augustProfile(),
}: {
  metrics?: MembershipEnergyMetricsResponse | "error";
  previous?: EnergyAnswer;
  payback?: MembershipPaybackResponse | "error";
  monthly?: MembershipMonthlyConsumptionBucketResponse[] | "error" | "loading";
  hourly?: MembershipHourlyProfileResponse | "error" | "loading";
} = {}) {
  const referenceMonth = energyQuery(metrics, "energy-metrics failed");
  const previousMonth = energyQuery(previous, "previous month failed");
  vi.mocked(useGetMembershipEnergyMetrics).mockImplementation((_communityId, _userId, params) =>
    params?.period ? referenceMonth : previousMonth,
  );
  vi.mocked(useGetMembershipMonthlyConsumption).mockReturnValue(
    monthly === "error"
      ? query.error(new Error("monthly series failed"))
      : monthly === "loading"
        ? query.loading()
        : query.success<typeof getMembershipMonthlyConsumption>(monthly),
  );
  vi.mocked(useGetMembershipHourlyProfile).mockReturnValue(
    hourly === "error"
      ? query.error(new Error("hourly profile failed"))
      : hourly === "loading"
        ? query.loading()
        : query.success<typeof getMembershipHourlyProfile>(hourly),
  );
  vi.mocked(useGetMembershipPayback).mockReturnValue(
    payback === "error" ? query.error(new Error("payback failed")) : query.success<typeof getMembershipPayback>(payback),
  );
}

function openHome() {
  return renderWithProviders(<MemberHomePage />, { activeCommunityId: COMMUNITY_ID });
}

// Intl separates figures from their unit with a no-break space.
const text = (element: HTMLElement) => (element.textContent ?? "").replace(/\u00a0/g, " ");
const page = () => text(document.body);
const card = (name: string) => screen.getByRole("region", { name });
const savingsCard = () => card("Tu ahorro en agosto de 2026");
const paybackCard = () => card("Recuperación de tu inversión");
const advice = () => screen.queryAllByRole("region", { name: "Qué puedes hacer" });

describe("MemberHomePage (#199)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLoggedUser).mockReturnValue(
      buildCurrentUser({ id: USER_ID, memberships: { [COMMUNITY_ID]: CommunityRole.COMMUNITY_MEMBER } }),
    );
    // A plain member: the community grants no management, so no switch.
    answerCommunities({ adminOf: [] });
    answer();
  });

  afterEach(() => {
    expect(customInstance).not.toHaveBeenCalled();
  });

  it("reads the caller's own membership in the active community", () => {
    openHome();

    expect(vi.mocked(useGetMembershipEnergyMetrics).mock.lastCall?.slice(0, 2)).toEqual([COMMUNITY_ID, USER_ID]);
    expect(vi.mocked(useGetMembershipPayback).mock.lastCall?.slice(0, 2)).toEqual([COMMUNITY_ID, USER_ID]);
  });

  describe("AC1 -- a member with data sees the month and every figure", () => {
    it("states which month the figures belong to, and why that month, without implying it was chosen", () => {
      openHome();

      expect(screen.getByText("Datos de agosto de 2026")).toBeInTheDocument();
      expect(page()).toContain("Es el último mes completo que ha publicado la distribuidora");
      expect(page()).toContain("hacia el día 10 del mes siguiente");
    });

    it("splits the assigned energy into used and exported, and the consumption into community and grid", () => {
      openHome();
      const journey = text(card("El recorrido de tu energía"));

      expect(journey).toContain("La usaste tú: 180 kWh (67 %)");
      expect(journey).toContain("Se fue a la red: 88 kWh (33 %)");
      expect(journey).toContain("De la comunidad: 180 kWh (44 %)");
      expect(journey).toContain("De la red: 232 kWh (56 %)");
    });

    it("shows the savings and the payback progress", () => {
      openHome();

      expect(text(savingsCard())).toContain("27,00 €");
      expect(text(paybackCard())).toContain("Has recuperado el 40 % de tu inversión de 500,00 €; te faltan 300,00 €");
      expect(within(paybackCard()).getByRole("progressbar", { name: "Parte recuperada de tu inversión" })).toHaveAttribute(
        "aria-valuenow",
        "40",
      );
    });
  });

  it("AC2 -- each bar states the base it is a proportion of, beside its own title", () => {
    openHome();

    const assigned = screen.getByRole("heading", { name: "La energía que se te asignó" }).parentElement!;
    const consumed = screen.getByRole("heading", { name: "Tu consumo" }).parentElement!;
    expect(text(assigned)).toContain("de 268 kWh asignados");
    expect(text(consumed)).toContain("de 412 kWh consumidos");
  });

  describe("AC3/AC4 -- the estimate label follows estimatedPrice, and nothing else", () => {
    it("states the price beside each figure whose own response carries one", () => {
      answer({
        metrics: monthWith({ savings: { amountEur: 27, tariffSource: "ESTIMATE", estimatedPrice: { eurPerKWh: 0.15 } } }),
        payback: paybackWith({ tariffSource: "ESTIMATE", estimatedPrice: { eurPerKWh: 0.1234 } }),
      });
      openHome();

      expect(text(savingsCard())).toContain("Estimado con un precio de 0,15 €/kWh para la energía, sin impuestos.");
      expect(text(paybackCard())).toContain("Estimado con un precio de 0,1234 €/kWh para la energía, sin impuestos.");
    });

    it("shows no estimate wording anywhere when neither response carries a price", () => {
      openHome();

      expect(page()).not.toMatch(/estimad/i);
    });

    // tariffSource reports ESTIMATE even on shapes with no amount: keying the
    // label on it would print a price beside a figure that has none.
    it("shows no label where tariffSource is ESTIMATE but estimatedPrice is null", () => {
      answer({
        metrics: monthWith({ savings: { amountEur: 27, tariffSource: "ESTIMATE", estimatedPrice: null } }),
        payback: paybackWith({ tariffSource: "ESTIMATE", estimatedPrice: null }),
      });
      openHome();

      expect(page()).not.toMatch(/estimad/i);
      expect(page()).not.toContain("€/kWh");
    });

    it("does not infer one card's price from the other's", () => {
      answer({
        metrics: monthWith({ savings: { amountEur: 27, tariffSource: "ESTIMATE", estimatedPrice: { eurPerKWh: 0.15 } } }),
        payback: paybackWith({ estimatedPrice: null }),
      });
      openHome();

      expect(text(savingsCard())).toContain("0,15 €/kWh");
      expect(text(paybackCard())).not.toMatch(/estimad/i);
    });
  });

  describe("AC5 -- a month with gaps", () => {
    it.each([
      ["fewer hours with data than expected", { hoursWithData: 1300, expectedHours: 1488, supplyCount: 2, suppliesWithData: 2 }],
      ["fewer supplies with data than the member has", { hoursWithData: 1488, expectedHours: 1488, supplyCount: 2, suppliesWithData: 1 }],
    ])("with %s gets a neutral notice and no advice", (_label, coverage) => {
      answer({ metrics: monthWith({ coverage }) });
      openHome();

      expect(text(screen.getByRole("note"))).toContain("Este mes está incompleto");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(advice()).toHaveLength(0);
    });
  });

  it("AC6 -- no investment recorded is explained neutrally, and the rest is unaffected", () => {
    answer({ payback: paybackWith({ investmentEur: null, progressRatio: null, remainingEur: null, estimatedRemainingMonths: null }) });
    openHome();

    expect(text(paybackCard())).toContain("No consta ninguna inversión tuya registrada en esta comunidad");
    expect(text(paybackCard())).toContain("Llevas ahorrados 200,00 €");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(card("El recorrido de tu energía")).toBeInTheDocument();
    expect(text(savingsCard())).toContain("27,00 €");
  });

  it("AC7 -- progress above 1 says the investment is recovered and shows the return beyond it", () => {
    answer({
      payback: paybackWith({ savedEur: 650, progressRatio: 1.3, remainingEur: 0, estimatedRemainingMonths: 0 }),
    });
    openHome();

    expect(text(paybackCard())).toContain(
      "Ya has recuperado tu inversión de 500,00 € y llevas 150,00 € más de lo que aportaste (130 % de la inversión).",
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  describe("AC8 -- nothing to show yet", () => {
    it("explains it when the community has never shared energy", () => {
      answer({ metrics: buildMembershipEnergyMetrics(), payback: buildMembershipPayback({ investmentEur: 500 }) });
      openHome();

      expect(text(screen.getByRole("note"))).toContain("Todavía no hay datos de tu energía");
      expect(text(paybackCard())).toContain("Tu comunidad todavía no ha empezado a compartir energía");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("explains it when the member joined and no month is resolved yet", () => {
      answer({
        metrics: buildMembershipEnergyMetrics(),
        payback: paybackWith({ savedEur: 0, progressRatio: 0, remainingEur: 500, estimatedRemainingMonths: null }),
      });
      openHome();

      expect(text(screen.getByRole("note"))).toContain("Todavía no hay datos de tu energía");
      expect(screen.queryByRole("region", { name: "El recorrido de tu energía" })).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("AC9 -- a null figure is explained, never shown as zero", () => {
    const ZERO = /(^|[^\d,])0(,0+)? ?(€|kWh|%)/;

    it("for the empty shapes of both responses", () => {
      answer({ metrics: buildMembershipEnergyMetrics(), payback: buildMembershipPayback(), hourly: buildMembershipHourlyProfile() });
      openHome();

      expect(page()).not.toMatch(ZERO);
    });

    it("for null ratios in a resolved month", () => {
      answer({
        metrics: monthWith({
          selfConsumptionRatio: null,
          selfSufficiencyRatio: null,
          energy: { assignedProductionKWh: 0, selfConsumptionKWh: 0, surplusKWh: 0, totalConsumptionKWh: 0, gridImportKWh: 0 },
          savings: { amountEur: null, tariffSource: "ESTIMATE", estimatedPrice: null },
        }),
      });
      openHome();
      const journey = text(card("El recorrido de tu energía"));

      expect(journey).toContain("Este mes no se te asignó energía de la comunidad.");
      expect(journey).toContain("Este mes no consta consumo en tus puntos de suministro.");
      expect(text(savingsCard())).not.toMatch(ZERO);
      expect(journey).not.toMatch(ZERO);
    });

    it("for a remaining time that cannot be estimated", () => {
      answer({ payback: paybackWith({ estimatedRemainingMonths: null }) });
      openHome();

      expect(text(paybackCard())).toContain("Todavía no hay ahorro suficiente para estimar cuánto tardarás");
    });
  });

  describe("AC10 -- exactly one actionable message, by the agreed rules", () => {
    it.each([
      ["below 30 %", 0.2, "De la energía que se te asignó, 88 kWh se fueron a la red sin que los usaras. Si puedes"],
      ["between 30 % and 60 %", 0.45, "Aprovechaste el 45 % de la energía que se te asignó. Los 88 kWh restantes se fueron a la red"],
      ["above 60 %", 0.7, "Aprovechaste el 70 % de la energía que se te asignó. Vas muy bien."],
    ])("%s", (_label, selfConsumptionRatio, expected) => {
      answer({ metrics: monthWith({ selfConsumptionRatio }) });
      openHome();

      expect(advice()).toHaveLength(1);
      expect(text(advice()[0])).toContain(expected);
    });
  });

  it("AC11 -- the reasons behind the figures are visible text, not tooltips", () => {
    answer({
      metrics: monthWith({ savings: { amountEur: 27, tariffSource: "ESTIMATE", estimatedPrice: { eurPerKWh: 0.15 } } }),
    });
    openHome();

    expect(screen.getByText(/Estimado con un precio de 0,15/)).toBeVisible();
    expect(screen.getByText(/Es el último mes completo/)).toBeVisible();
    expect(document.querySelector("[title], [aria-describedby]")).toBeNull();
  });

  describe("one read failing leaves the other half", () => {
    it("when the energy fails, the payback still renders and the energy offers a retry", async () => {
      answer({ metrics: "error" });
      openHome();

      expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar los datos de tu energía.");
      expect(text(paybackCard())).toContain("Llevas ahorrados 200,00 €");

      await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
      expect(vi.mocked(useGetMembershipEnergyMetrics).mock.results.at(-1)?.value.refetch).toHaveBeenCalled();
    });

    it("when the payback fails, the energy still renders and the payback offers a retry", async () => {
      answer({ payback: "error" });
      openHome();

      expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar la recuperación de tu inversión.");
      expect(card("El recorrido de tu energía")).toBeInTheDocument();
      expect(text(savingsCard())).toContain("27,00 €");

      await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
      expect(vi.mocked(useGetMembershipPayback).mock.results.at(-1)?.value.refetch).toHaveBeenCalled();
    });
  });

  describe("the comparison with the previous month (#200)", () => {
    const comparison = () => card("Comparado con julio de 2026");
    const row = (label: string) => text(within(comparison()).getByRole("heading", { name: label }).closest("li")!);
    const energyCalls = () => vi.mocked(useGetMembershipEnergyMetrics).mock.calls.map(([, , params]) => params);

    it("asks for the month before the resolved one, by explicit bounds, and leaves the first read as it was", () => {
      openHome();

      expect(energyCalls()).toContainEqual({ startDate: JULY.startDate, endDate: JULY.endDate });
      const referenceCalls = energyCalls().filter((params) => params?.period);
      expect(referenceCalls.length).toBeGreaterThan(0);
      expect(referenceCalls).toEqual(referenceCalls.map(() => ({ period: "LATEST_PUBLISHED_MONTH" })));
    });

    describe("AC1 -- both months have data: each change is shown with its direction", () => {
      it("a rise in savings, in euros", () => {
        openHome();

        expect(row("Tu ahorro")).toContain("4,50 € más");
        expect(row("Tu ahorro")).toContain("27,00 € en agosto de 2026, frente a 22,50 € en julio de 2026.");
      });

      it("a rise and a fall in the two shares, in percentage points", () => {
        openHome();

        expect(row("Energía asignada que usaste")).toContain("15 puntos porcentuales más");
        expect(row("Energía asignada que usaste")).toContain("67 % en agosto de 2026, frente a 52 % en julio de 2026.");
        expect(row("Consumo cubierto por la comunidad")).toContain("5 puntos porcentuales menos");
      });

      it("a share going from 20 % to 30 % is ten points, not a 50 % rise", () => {
        answer({ metrics: monthWith({ selfSufficiencyRatio: 0.3 }), previous: previousMonthWith({ selfSufficiencyRatio: 0.2 }) });
        openHome();

        expect(row("Consumo cubierto por la comunidad")).toContain("10 puntos porcentuales más");
        expect(row("Consumo cubierto por la comunidad")).not.toContain("50");
      });

      it("a fall in savings", () => {
        answer({ previous: previousMonthWith({ savings: { amountEur: 31.2, tariffSource: "REAL_TARIFF", estimatedPrice: null } }) });
        openHome();

        expect(row("Tu ahorro")).toContain("4,20 € menos");
      });
    });

    describe("AC2 -- no previous month to compare with", () => {
      it.each([
        [
          "the month before has no published data",
          previousMonthWith({ coverage: { hoursWithData: 0, expectedHours: 1488, supplyCount: 2, suppliesWithData: 0 } }),
        ],
        // A member whose supplies did not exist yet: the backend answers the same shape.
        [
          "the member has no earlier month at all",
          buildMembershipEnergyMetrics({
            period: JULY,
            coverage: { hoursWithData: 0, expectedHours: 744, supplyCount: 1, suppliesWithData: 0 },
            savings: { amountEur: 0, tariffSource: "REAL_TARIFF", estimatedPrice: null },
          }),
        ],
        [
          "the month before has too few hours to compare",
          previousMonthWith({ coverage: { hoursWithData: 3, expectedHours: 1488, supplyCount: 2, suppliesWithData: 1 } }),
        ],
      ])("%s: says so neutrally, and the current month is unaffected", (_label, previous) => {
        answer({ previous });
        openHome();

        const notice = text(screen.getByRole("note"));
        expect(notice).toContain("Todavía no se puede comparar con el mes anterior");
        expect(notice).toContain("No hay datos suficientes de julio de 2026.");
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(screen.queryByRole("region", { name: "Comparado con julio de 2026" })).not.toBeInTheDocument();
        expect(text(savingsCard())).toContain("27,00 €");
        expect(text(card("El recorrido de tu energía"))).toContain("La usaste tú: 180 kWh (67 %)");
      });
    });

    describe("AC3 -- partial coverage in either month: the comparison says it is affected", () => {
      it("the reference month", () => {
        answer({ metrics: monthWith({ coverage: { hoursWithData: 1300, expectedHours: 1488, supplyCount: 2, suppliesWithData: 2 } }) });
        openHome();

        expect(text(comparison())).toContain(
          "La comparación está afectada: faltan datos de agosto de 2026, así que parte del cambio puede deberse a esos datos que faltan y no a tu consumo.",
        );
      });

      it("the month before", () => {
        answer({ previous: previousMonthWith({ coverage: { hoursWithData: 744, expectedHours: 1488, supplyCount: 2, suppliesWithData: 1 } }) });
        openHome();

        expect(text(comparison())).toContain("La comparación está afectada: faltan datos de julio de 2026,");
      });

      it("neither: no such statement", () => {
        openHome();

        expect(text(comparison())).not.toContain("afectada");
      });
    });

    describe("AC4 -- the second request does not hold up the rest of the view", () => {
      it("when it fails, the rest still renders, and the comparison offers a retry of its own request", async () => {
        answer({ previous: "error" });
        openHome();

        expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar la comparación con el mes anterior.");
        expect(card("El recorrido de tu energía")).toBeInTheDocument();
        expect(text(savingsCard())).toContain("27,00 €");
        expect(text(paybackCard())).toContain("Llevas ahorrados 200,00 €");

        await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
        const { calls, results } = vi.mocked(useGetMembershipEnergyMetrics).mock;
        const previousMonthCall = calls.findIndex(([, , params]) => !params?.period);
        expect(results[previousMonthCall].value.refetch).toHaveBeenCalled();
      });

      it("while it loads, the rest is already there", () => {
        answer({ previous: "loading" });
        openHome();

        expect(screen.getByLabelText("Cargando la comparación con el mes anterior")).toBeInTheDocument();
        expect(card("El recorrido de tu energía")).toBeInTheDocument();
        expect(text(savingsCard())).toContain("27,00 €");
        expect(text(paybackCard())).toContain("Llevas ahorrados 200,00 €");
      });

      it("when the first read fails, there is nothing to compare and only the energy half reports it", () => {
        answer({ metrics: "error" });
        openHome();

        expect(screen.getAllByRole("alert")).toHaveLength(1);
        expect(screen.queryByLabelText("Cargando la comparación con el mes anterior")).not.toBeInTheDocument();
      });
    });

    describe("AC5 -- a figure null in either month gets no change", () => {
      it("null in the month before", () => {
        answer({ previous: previousMonthWith({ selfConsumptionRatio: null }) });
        openHome();

        expect(row("Energía asignada que usaste")).toBe("Energía asignada que usasteSin comparación: no hay dato de julio de 2026.");
        expect(row("Tu ahorro")).toContain("4,50 € más");
      });

      it("null in the reference month", () => {
        answer({ metrics: monthWith({ selfSufficiencyRatio: null }) });
        openHome();

        expect(row("Consumo cubierto por la comunidad")).toBe(
          "Consumo cubierto por la comunidadSin comparación: no hay dato de agosto de 2026.",
        );
      });
    });
  });

  it("#219 AC2 -- its monthly buckets carry the date and time as the API writes them", () => {
    const [captured] = CAPTURED_MEMBERSHIP_MONTHLY_CONSUMPTION;
    for (const bucket of twelveMonths()) {
      expect(bucket.date).toMatch(wireShapeOf(captured.date));
      expect(bucket.time).toMatch(wireShapeOf(captured.time));
    }
  });

  describe("the twelve-month series (#201)", () => {
    const twelveMonths = () => card("Tus últimos 12 meses");
    const monthlyCalls = () => vi.mocked(useGetMembershipMonthlyConsumption).mock.calls.map(([, , params]) => params);
    const energyCalls = () => vi.mocked(useGetMembershipEnergyMetrics).mock.calls.map(([, , params]) => params);

    it("asks for the twelve months ending at the resolved one, by explicit bounds, and leaves the other reads as they were", () => {
      openHome();

      expect(vi.mocked(useGetMembershipMonthlyConsumption)).toHaveBeenCalledWith(
        COMMUNITY_ID,
        USER_ID,
        { startDate: "2025-09-01T00:00:00+02:00", endDate: AUGUST.endDate },
        expect.anything(),
      );
      expect(new Set(monthlyCalls().map((params) => JSON.stringify(params))).size).toBe(1);
      expect(new Set(energyCalls().map((params) => JSON.stringify(params)))).toEqual(
        new Set([JSON.stringify({ period: "LATEST_PUBLISHED_MONTH" }), JSON.stringify({ startDate: JULY.startDate, endDate: JULY.endDate })]),
      );
    });

    it("waits for the reference month: with none resolved, it neither asks nor shows anything of its own", () => {
      answer({ metrics: monthWith({ period: { startDate: null, endDate: null } }) });
      openHome();

      expect(vi.mocked(useGetMembershipMonthlyConsumption)).not.toHaveBeenCalled();
      expect(screen.queryByRole("region", { name: "Tus últimos 12 meses" })).not.toBeInTheDocument();
      expect(screen.queryByText(/meses que mostrar/)).not.toBeInTheDocument();
    });

    describe("AC9 -- its read failing leaves the rest of the view, and the rest failing leaves it", () => {
      it("when the series fails, the month, the comparison and the payback still render, and the series offers a retry", async () => {
        answer({ monthly: "error" });
        openHome();

        expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar tus últimos 12 meses.");
        expect(card("El recorrido de tu energía")).toBeInTheDocument();
        expect(card("Comparado con julio de 2026")).toBeInTheDocument();
        expect(text(paybackCard())).toContain("Llevas ahorrados 200,00 €");

        await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
        expect(vi.mocked(useGetMembershipMonthlyConsumption).mock.results.at(-1)?.value.refetch).toHaveBeenCalled();
      });

      it("when the series is still loading, the rest of the view is not held up", () => {
        answer({ monthly: "loading" });
        openHome();

        expect(screen.getByLabelText("Cargando tus últimos 12 meses")).toBeInTheDocument();
        expect(card("El recorrido de tu energía")).toBeInTheDocument();
        expect(paybackCard()).toBeInTheDocument();
      });

      it("when the comparison fails, the series still renders", () => {
        answer({ previous: "error" });
        openHome();

        expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar la comparación con el mes anterior.");
        expect(twelveMonths()).toBeInTheDocument();
      });

      it("when the payback fails, the series still renders", () => {
        answer({ payback: "error" });
        openHome();

        expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar la recuperación de tu inversión.");
        expect(twelveMonths()).toBeInTheDocument();
      });
    });
  });

  describe("the best hours (#201)", () => {
    const bestHours = () => card("Tus mejores horas");
    const twelveMonths = () => card("Tus últimos 12 meses");

    it("asks for the profile with no period of its own, and renders without waiting for the reference month", () => {
      answer({ metrics: "error" });
      openHome();

      expect(vi.mocked(useGetMembershipHourlyProfile)).toHaveBeenCalledWith(COMMUNITY_ID, USER_ID, expect.anything());
      expect(bestHours()).toBeInTheDocument();
    });

    describe("AC9 -- either new block failing leaves the rest of the view, the other block included", () => {
      it("when the profile fails, the month, the comparison, the twelve months and the payback still render, and the profile offers a retry", async () => {
        answer({ hourly: "error" });
        openHome();

        expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar tus mejores horas.");
        expect(card("El recorrido de tu energía")).toBeInTheDocument();
        expect(card("Comparado con julio de 2026")).toBeInTheDocument();
        expect(twelveMonths()).toBeInTheDocument();
        expect(text(paybackCard())).toContain("Llevas ahorrados 200,00 €");

        await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
        expect(vi.mocked(useGetMembershipHourlyProfile).mock.results.at(-1)?.value.refetch).toHaveBeenCalled();
      });

      it("when the twelve months fail, the profile still renders", () => {
        answer({ monthly: "error" });
        openHome();

        expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar tus últimos 12 meses.");
        expect(bestHours()).toBeInTheDocument();
      });

      it("when the payback fails, the profile still renders", () => {
        answer({ payback: "error" });
        openHome();

        expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar la recuperación de tu inversión.");
        expect(bestHours()).toBeInTheDocument();
      });

      it("when the profile is still loading, the rest of the view is not held up", () => {
        answer({ hourly: "loading" });
        openHome();

        expect(screen.getByLabelText("Cargando tus mejores horas")).toBeInTheDocument();
        expect(card("El recorrido de tu energía")).toBeInTheDocument();
        expect(twelveMonths()).toBeInTheDocument();
      });
    });
  });
});
