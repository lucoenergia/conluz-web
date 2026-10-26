import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ConfirmationModal } from "./ConfirmationModal";
import userEvent from "@testing-library/user-event";

describe("ConfirmationModal", () => {
  const mockOnCancel = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setup() {
    render(
      <ConfirmationModal isOpen={true} title="¿Deshabilitar?" confirmLabel="Deshabilitar" onCancel={mockOnCancel} onConfirm={mockOnConfirm}>
        Deshabilitar punto de suministro
      </ConfirmationModal>,
    );
  }

  it("#310 AC2 is a modal dialog named by its title", () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: "¿Deshabilitar?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveTextContent("Deshabilitar punto de suministro");
  });

  it("renders the modal content with code", () => {
    setup();
    expect(screen.getByText("Deshabilitar punto de suministro")).toBeInTheDocument();
  });

  it("calls onCancel when Cancelar button is clicked", async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Cancelar/i }));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it("calls disableSupplyPoint and onConfirm when Deshabilitar is clicked", async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Deshabilitar/i }));

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  describe("#310 AC4 while the confirmed write is in flight", () => {
    function renderInFlight(inFlight: boolean) {
      return render(
        <ConfirmationModal
          isOpen
          title="¿Deshabilitar?"
          confirmLabel="Deshabilitar"
          inFlight={inFlight}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        >
          Deshabilitar punto de suministro
        </ConfirmationModal>,
      );
    }

    // The backdrop has no role or name: MUI renders it as a sibling of the
    // dialog, so its class is the only way to click it.
    const backdrop = () => document.querySelector(".MuiBackdrop-root")!;

    it("cannot be dismissed: Escape, a backdrop click and Cancelar do nothing, and Cancelar is disabled", async () => {
      renderInFlight(true);
      const user = userEvent.setup();
      const dialog = screen.getByRole("dialog", { name: "¿Deshabilitar?" });

      fireEvent.keyDown(dialog, { key: "Escape" });
      await user.click(backdrop());
      const cancel = screen.getByRole("button", { name: "Cancelar" });
      expect(cancel).toBeDisabled();
      // A disabled button takes no pointer events, so userEvent refuses it.
      fireEvent.click(cancel);

      expect(mockOnCancel).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog", { name: "¿Deshabilitar?" })).toBeInTheDocument();
    });

    it("can be dismissed again once the write has settled", async () => {
      const { rerender } = renderInFlight(true);
      rerender(
        <ConfirmationModal
          isOpen
          title="¿Deshabilitar?"
          confirmLabel="Deshabilitar"
          inFlight={false}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        >
          Deshabilitar punto de suministro
        </ConfirmationModal>,
      );
      const user = userEvent.setup();

      fireEvent.keyDown(screen.getByRole("dialog", { name: "¿Deshabilitar?" }), { key: "Escape" });
      await user.click(backdrop());
      await user.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(mockOnCancel).toHaveBeenCalledTimes(3);
    });
  });

  it("keeps the static label by default while pending — confirmPending is opt-in, off unless a caller asks for it", () => {
    render(
      <ConfirmationModal isOpen title="¿Deshabilitar?" confirmLabel="Deshabilitar" confirmDisabled onCancel={mockOnCancel} onConfirm={mockOnConfirm}>
        Deshabilitar punto de suministro
      </ConfirmationModal>,
    );
    expect(screen.getByRole("button", { name: "Deshabilitar" })).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("swaps the visible label for a spinner when confirmPending is set, while keeping the button's accessible name", () => {
    render(
      <ConfirmationModal isOpen title="¿Deshabilitar?" confirmLabel="Deshabilitar" confirmPending onCancel={mockOnCancel} onConfirm={mockOnConfirm}>
        Deshabilitar punto de suministro
      </ConfirmationModal>,
    );
    const confirmButton = screen.getByRole("button", { name: "Deshabilitar" });
    expect(confirmButton).toHaveTextContent("");
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
