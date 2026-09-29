import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { SharingAgreementGenerateDialog } from "./SharingAgreementGenerateDialog";

const mockRun = vi.fn();

function renderDialog(onGenerateSuccess?: () => void, isPending = false) {
  return renderWithProviders(
    <SharingAgreementGenerateDialog
      isOpen
      generateFile={{ run: mockRun, isPending }}
      regulatoryCode="CAU0001"
      onClose={vi.fn()}
      onGenerateSuccess={onGenerateSuccess}
    />,
  );
}

describe("SharingAgreementGenerateDialog", () => {
  const currentYear = new Date().getFullYear();

  beforeEach(() => {
    mockRun.mockClear();
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

  it("runs the action with the current year on confirm and reports success", async () => {
    mockRun.mockResolvedValue(new Blob(["fake"]));
    const onGenerateSuccess = vi.fn();
    const user = userEvent.setup();
    renderDialog(onGenerateSuccess);

    await user.click(screen.getByRole("button", { name: "Generar" }));

    await waitFor(() => expect(mockRun).toHaveBeenCalledWith(currentYear));
    await waitFor(() => expect(onGenerateSuccess).toHaveBeenCalled());
  });

  // The toast belongs to the actions layer now, which is where it is asserted;
  // what this dialog owes on failure is to stay open with the year still typed.
  it("keeps the dialog open and reports nothing when the action produces no file", async () => {
    mockRun.mockResolvedValue(undefined);
    const onGenerateSuccess = vi.fn();
    const user = userEvent.setup();
    renderDialog(onGenerateSuccess);

    await user.click(screen.getByRole("button", { name: "Generar" }));

    await waitFor(() => expect(mockRun).toHaveBeenCalled());
    expect(onGenerateSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Generar" })).toBeInTheDocument();
  });

  it("reports the action's pending state on its own button", () => {
    renderDialog(undefined, true);

    expect(screen.getByRole("button", { name: "Generando…" })).toBeDisabled();
  });
});
