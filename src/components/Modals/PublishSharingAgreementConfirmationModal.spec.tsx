import "@testing-library/jest-dom";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublishSharingAgreementConfirmationModal } from "./PublishSharingAgreementConfirmationModal";

function renderModal(props: Partial<React.ComponentProps<typeof PublishSharingAgreementConfirmationModal>> = {}) {
  return render(
    <PublishSharingAgreementConfirmationModal
      isOpen
      agreementName="Reparto vecinos bloque A"
      fileSumLabel="100,0000 %"
      coefficientCount={3}
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
      {...props}
    />,
  );
}

describe("PublishSharingAgreementConfirmationModal", () => {
  test("states the coefficient set is sealed, that publishing applies nothing, and the reversibility window", () => {
    renderModal();

    expect(screen.getByRole("heading", { name: "Poner en vigor" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Al poner el acuerdo en vigor, el reparto queda sellado: no podrás editar los coeficientes mientras esté vigente.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Poner en vigor no aplica nada por sí mismo. Que el 0 % esté aplicado justo después es el comienzo normal del despliegue.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Podrás volver a borrador mientras no se haya aplicado ningún coeficiente. En cuanto aplique alguno, dejará de ser posible y cualquier cambio exigirá un acuerdo nuevo.",
      ),
    ).toBeInTheDocument();
  });

  test("names the agreement being sealed, so two drafts open in two tabs cannot be confused", () => {
    renderModal();

    expect(screen.getByText("Reparto vecinos bloque A")).toBeInTheDocument();
  });

  test("restates what is being sealed: the sum at full precision and the number of supply points", () => {
    renderModal();

    expect(screen.getByText("100,0000 %")).toBeInTheDocument();
    expect(screen.getByText(/3 puntos de suministro/)).toBeInTheDocument();
  });

  test("uses the singular supply-point form for a single coefficient", () => {
    renderModal({ coefficientCount: 1 });

    expect(screen.getByText(/1 punto de suministro/)).toBeInTheDocument();
  });

  test("confirms in primary, not error — sealing an agreed reparto is the constructive move, and red reads as destruction", () => {
    renderModal();

    const confirmButton = screen.getByRole("button", { name: "Poner en vigor" });
    expect(confirmButton).not.toHaveClass("MuiButton-containedError");
    expect(confirmButton).toHaveClass("MuiButton-containedPrimary");
  });

  test("confirm calls onConfirm, cancel calls onCancel", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderModal({ onCancel, onConfirm });

    await user.click(screen.getByRole("button", { name: "Poner en vigor" }));
    expect(onConfirm).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalled();
  });

  test("shows a spinner and disables the confirm button while publishing is pending, without losing its accessible name", () => {
    renderModal({ isPublishing: true });

    const confirmButton = screen.getByRole("button", { name: "Poner en vigor" });
    expect(confirmButton).toBeDisabled();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
