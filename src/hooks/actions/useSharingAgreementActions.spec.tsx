import { describe, expect, it, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createTestQueryClient, renderHookWithProviders } from "../../test/renderWithProviders";
import { mutation } from "../../test/queryState";
import { buildSharingAgreement, buildSharingAgreementCapabilities } from "../../test/fixtures";
import { useSharingAgreementActions } from "./useSharingAgreementActions";
import type { SharingAgreementResponse } from "../../api/models";
import {
  getGetSharingAgreementByIdQueryKey,
  getGetSharingAgreementPartitionCoefficientsQueryKey,
  getGetSharingAgreementsQueryKey,
  useDeleteSharingAgreement,
  useGenerateSharingAgreementDistributorFile,
  usePublishSharingAgreement,
  useRevertSharingAgreementToDraft,
  useUpdateSharingAgreement,
  useUploadSharingAgreementFile,
} from "../../api/sharing-agreements/sharing-agreements";
import { downloadSharingAgreementFile, triggerBrowserDownload } from "../../components/SharingAgreementFilePanel/downloadSharingAgreementFile";

const mockErrorDispatch = vi.fn();
const mockSuccessDispatch = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();
const mockPublishMutateAsync = vi.fn();
const mockRevertMutateAsync = vi.fn();
const mockUploadMutateAsync = vi.fn();
const mockGenerateMutateAsync = vi.fn();

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
  useUpdateSharingAgreement: vi.fn(),
  useDeleteSharingAgreement: vi.fn(),
  usePublishSharingAgreement: vi.fn(),
  useRevertSharingAgreementToDraft: vi.fn(),
  useUploadSharingAgreementFile: vi.fn(),
  useGenerateSharingAgreementDistributorFile: vi.fn(),
}));

// Not a generated hook: the download goes through AXIOS_INSTANCE directly, and
// triggerBrowserDownload touches the DOM, so both are replaced.
vi.mock(import("../../components/SharingAgreementFilePanel/downloadSharingAgreementFile"), async (importOriginal) => ({
  ...(await importOriginal()),
  downloadSharingAgreementFile: vi.fn(),
  triggerBrowserDownload: vi.fn(),
}));

const MANAGEABLE = buildSharingAgreementCapabilities({ canRead: true, canManage: true });
const READ_ONLY = buildSharingAgreementCapabilities({ canRead: true, canManage: false });

const agreement = (capabilities = MANAGEABLE) =>
  buildSharingAgreement({ id: "agreement-1", plantId: "plant-1", capabilities });

// Not a default parameter: `undefined` is a case under test (the agreement has
// not arrived yet), and a default would quietly substitute a real one.
function renderActions(
  resource: SharingAgreementResponse | undefined = agreement(),
  queryClient?: ReturnType<typeof createTestQueryClient>,
) {
  return renderHookWithProviders(() => useSharingAgreementActions("plant-1").forAgreement(resource), { queryClient });
}

function renderActionsWithoutAgreement() {
  return renderHookWithProviders(() => useSharingAgreementActions("plant-1").forAgreement(undefined));
}

