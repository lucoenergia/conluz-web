import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    enabled: true,
    contract: {
      validDateFrom: "2020-01-01",
    },
    distributor: {
      name: "Test Distributor",
      code: "D001",
      pointType: 5,
    },
    shelly: {
      macAddress: "AA:BB:CC:DD:EE:FF",
      id: "shelly-1",
      mqttPrefix: "shellies/test",
    },
    user: {
      id: "user1",
      personalId: "12345678A",
      number: 1,
      fullName: "John Doe",
      address: "Calle Test 1",
      email: "john.doe@example.com",
      phoneNumber: "600000000",
      enabled: true,
      memberships: {},
      isPlatformAdmin: false,
    },
  };

  it("renders supply point information", () => {
    render(<SupplyDetailHeader supplyPoint={mockSupplyPoint} />);

    expect(screen.getByText("Test Supply Point")).toBeInTheDocument();
    expect(screen.getByText("Calle Test 123")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("promotes the CUPS into the strip and offers to copy it", () => {
    render(<SupplyDetailHeader supplyPoint={mockSupplyPoint} />);

    expect(screen.getByText("CUPS")).toBeInTheDocument();
    expect(screen.getByText("ES0031300296192001MB0F")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copiar CUPS" })).toBeInTheDocument();
  });

  it("keeps the cadastral reference and the owner behind the details toggle", async () => {
    const user = userEvent.setup();
    render(<SupplyDetailHeader supplyPoint={mockSupplyPoint} />);

    expect(screen.queryByText("Referencia catastral")).not.toBeInTheDocument();
    expect(screen.queryByText("John Doe")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver 2 datos más" }));

    expect(screen.getByText("Referencia catastral")).toBeInTheDocument();
    expect(screen.getByText("REF123456")).toBeInTheDocument();
    expect(screen.getByText("Propietario")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("falls back to the CUPS as the title when the supply has no name", () => {
    render(<SupplyDetailHeader supplyPoint={{ ...mockSupplyPoint, name: null }} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "ES0031300296192001MB0F" }),
    ).toBeInTheDocument();
  });

  it("shows Inactivo chip when supply point is disabled", () => {
    const disabledSupply = { ...mockSupplyPoint, enabled: false };
    render(<SupplyDetailHeader supplyPoint={disabledSupply} />);

    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("renders default texts when supply point data is missing", () => {
    render(<SupplyDetailHeader />);

    expect(screen.getByText("Punto de Suministro")).toBeInTheDocument();
    expect(screen.getByText("Dirección no disponible")).toBeInTheDocument();
  });

  it("names each missing field rather than counting anonymous dashes", async () => {
    const user = userEvent.setup();
    render(<SupplyDetailHeader />);

    // The CUPS has no value, so it has no copy button either.
    expect(screen.getByText("CUPS").parentElement).toHaveTextContent("-");
    expect(screen.queryByRole("button", { name: "Copiar CUPS" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver 2 datos más" }));

    expect(screen.getByText("Referencia catastral").parentElement).toHaveTextContent("-");
    expect(screen.getByText("Propietario").parentElement).toHaveTextContent("-");
  });

  it("renders neither the strip nor the details toggle when loading", () => {
    render(<SupplyDetailHeader supplyPoint={mockSupplyPoint} isLoading={true} />);

    expect(screen.queryByText("CUPS")).not.toBeInTheDocument();
    expect(screen.queryByText("Referencia catastral")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Ver \d+ dato/ })).not.toBeInTheDocument();
  });

  it("renders neither the strip nor the details toggle on error", () => {
    render(<SupplyDetailHeader supplyPoint={mockSupplyPoint} error={new Error("Test error")} />);

    expect(screen.queryByText("CUPS")).not.toBeInTheDocument();
    expect(screen.queryByText("Referencia catastral")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Ver \d+ dato/ })).not.toBeInTheDocument();
  });

  it("does not render status chip when loading", () => {
    render(<SupplyDetailHeader supplyPoint={mockSupplyPoint} isLoading={true} />);

    expect(screen.queryByText("Activo")).not.toBeInTheDocument();
    expect(screen.queryByText("Inactivo")).not.toBeInTheDocument();
  });
});
