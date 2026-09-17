import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { Table, TableBody } from "@mui/material";
import { SharingAgreementCoefficientCard, SharingAgreementCoefficientTableRow } from "./SharingAgreementCoefficientRow";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
} from "../../api/models";
import { SharingAgreementReferenceResponseStatus } from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse, SupplyResponse } from "../../api/models";
import {
  buildEditableRowFromSupply,
  updateRowInput,
  type EditableCoefficientRow,
} from "../../pages/production/sharingAgreementCoefficientEditing";
import { colors } from "../../theme/tokens";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN, DERIVED, OPEN_ORPHAN } = SharingAgreementPartitionCoefficientResponseEndState;

const pendingCoefficient: SharingAgreementPartitionCoefficientResponse = {
  coefficientId: "1",
  supply: { id: "8f6a1a2c-1e8b-4b3a-9b8b-0a1b2c3d4e5f", name: "Vivienda A", code: "ES0031300000000001AB" },
  coefficient: 0.25,
  validFrom: null,
  validTo: null,
  applicationState: PENDING,
  endState: OPEN,
  endDate: null,
  currentCoefficient: null,
};

const derivedCoefficient: SharingAgreementPartitionCoefficientResponse = {
  coefficientId: "2",
  supply: { id: "3d2c1b0a-4e5f-4b3a-9b8b-1a2b3c4d5e6f", name: "Vivienda B", code: "ES0031300000000002CD" },
  coefficient: 0.75,
  validFrom: "2024-05-23T00:00:00Z",
  validTo: null,
  applicationState: APPLIED,
  endState: DERIVED,
  endDate: "2025-01-01T00:00:00Z",
  currentCoefficient: null,
};

