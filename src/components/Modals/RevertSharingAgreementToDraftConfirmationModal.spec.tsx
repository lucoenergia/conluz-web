import "@testing-library/jest-dom";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RevertSharingAgreementToDraftConfirmationModal } from "./RevertSharingAgreementToDraftConfirmationModal";

function renderModal(
  props: Partial<React.ComponentProps<typeof RevertSharingAgreementToDraftConfirmationModal>> = {},
) {
  return render(
    <RevertSharingAgreementToDraftConfirmationModal
      isOpen
      agreementName="Reparto vecinos bloque A"
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
      {...props}
    />,
  );
}

describe("RevertSharingAgreementToDraftConfirmationModal", () => {
  test("states the agreement stops being in force and its coefficients become editable", () => {
    renderModal();

    expect(screen.getByRole("heading", { name: "Volver a borrador" })).toBeInTheDocument();
    expect(screen.getByText(/dejará de estar en vigor y sus coeficientes volverán a ser editables/)).toBeInTheDocument();
  });

  test("names the agreement, matching the delete and publish dialogs", () => {
    renderModal();

    expect(screen.getByText("Reparto vecinos bloque A")).toBeInTheDocument();
  });

  test("states the point of no return here, where it is about to matter — not only in the publish dialog", () => {
    renderModal();

    expect(
      screen.getByText(
        /todavía no ha aplicado ningún coeficiente\. En cuanto aplique alguno, el acuerdo ya no podrá volver a borrador/,
      ),
    ).toBeInTheDocument();
  });

  test("uses a non-error confirm color, since reverting is undoable by publishing again", () => {
    renderModal();

    const confirmButton = screen.getByRole("button", { name: "Volver a borrador" });
    expect(confirmButton).not.toHaveClass("MuiButton-containedError");
    expect(confirmButton).toHaveClass("MuiButton-containedPrimary");
  });

  test("confirm calls onConfirm, cancel calls onCancel", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderModal({ onCancel, onConfirm });

    await user.click(screen.getByRole("button", { name: "Volver a borrador" }));
    expect(onConfirm).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalled();
  });

  test("shows a spinner and disables the confirm button while reverting is pending, without losing its accessible name", () => {
    renderModal({ isReverting: true });

    const confirmButton = screen.getByRole("button", { name: "Volver a borrador" });
    expect(confirmButton).toBeDisabled();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
