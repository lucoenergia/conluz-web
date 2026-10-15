import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { apiError } from "../../test/apiError";
import {
  buildPlant,
  buildPlantCapabilities,
  buildSharingAgreement,
  buildSupplyReference,
} from "../../test/fixtures";
import { colors } from "../../theme/tokens";
import {
  SharingAgreementResponseStatus,
  type GetHuaweiConfigResponse,
  type PlantCapabilitiesResponse,
  type PlantResponse,
  type ProductionByTime,
  type SharingAgreementResponse,
} from "../../api/models";

// jsdom has no layout, and ApexCharts measures its container on mount. The stub
// records what the page hands the chart.
const { chart } = vi.hoisted(() => ({ chart: vi.fn<(props: unknown) => null>(() => null) }));
vi.mock("react-apexcharts", () => ({ default: chart }));

// A stable dispatch. The provider's own changes identity on every render, and
// the page's error effect depends on it, so a failed read re-dispatches without
// end; that defect is not this spec's subject (see the PR's follow-ups).
const { mockErrorDispatch } = vi.hoisted(() => ({ mockErrorDispatch: vi.fn() }));
vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock(import("./usePlantInActiveCommunity"), async (importOriginal) => ({
  ...(await importOriginal()),
  usePlantInActiveCommunity: vi.fn(),
}));
vi.mock(import("../../api/production/production"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetHourlyProduction: vi.fn(),
  useGetDailyProduction: vi.fn(),
  useGetMonthlyProduction: vi.fn(),
  useGetYearlyProduction: vi.fn(),
  useGetHuaweiConfig: vi.fn(),
}));
vi.mock(import("../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSharingAgreements: vi.fn(),
}));

import { usePlantInActiveCommunity } from "./usePlantInActiveCommunity";
import {
  getHourlyProduction,
  getHuaweiConfig,
  useGetDailyProduction,
  useGetHourlyProduction,
  useGetHuaweiConfig,
  useGetMonthlyProduction,
  useGetYearlyProduction,
} from "../../api/production/production";
import { getSharingAgreements, useGetSharingAgreements } from "../../api/sharing-agreements/sharing-agreements";
import { PlantDetailPage } from "./PlantDetailPage";

const COMMUNITY_ID = "community-a";
const PRODUCTION_HOOKS = [useGetHourlyProduction, useGetDailyProduction, useGetMonthlyProduction, useGetYearlyProduction];

/** Two plants of one community, each backed by a supply of its own. */
const PLANT_A = { id: "plant-a", supplyId: "supply-a" };
const PLANT_B = { id: "plant-b", supplyId: "supply-b" };

const ADMIN: Partial<PlantCapabilitiesResponse> = { canManage: true, canListSharingAgreements: true };
const MEMBER: Partial<PlantCapabilitiesResponse> = {};

const ENABLED: GetHuaweiConfigResponse = {
  username: "huawei-user",
  passwordSet: true,
  baseUrl: "https://eu5.fusionsolar.huawei.com/thirdData",
  enabled: true,
};

type ConfigRead = "enabled" | "disabled" | "not-found" | "failed" | "loading";

interface SetupOptions {
  plant?: { id: string; supplyId: string };
  capabilities?: Partial<PlantCapabilitiesResponse>;
  config?: ConfigRead;
  agreements?: SharingAgreementResponse[];
  production?: ProductionByTime[] | "failed" | "loading";
  /** The plant not known yet, as on first load. */
  plantPending?: boolean;
}

function plantFor({ id, supplyId }: { id: string; supplyId: string }, capabilities: Partial<PlantCapabilitiesResponse>): PlantResponse {
  return buildPlant({
    id,
    name: `Planta ${id}`,
    supply: buildSupplyReference({ id: supplyId, code: `CUPS-${supplyId}` }),
    community: { id: COMMUNITY_ID },
    capabilities: buildPlantCapabilities({ canRead: true, ...capabilities }),
  });
}

