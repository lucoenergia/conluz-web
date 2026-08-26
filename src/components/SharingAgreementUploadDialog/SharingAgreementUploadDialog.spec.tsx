import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { SharingAgreementUploadDialog } from "./SharingAgreementUploadDialog";

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
    useUploadSharingAgreementFile: () => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
      reset: vi.fn(),
    }),
  };
});

function renderDialog(regulatoryCode: string | undefined) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <SharingAgreementUploadDialog
          isOpen
          plantId="plant-1"
          sharingAgreementId="agreement-1"
          regulatoryCode={regulatoryCode}
          onClose={vi.fn()}
        />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe("SharingAgreementUploadDialog", () => {
  beforeEach(() => {
    mockErrorDispatch.mockClear();
    mockMutateAsync.mockClear();
  });

  it("idle state states the expected filename with the plant's actual regulatory code, and warns of full replacement", () => {
    renderDialog("CAU0001");
    expect(screen.getByText(/CAU0001_AAAA\.txt/)).toBeInTheDocument();
    expect(screen.getByText(/sustituye por completo/)).toBeInTheDocument();
  });

  it("when the plant has no regulatory code, explains the fix is on the plant and shows no file picker", () => {
    renderDialog(undefined);
    expect(screen.getByText(/no tiene código regulatorio/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Seleccionar fichero" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Subir fichero" })).not.toBeInTheDocument();
  });

  it("renders the rejected-lines screen on a 400, grouped into file-level and line-level errors, without importing anything", async () => {
    mockMutateAsync.mockRejectedValue({
      response: {
        status: 400,
        data: {
          errors: [
            { message: "raw", code: "DISTRIBUTOR_FILE_COEFFICIENT_SUM_INVALID" },
            { message: "raw", code: "DISTRIBUTOR_FILE_CUPS_UNKNOWN", params: { line: "3", cups: "ES1" } },
          ],
        },
      },
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
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  it("on a non-400 error, dispatches a toast and stays on the file picker", async () => {
    mockMutateAsync.mockRejectedValue({ response: { status: 409 } });
    const user = userEvent.setup();
    renderDialog("CAU0001");

    const file = new File(["x"], "CAU0001_2026.txt", { type: "text/plain" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    await user.click(screen.getByRole("button", { name: "Subir fichero" }));

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
    expect(screen.queryByText("Errores del fichero")).not.toBeInTheDocument();
  });
});
