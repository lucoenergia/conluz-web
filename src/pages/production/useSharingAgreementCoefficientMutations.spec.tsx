import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useSharingAgreementCoefficientMutations } from "./useSharingAgreementCoefficientMutations";
import {
  buildEditableRowFromSupply,
  buildEditableRowsFromCoefficients,
  retextRowsForUnit,
  updateRowInput,
  type EditableCoefficientRow,
} from "./sharingAgreementCoefficientEditing";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse, SupplyResponse } from "../../api/models";

// A clean pending/never-applied default for the response fields these tests don't care about.
const PENDING_FIELDS = {
  validFrom: null,
  validTo: null,
  applicationState: SharingAgreementPartitionCoefficientResponseApplicationState.PENDING,
  endState: SharingAgreementPartitionCoefficientResponseEndState.OPEN,
  endDate: null,
} as const;

const mockErrorDispatch = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock("../../context/error.context", () => ({
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock("../../api/sharing-agreements/sharing-agreements", async () => {
  const actual = await vi.importActual<typeof import("../../api/sharing-agreements/sharing-agreements")>(
    "../../api/sharing-agreements/sharing-agreements",
  );
  return {
    ...actual,
    useReplacePartitionCoefficients: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const row = (supplyId: string, value: number | undefined): EditableCoefficientRow => ({
  supplyId,
  coefficient: {} as SharingAgreementPartitionCoefficientResponse,
  value,
  inputText: value === undefined ? "" : String(value),
});

describe("useSharingAgreementCoefficientMutations", () => {
  beforeEach(() => {
    mockErrorDispatch.mockClear();
    mockMutateAsync.mockClear();
  });

  it("issues exactly one PUT for the whole row set, keyed by supplyId", async () => {
    mockMutateAsync.mockResolvedValue({ coefficients: [] });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    await result.current.replaceCoefficients("agreement-1", [row("s1", 0.5), row("s2", 0.5)]);

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledWith({
      plantId: "plant-1",
      sharingAgreementId: "agreement-1",
      data: { coefficients: [{ supplyId: "s1", coefficient: 0.5 }, { supplyId: "s2", coefficient: 0.5 }] },
    });
  });

  it("sends a row whose value is 0 as a real 0 in the request body — never filtered, never coerced from empty", async () => {
    mockMutateAsync.mockResolvedValue({ coefficients: [] });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    await result.current.replaceCoefficients("agreement-1", [row("s1", 0), row("s2", 1)]);

    const body = mockMutateAsync.mock.calls[0][0].data;
    expect(body.coefficients).toHaveLength(2);
    expect(body.coefficients.find((entry: { supplyId: string }) => entry.supplyId === "s1")).toEqual({
      supplyId: "s1",
      coefficient: 0,
    });
  });

  it("reads the canonical value directly, so a row edited in kW behaves identically to one edited in percentage", async () => {
    // Whatever unit produced these values (0 = "0 kW" or "0%"; a value derived
    // from typing "30" kW on a 60 kWp plant is exactly 0.5, same as typing
    // "50" as a percentage) — the hook never re-parses text or knows about units.
    mockMutateAsync.mockResolvedValue({ coefficients: [] });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    await result.current.replaceCoefficients("agreement-1", [row("s1", 0), row("s2", 0.5)]);

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { coefficients: [{ supplyId: "s1", coefficient: 0 }, { supplyId: "s2", coefficient: 0.5 }] },
      }),
    );
  });

  it("returns the sumWarning from the response informationally on success", async () => {
    mockMutateAsync.mockResolvedValue({ coefficients: [], coefficientSumWarning: "La suma se aleja del 100%" });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    const outcome = await result.current.replaceCoefficients("agreement-1", [row("s1", 0.5)]);

    expect(outcome).toEqual({ success: true, sumWarning: "La suma se aleja del 100%" });
  });

  it("reproduction case: rows entered in kW mode against a 48,40 kW plant reach the request body as exact 6-decimal values", async () => {
    mockMutateAsync.mockResolvedValue({ coefficients: [] });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    const installedPowerKw = 48.4;
    // Only id/name are exercised by buildEditableRowFromSupply; the rest of SupplyResponse is irrelevant here.
    const supplies = [
      { id: "s1", name: "A" },
      { id: "s2", name: "B" },
      { id: "s3", name: "C" },
      { id: "s4", name: "D" },
    ] as SupplyResponse[];
    const kwText = ["1,5", "3,2", "1,0", "2,0"];
    const rows = supplies.map((supply, i) => {
      const empty = buildEditableRowFromSupply(supply);
      return updateRowInput([empty], supply.id!, kwText[i], "kw", installedPowerKw)[0];
    });

    await result.current.replaceCoefficients("agreement-1", rows);

    const body = mockMutateAsync.mock.calls[0][0].data;
    expect(body.coefficients).toEqual([
      { supplyId: "s1", coefficient: 0.030992 },
      { supplyId: "s2", coefficient: 0.066116 },
      { supplyId: "s3", coefficient: 0.020661 },
      { supplyId: "s4", coefficient: 0.041322 },
    ]);
  });

  it("round-trip: exact 6-decimal coefficients summing to 1,000,000 units survive display, unit toggling, and save unchanged", async () => {
    mockMutateAsync.mockResolvedValue({ coefficients: [] });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    const installedPowerKw = 45;
    const seeded = buildEditableRowsFromCoefficients(
      [
        { coefficientId: "c1", supply: { id: "s1", name: "A", code: "CUPS1" }, coefficient: 0.333333, ...PENDING_FIELDS },
        { coefficientId: "c2", supply: { id: "s2", name: "B", code: "CUPS2" }, coefficient: 0.333333, ...PENDING_FIELDS },
        { coefficientId: "c3", supply: { id: "s3", name: "C", code: "CUPS3" }, coefficient: 0.333334, ...PENDING_FIELDS },
      ],
      "coefficient",
      installedPowerKw,
    );

    let rows = retextRowsForUnit(seeded, "kw", installedPowerKw);
    rows = retextRowsForUnit(rows, "coefficient", installedPowerKw);

    await result.current.replaceCoefficients("agreement-1", rows);

    const body = mockMutateAsync.mock.calls[0][0].data;
    expect(body.coefficients).toEqual([
      { supplyId: "s1", coefficient: 0.333333 },
      { supplyId: "s2", coefficient: 0.333333 },
      { supplyId: "s3", coefficient: 0.333334 },
    ]);
  });

  it("dispatches a toast and returns success:false on error, without throwing", async () => {
    mockMutateAsync.mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    const outcome = await result.current.replaceCoefficients("agreement-1", [row("s1", 0.5)]);

    expect(outcome).toEqual({ success: false });
    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
  });
});
