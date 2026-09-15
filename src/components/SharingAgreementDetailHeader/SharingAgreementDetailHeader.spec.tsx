import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { SharingAgreementDetailHeader, type SharingAgreementDetailHeaderProps } from "./SharingAgreementDetailHeader";
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
import { colors } from "../../theme/tokens";

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

const KEBAB = "Más opciones del acuerdo";

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

  function renderHeader(props: Partial<SharingAgreementDetailHeaderProps> = {}) {
    return render(
      <SharingAgreementDetailHeader
        agreement={mockAgreement}
        plant={mockPlant}
        nextStep={{ kind: "NONE" }}
        {...props}
      />,
    );
  }

  it("renders agreement name, CAU, status chip and the metadata strip", () => {
    renderHeader();

    expect(screen.getByText("Acuerdo Comunidad Sur")).toBeInTheDocument();
    expect(screen.getByText("CAU: ES0031300296192001MB")).toBeInTheDocument();
    expect(screen.getByText("Vigente")).toBeInTheDocument();
    expect(screen.getByText("Creado el 23 de mayo de 2024")).toBeInTheDocument();
    expect(screen.getByText("Revisión anual pendiente")).toBeInTheDocument();
  });

  it("no longer carries installed power — it moved to the coefficient panel, where kW mode actually uses it", () => {
    renderHeader();

    expect(screen.queryByText("42,50 kW")).not.toBeInTheDocument();
    expect(screen.queryByText("Potencia instalada")).not.toBeInTheDocument();
  });

  it("renders the status chip on its own explicit surface tint, not an alpha overlay (the identity card is light now, so the onDark white pill no longer applies)", () => {
    renderHeader();

    const chip = screen.getByText("Vigente").closest(".MuiChip-root");
    // An explicit `surface` token rather than a translucent overlay: alpha would
    // make the effective contrast depend on whatever sits behind the card.
    expect(chip).toHaveStyle({ backgroundColor: colors.brand.surface });
    expect(chip).toHaveStyle({ color: colors.brand.main });
  });

  it("renders default texts and CAU fallback when data is missing", () => {
    renderHeader({ agreement: {} as SharingAgreementResponse, plant: {} as PlantResponse });

    expect(screen.getByText("Acuerdo de reparto")).toBeInTheDocument();
    expect(screen.getByText("CAU no disponible")).toBeInTheDocument();
  });

  it("renders neither the rail nor the status chip when loading", () => {
    renderHeader({ isLoading: true });

    expect(screen.queryByText("Vigente")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver todos los pasos" })).not.toBeInTheDocument();
  });

  it("renders neither the rail nor the status chip on error", () => {
    renderHeader({ error: new Error("boom") });

    expect(screen.queryByText("Vigente")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver todos los pasos" })).not.toBeInTheDocument();
  });

  it("hides the actions kebab for a non-DRAFT (published) agreement", () => {
    renderHeader({ onEdit: vi.fn(), onDeleteRequest: vi.fn() });

    expect(screen.queryByRole("button", { name: KEBAB })).not.toBeInTheDocument();
  });

  it("keeps only Editar and Eliminar in the kebab — the lifecycle moves are labelled controls on the rail", async () => {
    const onEdit = vi.fn();
    const onDeleteRequest = vi.fn();
    const user = userEvent.setup();
    renderHeader({
      agreement: { ...mockAgreement, status: SharingAgreementResponseStatus.DRAFT },
      coefficients: ALL_PENDING,
      nextStep: { kind: "GENERATE_AND_SEND", canGenerate: true },
      onEdit,
      onDeleteRequest,
      onPublishRequest: vi.fn(),
    });

    await user.click(screen.getByRole("button", { name: KEBAB }));
    await waitFor(() => expect(screen.getByText("Editar")).toBeInTheDocument());

    const menu = screen.getByRole("menu");
    expect(menu).toHaveTextContent("Editar");
    expect(menu).toHaveTextContent("Eliminar");
    expect(menu).not.toHaveTextContent("Poner en vigor");
    expect(menu).not.toHaveTextContent("Volver a borrador");

    await user.click(screen.getByText("Editar"));
    expect(onEdit).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: KEBAB }));
    await waitFor(() => expect(screen.getByText("Eliminar")).toBeInTheDocument());
    await user.click(screen.getByText("Eliminar"));
    expect(onDeleteRequest).toHaveBeenCalled();
  });

  it("hides the actions kebab while loading, even for a DRAFT agreement", () => {
    renderHeader({
      agreement: { ...mockAgreement, status: SharingAgreementResponseStatus.DRAFT },
      isLoading: true,
      onEdit: vi.fn(),
      onDeleteRequest: vi.fn(),
    });

    expect(screen.queryByRole("button", { name: KEBAB })).not.toBeInTheDocument();
  });

  describe("Poner en vigor / Volver a borrador on the rail", () => {
    const draftAgreement = { ...mockAgreement, status: SharingAgreementResponseStatus.DRAFT };
    const publishedAgreement = { ...mockAgreement, status: SharingAgreementResponseStatus.PUBLISHED };
    const supersededAgreement = { ...mockAgreement, status: SharingAgreementResponseStatus.SUPERSEDED };

    it("renders neither lifecycle action while coefficients is undefined, on a DRAFT agreement", () => {
      renderHeader({ agreement: draftAgreement, onEdit: vi.fn(), onPublishRequest: vi.fn() });

      expect(screen.queryByRole("button", { name: "Poner en vigor" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Volver a borrador" })).not.toBeInTheDocument();
    });

    it("never shows revert transiently for a PUBLISHED agreement while coefficients is undefined", () => {
      renderHeader({ agreement: publishedAgreement, onRevertRequest: vi.fn() });

      expect(screen.queryByRole("button", { name: "Volver a borrador" })).not.toBeInTheDocument();
    });

    it("gates Poner en vigor with a visible 'no coefficients' reason for a resolved empty set on DRAFT", () => {
      renderHeader({ agreement: draftAgreement, coefficients: [], onPublishRequest: vi.fn() });

      const publish = screen.getByRole("button", { name: "Poner en vigor" });
      expect(publish).toHaveAttribute("aria-disabled", "true");
      expect(screen.getByText("Este acuerdo todavía no tiene coeficientes.")).toBeInTheDocument();
    });

    it("gates Poner en vigor with the exact gap message for a genuinely incomplete sum", () => {
      renderHeader({ agreement: draftAgreement, coefficients: GENUINELY_INCOMPLETE, onPublishRequest: vi.fn() });

      expect(screen.getByRole("button", { name: "Poner en vigor" })).toHaveAttribute("aria-disabled", "true");
      // Computed via the same helpers the component uses, not hand-typed — Intl inserts a
      // non-breaking space before the first "%" that's easy to get wrong by hand.
      const { fileSumUnits } = computeSharingAgreementCoefficientSums(GENUINELY_INCOMPLETE);
      const expectedMessage = (formatCoefficientGapMessage(COEFFICIENT_SCALE - fileSumUnits) as string)
        // RTL's default text normalizer collapses the NBSP Intl inserts into a regular space.
        .replace(/\u00A0/g, " ");
      expect(screen.getByText(expectedMessage)).toBeInTheDocument();
    });

    it("enables Poner en vigor for a rounding-sensitive set that sums to exactly 1 in integer units but not as raw floats", () => {
      renderHeader({ agreement: draftAgreement, coefficients: ROUNDING_SENSITIVE_FULL, onPublishRequest: vi.fn() });

      expect(screen.getByRole("button", { name: "Poner en vigor" })).not.toHaveAttribute("aria-disabled");
    });

    it("never calls onPublishRequest when the gated control is clicked", async () => {
      const onPublishRequest = vi.fn();
      const user = userEvent.setup();
      renderHeader({ agreement: draftAgreement, coefficients: [], onPublishRequest });

      await user.click(screen.getByRole("button", { name: "Poner en vigor" }));

      expect(onPublishRequest).not.toHaveBeenCalled();
    });

    it("calls onPublishRequest when the enabled control is clicked", async () => {
      const onPublishRequest = vi.fn();
      const user = userEvent.setup();
      renderHeader({ agreement: draftAgreement, coefficients: ALL_PENDING, onPublishRequest });

      await user.click(screen.getByRole("button", { name: "Poner en vigor" }));

      expect(onPublishRequest).toHaveBeenCalled();
    });

    it("keeps the gated Poner en vigor control in the tab order and exposes its reason via aria-describedby", () => {
      renderHeader({ agreement: draftAgreement, coefficients: [], onPublishRequest: vi.fn() });

      const publish = screen.getByRole("button", { name: "Poner en vigor" });
      // `aria-disabled` rather than `disabled`: a disabled button takes its own
      // explanation out of reach of the keyboard.
      expect(publish).not.toBeDisabled();
      expect(publish).toHaveAttribute("aria-disabled", "true");

      const describedBy = publish.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy as string)).toHaveTextContent(
        "Este acuerdo todavía no tiene coeficientes.",
      );
    });

    it("never renders Volver a borrador when any coefficient has been applied", () => {
      renderHeader({ agreement: publishedAgreement, coefficients: ONE_APPLIED, onRevertRequest: vi.fn() });

      expect(screen.queryByRole("button", { name: "Volver a borrador" })).not.toBeInTheDocument();
    });

    it("renders Volver a borrador, ungated, for a PUBLISHED fully-pending agreement", async () => {
      const onRevertRequest = vi.fn();
      const user = userEvent.setup();
      renderHeader({ agreement: publishedAgreement, coefficients: ALL_PENDING, onRevertRequest });

      const revert = screen.getByRole("button", { name: "Volver a borrador" });
      expect(revert).not.toHaveAttribute("aria-disabled");

      await user.click(revert);
      expect(onRevertRequest).toHaveBeenCalled();
    });

    it("never renders Volver a borrador for a DRAFT agreement, regardless of coefficient state", () => {
      renderHeader({ agreement: draftAgreement, coefficients: ALL_PENDING, onRevertRequest: vi.fn() });

      expect(screen.queryByRole("button", { name: "Volver a borrador" })).not.toBeInTheDocument();
    });

    it("renders no lifecycle action and no kebab for a SUPERSEDED agreement", () => {
      renderHeader({
        agreement: supersededAgreement,
        coefficients: ALL_PENDING,
        onRevertRequest: vi.fn(),
        onPublishRequest: vi.fn(),
        onEdit: vi.fn(),
      });

      expect(screen.queryByRole("button", { name: "Volver a borrador" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Poner en vigor" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: KEBAB })).not.toBeInTheDocument();
    });
  });

  describe("Generar fichero on the rail", () => {
    const draftAgreement = { ...mockAgreement, status: SharingAgreementResponseStatus.DRAFT };

    it("offers Generar fichero during the generate-and-send span", async () => {
      const onGenerateRequest = vi.fn();
      const user = userEvent.setup();
      renderHeader({
        agreement: draftAgreement,
        coefficients: ALL_PENDING,
        nextStep: { kind: "GENERATE_AND_SEND", canGenerate: true },
        onGenerateRequest,
      });

      await user.click(screen.getByRole("button", { name: "Generar fichero" }));
      expect(onGenerateRequest).toHaveBeenCalled();
    });

    it("gates Generar fichero on a missing CAU while leaving Poner en vigor available — the two actions in the span gate independently", () => {
      renderHeader({
        agreement: draftAgreement,
        coefficients: ALL_PENDING,
        nextStep: { kind: "GENERATE_AND_SEND", canGenerate: false, blockedReason: "NO_REGULATORY_CODE" },
        onGenerateRequest: vi.fn(),
        onPublishRequest: vi.fn(),
      });

      expect(screen.getByRole("button", { name: "Generar fichero" })).toHaveAttribute("aria-disabled", "true");
      expect(
        screen.getByText("La planta no tiene CAU configurado. Sin él no se puede generar el fichero."),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Poner en vigor" })).not.toHaveAttribute("aria-disabled");
    });

    it("offers no Generar fichero outside the span", () => {
      renderHeader({
        agreement: draftAgreement,
        coefficients: [],
        nextStep: { kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" },
        onGenerateRequest: vi.fn(),
      });

      expect(screen.queryByRole("button", { name: "Generar fichero" })).not.toBeInTheDocument();
    });
  });
});
