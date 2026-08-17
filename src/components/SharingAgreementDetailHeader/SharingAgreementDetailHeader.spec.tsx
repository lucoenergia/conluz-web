import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SharingAgreementDetailHeader } from "./SharingAgreementDetailHeader";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { PlantResponse, SharingAgreementResponse } from "../../api/models";

describe("SharingAgreementDetailHeader", () => {
  const mockAgreement: SharingAgreementResponse = {
    id: "agreement-1",
    name: "Acuerdo Comunidad Sur",
    status: SharingAgreementResponseStatus.PUBLISHED,
    installedPowerKw: 42.5,
    createdAt: "2024-05-23T10:30:00Z",
    notes: "Revisión anual pendiente",
  };

  const mockPlant: PlantResponse = {
    id: "plant-1",
    regulatoryCode: "ES0031300296192001MB",
  };

  it("renders agreement name, CAU and tiles", () => {
    render(<SharingAgreementDetailHeader agreement={mockAgreement} plant={mockPlant} />);

    expect(screen.getByText("Acuerdo Comunidad Sur")).toBeInTheDocument();
    expect(screen.getByText("CAU: ES0031300296192001MB")).toBeInTheDocument();
    expect(screen.getByText("Vigente")).toBeInTheDocument();
    expect(screen.getByText("23 de mayo de 2024")).toBeInTheDocument();
    expect(screen.getByText("42.5 kW")).toBeInTheDocument();
    expect(screen.getByText("Revisión anual pendiente")).toBeInTheDocument();
  });

  it("renders default texts and CAU fallback when data is missing", () => {
    render(<SharingAgreementDetailHeader agreement={{}} plant={{}} />);

    expect(screen.getByText("Acuerdo de reparto")).toBeInTheDocument();
    expect(screen.getByText("CAU no disponible")).toBeInTheDocument();
  });

  it("does not render tiles or status chip when loading", () => {
    render(<SharingAgreementDetailHeader agreement={mockAgreement} plant={mockPlant} isLoading />);

    expect(screen.queryByText("Fecha de creación")).not.toBeInTheDocument();
    expect(screen.queryByText("Vigente")).not.toBeInTheDocument();
  });

  it("does not render tiles or status chip on error", () => {
    render(<SharingAgreementDetailHeader agreement={mockAgreement} plant={mockPlant} error={new Error("boom")} />);

    expect(screen.queryByText("Fecha de creación")).not.toBeInTheDocument();
    expect(screen.queryByText("Vigente")).not.toBeInTheDocument();
  });
});