describe("SharingAgreementCoefficientTableRow", () => {
  it("renders supply, CUPS, coefficient percentage and both state readouts", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow coefficient={pendingCoefficient} installedPowerKw={100} />
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("Vivienda A")).toBeInTheDocument();
    expect(screen.getByText("ES0031300000000001AB")).toBeInTheDocument();
    // getByText's default normalizer collapses the formatter's U+00A0 into a
    // regular space before comparing, so the matcher uses a regular space too.
    expect(screen.getByText("25,0000 %")).toBeInTheDocument();
    // 25% of 100 kW, matching the mock-up's coefficient×installedPowerKw derivation.
    expect(screen.getByText("25,00 kW")).toBeInTheDocument();
    expect(screen.getByText("Sin fecha de aplicación")).toBeInTheDocument();
    expect(screen.getByText("Regístrala cuando la distribuidora lo aplique")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders the supply's display name in the 'Punto' column, never its id, even when both are present", () => {
    const coefficientWithId: SharingAgreementPartitionCoefficientResponse = {
      ...pendingCoefficient,
      supply: { id: "d8e14158-41fa-405b-ab48-4abd9a126079", name: "Vivienda A", code: "ES0031300000000001AB" },
    };
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow coefficient={coefficientWithId} installedPowerKw={100} />
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("Vivienda A")).toBeInTheDocument();
    expect(screen.queryByText("d8e14158-41fa-405b-ab48-4abd9a126079")).not.toBeInTheDocument();
  });

  it("falls back to a dash for assigned energy when installedPowerKw is unavailable", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow coefficient={pendingCoefficient} installedPowerKw={undefined} />
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("25,0000 %")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    expect(screen.queryByText(/kW/)).not.toBeInTheDocument();
  });

  it("renders a read-only DERIVED end date with the muted text token", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow coefficient={derivedCoefficient} installedPowerKw={100} />
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("En vigor desde 23 de mayo de 2024")).toBeInTheDocument();
    expect(screen.queryByText("Aplicado")).not.toBeInTheDocument();
    expect(screen.queryByText("Desde 23 de mayo de 2024")).not.toBeInTheDocument();
    const endDate = screen.getByText("1 de enero de 2025");
    expect(endDate).toHaveStyle({ color: colors.text.muted });
  });

  it("hides both state cells when showStateColumns is false", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow coefficient={pendingCoefficient} installedPowerKw={100} showStateColumns={false} />
        </TableBody>
      </Table>,
    );

    expect(screen.queryByText("Sin fecha de aplicación")).not.toBeInTheDocument();
    expect(screen.queryByText("Regístrala cuando la distribuidora lo aplique")).not.toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  it("shows both state cells by default when showStateColumns is omitted", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow coefficient={pendingCoefficient} installedPowerKw={100} />
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("Sin fecha de aplicación")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("SharingAgreementCoefficientTableRow (editing, percentage unit)", () => {
  it("renders an editable input instead of the static percentage, seeded from coefficientInput/editedValue", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={100}
            isEditing
            inputUnit="percentage"
            coefficientInput="0,25"
            editedValue={0.25}
            onCoefficientChange={vi.fn()}
            onRemove={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole("textbox")).toHaveValue("0,25");
    expect(screen.queryByText("25,0000 %")).not.toBeInTheDocument();
  });

  it("calls onCoefficientChange verbatim as the user types, and onRemove when the delete action is clicked", async () => {
    const onCoefficientChange = vi.fn();
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={100}
            isEditing
            inputUnit="percentage"
            coefficientInput=""
            editedValue={undefined}
            onCoefficientChange={onCoefficientChange}
            onRemove={onRemove}
          />
        </TableBody>
      </Table>,
    );

    await user.type(screen.getByRole("textbox"), "1");
    expect(onCoefficientChange).toHaveBeenCalledWith("1");

    await user.click(screen.getByRole("button", { name: /Quitar/ }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("shows a field-level error for an empty input, never treating it as zero", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={100}
            isEditing
            inputUnit="percentage"
            coefficientInput=""
            editedValue={undefined}
            onCoefficientChange={vi.fn()}
            onRemove={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("Obligatorio")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("accepts and displays a real zero without an error", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={100}
            isEditing
            inputUnit="percentage"
            coefficientInput="0"
            editedValue={0}
            onCoefficientChange={vi.fn()}
            onRemove={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole("textbox")).toHaveValue("0");
    expect(screen.queryByText("Obligatorio")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
  });

  it("shows an out-of-range but non-empty percentage as invalid, distinct from empty", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={100}
            isEditing
            inputUnit="percentage"
            coefficientInput="150"
            editedValue={1.5}
            onCoefficientChange={vi.fn()}
            onRemove={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("Introduce un valor entre 0 y 100 %")).toBeInTheDocument();
    expect(screen.queryByText("Obligatorio")).not.toBeInTheDocument();
  });

  // D2: a fifth percentage decimal is a figure the distributor file cannot carry.
  // It is named and it blocks the save, rather than being rounded away in silence.
  it("names the decimal limit when more than four decimals are typed", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={100}
            isEditing
            inputUnit="percentage"
            coefficientInput="30,00005"
            editedValue={undefined}
            onCoefficientChange={vi.fn()}
            onRemove={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("Como máximo 4 decimales")).toBeInTheDocument();
    expect(screen.queryByText("Obligatorio")).not.toBeInTheDocument();
    expect(screen.queryByText("Introduce un valor entre 0 y 100 %")).not.toBeInTheDocument();
  });

  it("the other-unit column shows kW while editing in percentage mode", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={100}
            isEditing
            inputUnit="percentage"
            coefficientInput="40,0000"
            editedValue={0.4}
            onCoefficientChange={vi.fn()}
            onRemove={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("40,00 kW")).toBeInTheDocument();
  });

  it("focus and blur with no edit never call onCoefficientChange — the field has no onBlur wiring", async () => {
    const onCoefficientChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={60}
            isEditing
            inputUnit="kw"
            // value 0.016670 -> exact kW is 1.0002, but the 2dp-rounded display text is "1,00" —
            // blurring must not re-derive value from that rounded text.
            coefficientInput="1,00"
            editedValue={0.01667}
            onCoefficientChange={onCoefficientChange}
            onRemove={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.tab();

    expect(onCoefficientChange).not.toHaveBeenCalled();
  });
});

describe("SharingAgreementCoefficientTableRow (editing, kW unit)", () => {
  it("renders a kW-unit placeholder and adornment", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={60}
            isEditing
            inputUnit="kw"
            coefficientInput=""
            editedValue={undefined}
            onCoefficientChange={vi.fn()}
            onRemove={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getByPlaceholderText("0,00")).toBeInTheDocument();
    expect(screen.getByText("kW")).toBeInTheDocument();
  });

  it("renders no adornment in percentage mode — the column header already carries the unit", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={100}
            isEditing
            inputUnit="percentage"
            coefficientInput="3,0992"
            editedValue={0.030992}
            onCoefficientChange={vi.fn()}
            onRemove={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole("textbox")).toHaveValue("3,0992");
    expect(screen.queryByText("%")).not.toBeInTheDocument();
  });

  it("shows a kW-range error message using the plant's installedPowerKw", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={60}
            isEditing
            inputUnit="kw"
            coefficientInput="90"
            editedValue={1.5}
            onCoefficientChange={vi.fn()}
            onRemove={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("Introduce un valor entre 0 y 60 kW")).toBeInTheDocument();
  });

  it("the other-unit column shows the equivalent percentage while editing in kW mode", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={60}
            isEditing
            inputUnit="kw"
            coefficientInput="30"
            editedValue={0.5}
            onCoefficientChange={vi.fn()}
            onRemove={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("50,0000 %")).toBeInTheDocument();
  });

  it("the other-unit column shows '-', never NaN or 0, for an empty row", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={60}
            isEditing
            inputUnit="kw"
            coefficientInput=""
            editedValue={undefined}
            onCoefficientChange={vi.fn()}
            onRemove={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    const cells = screen.getAllByRole("cell");
    // "Potencia asignada"/other-unit cell is the 4th column.
    expect(cells[3]).toHaveTextContent("-");
    expect(cells[3]).not.toHaveTextContent("NaN");
  });
});

