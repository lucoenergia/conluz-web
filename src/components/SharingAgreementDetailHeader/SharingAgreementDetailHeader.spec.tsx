import { describe, it, expect, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { SharingAgreementDetailHeader } from "./SharingAgreementDetailHeader";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { PlantResponse, SharingAgreementResponse } from "../../api/models";
import {
  COEFFICIENT_SCALE,
  computeSharingAgreementCoefficientSums,
  type CoefficientSummable,
} from "../../pages/production/sharingAgreementCoefficientSums";
import { formatCoefficientGapMessage } from "../../pages/production/sharingAgreementGapMessage";

const PENDING = SharingAgreementPartitionCoefficientResponseApplicationState.PENDING;
const APPLIED = SharingAgreementPartitionCoefficientResponseApplicationState.APPLIED;

const ALL_PENDING: CoefficientSummable[] = [
  { coefficient: 0.6, applicationState: PENDING },
  { coefficient: 0.4, applicationState: PENDING },
];

const ONE_APPLIED: CoefficientSummable[] = [
  { coefficient: 0.6, applicationState: APPLIED },
  { coefficient: 0.4, applicationState: PENDING },
];

const ROUNDING_SENSITIVE_FULL: CoefficientSummable[] = [
  ...Array.from({ length: 8 }, () => ({ coefficient: 0.111111, applicationState: PENDING })),
  { coefficient: 0.111112, applicationState: PENDING },
];

const GENUINELY_INCOMPLETE: CoefficientSummable[] = [
  { coefficient: 0.5, applicationState: PENDING },
  { coefficient: 0.4, applicationState: PENDING },
];

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

  describe("Poner en vigor / Volver a borrador", () => {
    const draftAgreement = { ...mockAgreement, status: SharingAgreementResponseStatus.DRAFT };
    const publishedAgreement = { ...mockAgreement, status: SharingAgreementResponseStatus.PUBLISHED };
    const supersededAgreement = { ...mockAgreement, status: SharingAgreementResponseStatus.SUPERSEDED };

    it("renders neither lifecycle item when coefficients is undefined, on a DRAFT agreement", async () => {
      const user = userEvent.setup();
      render(<SharingAgreementDetailHeader agreement={draftAgreement} plant={mockPlant} onEdit={vi.fn()} />);

      await user.click(screen.getByRole("button"));
      await waitFor(() => expect(screen.getByText("Editar")).toBeInTheDocument());
      expect(screen.queryByText("Poner en vigor")).not.toBeInTheDocument();
      expect(screen.queryByText("Volver a borrador")).not.toBeInTheDocument();
    });

    it("hides the kebab entirely for a PUBLISHED agreement while coefficients is undefined (never shows revert transiently)", () => {
      render(<SharingAgreementDetailHeader agreement={publishedAgreement} plant={mockPlant} />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("disables Poner en vigor with a visible 'no coefficients' reason for a resolved empty set on DRAFT", async () => {
      const user = userEvent.setup();
      render(<SharingAgreementDetailHeader agreement={draftAgreement} plant={mockPlant} coefficients={[]} />);

      await user.click(screen.getByRole("button"));
      const item = await screen.findByText("Poner en vigor");
      const menuItem = item.closest('[role="menuitem"]') as HTMLElement;
      expect(menuItem).toHaveAttribute("aria-disabled", "true");
      expect(screen.getByText("Este acuerdo todavía no tiene coeficientes.")).toBeInTheDocument();
    });

    it("disables Poner en vigor with the exact gap message for a genuinely incomplete sum", async () => {
      const user = userEvent.setup();
      render(
        <SharingAgreementDetailHeader
          agreement={draftAgreement}
          plant={mockPlant}
          coefficients={GENUINELY_INCOMPLETE}
        />,
      );

      await user.click(screen.getByRole("button"));
      const item = await screen.findByText("Poner en vigor");
      expect(item.closest('[role="menuitem"]')).toHaveAttribute("aria-disabled", "true");
      // Computed via the same helpers the component uses, not hand-typed — Intl inserts a
      // non-breaking space before the first "%" that's easy to get wrong by hand.
      const { fileSumUnits } = computeSharingAgreementCoefficientSums(GENUINELY_INCOMPLETE);
      const expectedMessage = (formatCoefficientGapMessage(COEFFICIENT_SCALE - fileSumUnits) as string)
        // RTL's default text normalizer collapses the NBSP Intl inserts into a regular space.
        .replace(/\u00A0/g, " ");
      expect(screen.getByText(expectedMessage)).toBeInTheDocument();
    });

    it("enables Poner en vigor for a rounding-sensitive set that sums to exactly 1 in integer units but not as raw floats", async () => {
      const user = userEvent.setup();
      render(
        <SharingAgreementDetailHeader
          agreement={draftAgreement}
          plant={mockPlant}
          coefficients={ROUNDING_SENSITIVE_FULL}
        />,
      );

      await user.click(screen.getByRole("button"));
      const item = await screen.findByText("Poner en vigor");
      expect(item.closest('[role="menuitem"]')).toHaveAttribute("aria-disabled", "false");
    });

    it("keeps the menu open and never calls onPublishRequest when the gated item is clicked", async () => {
      const onPublishRequest = vi.fn();
      const user = userEvent.setup();
      render(
        <SharingAgreementDetailHeader
          agreement={draftAgreement}
          plant={mockPlant}
          coefficients={[]}
          onPublishRequest={onPublishRequest}
        />,
      );

      await user.click(screen.getByRole("button"));
      const item = await screen.findByText("Poner en vigor");
      await user.click(item);

      expect(onPublishRequest).not.toHaveBeenCalled();
      expect(screen.getByText("Poner en vigor")).toBeInTheDocument();
    });

    it("closes the menu and calls onPublishRequest when the enabled item is clicked", async () => {
      const onPublishRequest = vi.fn();
      const user = userEvent.setup();
      render(
        <SharingAgreementDetailHeader
          agreement={draftAgreement}
          plant={mockPlant}
          coefficients={ALL_PENDING}
          onPublishRequest={onPublishRequest}
        />,
      );

      await user.click(screen.getByRole("button"));
      const item = await screen.findByText("Poner en vigor");
      await user.click(item);

      expect(onPublishRequest).toHaveBeenCalled();
      await waitFor(() => expect(screen.getByText("Poner en vigor")).not.toBeVisible());
    });

    it("keeps the gated Poner en vigor item reachable by arrow-key navigation and exposes its reason via aria-describedby", async () => {
      const user = userEvent.setup();
      render(<SharingAgreementDetailHeader agreement={draftAgreement} plant={mockPlant} coefficients={[]} />);

      await user.click(screen.getByRole("button"));
      const editItem = (await screen.findByText("Editar")).closest('[role="menuitem"]') as HTMLElement;
      act(() => editItem.focus());
      expect(editItem).toHaveFocus();

      await user.keyboard("{ArrowDown}");

      const publishItem = screen.getByText("Poner en vigor").closest('[role="menuitem"]') as HTMLElement;
      expect(publishItem).toHaveFocus();

      const describedBy = publishItem.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy as string)).toHaveTextContent(
        "Este acuerdo todavía no tiene coeficientes.",
      );
    });

    it("never renders Volver a borrador (nor the kebab at all) when any coefficient has been applied", () => {
      render(
        <SharingAgreementDetailHeader
          agreement={publishedAgreement}
          plant={mockPlant}
          coefficients={ONE_APPLIED}
          onRevertRequest={vi.fn()}
        />,
      );

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByText("Volver a borrador")).not.toBeInTheDocument();
    });

    it("renders Volver a borrador (not disabled) for a PUBLISHED, fully-pending agreement, closing the menu on click", async () => {
      const onRevertRequest = vi.fn();
      const user = userEvent.setup();
      render(
        <SharingAgreementDetailHeader
          agreement={publishedAgreement}
          plant={mockPlant}
          coefficients={ALL_PENDING}
          onRevertRequest={onRevertRequest}
        />,
      );

      await user.click(screen.getByRole("button"));
      const item = await screen.findByText("Volver a borrador");
      expect(item.closest('[role="menuitem"]')).not.toHaveAttribute("aria-disabled", "true");

      await user.click(item);
      expect(onRevertRequest).toHaveBeenCalled();
      await waitFor(() => expect(screen.getByText("Volver a borrador")).not.toBeVisible());
    });

    it("never renders Volver a borrador for a DRAFT agreement, regardless of coefficient state", () => {
      render(<SharingAgreementDetailHeader agreement={draftAgreement} plant={mockPlant} coefficients={ALL_PENDING} />);
      expect(screen.queryByText("Volver a borrador")).not.toBeInTheDocument();
    });

    it("never renders Volver a borrador for a SUPERSEDED agreement, regardless of coefficient state", () => {
      render(
        <SharingAgreementDetailHeader agreement={supersededAgreement} plant={mockPlant} coefficients={ALL_PENDING} />,
      );
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByText("Volver a borrador")).not.toBeInTheDocument();
    });
  });
});
