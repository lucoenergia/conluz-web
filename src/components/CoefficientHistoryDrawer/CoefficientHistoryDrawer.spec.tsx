import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import {
  getAllSupplies,
  useGetPartitionCoefficientHistory,
  type getPartitionCoefficientHistory,
} from "../../api/supplies/supplies";
import { SharingAgreementCoefficientSet } from "../SharingAgreementCoefficientSet";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { PartitionCoefficientResponse, SharingAgreementPartitionCoefficientResponse } from "../../api/models";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN } = SharingAgreementPartitionCoefficientResponseEndState;

const PLANT_ID = "plant-norte";
const AGREEMENT_ID = "sa-2024";

const historyCalls: { supplyId: string; params: { plantId?: string } | undefined }[] = [];
let historyResult: PartitionCoefficientResponse[] = [];

vi.mock(import("../../api/supplies/supplies"), () => ({
  getAllSupplies: vi.fn(),
  useGetPartitionCoefficientHistory: vi.fn(),
}));

// The drawer's history query is enabled only while the drawer is open; closed,
// it is disabled and returns no data.
beforeEach(() => {
  vi.mocked(getAllSupplies).mockResolvedValue({ items: [], number: 0, totalPages: 1 });
  vi.mocked(useGetPartitionCoefficientHistory).mockImplementation((supplyId, params, options) => {
    if (options?.query?.enabled) historyCalls.push({ supplyId, params });
    return options?.query?.enabled
      ? query.success<typeof getPartitionCoefficientHistory>(historyResult)
      : query.disabled();
  });
});

vi.mock(import("../../context/success.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useSuccessDispatch: () => vi.fn(),
}));

vi.mock(import("../../pages/production/useSharingAgreementCoefficientMutations"), () => ({
  useSharingAgreementCoefficientMutations: () => ({
    replaceCoefficients: vi.fn(),
    activateCoefficients: vi.fn(),
    deactivateCoefficients: vi.fn(),
    closeCoefficients: vi.fn(),
    reopenCoefficients: vi.fn(),
    isReplacing: false,
    isActivating: false,
    isDeactivating: false,
    isClosing: false,
    isReopening: false,
  }),
}));

const OPEN_UNCLOSED = { validFrom: null, validTo: null, endState: OPEN, endDate: null, currentCoefficient: null };

const draftRow: SharingAgreementPartitionCoefficientResponse = {
  coefficientId: "c1",
  supply: { id: "supply-1", name: "Vivienda A", code: "ES0031300000000001AB" },
  coefficient: 1,
  applicationState: PENDING,
  ...OPEN_UNCLOSED,
};

const appliedRow: SharingAgreementPartitionCoefficientResponse = {
  ...draftRow,
  applicationState: APPLIED,
  validFrom: "2024-01-01T00:00:00Z",
};

function historyPeriod(overrides: Partial<PartitionCoefficientResponse> = {}): PartitionCoefficientResponse {
  return {
    id: "h1",
    supply: { id: "supply-1", code: "ES0031300000000001AB", name: "Vivienda A" },
    community: { id: "community-1", name: "Sol Común" },
    plant: { id: PLANT_ID, name: "Planta Solar Norte" },
    sharingAgreement: { id: "sa-2023", name: "Reparto 2023", status: "SUPERSEDED" },
    coefficient: 0.1,
    validFrom: "2023-01-01T00:00:00Z",
    validTo: "2024-01-01T00:00:00Z",
    createdAt: "2023-01-01T00:00:00Z",
    ...overrides,
  };
}

function setElement(
  status: (typeof SharingAgreementResponseStatus)[keyof typeof SharingAgreementResponseStatus],
  coefficients: SharingAgreementPartitionCoefficientResponse[],
) {
  return (
    <SharingAgreementCoefficientSet
      plantId={PLANT_ID}
      sharingAgreementId={AGREEMENT_ID}
      coefficients={coefficients}
      installedPowerKw={100}
      agreementStatus={status}
    />
  );
}

function renderSet(
  status: (typeof SharingAgreementResponseStatus)[keyof typeof SharingAgreementResponseStatus],
  coefficients: SharingAgreementPartitionCoefficientResponse[] = [appliedRow],
) {
  return renderWithProviders(setElement(status, coefficients), { activeCommunityId: "community-1" });
}

/** For rerender(): the harness keeps its providers across a rerender. */
function setTree(coefficients: SharingAgreementPartitionCoefficientResponse[]) {
  return setElement(SharingAgreementResponseStatus.PUBLISHED, coefficients);
}

