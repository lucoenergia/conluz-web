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
  useGetHuaweiConfig: vi.fn(),
}));
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetPlantEnergyMetrics: vi.fn(),
}));
vi.mock(import("../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSharingAgreements: vi.fn(),
}));

import { usePlantInActiveCommunity } from "./usePlantInActiveCommunity";
import { useGetHuaweiConfig } from "../../api/production/production";
import { useGetPlantEnergyMetrics } from "../../api/plants/plants";
import { getSharingAgreements, useGetSharingAgreements } from "../../api/sharing-agreements/sharing-agreements";
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
  // The production sections have specs of their own; here they only have to stay quiet.
  vi.mocked(useGetPlantEnergyMetrics).mockReturnValue(query.loading());
  // The integrations section has its own spec; here it only has to stay quiet.
  vi.mocked(useGetHuaweiConfig).mockReturnValue(query.loading());
  vi.mocked(useGetSharingAgreements).mockReturnValue(query.success<typeof getSharingAgreements>([]));

  return renderWithProviders(
    <Routes>
      <Route path="/plants/:plantId" element={<PlantDetailPage />} />
    </Routes>,
    { route: `/plants/${PLANT_ID}`, activeCommunityId: COMMUNITY_ID },
  );
}

const expandDetails = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /^Ver \d+ dato/ }));
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlantDetailPage", () => {
  // Edit and delete sit in the header's menu, under the plant's own canManage.
  // The Huawei integration is the one other write, in its own section under the
  // same gate (PlantIntegrationsSection.spec).
  it("UI-PLT-014 offers Editar planta and Eliminar planta in the header's menu to a caller who may manage the plant", async () => {
    const user = userEvent.setup();
    setup({ canManage: true, canListSharingAgreements: true });

    await user.click(screen.getByRole("button", { name: "Más opciones de la planta" }));

    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Editar planta", "Eliminar planta"]);
  });

  it("UI-PLT-014 shows no menu to a caller the plant refuses canManage", () => {
    setup({ canManage: false, canListSharingAgreements: true });

    expect(screen.getByRole("heading", { name: "Planta Norte" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Más opciones de la planta" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
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
