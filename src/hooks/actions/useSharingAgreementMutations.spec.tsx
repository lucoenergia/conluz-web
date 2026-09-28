import { describe, expect, it, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createTestQueryClient, renderHookWithProviders } from "../../test/renderWithProviders";
import { mutation } from "../../test/queryState";
import { useSharingAgreementMutations } from "./useSharingAgreementMutations";
import {
  getGetSharingAgreementByIdQueryKey,
  getGetSharingAgreementPartitionCoefficientsQueryKey,
  getGetSharingAgreementsQueryKey,
  useCreateSharingAgreement,
  useDeleteSharingAgreement,
  usePublishSharingAgreement,
  useRevertSharingAgreementToDraft,
  useUpdateSharingAgreement,
} from "../../api/sharing-agreements/sharing-agreements";

const mockErrorDispatch = vi.fn();
const mockSuccessDispatch = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();
const mockPublishMutateAsync = vi.fn();
const mockRevertMutateAsync = vi.fn();

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock(import("../../context/success.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useSuccessDispatch: () => mockSuccessDispatch,
}));

// The real module is kept for its query-key getters; only the mutation hooks are replaced.
vi.mock(import("../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreateSharingAgreement: vi.fn(),
  useUpdateSharingAgreement: vi.fn(),
  useDeleteSharingAgreement: vi.fn(),
  usePublishSharingAgreement: vi.fn(),
  useRevertSharingAgreementToDraft: vi.fn(),
}));

describe("useSharingAgreementMutations", () => {
  beforeEach(() => {
    mockErrorDispatch.mockClear();
    mockSuccessDispatch.mockClear();
    mockCreateMutateAsync.mockClear();
    mockUpdateMutateAsync.mockClear();
    mockDeleteMutateAsync.mockClear();
    mockPublishMutateAsync.mockClear();
    mockRevertMutateAsync.mockClear();
    vi.mocked(useCreateSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync: mockCreateMutateAsync }));
    vi.mocked(useUpdateSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync: mockUpdateMutateAsync }));
    vi.mocked(useDeleteSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync: mockDeleteMutateAsync }));
    vi.mocked(usePublishSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync: mockPublishMutateAsync }));
    vi.mocked(useRevertSharingAgreementToDraft).mockReturnValue(mutation.idle({ mutateAsync: mockRevertMutateAsync }));
  });

  it("dispatches a success toast and returns true after deleting an agreement", async () => {
    mockDeleteMutateAsync.mockResolvedValue(undefined);
    const { result } = renderHookWithProviders(() => useSharingAgreementMutations("plant-1"));

    const success = await result.current.deleteAgreement("agreement-1");

    expect(success).toBe(true);
    expect(mockDeleteMutateAsync).toHaveBeenCalledWith({ plantId: "plant-1", sharingAgreementId: "agreement-1" });
    await waitFor(() => expect(mockSuccessDispatch).toHaveBeenCalledWith("Acuerdo de reparto eliminado correctamente"));
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  it("dispatches an error toast, not a success toast, when deleting fails", async () => {
    mockDeleteMutateAsync.mockRejectedValue(new Error("network error"));
    const { result } = renderHookWithProviders(() => useSharingAgreementMutations("plant-1"));

    const success = await result.current.deleteAgreement("agreement-1");

    expect(success).toBe(false);
    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
    expect(mockSuccessDispatch).not.toHaveBeenCalled();
  });

  it("publishing invalidates the agreement, the coefficient set and the list", async () => {
    mockPublishMutateAsync.mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHookWithProviders(() => useSharingAgreementMutations("plant-1"), {
      queryClient,
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
    const { result } = renderHookWithProviders(() => useSharingAgreementMutations("plant-1"));

    const success = await result.current.publishAgreement("agreement-1");

    expect(success).toBe(false);
    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
  });

  it("reverting to draft invalidates the agreement, the coefficient set and the list", async () => {
    mockRevertMutateAsync.mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHookWithProviders(() => useSharingAgreementMutations("plant-1"), {
      queryClient,
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
    const { result } = renderHookWithProviders(() => useSharingAgreementMutations("plant-1"));

    const success = await result.current.revertAgreementToDraft("agreement-1");

    expect(success).toBe(false);
    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
  });
});