function setup({
  plant = PLANT_A,
  capabilities = ADMIN,
  config = "enabled",
  agreements = [],
  production = [{ time: "2026-08-01T10:00:00Z", power: 4.5 }],
  plantPending = false,
}: SetupOptions = {}) {
  vi.mocked(usePlantInActiveCommunity).mockReturnValue({
    plant: plantPending ? undefined : plantFor(plant, capabilities),
    isLoading: plantPending,
    isNotFound: false,
    error: null,
    refetch: vi.fn(),
  });
  for (const hook of PRODUCTION_HOOKS) {
    vi.mocked(hook).mockReturnValue(
      production === "failed"
        ? query.error(apiError(500))
        : production === "loading"
          ? query.loading()
          : query.success<typeof getHourlyProduction>(production),
    );
  }
  vi.mocked(useGetHuaweiConfig).mockReturnValue(
    config === "enabled"
      ? query.success<typeof getHuaweiConfig>(ENABLED)
      : config === "disabled"
        ? query.success<typeof getHuaweiConfig>({ ...ENABLED, enabled: false })
        : config === "not-found"
          ? query.error(apiError(404))
          : config === "failed"
            ? query.error(apiError(500))
            : query.loading(),
  );
  vi.mocked(useGetSharingAgreements).mockReturnValue(query.success<typeof getSharingAgreements>(agreements));

  return renderWithProviders(
    <Routes>
      <Route path="/production/:plantId" element={<PlantDetailPage />} />
    </Routes>,
    { route: `/production/${plant.id}`, activeCommunityId: COMMUNITY_ID },
  );
}

const agreement = (id: string, name: string, status: SharingAgreementResponse["status"]) =>
  buildSharingAgreement({ id, plantId: PLANT_A.id, name, status });

const summary = () => screen.queryByRole("region", { name: "En esta planta" });
const nextStep = () => screen.queryByRole("region", { name: "Siguiente paso" });

/** Every production request the page set up, current and previous period, as [params, enabled]. */
function productionRequests() {
  return PRODUCTION_HOOKS.flatMap((hook) =>
    vi.mocked(hook).mock.calls.map(([communityId, params, options]) => ({
      communityId,
      supplyId: params.supplyId,
      enabled: options?.query?.enabled !== false,
    })),
  );
}

/**
 * The declarations emotion wrote for an element's own class. MUI puts them in
 * `@layer mui`, which jsdom leaves out of getComputedStyle, so toHaveStyle
 * would only see the user-agent defaults.
 */
