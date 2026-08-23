import "@testing-library/jest-dom";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SharingAgreementFormDialog } from "./SharingAgreementFormDialog";

describe("SharingAgreementFormDialog", () => {
  test("create mode starts with an empty, required capacity field when no prefill is given", () => {
    render(
      <SharingAgreementFormDialog isOpen mode="create" onCancel={vi.fn()} onSubmit={vi.fn()} />,
    );

    const capacityField = screen.getByLabelText("Potencia instalada (kW)", { exact: false });
    expect(capacityField).toHaveValue("");
    expect(screen.getByRole("heading", { name: "Nuevo acuerdo de reparto" })).toBeInTheDocument();
  });

  test("create mode prefills capacity from the plant's totalPower, formatted with a Spanish comma", () => {
    render(
      <SharingAgreementFormDialog
        isOpen
        mode="create"
        initialValues={{ installedPowerKw: 12.5 }}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Potencia instalada (kW)", { exact: false })).toHaveValue("12,5");
  });

  test("submitting with an empty name shows a field error and does not call onSubmit", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <SharingAgreementFormDialog
        isOpen
        mode="create"
        initialValues={{ installedPowerKw: 10 }}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Crear acuerdo" }));

    expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("submitting with a non-numeric capacity shows a field error and does not call onSubmit", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<SharingAgreementFormDialog isOpen mode="create" onCancel={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Nombre", { exact: false }), "Reparto 2025");
    await user.click(screen.getByRole("button", { name: "Crear acuerdo" }));

    expect(screen.getByText("Introduce una potencia en kW mayor que 0")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("submits parsed values, treating the Spanish decimal comma correctly", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<SharingAgreementFormDialog isOpen mode="create" onCancel={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Nombre", { exact: false }), "Reparto 2025");
    await user.type(screen.getByLabelText("Potencia instalada (kW)", { exact: false }), "12,5");
    await user.type(screen.getByLabelText("Notas"), "Primer reparto del año");
    await user.click(screen.getByRole("button", { name: "Crear acuerdo" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Reparto 2025",
      notes: "Primer reparto del año",
      installedPowerKw: 12.5,
    });
  });

  test("edit mode is seeded with the agreement's current values and sends all three fields on submit", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <SharingAgreementFormDialog
        isOpen
        mode="edit"
        initialValues={{ name: "Reparto 2024", notes: "Nota original", installedPowerKw: 8 }}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText("Nombre", { exact: false })).toHaveValue("Reparto 2024");
    expect(screen.getByLabelText("Notas")).toHaveValue("Nota original");
    expect(screen.getByLabelText("Potencia instalada (kW)", { exact: false })).toHaveValue("8");
    expect(screen.getByRole("heading", { name: "Editar acuerdo de reparto" })).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Nombre", { exact: false }));
    await user.type(screen.getByLabelText("Nombre", { exact: false }), "Reparto 2024 (revisado)");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Reparto 2024 (revisado)",
      notes: "Nota original",
      installedPowerKw: 8,
    });
  });

  test("cancel button calls onCancel without submitting", async () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<SharingAgreementFormDialog isOpen mode="create" onCancel={onCancel} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
