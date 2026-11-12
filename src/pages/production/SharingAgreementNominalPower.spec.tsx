import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { SharingAgreementResponseStatus } from "../../api/models";
import {
  buildPlant,
  buildPlantCapabilities,
  buildSharingAgreement,
  buildSharingAgreementCapabilities,
} from "../../test/fixtures";
import type { SharingAgreementsData } from "./useSharingAgreementsData";
import type { SharingAgreementDetailData } from "./useSharingAgreementDetailData";

const mockListData = vi.fn();
const mockDetailData = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock(import("./useSharingAgreementsData"), async (importOriginal) => ({
  ...(await importOriginal()),
  useSharingAgreementsData: (...args: Parameters<typeof mockListData>) => mockListData(...args),
}));
vi.mock(import("./useSharingAgreementDetailData"), async (importOriginal) => ({
  ...(await importOriginal()),
  useSharingAgreementDetailData: (...args: Parameters<typeof mockDetailData>) => mockDetailData(...args),
}));
// Only the reads and the network calls are replaced; the actions layer runs
// for real. The coefficient set compares a draft against what is in force:
// nothing is, here.
vi.mock(import("../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreateSharingAgreement: vi.fn(),
  useUpdateSharingAgreement: vi.fn(),
  useGetPlantActivePartitionCoefficients: vi.fn(),
  getSharingAgreementById: vi.fn(),
}));
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => vi.fn() };
});

import {
  getSharingAgreementById,
  useCreateSharingAgreement,
  useGetPlantActivePartitionCoefficients,
  useUpdateSharingAgreement,
  type getPlantActivePartitionCoefficients,
} from "../../api/sharing-agreements/sharing-agreements";
import { SharingAgreementsPage } from "./SharingAgreementsPage";
import { SharingAgreementDetailPage } from "./SharingAgreementDetailPage";

const NOMINAL = /^Potencia nominal \(kW\)/;
const MANAGEABLE = buildSharingAgreementCapabilities({ canRead: true, canManage: true });

// The plant's nominal power differs from every agreement's own, so a field or
// row showing the plant's figure where the agreement's belongs fails.
const PLANT = buildPlant({
  id: "plant-1",
  name: "Planta Luco",
  peakPowerKWp: 80,
  nominalPowerKW: 60,
  capabilities: buildPlantCapabilities({ canRead: true, canListSharingAgreements: true, canManageSharingAgreements: true }),
});
const DRAFT = buildSharingAgreement({
  id: "agreement-1",
  plantId: "plant-1",
  name: "Reparto 2025",
  status: SharingAgreementResponseStatus.DRAFT,
  nominalPowerKW: 45,
  capabilities: MANAGEABLE,
});
const PUBLISHED = buildSharingAgreement({
  id: "agreement-2",
  plantId: "plant-1",
  name: "Reparto 2024",
  status: SharingAgreementResponseStatus.PUBLISHED,
  nominalPowerKW: 80,
  capabilities: MANAGEABLE,
});

const setViewport = (width: number) =>
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  setViewport(1024);
  mockCreate.mockResolvedValue({ id: "agreement-3", name: "Reparto 2026" });
  mockUpdate.mockResolvedValue(undefined);
  vi.mocked(useCreateSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync: mockCreate }));
  vi.mocked(useUpdateSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync: mockUpdate }));
  vi.mocked(useGetPlantActivePartitionCoefficients).mockImplementation((_plantId, options) =>
    options?.query?.enabled ? query.success<typeof getPlantActivePartitionCoefficients>([]) : query.disabled(),
  );
  vi.mocked(getSharingAgreementById).mockRejectedValue(new Error("No agreement fixture"));
  mockListData.mockReturnValue({
    agreements: [DRAFT, PUBLISHED],
    plant: PLANT,
    counts: { vigentes: 1, drafts: 1, historicos: 0 },
    isLoading: false,
    isNotFound: false,
    error: null,
    refetch: vi.fn(),
  } satisfies SharingAgreementsData);
  mockDetailData.mockReturnValue({
    agreement: DRAFT,
    plant: PLANT,
    coefficients: [],
    coefficientsData: [],
    isLoading: false,
    isNotFound: false,
    error: null,
  } satisfies SharingAgreementDetailData);
});

function renderList() {
  renderWithProviders(
    <Routes>
      <Route path="/plants/:plantId/sharing-agreements" element={<SharingAgreementsPage />} />
    </Routes>,
    { route: "/plants/plant-1/sharing-agreements", activeCommunityId: "TEST-COMMUNITY-ID" },
  );
}

function renderDetail() {
  renderWithProviders(
    <Routes>
      <Route path="/plants/:plantId/sharing-agreements/:sharingAgreementId" element={<SharingAgreementDetailPage />} />
    </Routes>,
    { route: "/plants/plant-1/sharing-agreements/agreement-1", activeCommunityId: "TEST-COMMUNITY-ID" },
  );
}

describe("UI-AGR-018 the create dialog starts from the plant's nominal power (#407)", () => {
  it("UI-AGR-018 seeds «Potencia nominal (kW)» with the plant's nominal power, not its peak power", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Nuevo acuerdo de reparto" }));

    expect(await screen.findByLabelText(NOMINAL)).toHaveValue("60");
  });

  it("UI-AGR-018 the seeded power can be changed before saving, and the changed one is sent", async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(screen.getByRole("button", { name: "Nuevo acuerdo de reparto" }));
    const power = await screen.findByLabelText(NOMINAL);

    await user.clear(power);
    await user.type(power, "55,5");
    await user.type(screen.getByLabelText(/^Nombre del acuerdo/), "Reparto 2026");
    await user.click(screen.getByRole("button", { name: "Crear borrador" }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].data).toMatchObject({ name: "Reparto 2026", nominalPowerKW: 55.5 });
  });
});

describe("UI-AGR-009 the edit dialog starts from the agreement's own nominal power (#407)", () => {
  it("UI-AGR-009 opens «Potencia nominal (kW)» with the agreement's 45, not the plant's 60", async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(screen.getByRole("button", { name: "Más opciones del acuerdo" }));
    await user.click(await screen.findByText("Editar datos del acuerdo"));

    expect(await screen.findByLabelText(NOMINAL)).toHaveValue("45");
  });
});

describe("UI-AGR-015 a row shows the agreement's own nominal power (#407)", () => {
  it("UI-AGR-015 the table names the column «Potencia nominal» and each row shows its agreement's figure", () => {
    renderList();

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Potencia nominal" })).toBeInTheDocument();
    const [draftRow, publishedRow] = within(table).getAllByRole("row").slice(1);
    expect(draftRow).toHaveTextContent(/(^|\D)45 kW/);
    expect(publishedRow).toHaveTextContent(/(^|\D)80 kW/);
    expect(table).not.toHaveTextContent(/(^|\D)60 kW/);
  });

  it("UI-AGR-015 on a narrow screen each row labels its figure «Potencia nominal»", () => {
    setViewport(380);
    renderList();

    const [draftRow, publishedRow] = within(screen.getByRole("list", { name: /acuerdos/i })).getAllByRole("listitem");
    expect(draftRow).toHaveTextContent("Potencia nominal 45 kW");
    expect(publishedRow).toHaveTextContent("Potencia nominal 80 kW");
  });
});
