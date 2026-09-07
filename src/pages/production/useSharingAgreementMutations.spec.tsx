import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useSharingAgreementMutations } from "./useSharingAgreementMutations";
import {
  getGetSharingAgreementByIdQueryKey,
  getGetSharingAgreementPartitionCoefficientsQueryKey,
  getGetSharingAgreementsQueryKey,
} from "../../api/sharing-agreements/sharing-agreements";

const mockErrorDispatch = vi.fn();
const mockSuccessDispatch = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();
const mockPublishMutateAsync = vi.fn();
const mockRevertMutateAsync = vi.fn();

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
    useCreateSharingAgreement: () => ({ mutateAsync: mockCreateMutateAsync, isPending: false }),
    useUpdateSharingAgreement: () => ({ mutateAsync: mockUpdateMutateAsync, isPending: false }),
    useDeleteSharingAgreement: () => ({ mutateAsync: mockDeleteMutateAsync, isPending: false }),
    usePublishSharingAgreement: () => ({ mutateAsync: mockPublishMutateAsync, isPending: false }),
    useRevertSharingAgreementToDraft: () => ({ mutateAsync: mockRevertMutateAsync, isPending: false }),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function wrapperWithClient(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useSharingAgreementMutations", () => {
  beforeEach(() => {
    mockErrorDispatch.mockClear();
    mockSuccessDispatch.mockClear();
    mockCreateMutateAsync.mockClear();
    mockUpdateMutateAsync.mockClear();
    mockDeleteMutateAsync.mockClear();
    mockPublishMutateAsync.mockClear();
    mockRevertMutateAsync.mockClear();
  });

  it("dispatches a success toast and returns true after deleting an agreement", async () => {
    mockDeleteMutateAsync.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSharingAgreementMutations("plant-1"), { wrapper });

    const success = await result.current.deleteAgreement("agreement-1");

    expect(success).toBe(true);
    expect(mockDeleteMutateAsync).toHaveBeenCalledWith({ plantId: "plant-1", sharingAgreementId: "agreement-1" });
    await waitFor(() => expect(mockSuccessDispatch).toHaveBeenCalledWith("Acuerdo de reparto eliminado correctamente"));
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  it("dispatches an error toast, not a success toast, when deleting fails", async () => {
    mockDeleteMutateAsync.mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() => useSharingAgreementMutations("plant-1"), { wrapper });

    const success = await result.current.deleteAgreement("agreement-1");

    expect(success).toBe(false);
    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
    expect(mockSuccessDispatch).not.toHaveBeenCalled();
  });

  it("publishing invalidates the agreement, the coefficient set and the list", async () => {
    mockPublishMutateAsync.mockResolvedValue(undefined);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSharingAgreementMutations("plant-1"), {
      wrapper: wrapperWithClient(queryClient),
    });

    const success = await result.current.publishAgreement("agreement-1");

    expect(success).toBe(true);
    expect(mockPublishMutateAsync).toHaveBeenCalledWith({ plantId: "plant-1", sharingAgreementId: "agreement-1" });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGetSharingAgreementByIdQueryKey("plant-1", "agreement-1"),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGetSharingAgreementPartitionCoefficientsQueryKey("plant-1", "agreement-1"),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: getGetSharingAgreementsQueryKey("plant-1") });
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  it("dispatches an error toast and returns false when publishing fails", async () => {
    mockPublishMutateAsync.mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() => useSharingAgreementMutations("plant-1"), { wrapper });

    const success = await result.current.publishAgreement("agreement-1");

    expect(success).toBe(false);
    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
  });

  it("reverting to draft invalidates the agreement, the coefficient set and the list", async () => {
    mockRevertMutateAsync.mockResolvedValue(undefined);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSharingAgreementMutations("plant-1"), {
      wrapper: wrapperWithClient(queryClient),
    });

    const success = await result.current.revertAgreementToDraft("agreement-1");

    expect(success).toBe(true);
    expect(mockRevertMutateAsync).toHaveBeenCalledWith({ plantId: "plant-1", sharingAgreementId: "agreement-1" });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGetSharingAgreementByIdQueryKey("plant-1", "agreement-1"),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGetSharingAgreementPartitionCoefficientsQueryKey("plant-1", "agreement-1"),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: getGetSharingAgreementsQueryKey("plant-1") });
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  it("dispatches an error toast and returns false when reverting to draft fails", async () => {
    mockRevertMutateAsync.mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() => useSharingAgreementMutations("plant-1"), { wrapper });

    const success = await result.current.revertAgreementToDraft("agreement-1");

    expect(success).toBe(false);
    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
  });
});
