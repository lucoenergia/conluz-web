// Deliberately does NOT mock "../../api/sharing-agreements/sharing-agreements"
// the way useSharingAgreementCoefficientMutations.spec.tsx does — that mock
// replaces the Orval-generated useMutation/useQuery hooks outright, which
// would hide exactly the bug this file exists to catch: the real TanStack
// isPending flag only tracks the mutation's own HTTP call, not the
// invalidation-triggered refetch that follows it. Mocking one level lower,
// at the raw HTTP layer (customInstance), keeps the real hooks — and
// therefore the real isPending timing — in play.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { AxiosRequestConfig } from "axios";
import dayjs from "dayjs";
import { customInstance } from "../../api/custom-instance";
import { useSharingAgreementCoefficientMutations } from "./useSharingAgreementCoefficientMutations";
import { useGetSharingAgreementPartitionCoefficients } from "../../api/sharing-agreements/sharing-agreements";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";

vi.mock("../../api/custom-instance", () => ({
  customInstance: vi.fn(),
}));

vi.mock("../../context/error.context", () => ({
  useErrorDispatch: () => vi.fn(),
}));

vi.mock("../../context/success.context", () => ({
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
};

const correctedCoefficient: SharingAgreementPartitionCoefficientResponse = {
  ...initialCoefficient,
  validFrom: "2026-02-01",
};

function useHarness(plantId: string, sharingAgreementId: string) {
  const query = useGetSharingAgreementPartitionCoefficients(plantId, sharingAgreementId);
  const mutations = useSharingAgreementCoefficientMutations(plantId);
  return { query, mutations };
}

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
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

    const Wrapper = makeWrapper();
    const { result } = renderHook(() => useHarness("plant-1", "agreement-1"), { wrapper: Wrapper });

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
});
