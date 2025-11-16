import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SupplyDetailHeader } from "./SupplyDetailHeader";
import type { SupplyResponse } from "../../api/models";

describe("SupplyDetailHeader", () => {
  const mockSupplyPoint: SupplyResponse = {
    id: "1",
    name: "Test Supply Point",
    code: "ES0031300296192001MB0F",
    address: "Calle Test 123",
    addressRef: "REF123456",
    partitionCoefficient: 0.25,
    enabled: true,
    user: {
      id: "user1",
      fullName: "John Doe",
    },
  };

  it("renders supply point information", () => {
    render(<SupplyDetailHeader supplyPoint={mockSupplyPoint} />);

    expect(screen.getByText("Test Supply Point")).toBeInTheDocument();
    expect(screen.getByText("Calle Test 123")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("renders supply details grid with CUPS, address ref, coefficient, and owner", () => {
    render(<SupplyDetailHeader supplyPoint={mockSupplyPoint} />);

    expect(screen.getByText("CUPS")).toBeInTheDocument();
    expect(screen.getByText("ES0031300296192001MB0F")).toBeInTheDocument();

    expect(screen.getByText("Referencia catastral")).toBeInTheDocument();
    expect(screen.getByText("REF123456")).toBeInTheDocument();

    expect(screen.getByText("Coeficiente de reparto")).toBeInTheDocument();
    expect(screen.getByText("25.00%")).toBeInTheDocument();

    expect(screen.getByText("Propietario")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("shows Inactivo chip when supply point is disabled", () => {
    const disabledSupply = { ...mockSupplyPoint, enabled: false };
    render(<SupplyDetailHeader supplyPoint={disabledSupply} />);

    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("renders default texts when supply point data is missing", () => {
    render(<SupplyDetailHeader supplyPoint={{}} />);

    expect(screen.getByText("Punto de Suministro")).toBeInTheDocument();
    expect(screen.getByText("Dirección no disponible")).toBeInTheDocument();
  });

  it("renders placeholders for missing supply details", () => {
    render(<SupplyDetailHeader supplyPoint={{}} />);

    // Should render 4 dashes for missing data
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });

  it("does not render details grid when loading", () => {
    render(<SupplyDetailHeader supplyPoint={mockSupplyPoint} isLoading={true} />);

    expect(screen.queryByText("CUPS")).not.toBeInTheDocument();
    expect(screen.queryByText("Referencia catastral")).not.toBeInTheDocument();
  });

  it("does not render details grid when error", () => {
    render(<SupplyDetailHeader supplyPoint={mockSupplyPoint} error={new Error("Test error")} />);

    expect(screen.queryByText("CUPS")).not.toBeInTheDocument();
    expect(screen.queryByText("Referencia catastral")).not.toBeInTheDocument();
  });

  it("does not render status chip when loading", () => {
    render(<SupplyDetailHeader supplyPoint={mockSupplyPoint} isLoading={true} />);

    expect(screen.queryByText("Activo")).not.toBeInTheDocument();
    expect(screen.queryByText("Inactivo")).not.toBeInTheDocument();
  });
});
