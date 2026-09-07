import "@testing-library/jest-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { SharingAgreementGenerateDialog } from "./SharingAgreementGenerateDialog";

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
    useGenerateSharingAgreementDistributorFile: () => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
      reset: vi.fn(),
    }),
  };
});

function renderDialog(onGenerateSuccess?: () => void) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <SharingAgreementGenerateDialog
          isOpen
          plantId="plant-1"
          sharingAgreementId="agreement-1"
          regulatoryCode="CAU0001"
          onClose={vi.fn()}
          onGenerateSuccess={onGenerateSuccess}
        />
      </ThemeProvider>
    </QueryClientProvider>,
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