describe("useSharingAgreementActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUpdateSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync: mockUpdateMutateAsync }));
    vi.mocked(useDeleteSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync: mockDeleteMutateAsync }));
    vi.mocked(usePublishSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync: mockPublishMutateAsync }));
    vi.mocked(useRevertSharingAgreementToDraft).mockReturnValue(mutation.idle({ mutateAsync: mockRevertMutateAsync }));
    vi.mocked(useUploadSharingAgreementFile).mockReturnValue(mutation.idle({ mutateAsync: mockUploadMutateAsync }));
    vi.mocked(useGenerateSharingAgreementDistributorFile).mockReturnValue(
      mutation.idle({ mutateAsync: mockGenerateMutateAsync }),
    );
  });

  describe("what the caller is handed", () => {
    it("hands over every write when the agreement reports canManage", () => {
      const { result } = renderActions();

      expect(result.current.actions.update).toBeDefined();
      expect(result.current.actions.remove).toBeDefined();
      expect(result.current.actions.publish).toBeDefined();
      expect(result.current.actions.revertToDraft).toBeDefined();
      expect(result.current.actions.uploadFile).toBeDefined();
      expect(result.current.actions.generateFile).toBeDefined();
    });

    it("withholds every write when the agreement does not report canManage", () => {
      const { result } = renderActions(agreement(READ_ONLY));

      expect(result.current.actions.update).toBeUndefined();
      expect(result.current.actions.remove).toBeUndefined();
      expect(result.current.actions.publish).toBeUndefined();
      expect(result.current.actions.revertToDraft).toBeUndefined();
      expect(result.current.actions.uploadFile).toBeUndefined();
      expect(result.current.actions.generateFile).toBeUndefined();
      expect(result.current.outcomes.update).toEqual({ state: "denied" });
    });

    it("gates the download on canRead, which a caller who may not manage still has", () => {
      const { result } = renderActions(agreement(READ_ONLY));

      expect(result.current.actions.downloadFile).toBeDefined();
    });

    it("withholds everything, as pending rather than denied, while the agreement has not arrived", () => {
      const { result } = renderActionsWithoutAgreement();

      expect(result.current.actions.update).toBeUndefined();
      expect(result.current.actions.downloadFile).toBeUndefined();
      expect(result.current.outcomes.update).toEqual({ state: "pending" });
      expect(result.current.outcomes.downloadFile).toEqual({ state: "pending" });
    });
  });

  describe("deleting", () => {
    it("dispatches a success toast and returns true after deleting an agreement", async () => {
      mockDeleteMutateAsync.mockResolvedValue(undefined);
      const { result } = renderActions();

      const success = await result.current.actions.remove!.run();

      expect(success).toBe(true);
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith({ plantId: "plant-1", sharingAgreementId: "agreement-1" });
      await waitFor(() => expect(mockSuccessDispatch).toHaveBeenCalledWith("Acuerdo de reparto eliminado correctamente"));
      expect(mockErrorDispatch).not.toHaveBeenCalled();
    });

    it("removes the agreement from the cache rather than invalidating it", async () => {
      mockDeleteMutateAsync.mockResolvedValue(undefined);
      const queryClient = createTestQueryClient();
      const removeSpy = vi.spyOn(queryClient, "removeQueries");
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderActions(agreement(), queryClient);

      await result.current.actions.remove!.run();

      expect(removeSpy).toHaveBeenCalledWith({
        queryKey: getGetSharingAgreementByIdQueryKey("plant-1", "agreement-1"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: getGetSharingAgreementsQueryKey("plant-1") });
      expect(invalidateSpy).not.toHaveBeenCalledWith({
        queryKey: getGetSharingAgreementByIdQueryKey("plant-1", "agreement-1"),
      });
    });

    it("dispatches an error toast, not a success toast, when deleting fails", async () => {
      mockDeleteMutateAsync.mockRejectedValue(new Error("network error"));
      const { result } = renderActions();

      const success = await result.current.actions.remove!.run();

      expect(success).toBe(false);
      await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
      expect(mockSuccessDispatch).not.toHaveBeenCalled();
    });
  });

  describe("lifecycle transitions", () => {
    it("publishing invalidates the agreement, the coefficient set and the list", async () => {
      mockPublishMutateAsync.mockResolvedValue(undefined);
      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderActions(agreement(), queryClient);

      const success = await result.current.actions.publish!.run();

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
      const { result } = renderActions();

      const success = await result.current.actions.publish!.run();

      expect(success).toBe(false);
      await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
    });

    it("reverting to draft invalidates the agreement, the coefficient set and the list", async () => {
      mockRevertMutateAsync.mockResolvedValue(undefined);
      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderActions(agreement(), queryClient);

      const success = await result.current.actions.revertToDraft!.run();

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
      const { result } = renderActions();

      const success = await result.current.actions.revertToDraft!.run();

      expect(success).toBe(false);
      await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
    });
  });

  describe("updating the agreement's own fields", () => {
    it("invalidates the agreement and the list", async () => {
      mockUpdateMutateAsync.mockResolvedValue(undefined);
      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderActions(agreement(), queryClient);

      const success = await result.current.actions.update!.run({ name: "Nuevo nombre", installedPowerKw: 45 });

      expect(success).toBe(true);
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        plantId: "plant-1",
        sharingAgreementId: "agreement-1",
        data: { name: "Nuevo nombre", installedPowerKw: 45 },
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getGetSharingAgreementByIdQueryKey("plant-1", "agreement-1"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: getGetSharingAgreementsQueryKey("plant-1") });
    });

    it("dispatches an error toast and returns false when updating fails", async () => {
      mockUpdateMutateAsync.mockRejectedValue(new Error("network error"));
      const { result } = renderActions();

      expect(await result.current.actions.update!.run({ name: "x", installedPowerKw: 45 })).toBe(false);
      await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
    });
  });

  describe("the file", () => {
    const file = new File(["contents"], "reparto.txt", { type: "text/plain" });

    it("invalidates the coefficient set and the agreement after an import", async () => {
      mockUploadMutateAsync.mockResolvedValue(undefined);
      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderActions(agreement(), queryClient);

      const outcome = await result.current.actions.uploadFile!.run(file);

      expect(outcome).toEqual({ success: true });
      expect(mockUploadMutateAsync).toHaveBeenCalledWith({
        plantId: "plant-1",
        sharingAgreementId: "agreement-1",
        data: { file },
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getGetSharingAgreementPartitionCoefficientsQueryKey("plant-1", "agreement-1"),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getGetSharingAgreementByIdQueryKey("plant-1", "agreement-1"),
      });
    });

    it("hands a 400's per-line details back instead of raising a toast, so the dialog can list them", async () => {
      mockUploadMutateAsync.mockRejectedValue({
        response: { status: 400, data: { errors: [{ code: "SHARING_AGREEMENT_FILE_INVALID_LINE", message: "Línea 3" }] } },
      });
      const { result } = renderActions();

      const outcome = await result.current.actions.uploadFile!.run(file);

      expect(outcome.success).toBe(false);
      expect(outcome.success === false && outcome.groupedErrors).not.toBeNull();
      expect(mockErrorDispatch).not.toHaveBeenCalled();
    });

    it("raises a toast and reports no grouped details for a failure that is not a 400", async () => {
      mockUploadMutateAsync.mockRejectedValue({ response: { status: 500 } });
      const { result } = renderActions();

      const outcome = await result.current.actions.uploadFile!.run(file);

      expect(outcome).toEqual({ success: false, groupedErrors: null });
      await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
    });

    it("returns the generated blob for the caller to save", async () => {
      const blob = new Blob(["TXT"]);
      mockGenerateMutateAsync.mockResolvedValue(blob);
      const { result } = renderActions();

      expect(await result.current.actions.generateFile!.run(2026)).toBe(blob);
      expect(mockGenerateMutateAsync).toHaveBeenCalledWith({
        plantId: "plant-1",
        sharingAgreementId: "agreement-1",
        data: { year: 2026 },
      });
    });

    it("dispatches an error toast and returns nothing when generating fails", async () => {
      mockGenerateMutateAsync.mockRejectedValue(new Error("network error"));
      const { result } = renderActions();

      expect(await result.current.actions.generateFile!.run(2026)).toBeUndefined();
      await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
    });

    it("saves the imported file under the name the response carries", async () => {
      const blob = new Blob(["TXT"]);
      vi.mocked(downloadSharingAgreementFile).mockResolvedValue({ blob, filename: "ES1234_2026.txt" });
      const { result } = renderActions();

      expect(await result.current.actions.downloadFile!.run()).toBe(true);
      expect(downloadSharingAgreementFile).toHaveBeenCalledWith("plant-1", "agreement-1");
      expect(triggerBrowserDownload).toHaveBeenCalledWith(blob, "ES1234_2026.txt");
    });

    it("dispatches an error toast and returns false when the download fails", async () => {
      vi.mocked(downloadSharingAgreementFile).mockRejectedValue(new Error("network error"));
      const { result } = renderActions();

      expect(await result.current.actions.downloadFile!.run()).toBe(false);
      await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
      expect(triggerBrowserDownload).not.toHaveBeenCalled();
    });
  });
});
