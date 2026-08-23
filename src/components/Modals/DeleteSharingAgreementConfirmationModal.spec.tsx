import "@testing-library/jest-dom";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteSharingAgreementConfirmationModal } from "./DeleteSharingAgreementConfirmationModal";

describe("DeleteSharingAgreementConfirmationModal", () => {
  test("names the affected agreement and gives calm, specific copy about the consequences", () => {
    render(
      <DeleteSharingAgreementConfirmationModal
        isOpen
        agreementName="Reparto 2025"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Eliminar acuerdo de reparto" })).toBeInTheDocument();
    expect(screen.getByText("Reparto 2025")).toBeInTheDocument();
    expect(screen.getByText(/coeficientes que se hayan introducido/)).toBeInTheDocument();
    expect(screen.getByText(/el historial de los miembros no se ve afectado/)).toBeInTheDocument();
  });

  test("confirm calls onConfirm, cancel calls onCancel", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <DeleteSharingAgreementConfirmationModal
        isOpen
        agreementName="Reparto 2025"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(onConfirm).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalled();
  });

  test("disables the confirm button while the delete is pending", () => {
    render(
      <DeleteSharingAgreementConfirmationModal
        isOpen
        agreementName="Reparto 2025"
        isDeleting
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Eliminar" })).toBeDisabled();
  });
});
