import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText("Pendiente de tratamiento")).toBeInTheDocument();
    expect(screen.getByText("Contribuye 0 a la suma aplicada")).toBeInTheDocument();
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

    expect(screen.getByText("Desde 23 de mayo de 2024")).toBeInTheDocument();
    const endDate = screen.getByText("1 de enero de 2025");
    expect(endDate).toHaveStyle({ color: colors.text.muted });
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
    expect(screen.getByText("Pendiente de tratamiento")).toBeInTheDocument();
  });

  it("renders a read-only PENDING_SUCCESSION/DERIVED end date with the muted text token", () => {
    render(<SharingAgreementCoefficientCard coefficient={derivedCoefficient} installedPowerKw={100} />);

    const endDate = screen.getByText("1 de enero de 2025");
    expect(endDate).toHaveStyle({ color: colors.text.muted });
  });
});
