import "@testing-library/jest-dom";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublishSharingAgreementConfirmationModal } from "./PublishSharingAgreementConfirmationModal";

describe("PublishSharingAgreementConfirmationModal", () => {
  test("states the coefficient set is sealed, that publishing applies nothing, and the reversibility window", () => {
    render(<PublishSharingAgreementConfirmationModal isOpen onCancel={vi.fn()} onConfirm={vi.fn()} />);

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
        "Podrás volver a borrador mientras la distribuidora no haya aplicado ningún coeficiente. En cuanto aplique alguno, dejará de ser posible y cualquier cambio exigirá un acuerdo nuevo.",
      ),
    ).toBeInTheDocument();
  });

  test("confirm calls onConfirm, cancel calls onCancel", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<PublishSharingAgreementConfirmationModal isOpen onCancel={onCancel} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Poner en vigor" }));
    expect(onConfirm).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalled();
  });

  test("disables the confirm button while publishing is pending", () => {
    render(<PublishSharingAgreementConfirmationModal isOpen isPublishing onCancel={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Poner en vigor" })).toBeDisabled();
  });
});
