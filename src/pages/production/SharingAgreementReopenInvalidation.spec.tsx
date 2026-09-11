import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "../../theme";
import { ErrorProvider } from "../../context/error.context";
import { SharingAgreementDetailHeader } from "../../components/SharingAgreementDetailHeader";
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

vi.mock("../../api/custom-instance", () => ({
  customInstance: (config: { url: string; method: string; data?: unknown }) => mockCustomInstance(config),
}));

vi.mock("../../context/success.context", () => ({
  useSuccessDispatch: () => vi.fn(),
}));

vi.mock("../../context/community.context", async () => {
  const actual = await vi.importActual<typeof import("../../context/community.context")>("../../context/community.context");
  return { ...actual, useActiveCommunity: () => "community-1" };
});

const closedCoefficient: SharingAgreementPartitionCoefficientResponse = {
  coefficientId: "c1",
  supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" },
  coefficient: 1,
  applicationState: APPLIED,
  validFrom: "2024-01-01T00:00:00Z",
  validTo: "2024-06-01T00:00:00Z",
  endState: CLOSED,
  endDate: "2024-06-01T00:00:00Z",
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
      <SharingAgreementDetailHeader agreement={agreement} coefficients={coefficients} />
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ErrorProvider>
        <ThemeProvider theme={theme}>
          <Harness />
        </ThemeProvider>
      </ErrorProvider>
    </QueryClientProvider>,
  );
}

describe("Reopen coefficient — real cache invalidation drives a real refetch (no manual refresh)", () => {
  let agreementGetCount = 0;
  let reopenCallCount = 0;

  beforeEach(() => {
    agreementGetCount = 0;
    reopenCallCount = 0;
    mockCustomInstance.mockReset();
    mockCustomInstance.mockImplementation((config: { url: string; method: string }) => {
      if (config.method === "GET" && config.url === AGREEMENT_URL) {
        agreementGetCount += 1;
        // SUPERSEDED on the first GET (before reopen), PUBLISHED on every GET after —
        // the second value is only ever reachable through a real refetch.
        return Promise.resolve({
          ...baseAgreement,
          status: agreementGetCount === 1 ? SharingAgreementResponseStatus.SUPERSEDED : SharingAgreementResponseStatus.PUBLISHED,
        });
      }
      if (config.method === "GET" && config.url === COEFFICIENTS_URL) {
        return Promise.resolve([closedCoefficient]);
      }
      if (config.method === "POST" && config.url === REOPEN_URL) {
        reopenCallCount += 1;
        return Promise.resolve({ coefficients: [{ coefficientId: closedCoefficient.coefficientId }] });
      }
      return Promise.reject(new Error(`Unhandled request in test: ${config.method} ${config.url}`));
    });
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
