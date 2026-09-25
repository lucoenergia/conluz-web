import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation } from "../../test/queryState";
import { useGenerateSharingAgreementDistributorFile } from "../../api/sharing-agreements/sharing-agreements";
import { SharingAgreementGenerateDialog } from "./SharingAgreementGenerateDialog";

const mockErrorDispatch = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock(import("../../context/error.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock(import("../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGenerateSharingAgreementDistributorFile: vi.fn(),
}));

function renderDialog(onGenerateSuccess?: () => void) {
  vi.mocked(useGenerateSharingAgreementDistributorFile).mockReturnValue(mutation.idle({ mutateAsync: mockMutateAsync }));
  return renderWithProviders(
    <SharingAgreementGenerateDialog
      isOpen
      plantId="plant-1"
      sharingAgreementId="agreement-1"
      regulatoryCode="CAU0001"
      onClose={vi.fn()}
      onGenerateSuccess={onGenerateSuccess}
    />,
  );
}

describe("SharingAgreementGenerateDialog", () => {
  const currentYear = new Date().getFullYear();

  beforeEach(() => {
    mockErrorDispatch.mockClear();
    mockMutateAsync.mockClear();
    // jsdom has no createObjectURL/revokeObjectURL implementation.
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() });
  });

  it("pre-fills the year field with the current year and states the resulting filename", () => {
    renderDialog();
    expect(screen.getByLabelText("Año")).toHaveValue(currentYear);
    expect(screen.getByText(`CAU0001_${currentYear}.txt`)).toBeInTheDocument();
  });

  it("disables Generar and shows an error when the year is out of range", async () => {
    const user = userEvent.setup();
    renderDialog();

    const yearField = screen.getByLabelText("Año");
    await user.clear(yearField);
    await user.type(yearField, "1999");

    expect(screen.getByRole("button", { name: "Generar" })).toBeDisabled();
    expect(screen.getByText(/Introduce un año entre 2000 y 2100/)).toBeInTheDocument();
  });

  it("calls the mutation with the current year on confirm and reports success", async () => {
    mockMutateAsync.mockResolvedValue(new Blob(["fake"]));
    const onGenerateSuccess = vi.fn();
    const user = userEvent.setup();
    renderDialog(onGenerateSuccess);

    await user.click(screen.getByRole("button", { name: "Generar" }));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        plantId: "plant-1",
        sharingAgreementId: "agreement-1",
        data: { year: currentYear },
      }),
    );
    await waitFor(() => expect(onGenerateSuccess).toHaveBeenCalled());
  });

  it("on error, dispatches a toast and keeps the dialog open", async () => {
    mockMutateAsync.mockRejectedValue({ response: { status: 409 } });
    const onGenerateSuccess = vi.fn();
    const user = userEvent.setup();
    renderDialog(onGenerateSuccess);

    await user.click(screen.getByRole("button", { name: "Generar" }));

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
    expect(onGenerateSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Generar" })).toBeInTheDocument();
  });
});
