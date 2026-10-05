import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import {
  useGetMembershipEnergyMetrics,
  useGetMembershipPayback,
  type getMembershipEnergyMetrics,
  type getMembershipPayback,
} from "../../api/memberships/memberships";
import { CommunityRole, type MembershipEnergyMetricsResponse, type MembershipPaybackResponse } from "../../api/models";
import { useLoggedUser } from "../../context/logged-user.context";
import { buildCurrentUser, buildMembershipEnergyMetrics, buildMembershipPayback } from "../../test/fixtures";
import { query } from "../../test/queryState";
import { renderWithProviders } from "../../test/renderWithProviders";
import { MemberHomePage } from "./MemberHomePage";

vi.mock(import("../../api/memberships/memberships"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetMembershipEnergyMetrics: vi.fn(),
  useGetMembershipPayback: vi.fn(),
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

function answer({
  metrics = monthWith(),
  payback = paybackWith(),
}: { metrics?: MembershipEnergyMetricsResponse | "error"; payback?: MembershipPaybackResponse | "error" } = {}) {
  vi.mocked(useGetMembershipEnergyMetrics).mockReturnValue(
    metrics === "error"
      ? query.error(new Error("energy-metrics failed"))
      : query.success<typeof getMembershipEnergyMetrics>(metrics),
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
    answer();
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
      answer({ metrics: buildMembershipEnergyMetrics(), payback: buildMembershipPayback() });
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
});
