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
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import { colors } from "../../theme/tokens";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN, DERIVED } = SharingAgreementPartitionCoefficientResponseEndState;

const pendingCoefficient: SharingAgreementPartitionCoefficientResponse = {
  coefficientId: "1",
  supply: { name: "Vivienda A", code: "ES0031300000000001AB" },
  coefficient: 0.25,
  applicationState: PENDING,
  endState: OPEN,
};

const derivedCoefficient: SharingAgreementPartitionCoefficientResponse = {
  coefficientId: "2",
  supply: { name: "Vivienda B", code: "ES0031300000000002CD" },
  coefficient: 0.75,
  applicationState: APPLIED,
  validFrom: "2024-05-23T00:00:00Z",
  endState: DERIVED,
  endDate: "2025-01-01T00:00:00Z",
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

  it("shows an out-of-range but non-empty value as invalid, distinct from empty", () => {
    render(
      <Table>
        <TableBody>
          <SharingAgreementCoefficientTableRow
            coefficient={pendingCoefficient}
            installedPowerKw={100}
            isEditing
            inputUnit="percentage"
            coefficientInput="1,5"
            editedValue={1.5}
            onCoefficientChange={vi.fn()}
            onRemove={vi.fn()}
          />
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("Introduce un valor entre 0 y 1")).toBeInTheDocument();
    expect(screen.queryByText("Obligatorio")).not.toBeInTheDocument();
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
            coefficientInput="0,4"
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
    // "Energía asignada"/other-unit cell is the 4th column.
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