describe("SharingAgreementCoefficientCard", () => {
  it("renders the same fields as a stacked mobile card", () => {
    render(<SharingAgreementCoefficientCard coefficient={pendingCoefficient} installedPowerKw={100} />);

    expect(screen.getByText("Vivienda A")).toBeInTheDocument();
    expect(screen.getByText("ES0031300000000001AB")).toBeInTheDocument();
    // getByText's default normalizer collapses the formatter's U+00A0 into a
    // regular space before comparing, so the matcher uses a regular space too.
    expect(screen.getByText("25,0000 %")).toBeInTheDocument();
    expect(screen.getByText("25,00 kW")).toBeInTheDocument();
    expect(screen.getByText("Sin fecha de aplicación")).toBeInTheDocument();
  });

  it("renders a read-only PENDING_SUCCESSION/DERIVED end date with the muted text token", () => {
    render(<SharingAgreementCoefficientCard coefficient={derivedCoefficient} installedPowerKw={100} />);

    expect(screen.getByText("En vigor desde 23 de mayo de 2024")).toBeInTheDocument();
    const endDate = screen.getByText("1 de enero de 2025");
    expect(endDate).toHaveStyle({ color: colors.text.muted });
  });

  it("hides both state readouts when showStateColumns is false", () => {
    render(<SharingAgreementCoefficientCard coefficient={pendingCoefficient} installedPowerKw={100} showStateColumns={false} />);

    expect(screen.queryByText("Sin fecha de aplicación")).not.toBeInTheDocument();
    expect(screen.queryByText("Regístrala cuando la distribuidora lo aplique")).not.toBeInTheDocument();
  });
});