async function openHistory(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("button", { name: /Más acciones/ })[0]);
  await user.click(screen.getByRole("menuitem", { name: "Ver histórico" }));
}

describe("CoefficientHistoryDrawer — reachable from every agreement status", () => {
  beforeEach(() => {
    historyCalls.length = 0;
    historyResult = [historyPeriod()];
  });

  it.each([
    ["DRAFT", SharingAgreementResponseStatus.DRAFT, [draftRow]],
    ["PUBLISHED", SharingAgreementResponseStatus.PUBLISHED, [appliedRow]],
    ["SUPERSEDED", SharingAgreementResponseStatus.SUPERSEDED, [appliedRow]],
  ] as const)("opens from a %s agreement", async (_label, status, rows) => {
    const user = userEvent.setup();
    renderSet(status, [...rows]);

    await openHistory(user);

    expect(await screen.findByText("Histórico de coeficientes")).toBeInTheDocument();
    expect(screen.getByText("Reparto 2023")).toBeInTheDocument();
  });

  it("does not request the history until the drawer is actually opened", () => {
    renderSet(SharingAgreementResponseStatus.PUBLISHED);

    expect(historyCalls).toHaveLength(0);
  });

  it("scopes the request to the agreement's own plant, so only one group can come back", async () => {
    const user = userEvent.setup();
    renderSet(SharingAgreementResponseStatus.PUBLISHED);

    await openHistory(user);

    expect(historyCalls.at(-1)).toEqual({ supplyId: "supply-1", params: { plantId: PLANT_ID } });
  });

  it("names the supply it is showing", async () => {
    const user = userEvent.setup();
    renderSet(SharingAgreementResponseStatus.PUBLISHED);

    await openHistory(user);

    expect(await screen.findByLabelText("Histórico de coeficientes de Vivienda A")).toBeInTheDocument();
  });

  it("links each period to its own agreement", async () => {
    const user = userEvent.setup();
    renderSet(SharingAgreementResponseStatus.PUBLISHED);

    await openHistory(user);

    expect(await screen.findByRole("link", { name: "Reparto 2023" })).toHaveAttribute(
      "href",
      `/production/${PLANT_ID}/sharing-agreements/sa-2023`,
    );
  });

  it("marks the agreement it was opened from rather than linking back to the same page", async () => {
    historyResult = [
      historyPeriod(),
      historyPeriod({
        id: "h2",
        sharingAgreement: { id: AGREEMENT_ID, name: "Reparto 2024", status: "PUBLISHED" },
        validFrom: "2024-01-01T00:00:00Z",
        validTo: null,
      }),
    ];
    const user = userEvent.setup();
    renderSet(SharingAgreementResponseStatus.PUBLISHED);

    await openHistory(user);

    expect(await screen.findByText("Este acuerdo")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Reparto 2024" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reparto 2023" })).toBeInTheDocument();
  });

  it("closes when its row disappears, rather than describing a supply the agreement no longer covers", async () => {
    const user = userEvent.setup();
    const { rerender } = renderSet(SharingAgreementResponseStatus.PUBLISHED);

    await openHistory(user);
    expect(await screen.findByText("Histórico de coeficientes")).toBeInTheDocument();

    // A replace or a deactivate refetches the set without this row.
    rerender(setTree([]));

    await waitFor(() => expect(screen.queryByText("Histórico de coeficientes")).not.toBeInTheDocument());
  });

  it("stays closed if the row comes back, instead of reopening itself behind the admin", async () => {
    const user = userEvent.setup();
    const { rerender } = renderSet(SharingAgreementResponseStatus.PUBLISHED);

    await openHistory(user);
    expect(await screen.findByText("Histórico de coeficientes")).toBeInTheDocument();

    // The row vanishes and then returns — an invalidation cascade can restore
    // it moments later. Without dropping the tracked id, the drawer would pop
    // back open on its own, which nobody asked for.
    rerender(setTree([]));
    await waitFor(() => expect(screen.queryByText("Histórico de coeficientes")).not.toBeInTheDocument());

    rerender(setTree([appliedRow]));

    await waitFor(() => expect(screen.getAllByRole("button", { name: /Más acciones/ }).length).toBeGreaterThan(0));
    expect(screen.queryByText("Histórico de coeficientes")).not.toBeInTheDocument();
  });
});
