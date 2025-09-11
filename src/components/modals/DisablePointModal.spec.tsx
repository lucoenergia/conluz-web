import { render, screen, fireEvent } from "@testing-library/react";
import { DisablePointModal } from "./DisablePointModal";

describe("DisablePointModal", () => {
  const mockDisableSupplyPoint = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOnDisable = jest.fn();

  const code = "POINT-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the modal content with code", () => {
    render(
      <DisablePointModal
        isOpen={true}
        code={code}
        disableSupplyPoint={mockDisableSupplyPoint}
        onCancel={mockOnCancel}
        onDisable={mockOnDisable}
      />
    );

    expect(screen.getByText("Deshabilitar punto de suministro")).toBeInTheDocument();
    expect(screen.getByText(code)).toBeInTheDocument();
  });

  it("calls onCancel when Cancelar button is clicked", () => {
    render(
      <DisablePointModal
        isOpen={true}
        code={code}
        disableSupplyPoint={mockDisableSupplyPoint}
        onCancel={mockOnCancel}
        onDisable={mockOnDisable}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockDisableSupplyPoint).not.toHaveBeenCalled();
    expect(mockOnDisable).not.toHaveBeenCalled();
  });

  it("calls disableSupplyPoint and onDisable when Deshabilitar is clicked", () => {
    render(
      <DisablePointModal
        isOpen={true}
        code={code}
        disableSupplyPoint={mockDisableSupplyPoint}
        onCancel={mockOnCancel}
        onDisable={mockOnDisable}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Deshabilitar/i }));

    expect(mockDisableSupplyPoint).toHaveBeenCalledWith(code);
    expect(mockOnDisable).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).not.toHaveBeenCalled();
  });
});
