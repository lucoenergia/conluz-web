// Deliberately does NOT mock "../../api/sharing-agreements/sharing-agreements"
// the way useSharingAgreementCoefficientMutations.spec.tsx does — that mock
// replaces the Orval-generated useMutation/useQuery hooks outright, which
// would hide exactly the bug this file exists to catch: the real TanStack
// isPending flag only tracks the mutation's own HTTP call, not the
// invalidation-triggered refetch that follows it. Mocking one level lower,
// at the raw HTTP layer (customInstance), keeps the real hooks — and
// therefore the real isPending timing — in play.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import type { AxiosRequestConfig } from "axios";
import dayjs from "dayjs";
import { customInstance } from "../../api/custom-instance";
import { useSharingAgreementCoefficientMutations } from "./useSharingAgreementCoefficientMutations";
import type { EditableCoefficientRow } from "./sharingAgreementCoefficientEditing";
import { useGetSharingAgreementPartitionCoefficients } from "../../api/sharing-agreements/sharing-agreements";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../api/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: vi.fn(),
}));

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => vi.fn(),
}));

vi.mock(import("../../context/success.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useSuccessDispatch: () => vi.fn(),
}));

const mockCustomInstance = vi.mocked(customInstance);

const { APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN } = SharingAgreementPartitionCoefficientResponseEndState;

const initialCoefficient: SharingAgreementPartitionCoefficientResponse = {
  coefficientId: "c1",
  supply: { id: "s1", name: "Vivienda A", code: "ES1111111111111111AA" },
  coefficient: 0.5,
  applicationState: APPLIED,
  endState: OPEN,
  validFrom: "2026-01-01",
  validTo: null,
  endDate: null,
  currentCoefficient: null,
};

const correctedCoefficient: SharingAgreementPartitionCoefficientResponse = {
  ...initialCoefficient,
  validFrom: "2026-02-01",
};

const replacedCoefficient: SharingAgreementPartitionCoefficientResponse = {
  ...initialCoefficient,
  coefficient: 0.6,
};

function useHarness(plantId: string, sharingAgreementId: string) {
  const query = useGetSharingAgreementPartitionCoefficients(plantId, sharingAgreementId);
  const mutations = useSharingAgreementCoefficientMutations(plantId);
  return { query, mutations };
}

describe("coefficient mutations stay pending until the post-success refetch resolves", () => {
  beforeEach(() => {
    mockCustomInstance.mockReset();
  });

  it("keeps isActivating true through the invalidation-triggered refetch, not just the POST", async () => {
    let resolveRefetch!: (value: SharingAgreementPartitionCoefficientResponse[]) => void;
    let getCallCount = 0;

    mockCustomInstance.mockImplementation((config: AxiosRequestConfig) => {
      if (config.method === "GET") {
        getCallCount += 1;
        if (getCallCount === 1) return Promise.resolve([initialCoefficient]);
        // The second GET is the invalidation-triggered refetch — held open
        // deliberately, so the test controls exactly when "fresh data"
        // arrives instead of racing a promise microtask.
        return new Promise((resolve) => {
          resolveRefetch = resolve;
        });
      }
      // POST .../activate resolves immediately — the whole point is that the
      // HTTP call finishing is NOT the same moment the mutation should stop
      // reporting itself as pending.
      return Promise.resolve({ coefficients: [{ coefficientId: "c1" }] });
    });

    const { result } = renderHookWithProviders(() => useHarness("plant-1", "agreement-1"));

    await waitFor(() => expect(result.current.query.data).toEqual([initialCoefficient]));
    expect(result.current.mutations.isActivating).toBe(false);

    let activatePromise!: Promise<unknown>;
    act(() => {
      activatePromise = result.current.mutations.activateCoefficients("agreement-1", ["c1"], dayjs("2026-02-01"));
    });

    // The POST has already resolved by now (it's an immediately-resolving
    // mock), so a naive "isPending tracks the HTTP call" implementation would
    // already report false here. The real assertion: the refetch it
    // triggered is still in flight, and isActivating must still be true.
    await waitFor(() => expect(getCallCount).toBe(2));
    expect(result.current.mutations.isActivating).toBe(true);

    act(() => resolveRefetch([correctedCoefficient]));
    await act(async () => {
      await activatePromise;
    });

    await waitFor(() => expect(result.current.mutations.isActivating).toBe(false));
    expect(result.current.query.data).toEqual([correctedCoefficient]);
  });

  // Replace races the editor reopening rather than another mutation: the
  // editor closes on save and seeds both its rows and its session-start
  // snapshot from the coefficients prop, so re-entering it before the refetch
  // lands would baseline the next session on superseded data. Nothing gates
  // "Editar a mano" except this flag reaching the save button.
  it("keeps isReplacing true through the invalidation-triggered refetch, not just the PUT", async () => {
    let resolveRefetch!: (value: SharingAgreementPartitionCoefficientResponse[]) => void;
    let getCallCount = 0;

    mockCustomInstance.mockImplementation((config: AxiosRequestConfig) => {
      if (config.method === "GET") {
        getCallCount += 1;
        if (getCallCount === 1) return Promise.resolve([initialCoefficient]);
        return new Promise((resolve) => {
          resolveRefetch = resolve;
        });
      }
      // PUT .../partition-coefficients resolves immediately.
      return Promise.resolve({ coefficients: [] });
    });

    const { result } = renderHookWithProviders(() => useHarness("plant-1", "agreement-1"));

    await waitFor(() => expect(result.current.query.data).toEqual([initialCoefficient]));
    expect(result.current.mutations.isReplacing).toBe(false);

    const rows: EditableCoefficientRow[] = [
      { supplyId: "s1", coefficient: initialCoefficient, value: 0.6, inputText: "60,0000" },
    ];

    let replacePromise!: Promise<unknown>;
    act(() => {
      replacePromise = result.current.mutations.replaceCoefficients("agreement-1", rows);
    });

    await waitFor(() => expect(getCallCount).toBe(2));
    expect(result.current.mutations.isReplacing).toBe(true);

    act(() => resolveRefetch([replacedCoefficient]));
    await act(async () => {
      await replacePromise;
    });

    await waitFor(() => expect(result.current.mutations.isReplacing).toBe(false));
    // Only once this is true may the editor reopen: it is what the next
    // session's snapshot would be built from.
    expect(result.current.query.data).toEqual([replacedCoefficient]);
  });
});
