import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests } from "../../test/requestRouter";
import { SharingAgreementDetailHeader } from "../../components/SharingAgreementDetailHeader";
import { selectSharingAgreementNextStep } from "./selectSharingAgreementNextStep";
import { SharingAgreementCoefficientSet } from "../../components/SharingAgreementCoefficientSet";
import { useGetSharingAgreementById, useGetSharingAgreementPartitionCoefficients } from "../../api/sharing-agreements/sharing-agreements";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse, SharingAgreementResponse } from "../../api/models";

const { APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { CLOSED } = SharingAgreementPartitionCoefficientResponseEndState;

const PLANT_ID = "plant-1";
const AGREEMENT_ID = "agreement-1";
const AGREEMENT_URL = `/api/v1/plants/${PLANT_ID}/sharing-agreements/${AGREEMENT_ID}`;
const COEFFICIENTS_URL = `${AGREEMENT_URL}/partition-coefficients`;
const REOPEN_URL = `${COEFFICIENTS_URL}/reopen`;

// This test deliberately mocks only the raw HTTP layer (customInstance), not
// the generated hooks — every other spec in the repo mocks the mutation
// hooks directly and fakes a refetch via a manual rerender(), which proves
// nothing about whether invalidateQueries actually works. Here the real
// useGetSharingAgreementById / useReopenPartitionCoefficients hooks run
// against a real QueryClient, so a genuine invalidateQueries-triggered
// refetch is what flips the rendered status chip — or the test fails.
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

const closedCoefficient: SharingAgreementPartitionCoefficientResponse = {
  coefficientId: "c1",
  supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" },
  coefficient: 1,
  applicationState: APPLIED,
  validFrom: "2024-01-01T00:00:00Z",
  validTo: "2024-06-01T00:00:00Z",
  endState: CLOSED,
  endDate: "2024-06-01T00:00:00Z",
  currentCoefficient: null,
};

// Fixture deliberately stays minimal — cast rather than fully populated to
// every now-required field, matching the pattern used elsewhere in this
// codebase for partial test fixtures (e.g. SharingAgreementDetailPage.spec.tsx).
const baseAgreement = {
  id: AGREEMENT_ID,
  plantId: PLANT_ID,
  name: "Acuerdo test",
  status: SharingAgreementResponseStatus.SUPERSEDED,
  createdAt: "2024-01-01T00:00:00Z",
  installedPowerKw: 100,
  notes: null,
  file: null,
} as unknown as SharingAgreementResponse;

function Harness() {
  const { data: agreement } = useGetSharingAgreementById(PLANT_ID, AGREEMENT_ID);
  const { data: coefficients } = useGetSharingAgreementPartitionCoefficients(PLANT_ID, AGREEMENT_ID);
  return (
    <>
      <SharingAgreementDetailHeader
        agreement={agreement}
        coefficients={coefficients}
        nextStep={selectSharingAgreementNextStep(agreement, coefficients, undefined)}
      />
      <SharingAgreementCoefficientSet
        plantId={PLANT_ID}
        sharingAgreementId={AGREEMENT_ID}
        coefficients={coefficients ?? []}
        installedPowerKw={agreement?.installedPowerKw}
        agreementStatus={agreement?.status}
      />
    </>
  );
}

function renderHarness() {
  return renderWithProviders(<Harness />, { activeCommunityId: "community-1" });
}

describe("Reopen coefficient — real cache invalidation drives a real refetch (no manual refresh)", () => {
  let agreementGetCount = 0;
  let reopenCallCount = 0;

  beforeEach(() => {
    agreementGetCount = 0;
    reopenCallCount = 0;
    mockCustomInstance.mockReset();
    const router = routeRequests([
      {
        method: "GET",
        url: AGREEMENT_URL,
        respond: () => {
          agreementGetCount += 1;
          // SUPERSEDED on the first GET (before reopen), PUBLISHED on every GET after —
          // the second value is only ever reachable through a real refetch.
          return {
            ...baseAgreement,
            status: agreementGetCount === 1 ? SharingAgreementResponseStatus.SUPERSEDED : SharingAgreementResponseStatus.PUBLISHED,
          };
        },
      },
      { method: "GET", url: COEFFICIENTS_URL, respond: () => [closedCoefficient] },
      {
        method: "POST",
        url: REOPEN_URL,
        respond: () => {
          reopenCallCount += 1;
          return { coefficients: [{ coefficientId: closedCoefficient.coefficientId }] };
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);
  });

  it("flips the status chip from Histórico to Vigente after reopen resolves, with no manual refresh", async () => {
    const user = userEvent.setup();
    renderHarness();

    expect(await screen.findByText("Histórico")).toBeInTheDocument();

    const menuButtons = await screen.findAllByRole("button", { name: "Más acciones para Vivienda A" });
    await user.click(menuButtons[0]);
    await user.click(screen.getByRole("menuitem", { name: "Reabrir" }));
    await user.click(screen.getByRole("button", { name: "Confirmar y recalcular" }));

    await waitFor(() => expect(reopenCallCount).toBe(1));
    expect(await screen.findByText("Vigente")).toBeInTheDocument();
    expect(screen.queryByText("Histórico")).not.toBeInTheDocument();

    // Exactly one GET before the reopen and one after (the invalidation
    // refetch), plus the reopen POST itself — not more, not fewer.
    expect(agreementGetCount).toBe(2);
    expect(reopenCallCount).toBe(1);
  });
});