function declaredStyle(element: HTMLElement): Record<string, string> {
  const className = [...element.classList].find((name) => name.startsWith("css-"));
  const css = [...document.querySelectorAll("style")].map((style) => style.textContent ?? "").join("\n");
  // Every block for the class: emotion also writes an empty one outside the layer.
  const block = [...css.matchAll(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`, "g"))].map((match) => match[1]).join(";");
  return Object.fromEntries(
    block
      .split(";")
      .map((declaration) => declaration.split(":").map((part) => part.trim()))
      .filter(([property, value]) => property && value)
      .map(([property, value]) => [property, value.toLowerCase()]),
  );
}

let scrollIntoView: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom implements no scrolling; the jump is observed through this spy.
  scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView as unknown as Element["scrollIntoView"];
});

describe("PlantDetailPage rules (#260)", () => {
  describe("production of the plant", () => {
    it.each([PLANT_A, PLANT_B])(
      "UI-PLT-001 every production request of $id carries its own supply, current and previous period",
      (plant) => {
        setup({ plant });

        // The day view, as last rendered: the hourly request for the period
        // and the one for the period before, both enabled.
        const [current, previous] = vi.mocked(useGetHourlyProduction).mock.calls.slice(-2);
        expect(current[1].supplyId).toBe(plant.supplyId);
        expect(previous[1].supplyId).toBe(plant.supplyId);
        expect([current[2]?.query?.enabled, previous[2]?.query?.enabled]).toEqual([true, true]);
        expect(previous[1].endDate < current[1].startDate).toBe(true);
        for (const request of productionRequests()) {
          expect(request).toMatchObject({ communityId: COMMUNITY_ID, supplyId: plant.supplyId });
        }
      },
    );

    it("UI-PLT-001 requests no production before the plant, and so its supply, is known", () => {
      setup({ plantPending: true });

      expect(productionRequests().filter((request) => request.enabled)).toEqual([]);
    });

    it("UI-PLT-001 keeps the supply on the requests of every other period", async () => {
      const user = userEvent.setup();
      setup({ plant: PLANT_B });

      for (const label of ["Mes", "Año", "Total", "Fechas"]) {
        await user.click(screen.getByRole("button", { name: label }));
      }

      const enabled = productionRequests().filter((request) => request.enabled);
      expect(enabled.length).toBeGreaterThan(2);
      expect(enabled.every((request) => request.supplyId === PLANT_B.supplyId)).toBe(true);
    });
  });

  describe("blocks by capability", () => {
    it("UI-PLT-002 a member sees no summary, agreements, integrations or next step, and neither read is issued", () => {
      setup({ capabilities: MEMBER, config: "not-found" });

      expect(screen.getByRole("heading", { name: "Producción" })).toBeVisible();
      expect(summary()).not.toBeInTheDocument();
      expect(nextStep()).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Acuerdos de reparto" })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Integraciones" })).not.toBeInTheDocument();
      expect(useGetSharingAgreements).not.toHaveBeenCalled();
      for (const [, options] of vi.mocked(useGetHuaweiConfig).mock.calls) {
        expect(options?.query?.enabled).toBe(false);
      }
    });

    it("UI-PLT-002 an admin sees the summary with both rows, the agreements and the integrations", () => {
      setup({ capabilities: ADMIN });

      const rows = within(summary()!).getAllByRole("button");
      expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual([
        "Acuerdos de reparto: Ninguno en vigor",
        "Integración Huawei: Activa",
      ]);
      expect(screen.getByRole("heading", { name: "Acuerdos de reparto" })).toBeVisible();
      expect(screen.getByRole("heading", { name: "Integraciones" })).toBeVisible();
      expect(useGetSharingAgreements).toHaveBeenCalledWith(PLANT_A.id);
      expect(vi.mocked(useGetHuaweiConfig).mock.calls.some(([plantId, options]) => plantId === PLANT_A.id && options?.query?.enabled === true)).toBe(true);
    });

    it("UI-PLT-002 each capability brings only its own row and section", () => {
      setup({ capabilities: { canListSharingAgreements: true } });

      expect(within(summary()!).getAllByRole("button")).toHaveLength(1);
      expect(within(summary()!).getByRole("button", { name: /^Acuerdos de reparto/ })).toBeVisible();
      expect(screen.queryByRole("heading", { name: "Integraciones" })).not.toBeInTheDocument();
      expect(nextStep()).not.toBeInTheDocument();
    });
  });

  describe("the summary", () => {
    it("UI-PLT-003 counts agreements in force and in draft, never superseded ones", () => {
      setup({
        agreements: [
          agreement("a-1", "Reparto 2026", SharingAgreementResponseStatus.PUBLISHED),
          agreement("a-2", "Reparto 2025", SharingAgreementResponseStatus.SUPERSEDED),
          agreement("a-3", "Reparto 2027", SharingAgreementResponseStatus.DRAFT),
          agreement("a-4", "Reparto 2024", SharingAgreementResponseStatus.SUPERSEDED),
        ],
      });

      expect(within(summary()!).getByRole("button", { name: "Acuerdos de reparto: 1 vigente · 1 borrador" })).toBeVisible();
    });

    it("UI-PLT-003 says none is in force, never zero, when only superseded agreements remain", () => {
      setup({ agreements: [agreement("a-2", "Reparto 2025", SharingAgreementResponseStatus.SUPERSEDED)] });

      const row = within(summary()!).getByRole("button", { name: /^Acuerdos de reparto/ });
      expect(row).toHaveTextContent("Ninguno en vigor");
      expect(row).not.toHaveTextContent(/\b0\b/);
    });

    it.each<[ConfigRead, string]>([
      ["enabled", "Activa"],
      ["disabled", "Desactivada"],
      ["not-found", "Sin configurar"],
    ])("UI-PLT-003 summarises a configuration read answering %s as %s", (config, text) => {
      setup({ config });

      expect(within(summary()!).getByRole("button", { name: `Integración Huawei: ${text}` })).toBeVisible();
    });

    it.each<ConfigRead>(["failed", "loading"])("UI-PLT-003 claims no integration status while the read is %s", (config) => {
      setup({ config });

      const row = within(summary()!).getByRole("button", { name: "Integración Huawei" });
      for (const text of ["Activa", "Desactivada", "Sin configurar"]) {
        expect(row).not.toHaveTextContent(text);
      }
    });

    it.each([
      ["Acuerdos de reparto", "plant-agreements"],
      ["Integración Huawei", "plant-integrations"],
    ])("UI-PLT-003 the %s row scrolls to its section and focuses its heading", async (label, sectionId) => {
      const user = userEvent.setup();
      setup();

      await user.click(within(summary()!).getByRole("button", { name: new RegExp(`^${label}`) }));

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView.mock.contexts[0]).toHaveAttribute("id", sectionId);
      const section = document.getElementById(sectionId)!;
      expect(within(section).getAllByRole("heading")[0]).toHaveFocus();
    });
  });

  describe("the agreements section", () => {
    it("UI-PLT-003 lists the agreements in force before the drafts, each linking to its detail, and the full list", () => {
      setup({
        agreements: [
          agreement("a-3", "Reparto 2027", SharingAgreementResponseStatus.DRAFT),
          agreement("a-2", "Reparto 2025", SharingAgreementResponseStatus.SUPERSEDED),
          agreement("a-1", "Reparto 2026", SharingAgreementResponseStatus.PUBLISHED),
        ],
      });

      const section = screen.getByRole("region", { name: "Acuerdos de reparto" });
      const links = within(section).getAllByRole("link");
      expect(links.map((link) => link.getAttribute("href"))).toEqual([
        `/production/${PLANT_A.id}/sharing-agreements/a-1`,
        `/production/${PLANT_A.id}/sharing-agreements/a-3`,
        `/production/${PLANT_A.id}/sharing-agreements`,
      ]);
      expect(links[0]).toHaveTextContent("Reparto 2026");
      expect(links[0]).toHaveTextContent("Vigente");
      expect(links[1]).toHaveTextContent("Borrador");
      expect(links[2]).toHaveTextContent("Ver todos los acuerdos");
      expect(section).not.toHaveTextContent("Reparto 2025");
    });

    it("UI-PLT-003 shows an empty state, and still the full list, when none is in force or in draft", () => {
      setup({ agreements: [agreement("a-2", "Reparto 2025", SharingAgreementResponseStatus.SUPERSEDED)] });

      const section = screen.getByRole("region", { name: "Acuerdos de reparto" });
      expect(within(section).getByText("Ningún acuerdo en vigor")).toBeVisible();
      expect(within(section).getByRole("link", { name: "Ver todos los acuerdos" })).toBeVisible();
    });
  });

  describe("the next step", () => {
    it("UI-PLT-004 offers to configure the integration while the read answers 404", () => {
      setup({ config: "not-found" });

      expect(within(nextStep()!).getByRole("button", { name: "Configurar integración" })).toBeVisible();
    });

    it("UI-PLT-004 offers to activate the integration while it is disabled", () => {
      setup({ config: "disabled" });

      expect(within(nextStep()!).getByRole("button", { name: "Activar integración" })).toBeVisible();
    });

    it.each<ConfigRead>(["enabled", "loading", "failed"])("UI-PLT-004 does not show while the read is %s", (config) => {
      setup({ config });

      expect(nextStep()).not.toBeInTheDocument();
    });

    it("UI-PLT-004 does not show to a caller who may not manage the plant", () => {
      setup({ capabilities: { canListSharingAgreements: true }, config: "not-found" });

      expect(nextStep()).not.toBeInTheDocument();
    });

    it("UI-PLT-004 its action only scrolls to the integrations section and focuses its heading", async () => {
      const user = userEvent.setup();
      setup({ config: "disabled" });

      await user.click(within(nextStep()!).getByRole("button", { name: "Activar integración" }));

      expect(scrollIntoView.mock.contexts[0]).toHaveAttribute("id", "plant-integrations");
      expect(screen.getByRole("heading", { name: "Integraciones" })).toHaveFocus();
      // Nothing asks to confirm a write, and the switch is still off: no write
      // was started. A request would also fail this test through the network guard.
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("switch", { name: "Integración con Huawei activa" })).not.toBeChecked();
    });
  });

  describe("a period without production", () => {
    it.each<[string, ProductionByTime[]]>([
      ["no rows", []],
      ["rows without a power", [{ time: "2026-08-01T10:00:00Z" }, { time: "2026-08-01T11:00:00Z" }]],
    ])("UI-PLT-005 shows an empty state, and no zero figure or chart, for %s", (_, production) => {
      setup({ production });

      expect(screen.getByText("No hay datos de producción para este periodo")).toBeVisible();
      expect(screen.queryByText(/^0(,0+)? kWh$/)).not.toBeInTheDocument();
      expect(chart).not.toHaveBeenCalled();
    });

    it("UI-PLT-005 shows a measured zero as a figure, not as an empty period", () => {
      setup({ production: [{ time: "2026-08-01T10:00:00Z", power: 0 }] });

      expect(screen.queryByText("No hay datos de producción para este periodo")).not.toBeInTheDocument();
      expect(chart).toHaveBeenCalled();
    });

    it.each<[ConfigRead, string]>([
      ["not-found", "La integración con Huawei de esta planta no está configurada."],
      ["disabled", "La integración con Huawei de esta planta está desactivada."],
    ])("UI-PLT-005 points a caller who may manage the plant to an integration read as %s", (config, text) => {
      setup({ config, production: [] });

      expect(screen.getByText(text)).toBeVisible();
      expect(screen.getByRole("button", { name: "Ir a integraciones" })).toBeVisible();
    });

    it("UI-PLT-005 says nothing about configuration to a member", () => {
      setup({ capabilities: MEMBER, config: "not-found", production: [] });

      const main = document.body;
      expect(screen.getByText("No hay datos de producción para este periodo")).toBeVisible();
      expect(main).not.toHaveTextContent(/integraci|configura/i);
    });

    it("UI-PLT-005 an error is not an empty period", () => {
      setup({ production: "failed" });

      expect(mockErrorDispatch).toHaveBeenCalled();
      expect(screen.queryByText("No hay datos de producción para este periodo")).not.toBeInTheDocument();
      expect(screen.queryByText(/Todavía no llegan datos/)).not.toBeInTheDocument();
      expect(chart).not.toHaveBeenCalled();
    });

    it("UI-PLT-005 loading is not an empty period", () => {
      setup({ production: "loading" });

      expect(screen.queryByText("No hay datos de producción para este periodo")).not.toBeInTheDocument();
      expect(screen.queryByText(/Todavía no llegan datos/)).not.toBeInTheDocument();
    });
  });

  describe("neutral setup states", () => {
    it.each<[ConfigRead, string]>([
      ["not-found", "Sin configurar"],
      ["disabled", "Desactivada"],
    ])("UI-PLT-006 an integration read as %s is summarised in neutral colour, never alert colour", (config, text) => {
      setup({ config });

      const status = within(summary()!).getByText(text);
      const declared = declaredStyle(status);
      expect(declared).toMatchObject({ color: colors.secondary.main, "background-color": colors.background.surface });
      const alertTones = [colors.error.main, colors.error.surface, colors.error.vivid, colors.warning.main, colors.warning.surface];
      expect(alertTones).not.toContain(declared.color);
      expect(alertTones).not.toContain(declared["background-color"]);
    });
  });

  describe("the chart subtitle", () => {
    it.each([
      ["Día", "Producción por hora"],
      ["Mes", "Producción por día"],
      ["Año", "Producción por mes"],
      ["Total", "Producción por año"],
    ])("UI-PLT-007 the %s period is subtitled in Spanish as %s", async (label, subtitle) => {
      const user = userEvent.setup();
      setup();

      await user.click(screen.getByRole("button", { name: label }));

      expect(screen.getByRole("heading", { name: subtitle })).toBeVisible();
      expect(document.body).not.toHaveTextContent(/Rango|\b(hour|day|month|year)\b/);
    });
  });
});
