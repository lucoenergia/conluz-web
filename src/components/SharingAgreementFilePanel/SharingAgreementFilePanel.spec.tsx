import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { SharingAgreementFilePanel } from "./SharingAgreementFilePanel";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponseStatus as StatusValue } from "../../api/models";

const mockErrorDispatch = vi.fn();
const mockDownload = vi.fn();

vi.mock("../../context/error.context", () => ({
  useErrorDispatch: () => mockErrorDispatch,
}));

vi.mock("./downloadSharingAgreementFile", () => ({
  downloadSharingAgreementFile: (...args: unknown[]) => mockDownload(...args),
}));

function renderPanel(agreementStatus: StatusValue = SharingAgreementResponseStatus.PUBLISHED) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <SharingAgreementFilePanel plantId="plant-1" sharingAgreementId="agreement-1" agreementStatus={agreementStatus} />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe("SharingAgreementFilePanel", () => {
  beforeEach(() => {
    mockErrorDispatch.mockClear();
    mockDownload.mockClear();
  });

  it("always shows the download action by default — never probes on load", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: "Descargar fichero" })).toBeInTheDocument();
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it("does not render any filename, date, or source metadata", () => {
    renderPanel();
    expect(screen.queryByText(/Distribuidora/)).not.toBeInTheDocument();
  });

  it("calls the download function only on click, not before", async () => {
    mockDownload.mockResolvedValue({ blob: new Blob(["x"]), filename: "reparto.pdf" });
    const user = userEvent.setup();
    renderPanel();

    expect(mockDownload).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Descargar fichero" }));

    await waitFor(() => expect(mockDownload).toHaveBeenCalledWith("plant-1", "agreement-1"));
  });

  it("on a 404, shows DRAFT-specific copy in place of the button, never a toast", async () => {
    mockDownload.mockRejectedValue({ response: { status: 404 } });
    const user = userEvent.setup();
    renderPanel(SharingAgreementResponseStatus.DRAFT);

    await user.click(screen.getByRole("button", { name: "Descargar fichero" }));

    expect(await screen.findByText(/todavía no tiene un fichero adjunto/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Descargar fichero" })).not.toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  it("on a 404 for a PUBLISHED agreement, shows the 'anterior al sistema' copy", async () => {
    mockDownload.mockRejectedValue({ response: { status: 404 } });
    const user = userEvent.setup();
    renderPanel(SharingAgreementResponseStatus.PUBLISHED);

    await user.click(screen.getByRole("button", { name: "Descargar fichero" }));

    expect(await screen.findByText(/anterior al sistema/)).toBeInTheDocument();
    expect(mockErrorDispatch).not.toHaveBeenCalled();
  });

  it("on a non-404 error, dispatches a toast and keeps the button clickable", async () => {
    mockDownload.mockRejectedValue({ response: { status: 500 } });
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Descargar fichero" }));

    await waitFor(() => expect(mockErrorDispatch).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Descargar fichero" })).toBeInTheDocument();
  });
});