describe("SharingAgreementCoefficientTableRow (batch-activation checkbox)", () => {
  it("renders a checkbox for a PENDING coefficient when selection is offered, and calls onToggleSelected", async () => {
    const onToggleSelected = vi.fn();
    const user = userEvent.setup();
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={100}
            showSelectionColumn
            selected={false}
            onToggleSelected={onToggleSelected}
          />
        </TableBody>
      </Table>,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Seleccionar Vivienda A" });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(onToggleSelected).toHaveBeenCalledTimes(1);
  });

  it("renders a checkbox for an APPLIED coefficient too, now that it's actionable (correct/deactivate)", async () => {
    const onToggleSelected = vi.fn();
    const user = userEvent.setup();
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={derivedCoefficient}
            installedPowerKw={100}
            showSelectionColumn
            selected={false}
            onToggleSelected={onToggleSelected}
          />
        </TableBody>
      </Table>,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Seleccionar Vivienda B" });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(onToggleSelected).toHaveBeenCalledTimes(1);
  });

  it("never renders a checkbox when showSelectionColumn is false, even for a PENDING coefficient with onToggleSelected present", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={100}
            showSelectionColumn={false}
            onToggleSelected={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("reflects a checked selection state", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={100}
            showSelectionColumn
            selected
            onToggleSelected={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole("checkbox", { name: "Seleccionar Vivienda A" })).toBeChecked();
  });
});

describe("SharingAgreementCoefficientTableRow (lifecycle actions menu)", () => {
  const appliedOrphanCoefficient: SharingAgreementPartitionCoefficientResponse = {
    ...derivedCoefficient,
    coefficientId: "3",
    endState: OPEN_ORPHAN,
    endDate: null,
  };

  it("renders a menu button offering apply for a PENDING row — getAvailableCoefficientActions now returns [\"apply\"]", async () => {
    const onOpenActionsMenu = vi.fn();
    const user = userEvent.setup();
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={100}
            showActionsColumn
            onOpenActionsMenu={onOpenActionsMenu}
          />
        </TableBody>
      </Table>,
    );

    const button = screen.getByRole("button", { name: "Más acciones para Vivienda A" });
    await user.click(button);
    expect(onOpenActionsMenu).toHaveBeenCalledTimes(1);
    expect(onOpenActionsMenu.mock.calls[0][1]).toBe(pendingCoefficient);
  });

  it("renders no menu button when showActionsColumn is false, even for an actionable row", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={appliedOrphanCoefficient}
            installedPowerKw={100}
            showActionsColumn={false}
            onOpenActionsMenu={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.queryByRole("button", { name: /Más acciones/ })).not.toBeInTheDocument();
  });

  it("renders the menu button for an actionable row and calls onOpenActionsMenu with the coefficient", async () => {
    const onOpenActionsMenu = vi.fn();
    const user = userEvent.setup();
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={appliedOrphanCoefficient}
            installedPowerKw={100}
            showActionsColumn
            onOpenActionsMenu={onOpenActionsMenu}
          />
        </TableBody>
      </Table>,
    );

    const button = screen.getByRole("button", { name: "Más acciones para Vivienda B" });
    await user.click(button);
    expect(onOpenActionsMenu).toHaveBeenCalledTimes(1);
    expect(onOpenActionsMenu.mock.calls[0][1]).toBe(appliedOrphanCoefficient);
  });

  it("disables the menu button when actionsDisabled is set, even for an actionable row", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={appliedOrphanCoefficient}
            installedPowerKw={100}
            showActionsColumn
            onOpenActionsMenu={vi.fn()}
            actionsDisabled
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole("button", { name: "Más acciones para Vivienda B" })).toBeDisabled();
  });
});

