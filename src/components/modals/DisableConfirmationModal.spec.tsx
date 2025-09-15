import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { DisableConfirmationModal } from "./DisableConfirmationModal";

describe("DisablePointModal", () => {
  const mockOnClose = vi.fn();

  const code = "POINT-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the modal content with code", () => {
    render(
      <DisableConfirmationModal
        isOpen={true}
        code={code}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText(code)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cerrar/i })).toBeInTheDocument();
  });

  it("calls onClose when Cerrar button is clicked", () => {
    render(
      <DisableConfirmationModal
        isOpen={true}
        code={code}
        onClose={mockOnClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Cerrar/i }));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
