import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { SharingAgreementDetailHeader } from "./SharingAgreementDetailHeader";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { PlantResponse, SharingAgreementResponse } from "../../api/models";

describe("SharingAgreementDetailHeader", () => {
  const mockAgreement = {
    id: "agreement-1",
    plantId: "plant-1",
    name: "Acuerdo Comunidad Sur",
    status: SharingAgreementResponseStatus.PUBLISHED,
    installedPowerKw: 42.5,
    createdAt: "2024-05-23T10:30:00Z",
    createdBy: "user-1",
    notes: "Revisión anual pendiente",
    file: null,
  } as unknown as SharingAgreementResponse;

  const mockPlant = {
    id: "plant-1",
    regulatoryCode: "ES0031300296192001MB",
  } as PlantResponse;

  it("renders agreement name, CAU and tiles", () => {
    render(<SharingAgreementDetailHeader agreement={mockAgreement} plant={mockPlant} />);

    expect(screen.getByText("Acuerdo Comunidad Sur")).toBeInTheDocument();
    expect(screen.getByText("CAU: ES0031300296192001MB")).toBeInTheDocument();
    expect(screen.getByText("Vigente")).toBeInTheDocument();
    expect(screen.getByText("23 de mayo de 2024")).toBeInTheDocument();
    expect(screen.getByText("42,50 kW")).toBeInTheDocument();
    expect(screen.getByText("Revisión anual pendiente")).toBeInTheDocument();
  });

  it("renders the status chip with contrast against the banner (regression guard: PUBLISHED was previously invisible — blue text on a blue-tinted chip on a solid blue banner)", () => {
    render(<SharingAgreementDetailHeader agreement={mockAgreement} plant={mockPlant} />);

    const chip = screen.getByText("Vigente").closest(".MuiChip-root");
    expect(chip).toHaveStyle({ backgroundColor: "rgba(255, 255, 255, 0.9)" });
  });

  it("renders default texts and CAU fallback when data is missing", () => {
    render(
      <SharingAgreementDetailHeader
        agreement={{} as SharingAgreementResponse}
        plant={{} as PlantResponse}
      />,
    );

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

  it("hides the actions kebab for a non-DRAFT (published) agreement", () => {
    render(<SharingAgreementDetailHeader agreement={mockAgreement} plant={mockPlant} onEdit={vi.fn()} onDeleteRequest={vi.fn()} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the actions kebab with Editar/Eliminar for a DRAFT agreement, wired to the callbacks", async () => {
    const onEdit = vi.fn();
    const onDeleteRequest = vi.fn();
    const user = userEvent.setup();
    const draftAgreement = { ...mockAgreement, status: SharingAgreementResponseStatus.DRAFT };
    render(
      <SharingAgreementDetailHeader agreement={draftAgreement} plant={mockPlant} onEdit={onEdit} onDeleteRequest={onDeleteRequest} />,
    );

    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByText("Editar")).toBeInTheDocument());

    await user.click(screen.getByText("Editar"));
    expect(onEdit).toHaveBeenCalled();

    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByText("Eliminar")).toBeInTheDocument());
    await user.click(screen.getByText("Eliminar"));
    expect(onDeleteRequest).toHaveBeenCalled();
  });

  it("hides the actions kebab while loading, even for a DRAFT agreement", () => {
    const draftAgreement = { ...mockAgreement, status: SharingAgreementResponseStatus.DRAFT };
    render(
      <SharingAgreementDetailHeader
        agreement={draftAgreement}
        plant={mockPlant}
        isLoading
        onEdit={vi.fn()}
        onDeleteRequest={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