describe("SharingAgreementCoefficientCard (lifecycle actions menu)", () => {
  const appliedOrphanCoefficient: SharingAgreementPartitionCoefficientResponse = {
    ...derivedCoefficient,
    coefficientId: "3",
    endState: OPEN_ORPHAN,
    endDate: null,
  };

  it("renders a menu button offering apply for a PENDING row", async () => {
    const onOpenActionsMenu = vi.fn();
    const user = userEvent.setup();
    render(
      <SharingAgreementCoefficientCard
        coefficient={pendingCoefficient}
        installedPowerKw={100}
        showActionsColumn
        onOpenActionsMenu={onOpenActionsMenu}
      />,
    );

    const button = screen.getByRole("button", { name: "Más acciones para Vivienda A" });
    await user.click(button);
    expect(onOpenActionsMenu).toHaveBeenCalledTimes(1);
    expect(onOpenActionsMenu.mock.calls[0][1]).toBe(pendingCoefficient);
  });

  it("renders the menu button for an actionable row and calls onOpenActionsMenu", async () => {
    const onOpenActionsMenu = vi.fn();
    const user = userEvent.setup();
    render(
      <SharingAgreementCoefficientCard
        coefficient={appliedOrphanCoefficient}
        installedPowerKw={100}
        showActionsColumn
        onOpenActionsMenu={onOpenActionsMenu}
      />,
    );

    const button = screen.getByRole("button", { name: "Más acciones para Vivienda B" });
    await user.click(button);
    expect(onOpenActionsMenu).toHaveBeenCalledTimes(1);
  });

  it("disables the menu button when actionsDisabled is set, even for an actionable row", () => {
    render(
      <SharingAgreementCoefficientCard
        coefficient={appliedOrphanCoefficient}
        installedPowerKw={100}
        showActionsColumn
        onOpenActionsMenu={vi.fn()}
        actionsDisabled
      />,
    );

    expect(screen.getByRole("button", { name: "Más acciones para Vivienda B" })).toBeDisabled();
  });
});

describe("SharingAgreementCoefficientCard (batch-activation checkbox)", () => {
  it("renders a checkbox for a PENDING coefficient when selection is offered, and calls onToggleSelected", async () => {
    const onToggleSelected = vi.fn();
    const user = userEvent.setup();
    render(
      <SharingAgreementCoefficientCard
        coefficient={pendingCoefficient}
        installedPowerKw={100}
        showSelectionColumn
        selected={false}
        onToggleSelected={onToggleSelected}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Seleccionar Vivienda A" });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(onToggleSelected).toHaveBeenCalledTimes(1);
  });

  it("renders a checkbox for an APPLIED coefficient too, now that it's actionable (correct/deactivate)", async () => {
    const onToggleSelected = vi.fn();
    const user = userEvent.setup();
    render(
      <SharingAgreementCoefficientCard
        coefficient={derivedCoefficient}
        installedPowerKw={100}
        showSelectionColumn
        selected={false}
        onToggleSelected={onToggleSelected}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Seleccionar Vivienda B" });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(onToggleSelected).toHaveBeenCalledTimes(1);
  });
});

// AC13. `supply.name` is declared required by the contract but is nullable in
// the database and empty for most production rows.
describe("row identity when the supply has no name", () => {
  const namelessCoefficient: SharingAgreementPartitionCoefficientResponse = {
    ...pendingCoefficient,
    supply: { id: "s9", name: "", code: "ES0031300000000009ZZ" },
  };

  it("promotes the CUPS to the primary identifier in the table, and does not repeat it", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow coefficient={namelessCoefficient} installedPowerKw={100} />
        </TableBody>
      </Table>,
    );

    expect(screen.getAllByText("ES0031300000000009ZZ")).toHaveLength(1);
    expect(screen.queryByText("-")).not.toBeInTheDocument();
  });

  it("promotes the CUPS to the primary identifier on the mobile card, and does not repeat it", () => {
    render(<SharingAgreementCoefficientCard coefficient={namelessCoefficient} installedPowerKw={100} />);

    expect(screen.getAllByText("ES0031300000000009ZZ")).toHaveLength(1);
    expect(screen.queryByText("-")).not.toBeInTheDocument();
  });

  it("keeps the name primary and the CUPS secondary when a name exists", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow coefficient={pendingCoefficient} installedPowerKw={100} />
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("Vivienda A")).toBeInTheDocument();
    expect(screen.getByText("ES0031300000000001AB")).toBeInTheDocument();
  });

  it("falls back to a dash only when neither a name nor a CUPS exists", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={{ ...pendingCoefficient, supply: { id: "s0", name: "", code: "" } }}
            installedPowerKw={100}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getAllByText("-")).toHaveLength(1);
  });

  it("treats a whitespace-only name as no name at all", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={{ ...namelessCoefficient, supply: { id: "s9", name: "   ", code: "ES0031300000000009ZZ" } }}
            installedPowerKw={100}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getAllByText("ES0031300000000009ZZ")).toHaveLength(1);
  });
});

