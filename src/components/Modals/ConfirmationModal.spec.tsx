import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
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
      <ConfirmationModal isOpen={true} confirmLabel="Deshabilitar" onCancel={mockOnCancel} onConfirm={mockOnConfirm}>
        Deshabilitar punto de suministro
      </ConfirmationModal>,
    );
  }

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
});
