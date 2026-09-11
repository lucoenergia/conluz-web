// Reinforcement, not the mechanism — the real proof that appliedOn survives
// timezone conversion correctly is the request-body assertion in the date
// serialisation test below, which fails if the conversion is ever changed to
// .toISOString(). This override just ensures the assertion isn't vacuously
// true because the test machine already happens to run in Madrid time.
process.env.TZ = "Europe/Madrid";

import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import dayjs from "dayjs";
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
const mockSuccessDispatch = vi.fn();
const mockMutateAsync = vi.fn();
const mockActivateMutateAsync = vi.fn();
const mockDeactivateMutateAsync = vi.fn();
const mockCloseMutateAsync = vi.fn();
const mockReopenMutateAsync = vi.fn();

vi.mock("../../context/error.context", () => ({
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock("../../context/success.context", () => ({
  useSuccessDispatch: () => mockSuccessDispatch,
}));

vi.mock("../../api/sharing-agreements/sharing-agreements", async () => {
  const actual = await vi.importActual<typeof import("../../api/sharing-agreements/sharing-agreements")>(
    "../../api/sharing-agreements/sharing-agreements",
  );
  return {
    ...actual,
    useReplacePartitionCoefficients: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
    useActivatePartitionCoefficients: () => ({ mutateAsync: mockActivateMutateAsync, isPending: false }),
    useDeactivatePartitionCoefficients: () => ({ mutateAsync: mockDeactivateMutateAsync, isPending: false }),
    useClosePartitionCoefficients: () => ({ mutateAsync: mockCloseMutateAsync, isPending: false }),
    useReopenPartitionCoefficients: () => ({ mutateAsync: mockReopenMutateAsync, isPending: false }),
  };
});

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, Wrapper };
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{children}</QueryClientProvider>;
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
    mockSuccessDispatch.mockClear();
    mockMutateAsync.mockClear();
    mockActivateMutateAsync.mockClear();
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

  it("does not surface the backend's coefficientSumWarning string on the result, even when present", async () => {
    mockMutateAsync.mockResolvedValue({ coefficients: [], coefficientSumWarning: "La suma se aleja del 100%" });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    const outcome = await result.current.replaceCoefficients("agreement-1", [row("s1", 0.5), row("s2", 0.4)]);

    expect(outcome).toEqual({ success: true });
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

describe("activateCoefficients", () => {
  beforeEach(() => {
    mockErrorDispatch.mockClear();
    mockSuccessDispatch.mockClear();
    mockActivateMutateAsync.mockClear();
  });

  it("serialises appliedOn with .format('YYYY-MM-DD'), never a UTC-converting method — proven by asserting on the request body actually sent", async () => {
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [{ coefficientId: "c1" }] });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    // Local midnight on a fixed date. If the conversion ever used
    // .toISOString() (which converts to UTC first), Europe/Madrid's +1/+2
    // offset would shift this to 22:00/23:00 the *previous* day, and this
    // assertion would catch it because it checks the exact string sent, not
    // just that dayjs itself can format the date correctly.
    const localMidnight = dayjs("2026-03-15T00:00:00");

    await result.current.activateCoefficients("agreement-1", ["c1"], localMidnight);

    expect(mockActivateMutateAsync).toHaveBeenCalledWith({
      plantId: "plant-1",
      sharingAgreementId: "agreement-1",
      data: { coefficientIds: ["c1"], appliedOn: "2026-03-15" },
    });
  });

  it("treats an empty coefficients response (no-op batch) as success and dispatches the transient confirmation", async () => {
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [] });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    const outcome = await result.current.activateCoefficients("agreement-1", ["c1"], dayjs("2026-01-10"));

    expect(outcome).toEqual({ success: true });
    expect(mockSuccessDispatch).toHaveBeenCalledWith("Fechas de aplicación registradas.");
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  it("on rejection, returns every translated detail and does not dispatch a toast", async () => {
    mockActivateMutateAsync.mockRejectedValue({
      response: {
        data: {
          errors: [
            {
              message: "raw",
              code: "SHARING_AGREEMENT_ACTIVATION_DATE_NOT_AFTER_PREDECESSOR",
              params: { cups: "ES1111111111111111AA" },
            },
            {
              message: "raw",
              code: "SHARING_AGREEMENT_ACTIVATION_DATE_NOT_AFTER_PREDECESSOR",
              params: { cups: "ES2222222222222222BB" },
            },
          ],
        },
      },
    });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    const outcome = await result.current.activateCoefficients("agreement-1", ["c1", "c2"], dayjs("2026-01-10"));

    expect(outcome.success).toBe(false);
    if (!outcome.success) {
      expect(outcome.errorMessages).toHaveLength(2);
      expect(new Set(outcome.errorMessages).size).toBe(2);
    }
    expect(mockErrorDispatch).not.toHaveBeenCalled();
    expect(mockSuccessDispatch).not.toHaveBeenCalled();
  });

  it("on a non-RestError rejection (network error), returns an empty errorMessages array rather than throwing", async () => {
    mockActivateMutateAsync.mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    const outcome = await result.current.activateCoefficients("agreement-1", ["c1"], dayjs("2026-01-10"));

    expect(outcome).toEqual({ success: false, errorMessages: [] });
  });

  it("invalidates every sharing-agreement query for the plant via a URL-prefix predicate, not a specific query key", async () => {
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [] });
    const { queryClient, Wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper: Wrapper });

    await result.current.activateCoefficients("agreement-1", ["c1"], dayjs("2026-01-10"));

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    const filters = invalidateSpy.mock.calls[0][0];
    const predicate = filters && "predicate" in filters ? filters.predicate : undefined;
    expect(predicate).toBeTypeOf("function");

    const matches = (key: string) => predicate!({ queryKey: [key] } as never);
    // Matches: the list, this agreement's by-id, this agreement's coefficient
    // set, and (critically) a *different* agreement of the *same* plant —
    // this is the whole reason for a predicate instead of specific keys: a
    // cascaded predecessor coefficient may belong to another agreement.
    expect(matches("/api/v1/plants/plant-1/sharing-agreements")).toBe(true);
    expect(matches("/api/v1/plants/plant-1/sharing-agreements/agreement-1")).toBe(true);
    expect(matches("/api/v1/plants/plant-1/sharing-agreements/agreement-1/partition-coefficients")).toBe(true);
    expect(matches("/api/v1/plants/plant-1/sharing-agreements/agreement-2/partition-coefficients")).toBe(true);
    // Does not match: a different plant, or an unrelated endpoint on this plant.
    expect(matches("/api/v1/plants/plant-2/sharing-agreements")).toBe(false);
    expect(matches("/api/v1/plants/plant-1/consumption")).toBe(false);
  });
});

