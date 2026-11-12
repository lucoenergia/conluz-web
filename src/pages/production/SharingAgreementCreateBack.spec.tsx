import "@testing-library/jest-dom";
import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation } from "../../test/queryState";
import { hasOverlayEntry, pressBack } from "../../test/overlay";
import { overlayHistorySettled } from "../../components/ResponsiveOverlay/overlayHistory";
import { SharingAgreementsPage } from "./SharingAgreementsPage";
import { SharingAgreementResponseStatus } from "../../api/models";
import { buildPlant, buildPlantCapabilities, buildSharingAgreement, buildSharingAgreementCapabilities } from "../../test/fixtures";
import type { SharingAgreementsData } from "./useSharingAgreementsData";
import { useCreateSharingAgreement, useDeleteSharingAgreement } from "../../api/sharing-agreements/sharing-agreements";

/**
 * Creating a sharing agreement opens the new agreement as the form closes
 * (#369). What back does afterwards is the subject (UI-OVL-004), so the real
 * page and BrowserRouter run; the reads are mocked and the create is a spy.
 */
const mockUseSharingAgreementsData = vi.fn();
const mockCreateMutateAsync = vi.fn();

vi.mock(import("./useSharingAgreementsData"), async (importOriginal) => ({
  ...(await importOriginal()),
  useSharingAgreementsData: (...args: Parameters<typeof mockUseSharingAgreementsData>) => mockUseSharingAgreementsData(...args),
}));

vi.mock(import("../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreateSharingAgreement: vi.fn(),
  useDeleteSharingAgreement: vi.fn(),
}));

const PLANT_ID = "plant-42";
const LIST = `/plants/${PLANT_ID}/sharing-agreements`;

const data = (): SharingAgreementsData => ({
  agreements: [
    buildSharingAgreement({
      id: "1",
      name: "Reparto vecinos bloque A",
      status: SharingAgreementResponseStatus.PUBLISHED,
      capabilities: buildSharingAgreementCapabilities({ canRead: true, canManage: true }),
    }),
    buildSharingAgreement({
      id: "2",
      name: "Borrador reciente",
      status: SharingAgreementResponseStatus.DRAFT,
      capabilities: buildSharingAgreementCapabilities({ canRead: true, canManage: true }),
    }),
  ],
  plant: buildPlant({
    name: "Planta Solar Norte",
    regulatoryCode: "CAU-123",
    peakPowerKWp: 36,
    nominalPowerKW: 30,
    capabilities: buildPlantCapabilities({ canRead: true, canListSharingAgreements: true, canManageSharingAgreements: true }),
  }),
  counts: { vigentes: 1, drafts: 1, historicos: 0 },
  isLoading: false,
  isNotFound: false,
  error: null,
  refetch: vi.fn(),
});

beforeEach(() => {
  mockUseSharingAgreementsData.mockReturnValue(data());
  mockCreateMutateAsync.mockResolvedValue({ id: "new-agreement", name: "Reparto nuevo" });
  vi.mocked(useCreateSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync: mockCreateMutateAsync }));
  vi.mocked(useDeleteSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync: vi.fn() }));
});

afterEach(async () => {
  cleanup();
  await act(() => overlayHistorySettled());
});

describe("UI-OVL-004 creating a sharing agreement", () => {
  it("UI-OVL-004 opens the new agreement, and one back lands on the list without the dialog", async () => {
    window.history.replaceState(null, "", "/start");
    window.history.pushState(null, "", LIST);
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/start" element={<h1>Inicio</h1>} />
        <Route path="/plants/:plantId/sharing-agreements" element={<SharingAgreementsPage />} />
        <Route path="/plants/:plantId/sharing-agreements/:agreementId" element={<h1>Detalle del acuerdo</h1>} />
      </Routes>,
      { browserHistory: true, activeCommunityId: "TEST-COMMUNITY-ID" },
    );

    await user.click(screen.getByRole("button", { name: "Nuevo acuerdo de reparto" }));
    await act(() => overlayHistorySettled());
    const dialog = screen.getByRole("dialog", { name: /^Nuevo acuerdo de reparto (en|de) / });
    await user.type(within(dialog).getByRole("textbox", { name: /Nombre del acuerdo/ }), "Reparto nuevo");
    await user.click(within(dialog).getByRole("button", { name: "Crear borrador" }));

    expect(await screen.findByRole("heading", { name: "Detalle del acuerdo" })).toBeInTheDocument();
    await act(() => overlayHistorySettled());
    expect(window.location.pathname).toBe(`${LIST}/new-agreement`);

    await pressBack();
    expect(window.location.pathname).toBe(LIST);
    expect(hasOverlayEntry()).toBe(false);
    expect(await screen.findByText("Borrador reciente")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
