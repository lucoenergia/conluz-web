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
import type { CoefficientSummable } from "../../pages/production/sharingAgreementCoefficientSums";
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

const KEBAB = "Más opciones del acuerdo";
const EDIT_ITEM = "Editar datos del acuerdo";

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

  const draftAgreement = { ...mockAgreement, status: SharingAgreementResponseStatus.DRAFT };
  const publishedAgreement = { ...mockAgreement, status: SharingAgreementResponseStatus.PUBLISHED };
  const supersededAgreement = { ...mockAgreement, status: SharingAgreementResponseStatus.SUPERSEDED };

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

  describe("identity", () => {
    it("renders the agreement name, the plant's CAU, the status chip and the record's own data", () => {
      renderHeader();

      expect(screen.getByRole("heading", { level: 1, name: "Acuerdo Comunidad Sur" })).toBeInTheDocument();
      expect(screen.getByText("CAU ES0031300296192001MB")).toBeInTheDocument();
      expect(screen.getByText("Vigente")).toBeInTheDocument();
      expect(screen.getByText(/Creado el 23 de mayo de 2024/)).toBeInTheDocument();
      expect(screen.getByText("Revisión anual pendiente")).toBeInTheDocument();
    });

    it("keeps the created date and the notes with the identity, not stranded between sections", () => {
      // They describe the record, so they belong under its name — below the
      // next-step banner they read as belonging to neither it nor "Reparto".
      renderHeader();

      const heading = screen.getByRole("heading", { level: 1, name: "Acuerdo Comunidad Sur" });
      const identityBlock = heading.closest("div")?.parentElement as HTMLElement;
      expect(identityBlock).toHaveTextContent(/Creado el 23 de mayo de 2024/);
      expect(identityBlock).toHaveTextContent("Revisión anual pendiente");
    });

    it("no longer carries installed power — it moved to the coefficient panel, where kW mode actually uses it", () => {
      renderHeader();

      expect(screen.queryByText("42,50 kW")).not.toBeInTheDocument();
      expect(screen.queryByText("Potencia instalada")).not.toBeInTheDocument();
    });

    it("renders the status chip on its own explicit surface tint, not an alpha overlay", () => {
      renderHeader();

      const chip = screen.getByText("Vigente").closest(".MuiChip-root");
      // An explicit `surface` token rather than a translucent overlay: alpha would
      // make the effective contrast depend on whatever sits behind it.
      expect(chip).toHaveStyle({ backgroundColor: colors.brand.surface });
      expect(chip).toHaveStyle({ color: colors.brand.main });
    });

    it("falls back to neutral text when the agreement and plant are empty", () => {
      renderHeader({ agreement: {} as SharingAgreementResponse, plant: {} as PlantResponse });

      expect(screen.getByText("Acuerdo de reparto")).toBeInTheDocument();
      expect(screen.getByText(/CAU no disponible/)).toBeInTheDocument();
    });
  });

  describe("the next-step banner", () => {
    it("is absent while loading, along with the status chip", () => {
      renderHeader({ isLoading: true });

      expect(screen.queryByText("Vigente")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Ver todos los pasos" })).not.toBeInTheDocument();
    });

    it("is absent on error, along with the status chip", () => {
      renderHeader({ error: new Error("boom") });

      expect(screen.queryByText("Vigente")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Ver todos los pasos" })).not.toBeInTheDocument();
    });

    it("binds each intent the selector names to the handler the page supplied", async () => {
      const onEditCoefficientsRequest = vi.fn();
      const onImportRequest = vi.fn();
      const user = userEvent.setup();
      renderHeader({
        agreement: draftAgreement,
        coefficients: [],
        nextStep: { kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" },
        onEditCoefficientsRequest,
        onImportRequest,
      });

      await user.click(screen.getByRole("button", { name: "Editar a mano" }));
      expect(onEditCoefficientsRequest).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole("button", { name: "Importar TXT" }));
      expect(onImportRequest).toHaveBeenCalledTimes(1);
    });

    it("routes the stage 2-4 download to the generate dialog, since nothing is stored to download", async () => {
      const onGenerateRequest = vi.fn();
      const user = userEvent.setup();
      renderHeader({
        agreement: draftAgreement,
        coefficients: ALL_PENDING,
        nextStep: { kind: "GENERATE_AND_SEND", canGenerate: true },
        onGenerateRequest,
      });

      await user.click(screen.getByRole("button", { name: "Descargar fichero" }));
      expect(onGenerateRequest).toHaveBeenCalledTimes(1);
    });

    it("calls onPublishRequest from the promoted control once the draft is complete", async () => {
      const onPublishRequest = vi.fn();
      const user = userEvent.setup();
      renderHeader({
        agreement: draftAgreement,
        coefficients: ALL_PENDING,
        nextStep: { kind: "GENERATE_AND_SEND", canGenerate: true },
        onPublishRequest,
      });

      await user.click(screen.getByRole("button", { name: "Poner en vigor" }));
      expect(onPublishRequest).toHaveBeenCalled();
    });

    // AC1. The header no longer re-implements the publish rule; the selector
    // decides, and a draft that would 409 simply has no publish control.
    it("renders no Poner en vigor control for a draft that is still being authored", () => {
      renderHeader({
        agreement: draftAgreement,
        coefficients: [],
        nextStep: { kind: "AUTHOR_COEFFICIENTS", blockedReason: "NO_COEFFICIENTS" },
        onPublishRequest: vi.fn(),
      });

      expect(screen.queryByRole("button", { name: "Poner en vigor" })).not.toBeInTheDocument();
      expect(screen.getByText("Este acuerdo todavía no tiene coeficientes.")).toBeVisible();
    });
  });

  describe("Volver a borrador", () => {
    it("is absent while coefficients are still in flight, so it never flashes on a published agreement", () => {
      // `[].every(...)` is vacuously true, so a defaulted empty array would make
      // an agreement with applied coefficients look revertible for a frame.
      renderHeader({ agreement: publishedAgreement, onRevertRequest: vi.fn() });

      expect(screen.queryByRole("button", { name: "Volver a borrador" })).not.toBeInTheDocument();
    });

    it("is absent once any coefficient has been applied", () => {
      renderHeader({
        agreement: publishedAgreement,
        coefficients: ONE_APPLIED,
        nextStep: { kind: "RECORD_APPLICATION_DATES", pendingCount: 1, totalCount: 2 },
        onRevertRequest: vi.fn(),
      });

      expect(screen.queryByRole("button", { name: "Volver a borrador" })).not.toBeInTheDocument();
    });

    it("is offered, ungated, for a published agreement nothing has been applied on", async () => {
      const onRevertRequest = vi.fn();
      const user = userEvent.setup();
      renderHeader({
        agreement: publishedAgreement,
        coefficients: ALL_PENDING,
        nextStep: { kind: "RECORD_APPLICATION_DATES", pendingCount: 2, totalCount: 2 },
        onRevertRequest,
      });

      const revert = screen.getByRole("button", { name: "Volver a borrador" });
      expect(revert).not.toHaveAttribute("aria-disabled");

      await user.click(revert);
      expect(onRevertRequest).toHaveBeenCalled();
    });

    it("is never offered for a draft", () => {
      renderHeader({ agreement: draftAgreement, coefficients: ALL_PENDING, onRevertRequest: vi.fn() });

      expect(screen.queryByRole("button", { name: "Volver a borrador" })).not.toBeInTheDocument();
    });
  });

  // AC5.
  describe("the kebab", () => {
    it("offers editing and deleting for a draft", async () => {
      const onEdit = vi.fn();
      const onDeleteRequest = vi.fn();
      const user = userEvent.setup();
      renderHeader({
        agreement: draftAgreement,
        coefficients: ALL_PENDING,
        nextStep: { kind: "GENERATE_AND_SEND", canGenerate: true },
        onEdit,
        onDeleteRequest,
      });

      await user.click(screen.getByRole("button", { name: KEBAB }));
      await waitFor(() => expect(screen.getByText(EDIT_ITEM)).toBeInTheDocument());

      const menu = screen.getByRole("menu");
      expect(menu).toHaveTextContent(EDIT_ITEM);
      expect(menu).toHaveTextContent("Eliminar");
      // The lifecycle moves are labelled controls on the banner, never menu items.
      expect(menu).not.toHaveTextContent("Poner en vigor");
      expect(menu).not.toHaveTextContent("Volver a borrador");

      await user.click(screen.getByText(EDIT_ITEM));
      expect(onEdit).toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: KEBAB }));
      await waitFor(() => expect(screen.getByText("Eliminar")).toBeInTheDocument());
      await user.click(screen.getByText("Eliminar"));
      expect(onDeleteRequest).toHaveBeenCalled();
    });

    it("offers editing, but not deleting, for a published agreement", async () => {
      // `PUT` accepts any status; `DELETE` still 409s outside DRAFT, because
      // removing a published agreement destroys the basis of past billing.
      const user = userEvent.setup();
      renderHeader({
        agreement: publishedAgreement,
        coefficients: ALL_PENDING,
        nextStep: { kind: "RECORD_APPLICATION_DATES", pendingCount: 2, totalCount: 2 },
        onEdit: vi.fn(),
        onDeleteRequest: vi.fn(),
      });

      await user.click(screen.getByRole("button", { name: KEBAB }));
      await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());

      expect(screen.getByRole("menu")).toHaveTextContent(EDIT_ITEM);
      expect(screen.getByRole("menu")).not.toHaveTextContent("Eliminar");
    });

    it("offers editing, but not deleting, for a superseded agreement", async () => {
      const user = userEvent.setup();
      renderHeader({
        agreement: supersededAgreement,
        coefficients: ALL_PENDING,
        onEdit: vi.fn(),
        onDeleteRequest: vi.fn(),
      });

      await user.click(screen.getByRole("button", { name: KEBAB }));
      await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());

      expect(screen.getByRole("menu")).toHaveTextContent(EDIT_ITEM);
      expect(screen.getByRole("menu")).not.toHaveTextContent("Eliminar");
    });

    it("names editing the agreement's own data, so it cannot be read as editing the split", async () => {
      const user = userEvent.setup();
      renderHeader({ agreement: draftAgreement, coefficients: ALL_PENDING, onEdit: vi.fn() });

      await user.click(screen.getByRole("button", { name: KEBAB }));
      await waitFor(() => expect(screen.getByRole("menu")).toBeInTheDocument());

      expect(screen.getByRole("menu")).not.toHaveTextContent("Editar a mano");
    });

    it("is absent while loading, even for a draft", () => {
      renderHeader({ agreement: draftAgreement, isLoading: true, onEdit: vi.fn() });

      expect(screen.queryByRole("button", { name: KEBAB })).not.toBeInTheDocument();
    });

    it("is absent on error", () => {
      renderHeader({ agreement: draftAgreement, error: new Error("boom"), onEdit: vi.fn() });

      expect(screen.queryByRole("button", { name: KEBAB })).not.toBeInTheDocument();
    });
  });

  it("offers no lifecycle action for a superseded agreement", () => {
    renderHeader({
      agreement: supersededAgreement,
      coefficients: ALL_PENDING,
      onRevertRequest: vi.fn(),
      onPublishRequest: vi.fn(),
    });

    expect(screen.queryByRole("button", { name: "Volver a borrador" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Poner en vigor" })).not.toBeInTheDocument();
  });

  // AC7.
  describe("the zero-distribution notice", () => {
    const NOTICE = /Vigente, pero todavía no reparte producción/;

    it("warns when a published agreement has no applied coefficient at all", () => {
      renderHeader({
        agreement: publishedAgreement,
        coefficients: ALL_PENDING,
        nextStep: { kind: "RECORD_APPLICATION_DATES", pendingCount: 2, totalCount: 2 },
      });

      expect(screen.getByText(NOTICE)).toBeVisible();
    });

    it("is informational, never styled as an error", () => {
      // Nothing has gone wrong — there is a step left. A fault colour here would
      // misreport the state in the other direction.
      renderHeader({
        agreement: publishedAgreement,
        coefficients: ALL_PENDING,
        nextStep: { kind: "RECORD_APPLICATION_DATES", pendingCount: 2, totalCount: 2 },
      });

      const alert = screen.getByText(NOTICE).closest(".MuiAlert-root");
      expect(alert).toHaveClass("MuiAlert-standardInfo");
      expect(alert).not.toHaveClass("MuiAlert-standardError");
    });

    it("disappears as soon as one coefficient has been applied", () => {
      renderHeader({
        agreement: publishedAgreement,
        coefficients: ONE_APPLIED,
        nextStep: { kind: "RECORD_APPLICATION_DATES", pendingCount: 1, totalCount: 2 },
      });

      expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
    });

    it("never appears on a draft, which is not in force to begin with", () => {
      renderHeader({
        agreement: draftAgreement,
        coefficients: ALL_PENDING,
        nextStep: { kind: "GENERATE_AND_SEND", canGenerate: true },
      });

      expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
    });

    it("never appears on a superseded agreement", () => {
      renderHeader({ agreement: supersededAgreement, coefficients: ALL_PENDING });

      expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
    });

    it("does not appear while the coefficients are still in flight", () => {
      // `[].every(...)` is vacuously true, so a defaulted empty array would
      // announce zero distribution for an agreement that may be fully applied.
      renderHeader({ agreement: publishedAgreement });

      expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
    });

    it("does not appear for a published agreement with no coefficients at all", () => {
      renderHeader({ agreement: publishedAgreement, coefficients: [] });

      expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
    });
  });
});
