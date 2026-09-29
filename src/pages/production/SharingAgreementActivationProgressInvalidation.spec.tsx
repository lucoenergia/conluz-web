import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { Route, Routes } from "react-router";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests } from "../../test/requestRouter";
import { SharingAgreementDetailPage } from "./SharingAgreementDetailPage";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
  SharingAgreementReferenceResponseStatus,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import {
  buildCoefficient,
  buildPlant,
  buildSharingAgreement,
  buildSharingAgreementCapabilities,
} from "../../test/fixtures";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN, CLOSED } = SharingAgreementPartitionCoefficientResponseEndState;

const COMMUNITY_ID = "community-1";
const PLANT_ID = "plant-1";
const AGREEMENT_ID = "agreement-1";
const PLANT_URL = new RegExp(`/plants/${PLANT_ID}$`);
const AGREEMENT_URL = `/api/v1/plants/${PLANT_ID}/sharing-agreements/${AGREEMENT_ID}`;
const COEFFICIENTS_URL = `${AGREEMENT_URL}/partition-coefficients`;
const ACTIVATE_URL = `${COEFFICIENTS_URL}/activate`;

// The subject is cache behaviour (ADR-0001, tier 2): the real generated hooks
// run against a real QueryClient, so only the awaited invalidation that
// follows the activation can bring the refetched list — and with it the
// hidden section — onto the page.
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

vi.mock(import("../../context/success.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useSuccessDispatch: () => vi.fn(),
}));

const agreement = buildSharingAgreement({
  id: AGREEMENT_ID,
  plantId: PLANT_ID,
  name: "Reparto 2026",
  status: SharingAgreementResponseStatus.PUBLISHED,
  installedPowerKw: 100,
  // Registering an application date is a write: without canManage the row menu
  // this spec drives would not be there to click.
  capabilities: buildSharingAgreementCapabilities({ canRead: true, canManage: true }),
});

const appliedOpen = buildCoefficient({
  coefficientId: "c1",
  supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" },
  coefficient: 0.5,
  applicationState: APPLIED,
  endState: OPEN,
  validFrom: "2026-01-01",
});
const appliedClosed = buildCoefficient({
  coefficientId: "c2",
  supply: { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" },
  coefficient: 0.2,
  applicationState: APPLIED,
  endState: CLOSED,
  validFrom: "2025-01-01",
  validTo: "2025-12-31",
  endDate: "2025-12-31",
});
const lastPending = buildCoefficient({
  coefficientId: "c3",
  supply: { id: "s3", name: "Vivienda C", code: "ES0031300000000003EF" },
  coefficient: 0.3,
  applicationState: PENDING,
  endState: OPEN,
  currentCoefficient: {
    coefficient: 0.25,
    validFrom: "2023-01-01T00:00:00Z",
    sharingAgreement: { id: "sa-previous", name: "Reparto 2023", status: SharingAgreementReferenceResponseStatus.SUPERSEDED },
  },
});

describe("Activating the last pending coefficient — the refetch hides the application section (no reload)", () => {
  let activated = false;
  let coefficientsGetCount = 0;

  beforeEach(() => {
    // jsdom does not implement window.scrollTo, which the page calls on entry.
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    activated = false;
    coefficientsGetCount = 0;
    mockCustomInstance.mockReset();
    const router = routeRequests([
      { method: "GET", url: PLANT_URL, respond: () => buildPlant({ id: PLANT_ID, name: "Planta Norte", community: { id: COMMUNITY_ID } }) },
      { method: "GET", url: AGREEMENT_URL, respond: () => agreement },
      {
        method: "GET",
        url: COEFFICIENTS_URL,
        respond: (): SharingAgreementPartitionCoefficientResponse[] => {
          coefficientsGetCount += 1;
          // The applied state is only reachable through a refetch after the POST.
          return [
            appliedOpen,
            appliedClosed,
            activated ? { ...lastPending, applicationState: APPLIED, validFrom: "2026-01-10", currentCoefficient: null } : lastPending,
          ];
        },
      },
      {
        method: "POST",
        url: ACTIVATE_URL,
        respond: () => {
          activated = true;
          return { coefficients: [{ coefficientId: lastPending.coefficientId }] };
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);
  });

  it("reaches N of N and removes the section once the refetched list comes back", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/production/:plantId/sharing-agreements/:sharingAgreementId" element={<SharingAgreementDetailPage />} />
      </Routes>,
      { route: `/production/${PLANT_ID}/sharing-agreements/${AGREEMENT_ID}`, activeCommunityId: COMMUNITY_ID },
    );

    // The closed row counts as applied: 2 of 3 before the activation.
    expect(await screen.findByText("2 de 3 puntos con fecha de aplicación")).toBeVisible();

    const [menuButton] = await screen.findAllByRole("button", { name: "Más acciones para Vivienda C" });
    await user.click(menuButton);
    await user.click(screen.getByRole("menuitem", { name: "Registrar fecha" }));
    await user.click(screen.getByRole("spinbutton", { name: "Dia" }));
    await user.keyboard("10");
    await user.keyboard("01");
    await user.keyboard("2026");
    await user.click(screen.getByRole("button", { name: "Registrar fecha" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Aplicación del reparto" })).not.toBeInTheDocument());
    expect(screen.queryByText(/puntos con fecha de aplicación/)).not.toBeInTheDocument();
    expect(activated).toBe(true);
    // One GET before the activation and one from the invalidation — no manual refetch.
    expect(coefficientsGetCount).toBe(2);
  });
});