describe("deactivateCoefficients", () => {
  beforeEach(() => {
    mockErrorDispatch.mockClear();
    mockSuccessDispatch.mockClear();
    mockDeactivateMutateAsync.mockClear();
  });

  it("sends coefficientIds only, invalidates the plant subtree, and dispatches the transient confirmation", async () => {
    mockDeactivateMutateAsync.mockResolvedValue({ coefficients: [{ coefficientId: "c1" }] });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    const outcome = await result.current.deactivateCoefficients("agreement-1", ["c1"]);

    expect(mockDeactivateMutateAsync).toHaveBeenCalledWith({
      plantId: "plant-1",
      sharingAgreementId: "agreement-1",
      data: { coefficientIds: ["c1"] },
    });
    expect(outcome).toEqual({ success: true });
    expect(mockSuccessDispatch).toHaveBeenCalledWith("Activación revertida.");
  });

  it("treats an empty coefficients response (no-op) as success", async () => {
    mockDeactivateMutateAsync.mockResolvedValue({ coefficients: [] });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    const outcome = await result.current.deactivateCoefficients("agreement-1", ["c1"]);

    expect(outcome).toEqual({ success: true });
  });

  it("on rejection, returns every translated detail and does not dispatch a toast", async () => {
    mockDeactivateMutateAsync.mockRejectedValue({
      response: {
        data: { errors: [{ message: "raw", code: "SHARING_AGREEMENT_COEFFICIENT_NOT_IN_AGREEMENT", params: {} }] },
      },
    });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    const outcome = await result.current.deactivateCoefficients("agreement-1", ["c1"]);

    expect(outcome.success).toBe(false);
    if (!outcome.success) expect(outcome.errorMessages).toHaveLength(1);
    expect(mockErrorDispatch).not.toHaveBeenCalled();
    expect(mockSuccessDispatch).not.toHaveBeenCalled();
  });

  it("invalidates every sharing-agreement query for the plant on success", async () => {
    mockDeactivateMutateAsync.mockResolvedValue({ coefficients: [] });
    const { queryClient, Wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper: Wrapper });

    await result.current.deactivateCoefficients("agreement-1", ["c1"]);

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });
});