describe("current coefficient (DRAFT-only column)", () => {
  // An explicit sign followed by a digit: a lone "-" is formatOtherUnit's
  // "no value" marker, not a difference of minus-nothing.
  const SIGNED_DELTA = /^[+-]\d[\d.,]*\s*%$/;

  const AGREEMENT = {
    id: "a1",
    name: "Acuerdo 2024",
    status: SharingAgreementReferenceResponseStatus.PUBLISHED,
  };

  /** A DRAFT row proposing `draft` for a supply currently on `current`. */
  function row(draft: number, current: number | null): SharingAgreementPartitionCoefficientResponse {
    return {
      ...pendingCoefficient,
      coefficient: draft,
      currentCoefficient:
        current === null ? null : { coefficient: current, validFrom: "2024-01-01T00:00:00Z", sharingAgreement: AGREEMENT },
    };
  }

  /** A row the picker synthesized this session — no server answer exists for it. */
  function unsavedRow(): SharingAgreementPartitionCoefficientResponse {
    return buildEditableRowFromSupply({ id: "s9", name: "Nave Nueva", code: "CUPS9" } as SupplyResponse).coefficient;
  }

  // A clean DRAFT hides the state columns, and their end-state readout is also
  // an em dash — rendering them here would make "—" ambiguous.
  function renderRow(props: Partial<React.ComponentProps<typeof SharingAgreementCoefficientTableRow>>) {
    return render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={row(0.4, 0.35)}
            installedPowerKw={100}
            showStateColumns={false}
            showCurrentCoefficient
            {...props}
          />
        </TableBody>
      </Table>,
    );
  }

  function renderCard(props: Partial<React.ComponentProps<typeof SharingAgreementCoefficientCard>>) {
    return render(
      <SharingAgreementCoefficientCard
        coefficient={row(0.4, 0.35)}
        installedPowerKw={100}
        showStateColumns={false}
        showCurrentCoefficient
        {...props}
      />,
    );
  }

  describe("table row", () => {
    it("shows the coefficient in force and the signed difference the draft would make", () => {
      renderRow({});
      expect(screen.getByText("35,0000 %")).toBeInTheDocument();
      expect(screen.getByText("+5,0000 %")).toBeInTheDocument();
    });

    it("signs a reduction negatively", () => {
      renderRow({ coefficient: row(0.25, 0.3) });
      expect(screen.getByText("-5,0000 %")).toBeInTheDocument();
    });

    it("shows an unsigned zero when the draft keeps the same coefficient", () => {
      renderRow({ coefficient: row(0.3, 0.3) });
      expect(screen.getByText("0,0000 %")).toBeInTheDocument();
    });

    it("renders an em dash, and no difference, for a server row with nothing in force", () => {
      renderRow({ coefficient: row(0.4, null) });
      expect(screen.getByText("—")).toBeInTheDocument();
      expect(screen.queryByText(SIGNED_DELTA)).not.toBeInTheDocument();
    });

    it("renders nothing at all for a row the picker just added — no server answer is not an answer of 'none'", () => {
      renderRow({ coefficient: unsavedRow() });
      expect(screen.queryByText("—")).not.toBeInTheDocument();
      expect(screen.queryByText(SIGNED_DELTA)).not.toBeInTheDocument();
    });

    it("is absent entirely when the container doesn't ask for it (PUBLISHED, SUPERSEDED)", () => {
      renderRow({ showCurrentCoefficient: false });
      expect(screen.queryByText("35,0000 %")).not.toBeInTheDocument();
      expect(screen.queryByText("+5,0000 %")).not.toBeInTheDocument();
    });
  });

  describe("mobile card", () => {
    it("names itself, since a card has no column header", () => {
      renderCard({});
      expect(screen.getByText("Actual 35,0000 % · +5,0000 %")).toBeInTheDocument();
    });

    it("says 'Actual —' for a server row with nothing in force", () => {
      renderCard({ coefficient: row(0.4, null) });
      expect(screen.getByText("Actual —")).toBeInTheDocument();
    });

    it("omits the line entirely for a freshly picked supply, rather than growing a blank one", () => {
      renderCard({ coefficient: unsavedRow() });
      expect(screen.queryByText(/^Actual/)).not.toBeInTheDocument();
    });

    it("is absent entirely when the container doesn't ask for it", () => {
      renderCard({ showCurrentCoefficient: false });
      expect(screen.queryByText(/^Actual/)).not.toBeInTheDocument();
    });
  });

  describe("while editing", () => {
    it("compares against what is in the field, not the saved value", () => {
      renderRow({ isEditing: true, inputUnit: "percentage", coefficientInput: "50", editedValue: 0.5, onCoefficientChange: vi.fn() });
      // 0.50 against a current 0.35, not the row's own saved 0.40.
      expect(screen.getByText("+15,0000 %")).toBeInTheDocument();
    });

    it("drops the difference while the field is empty — 'no comparison' is not 'no change'", () => {
      renderRow({ isEditing: true, inputUnit: "percentage", coefficientInput: "", editedValue: undefined, onCoefficientChange: vi.fn() });
      expect(screen.getByText("35,0000 %")).toBeInTheDocument();
      expect(screen.queryByText("0,0000 %")).not.toBeInTheDocument();
      expect(screen.queryByText(SIGNED_DELTA)).not.toBeInTheDocument();
    });

    /**
     * The difference must not depend on which unit the admin is typing in.
     * These drive the real `updateRowInput` rather than hand-computing a
     * value, so they exercise the kW->fraction conversion the editor actually
     * performs instead of restating it.
     */
    describe("unit invariance", () => {
      const INSTALLED_KW = 200;
      const seed: EditableCoefficientRow = {
        supplyId: "s1",
        coefficient: row(0.4, 0.35),
        value: undefined,
        inputText: "",
      };

      function deltaTextFor(inputText: string, unit: "percentage" | "kw"): string | null {
        const [updated] = updateRowInput([seed], "s1", inputText, unit, INSTALLED_KW);
        const { unmount } = renderRow({
          coefficient: updated.coefficient,
          isEditing: true,
          inputUnit: unit,
          installedPowerKw: INSTALLED_KW,
          coefficientInput: updated.inputText,
          editedValue: updated.value,
          onCoefficientChange: vi.fn(),
        });
        const match = screen.queryByText(SIGNED_DELTA);
        const text = match ? match.textContent : null;
        unmount();
        return text;
      }

      it("reports the same difference for 50 % and for the 100 kW that equals it", () => {
        const asPercentage = deltaTextFor("50", "percentage");
        // 100 kW of 200 kW installed is 0.5 — the same coefficient as "50 %".
        expect(deltaTextFor("100", "kw")).toBe(asPercentage);
        // ...and it is the real figure, not two matching nulls. \s rather than
        // a literal space: textContent keeps the formatter's U+00A0, which
        // getByText's normalizer would otherwise have hidden.
        expect(asPercentage).toMatch(/^\+15,0000\s%$/);
      });

      it("drops the difference when the kW field is emptied or unparseable", () => {
        expect(deltaTextFor("", "kw")).toBeNull();
        expect(deltaTextFor("abc", "kw")).toBeNull();
      });

      it("drops the difference when installed power can't convert the kW figure", () => {
        const [updated] = updateRowInput([seed], "s1", "100", "kw", 0);
        renderRow({
          coefficient: updated.coefficient,
          isEditing: true,
          inputUnit: "kw",
          installedPowerKw: 0,
          coefficientInput: updated.inputText,
          editedValue: updated.value,
          onCoefficientChange: vi.fn(),
        });
        expect(screen.queryByText(SIGNED_DELTA)).not.toBeInTheDocument();
      });
    });
  });
});
