import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildPlant, buildPlantCapabilities, buildSupplyReference } from "../../test/fixtures";
import type { PlantCapabilitiesResponse } from "../../api/models";

vi.mock(import("./usePlantInActiveCommunity"), async (importOriginal) => ({
  ...(await importOriginal()),
  usePlantInActiveCommunity: vi.fn(),
}));
// jsdom has no layout, and ApexCharts measures its container on mount.
vi.mock("react-apexcharts", () => ({ default: () => null }));
vi.mock(import("../../api/production/production"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetHourlyProduction: vi.fn(),
  useGetDailyProduction: vi.fn(),
  useGetMonthlyProduction: vi.fn(),
  useGetYearlyProduction: vi.fn(),
}));

import { usePlantInActiveCommunity } from "./usePlantInActiveCommunity";
import {
  getHourlyProduction,
  useGetDailyProduction,
  useGetHourlyProduction,
  useGetMonthlyProduction,
  useGetYearlyProduction,
} from "../../api/production/production";
import { PlantDetailPage } from "./PlantDetailPage";

const COMMUNITY_ID = "community-a";
const PLANT_ID = "plant-1";

function setup(options: Partial<PlantCapabilitiesResponse> & { isNotFound?: boolean } = {}) {
  const { isNotFound = false, ...capabilities } = options;

  vi.mocked(usePlantInActiveCommunity).mockReturnValue({
    plant: isNotFound
      ? undefined
      : buildPlant({
          id: PLANT_ID,
          name: "Planta Norte",
          address: "Calle Sol 1",
          regulatoryCode: "CAU-123",
          supply: buildSupplyReference({ id: "supply-7", code: "ES0031300806333002ET0F" }),
          community: { id: COMMUNITY_ID },
          capabilities: buildPlantCapabilities({ canRead: true, ...capabilities }),
        }),
    isLoading: false,
    isNotFound,
    error: null,
    refetch: vi.fn(),
  });
  for (const hook of [
    useGetHourlyProduction,
    useGetDailyProduction,
    useGetMonthlyProduction,
    useGetYearlyProduction,
  ]) {
    vi.mocked(hook).mockReturnValue(query.success<typeof getHourlyProduction>([]));
  }

  return renderWithProviders(
    <Routes>
      <Route path="/production/:plantId" element={<PlantDetailPage />} />
    </Routes>,
    { route: `/production/${PLANT_ID}`, activeCommunityId: COMMUNITY_ID },
  );
}

const expandDetails = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /^Ver \d+ dato/ }));
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlantDetailPage", () => {
  // The page itself offers no write: no edit, no delete, no Huawei form. Those
  // live on the card menu and on /integrations. This case is what would fail if
  // one appeared here without a gate.
  it("offers no action on the plant itself, to a caller who may manage it", () => {
    setup({ canManage: true, canListSharingAgreements: true });

    expect(screen.getByRole("heading", { name: "Planta Norte" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Editar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Eliminar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Acuerdos de Reparto/ })).not.toBeInTheDocument();
  });

  it("links the supply for a caller the plant says may read it", async () => {
    const user = userEvent.setup();
    setup({ canReadSupply: true });
    await expandDetails(user);

    expect(screen.getByRole("link", { name: /ES0031300806333002ET0F/ })).toHaveAttribute(
      "href",
      "/supply-points/supply-7",
    );
  });

  it("shows the CUPS as text for a caller the plant says may not", async () => {
    const user = userEvent.setup();
    setup({ canReadSupply: false });
    await expandDetails(user);

    expect(screen.queryByRole("link", { name: /ES0031300806333002ET0F/ })).not.toBeInTheDocument();
    expect(screen.getByText("ES0031300806333002ET0F")).toBeInTheDocument();
  });

  it("renders one empty state for a missing or foreign plant", () => {
    setup({ isNotFound: true });

    expect(screen.getByText("Planta no encontrada")).toBeInTheDocument();
  });
});
