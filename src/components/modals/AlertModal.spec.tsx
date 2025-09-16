import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AlertModal } from "./AlertModal";
import userEvent from "@testing-library/user-event";

describe("DisablePointModal", () => {
  const mockOnClose = vi.fn();


  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setup() {
    render(
      <AlertModal
        isOpen={true}
        onClose={mockOnClose}
      >
        Texto del modal
      </AlertModal>
    );
  }

  it("renders the modal content with children", () => {
    setup();
    expect(screen.getByText("Texto del modal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cerrar/i })).toBeInTheDocument();
  });

  it("calls onClose when Cerrar button is clicked", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: /Cerrar/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
