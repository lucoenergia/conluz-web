import "@testing-library/jest-dom";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RevertSharingAgreementToDraftConfirmationModal } from "./RevertSharingAgreementToDraftConfirmationModal";

describe("RevertSharingAgreementToDraftConfirmationModal", () => {
  test("states the agreement stops being in force and that a resent file may be needed", () => {
    render(<RevertSharingAgreementToDraftConfirmationModal isOpen onCancel={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Volver a borrador" })).toBeInTheDocument();
    expect(screen.getByText(/dejará de estar en vigor y sus coeficientes volverán a ser editables/)).toBeInTheDocument();
  });

  test("uses a non-error confirm color, since reverting is undoable by publishing again", () => {
    render(<RevertSharingAgreementToDraftConfirmationModal isOpen onCancel={vi.fn()} onConfirm={vi.fn()} />);

    const confirmButton = screen.getByRole("button", { name: "Volver a borrador" });
    expect(confirmButton).not.toHaveClass("MuiButton-containedError");
    expect(confirmButton).toHaveClass("MuiButton-containedPrimary");
  });

  test("confirm calls onConfirm, cancel calls onCancel", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<RevertSharingAgreementToDraftConfirmationModal isOpen onCancel={onCancel} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Volver a borrador" }));
    expect(onConfirm).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalled();
  });

  test("disables the confirm button while reverting is pending", () => {
    render(<RevertSharingAgreementToDraftConfirmationModal isOpen isReverting onCancel={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Volver a borrador" })).toBeDisabled();
  });
});