describe("closeCoefficients", () => {
  beforeEach(() => {
    mockErrorDispatch.mockClear();
    mockSuccessDispatch.mockClear();
    mockCloseMutateAsync.mockClear();
  });

  it("serialises closedOn with .format('YYYY-MM-DD'), never a UTC-converting method — proven by asserting on the request body actually sent", async () => {
    mockCloseMutateAsync.mockResolvedValue({ coefficients: [{ coefficientId: "c1" }] });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    // Local midnight on a fixed date — same hazard as activateCoefficients'
    // appliedOn test: .toISOString() would shift this to the previous day
    // under Europe/Madrid's +1/+2 offset (process.env.TZ set at top of file).
    const localMidnight = dayjs("2026-03-15T00:00:00");

    await result.current.closeCoefficients("agreement-1", ["c1"], localMidnight);

    expect(mockCloseMutateAsync).toHaveBeenCalledWith({
      plantId: "plant-1",
      sharingAgreementId: "agreement-1",
      data: { coefficientIds: ["c1"], closedOn: "2026-03-15" },
    });
  });

  it("treats an empty coefficients response (no-op) as success and dispatches the transient confirmation", async () => {
    mockCloseMutateAsync.mockResolvedValue({ coefficients: [] });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    const outcome = await result.current.closeCoefficients("agreement-1", ["c1"], dayjs("2026-01-10"));

    expect(outcome).toEqual({ success: true });
    expect(mockSuccessDispatch).toHaveBeenCalledWith("Cierre registrado.");
  });

  it("on rejection, returns every translated detail and does not dispatch a toast", async () => {
    mockCloseMutateAsync.mockRejectedValue({
      response: {
        data: { errors: [{ message: "raw", code: "SHARING_AGREEMENT_COEFFICIENT_NOT_ACTIVE", params: { cups: "ES1111111111111111AA" } }] },
      },
    });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    const outcome = await result.current.closeCoefficients("agreement-1", ["c1"], dayjs("2026-01-10"));

    expect(outcome.success).toBe(false);
    if (!outcome.success) expect(outcome.errorMessages).toHaveLength(1);
    expect(mockErrorDispatch).not.toHaveBeenCalled();
    expect(mockSuccessDispatch).not.toHaveBeenCalled();
  });

  it("invalidates every sharing-agreement query for the plant on success", async () => {
    mockCloseMutateAsync.mockResolvedValue({ coefficients: [] });
    const { queryClient, Wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper: Wrapper });

    await result.current.closeCoefficients("agreement-1", ["c1"], dayjs("2026-01-10"));

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });
});

describe("reopenCoefficients", () => {
  beforeEach(() => {
    mockErrorDispatch.mockClear();
    mockSuccessDispatch.mockClear();
    mockReopenMutateAsync.mockClear();
  });

  it("sends coefficientIds only, invalidates the plant subtree, and dispatches the transient confirmation", async () => {
    mockReopenMutateAsync.mockResolvedValue({ coefficients: [{ coefficientId: "c1" }] });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    const outcome = await result.current.reopenCoefficients("agreement-1", ["c1"]);

    expect(mockReopenMutateAsync).toHaveBeenCalledWith({
      plantId: "plant-1",
      sharingAgreementId: "agreement-1",
      data: { coefficientIds: ["c1"] },
    });
    expect(outcome).toEqual({ success: true });
    expect(mockSuccessDispatch).toHaveBeenCalledWith("Coeficiente reabierto.");
  });

  it("treats an empty coefficients response (no-op) as success", async () => {
    mockReopenMutateAsync.mockResolvedValue({ coefficients: [] });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    const outcome = await result.current.reopenCoefficients("agreement-1", ["c1"]);

    expect(outcome).toEqual({ success: true });
  });

  it("on rejection, returns every translated detail and does not dispatch a toast", async () => {
    mockReopenMutateAsync.mockRejectedValue({
      response: {
        data: {
          errors: [{ message: "raw", code: "SHARING_AGREEMENT_COEFFICIENT_HAS_SUCCESSOR", params: { cups: "ES1111111111111111AA" } }],
        },
      },
    });
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper });

    const outcome = await result.current.reopenCoefficients("agreement-1", ["c1"]);

    expect(outcome.success).toBe(false);
    if (!outcome.success) expect(outcome.errorMessages).toHaveLength(1);
    expect(mockErrorDispatch).not.toHaveBeenCalled();
    expect(mockSuccessDispatch).not.toHaveBeenCalled();
  });

  it("invalidates every sharing-agreement query for the plant on success", async () => {
    mockReopenMutateAsync.mockResolvedValue({ coefficients: [] });
    const { queryClient, Wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSharingAgreementCoefficientMutations("plant-1"), { wrapper: Wrapper });

    await result.current.reopenCoefficients("agreement-1", ["c1"]);

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });
});
