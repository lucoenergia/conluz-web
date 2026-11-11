import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
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
  type SharingAgreementResponse,
} from "../../api/models";

// jsdom has no layout, and ApexCharts measures its container on mount. The stub
// records what the page hands the chart.
const { chart } = vi.hoisted(() => ({ chart: vi.fn<(props: unknown) => null>(() => null) }));
vi.mock("react-apexcharts", () => ({ default: chart }));

vi.mock(import("./usePlantInActiveCommunity"), async (importOriginal) => ({
  ...(await importOriginal()),
  usePlantInActiveCommunity: vi.fn(),
}));
vi.mock(import("../../api/production/production"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetHuaweiConfig: vi.fn(),
}));
// The plant's production sections have specs of their own; here they only have to stay quiet.
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetPlantEnergyMetrics: vi.fn(),
}));
vi.mock(import("../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSharingAgreements: vi.fn(),
}));

import { usePlantInActiveCommunity } from "./usePlantInActiveCommunity";
import { getHuaweiConfig, useGetHuaweiConfig } from "../../api/production/production";
import { useGetPlantEnergyMetrics } from "../../api/plants/plants";
import { getSharingAgreements, useGetSharingAgreements } from "../../api/sharing-agreements/sharing-agreements";
import { PlantDetailPage } from "./PlantDetailPage";

const COMMUNITY_ID = "community-a";

const PLANT_A = { id: "plant-a", supplyId: "supply-a" };

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
  plantPending = false,
}: SetupOptions = {}) {
  vi.mocked(usePlantInActiveCommunity).mockReturnValue({
    plant: plantPending ? undefined : plantFor(plant, capabilities),
    isLoading: plantPending,
    isNotFound: false,
    error: null,
    refetch: vi.fn(),
  });
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
  vi.mocked(useGetPlantEnergyMetrics).mockReturnValue(query.loading());

  return renderWithProviders(
    <Routes>
      <Route path="/plants/:plantId" element={<PlantDetailPage />} />
    </Routes>,
    { route: `/plants/${plant.id}`, activeCommunityId: COMMUNITY_ID },
  );
}

const agreement = (id: string, name: string, status: SharingAgreementResponse["status"]) =>
  buildSharingAgreement({ id, plantId: PLANT_A.id, name, status });

const summary = () => screen.queryByRole("region", { name: "En esta planta" });
const nextStep = () => screen.queryByRole("region", { name: "Siguiente paso" });

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

let scrollIntoView: Mock;

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom implements no scrolling; the jump is observed through this spy.
  scrollIntoView = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView as unknown as Element["scrollIntoView"];
});

describe("PlantDetailPage rules (#260)", () => {
  describe("blocks by capability", () => {
    it("UI-PLT-002 a member sees no summary, agreements, integrations or next step, and neither read is issued", () => {
      setup({ capabilities: MEMBER, config: "not-found" });

      expect(screen.getByRole("heading", { name: "Producción por periodo" })).toBeVisible();
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
        `/plants/${PLANT_A.id}/sharing-agreements/a-1`,
        `/plants/${PLANT_A.id}/sharing-agreements/a-3`,
        `/plants/${PLANT_A.id}/sharing-agreements`,
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

  describe("neutral setup states", () => {
    it.each<[ConfigRead, string]>([
      ["not-found", "Sin configurar"],
      ["disabled", "Desactivada"],
    ])("UI-PLT-006 an integration read as %s is summarised in neutral colour, never alert colour", (config, text) => {
      setup({ config });

      const status = within(summary()!).getByText(text);
      const declared = declaredStyle(status);
      expect(declared).toMatchObject({ color: colors.secondary.main });
      const alertTones = [colors.error.main, colors.error.surface, colors.error.vivid, colors.warning.main, colors.warning.surface];
      expect(alertTones).not.toContain(declared.color);
      expect(alertTones).not.toContain(declared["background-color"]);
    });
  });
});
