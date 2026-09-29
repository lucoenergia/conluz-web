import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { getGroupedApiErrorDetails } from "../../errors/apiErrorCatalogue";
import { SharingAgreementUploadDialog } from "./SharingAgreementUploadDialog";

const mockRun = vi.fn();

function renderDialog(regulatoryCode: string | undefined, onUploadSuccess?: () => void) {
  return renderWithProviders(
    <SharingAgreementUploadDialog
      isOpen
      uploadFile={{ run: mockRun, isPending: false }}
      regulatoryCode={regulatoryCode}
      onClose={vi.fn()}
      onUploadSuccess={onUploadSuccess}
    />,
  );
}

describe("SharingAgreementUploadDialog", () => {
  beforeEach(() => {
    mockRun.mockClear();
  });

  it("idle state states the expected filename with the plant's actual regulatory code, and warns of full replacement", () => {
    renderDialog("CAU0001");
    expect(screen.getByText(/CAU0001_AAAA\.txt/)).toBeInTheDocument();
    expect(screen.getByText(/sustituye por completo/)).toBeInTheDocument();
  });

  it("titles the dialog as importing a file you already have, never as the distributor's file", () => {
    renderDialog("CAU0001");
    expect(screen.getByRole("heading", { name: "Importar un fichero que ya tengas" })).toBeInTheDocument();
    expect(screen.queryByText(/de la distribuidora/)).not.toBeInTheDocument();
  });

  it("when the plant has no regulatory code, explains the fix is on the plant and shows no file picker", () => {
    renderDialog(undefined);
    expect(screen.getByText(/no tiene código regulatorio/)).toBeInTheDocument();
    expect(screen.queryByText(/de la distribuidora/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Seleccionar fichero" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Subir fichero" })).not.toBeInTheDocument();
  });

  it("renders the rejected-lines screen when the action hands back grouped errors, without importing anything", async () => {
    mockRun.mockResolvedValue({
      success: false,
      groupedErrors: getGroupedApiErrorDetails({
        response: {
          status: 400,
          data: {
            errors: [
              { message: "raw", code: "DISTRIBUTOR_FILE_COEFFICIENT_SUM_INVALID" },
              { message: "raw", code: "DISTRIBUTOR_FILE_CUPS_UNKNOWN", params: { line: "3", cups: "ES1" } },
            ],
          },
        },
      }),
    });
    const user = userEvent.setup();
    renderDialog("CAU0001");

    const file = new File(["CUPS;0,5"], "CAU0001_2026.txt", { type: "text/plain" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    await user.click(screen.getByRole("button", { name: "Subir fichero" }));

    expect(await screen.findByText("Errores del fichero")).toBeInTheDocument();
    expect(screen.getByText("Errores por línea")).toBeInTheDocument();
    expect(screen.getByText(/no se ha modificado ningún coeficiente/i)).toBeInTheDocument();
  });

  it("calls onUploadSuccess after a successful upload", async () => {
    mockRun.mockResolvedValue({ success: true });
    const onUploadSuccess = vi.fn();
    const user = userEvent.setup();
    renderDialog("CAU0001", onUploadSuccess);

    const file = new File(["CUPS;0,5"], "CAU0001_2026.txt", { type: "text/plain" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    await user.click(screen.getByRole("button", { name: "Subir fichero" }));

    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalled());
  });

  // The toast for a failure with no per-line detail belongs to the actions
  // layer, which is where it is asserted; this dialog owes the file picker back.
  it("stays on the file picker when the action reports a failure it cannot list", async () => {
    mockRun.mockResolvedValue({ success: false, groupedErrors: null });
    const user = userEvent.setup();
    renderDialog("CAU0001");

    const file = new File(["x"], "CAU0001_2026.txt", { type: "text/plain" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    await user.click(screen.getByRole("button", { name: "Subir fichero" }));

    await waitFor(() => expect(mockRun).toHaveBeenCalledWith(file));
    expect(screen.queryByText("Errores del fichero")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Subir fichero" })).toBeInTheDocument();
  });
});
