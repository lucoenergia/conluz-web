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

    const capacityField = screen.getByLabelText("Capacidad de generación de la planta", { exact: false });
    expect(capacityField).toHaveValue("");
    expect(screen.getByRole("heading", { name: "Nuevo acuerdo de reparto" })).toBeInTheDocument();
  });

  test("create mode describes attaching a file you already have, never one facilitated by the distributor", () => {
    render(<SharingAgreementFormDialog isOpen mode="create" onCancel={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByText(/el fichero TXT que ya tengas hecho por otro medio/)).toBeInTheDocument();
    expect(screen.queryByText(/te haya facilitado la distribuidora/)).not.toBeInTheDocument();
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

    expect(screen.getByLabelText("Capacidad de generación de la planta", { exact: false })).toHaveValue("12,5");
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

    await user.click(screen.getByRole("button", { name: "Crear borrador" }));

    expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("submitting with a non-numeric capacity shows a field error and does not call onSubmit", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<SharingAgreementFormDialog isOpen mode="create" onCancel={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Nombre del acuerdo", { exact: false }), "Reparto 2025");
    await user.click(screen.getByRole("button", { name: "Crear borrador" }));

    expect(screen.getByText("Introduce una potencia en kW mayor que 0")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("submits parsed values, treating the Spanish decimal comma correctly", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<SharingAgreementFormDialog isOpen mode="create" onCancel={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Nombre del acuerdo", { exact: false }), "Reparto 2025");
    await user.type(screen.getByLabelText("Capacidad de generación de la planta", { exact: false }), "12,5");
    await user.type(screen.getByLabelText("Notas internas", { exact: false }), "Primer reparto del año");
    await user.click(screen.getByRole("button", { name: "Crear borrador" }));

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

    expect(screen.getByLabelText("Nombre del acuerdo", { exact: false })).toHaveValue("Reparto 2024");
    expect(screen.getByLabelText("Notas internas", { exact: false })).toHaveValue("Nota original");
    expect(screen.getByLabelText("Capacidad de generación de la planta", { exact: false })).toHaveValue("8");
    expect(screen.getByRole("heading", { name: "Editar acuerdo de reparto" })).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Nombre del acuerdo", { exact: false }));
    await user.type(screen.getByLabelText("Nombre del acuerdo", { exact: false }), "Reparto 2024 (revisado)");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Reparto 2024 (revisado)",
      notes: "Nota original",
      installedPowerKw: 8,
    });
  });

  test("create mode shows the plant/draft intro line and the publish info box, with field examples", () => {
    render(
      <SharingAgreementFormDialog isOpen mode="create" plantName="Planta Castellnovo I" onCancel={vi.fn()} onSubmit={vi.fn()} />,
    );

    expect(screen.getByText("Planta Castellnovo I", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/adjuntar el fichero TXT/)).toBeInTheDocument();
    expect(screen.getByText(/poner en vigor/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ej. 150")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ej. Recálculo julio 2026")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Motivo del nuevo reparto, cambios respecto al anterior, etc.")).toBeInTheDocument();
    expect(screen.getByText("Potencia pico instalada, en el momento de este acuerdo.")).toBeInTheDocument();
  });

  test("edit mode does not show the create-only intro line or publish info box", () => {
    render(
      <SharingAgreementFormDialog
        isOpen
        mode="edit"
        initialValues={{ name: "Reparto 2024", installedPowerKw: 8 }}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByText(/adjuntar el fichero TXT/)).not.toBeInTheDocument();
    expect(screen.queryByText(/poner en vigor/)).not.toBeInTheDocument();
  });

  const CAPACITY_WARNING = /cambiar la capacidad no modifica los coeficientes ya guardados/i;

  test("warns when hasCoefficients and the capacity is changed to a different valid value", async () => {
    const user = userEvent.setup();
    render(
      <SharingAgreementFormDialog
        isOpen
        mode="edit"
        initialValues={{ name: "Reparto 2024", installedPowerKw: 8 }}
        hasCoefficients
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByText(CAPACITY_WARNING)).not.toBeInTheDocument();

    const capacityField = screen.getByLabelText("Capacidad de generación de la planta", { exact: false });
    await user.clear(capacityField);
    await user.type(capacityField, "20");

    expect(screen.getByText(CAPACITY_WARNING)).toBeInTheDocument();
  });

  test("does not warn while the capacity field is cleared mid-edit", async () => {
    const user = userEvent.setup();
    render(
      <SharingAgreementFormDialog
        isOpen
        mode="edit"
        initialValues={{ name: "Reparto 2024", installedPowerKw: 8 }}
        hasCoefficients
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    await user.clear(screen.getByLabelText("Capacidad de generación de la planta", { exact: false }));

    expect(screen.queryByText(CAPACITY_WARNING)).not.toBeInTheDocument();
  });

  test("does not warn when the capacity is retyped to the same value", async () => {
    const user = userEvent.setup();
    render(
      <SharingAgreementFormDialog
        isOpen
        mode="edit"
        initialValues={{ name: "Reparto 2024", installedPowerKw: 8 }}
        hasCoefficients
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const capacityField = screen.getByLabelText("Capacidad de generación de la planta", { exact: false });
    await user.clear(capacityField);
    await user.type(capacityField, "8");

    expect(screen.queryByText(CAPACITY_WARNING)).not.toBeInTheDocument();
  });

  test("does not warn when hasCoefficients is false, even if capacity changes", async () => {
    const user = userEvent.setup();
    render(
      <SharingAgreementFormDialog
        isOpen
        mode="edit"
        initialValues={{ name: "Reparto 2024", installedPowerKw: 8 }}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const capacityField = screen.getByLabelText("Capacidad de generación de la planta", { exact: false });
    await user.clear(capacityField);
    await user.type(capacityField, "20");

    expect(screen.queryByText(CAPACITY_WARNING)).not.toBeInTheDocument();
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
