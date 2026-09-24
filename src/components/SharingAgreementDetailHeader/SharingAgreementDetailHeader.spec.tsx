import { beforeEach, describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { buildUser } from "../../test/fixtures";
import { useGetUserById, type getUserById } from "../../api/users/users";
import { SharingAgreementDetailHeader, type SharingAgreementDetailHeaderProps } from "./SharingAgreementDetailHeader";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { PlantResponse, SharingAgreementResponse } from "../../api/models";
import type { CoefficientSummable } from "../../pages/production/sharingAgreementCoefficientSums";

vi.mock(import("../../api/users/users"), () => ({
  useGetUserById: vi.fn(),
}));

const mockGetUserById = vi.mocked(useGetUserById);

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
  beforeEach(() => {
    // Most fixtures have no updatedBy, and the header enables the editor lookup
    // only when there is one (enabled: !!agreement?.updatedBy).
    mockGetUserById.mockReturnValue(query.disabled());
  });

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
    return renderWithProviders(
      <SharingAgreementDetailHeader
        agreement={mockAgreement}
        plant={mockPlant}
        nextStep={{ kind: "NONE" }}
        {...props}
      />,
    );
  }

  describe("identity", () => {
    const openDetails = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole("button", { name: /^Ver \d+ dato/ }));
      return document.getElementById(
        screen.getByRole("button", { name: "Ocultar detalles" }).getAttribute("aria-controls") as string,
      ) as HTMLElement;
    };

    it("renders the agreement name and its status chip", () => {
      renderHeader();

      expect(screen.getByRole("heading", { level: 1, name: "Acuerdo Comunidad Sur" })).toBeInTheDocument();
      expect(screen.getByText("Vigente")).toBeInTheDocument();
    });

    // The two values that describe the agreement itself, each under the field
    // name it belongs to. Run together on one line they gave no clue which was
    // which; at equal weight with everything else they said nothing at all.
    it("promotes the installed power and the creation date into the strip", () => {
      renderHeader({ coefficients: ALL_PENDING });

      for (const [label, value] of [
        ["Potencia instalada", "42,50 kW"],
        ["Creado el", "23 may 2024"],
      ] as const) {
        expect(screen.getByText(label).parentElement).toHaveTextContent(value);
      }
    });

    it("keeps the plant CAU and the notes out of the way until asked for", async () => {
      // Reference data, not identity. Visible by default they crowded the
      // page's actual subject.
      const user = userEvent.setup();
      renderHeader();

      const toggle = screen.getByRole("button", { name: "Ver 2 datos más" });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("Revisión anual pendiente")).not.toBeInTheDocument();

      const panel = await openDetails(user);

      expect(screen.getByRole("button", { name: "Ocultar detalles" })).toHaveAttribute("aria-expanded", "true");
      expect(panel).toHaveTextContent("CAU de la planta");
      expect(panel).toHaveTextContent("ES0031300296192001MB");
      expect(panel).toHaveTextContent("Notas internas");
      expect(panel).toHaveTextContent("Revisión anual pendiente");
    });

    // AC10. The count came from the coefficients query, so it reported the
    // number of ROWS rather than of supply points, and it went stale the moment
    // the split was edited. The split section states it, in context.
    it("states the number of supply points nowhere, collapsed or expanded", async () => {
      const user = userEvent.setup();
      renderHeader({ coefficients: ALL_PENDING });

      expect(screen.queryByText("Puntos de suministro")).not.toBeInTheDocument();

      await openDetails(user);

      expect(screen.queryByText("Puntos de suministro")).not.toBeInTheDocument();
    });

    it("links the plant under the title, so the agreement says what it belongs to", () => {
      renderHeader({ plant: { ...mockPlant, name: "21088 Luco de Jiloca" } as PlantResponse });

      expect(screen.getByRole("link", { name: "21088 Luco de Jiloca" })).toHaveAttribute(
        "href",
        "/production/plant-1",
      );
    });

    it("names the notes field even when the agreement has none, rather than showing a bare blank", async () => {
      const user = userEvent.setup();
      renderHeader({ agreement: { ...mockAgreement, notes: null } as unknown as SharingAgreementResponse });

      const panel = await openDetails(user);

      expect(panel).toHaveTextContent("Notas internas");
      expect(panel).toHaveTextContent("Sin notas");
    });

    it("says the CAU is unavailable rather than leaving its field empty", async () => {
      const user = userEvent.setup();
      renderHeader({ agreement: {} as SharingAgreementResponse, plant: {} as PlantResponse });

      expect(screen.getByText("Acuerdo de reparto")).toBeInTheDocument();
      const panel = await openDetails(user);
      expect(panel).toHaveTextContent("No disponible");
    });

    // An agreement's name, notes and installed power can be corrected after
    // publication, so the record has to say when that happened and by whom.
    it("reports the last edit, with the editor's name rather than their id", async () => {
      const user = userEvent.setup();
      mockGetUserById.mockReturnValue(query.success<typeof getUserById>(buildUser({ fullName: "Ana García" })));
      renderHeader({
        agreement: {
          ...mockAgreement,
          updatedAt: "2024-06-01T09:00:00Z",
          updatedBy: "user-2",
        } as unknown as SharingAgreementResponse,
      });

      const panel = await openDetails(user);

      expect(panel).toHaveTextContent("Última edición");
      expect(panel).toHaveTextContent("1 jun 2024 · Ana García");
      expect(panel).not.toHaveTextContent("user-2");
    });

    // Never edited is not the same as edited by nobody: an empty field would
    // report an absence as a fact, and it would cost a disclosure slot saying it.
    it("names no last edit at all when the agreement has never been edited", async () => {
      const user = userEvent.setup();
      renderHeader();

      const panel = await openDetails(user);

      expect(panel).not.toHaveTextContent("Última edición");
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
