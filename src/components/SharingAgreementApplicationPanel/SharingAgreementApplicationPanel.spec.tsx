import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import { SharingAgreementApplicationPanel } from "./SharingAgreementApplicationPanel";

const PENDING = SharingAgreementPartitionCoefficientResponseApplicationState.PENDING;
const APPLIED = SharingAgreementPartitionCoefficientResponseApplicationState.APPLIED;
const OPEN = SharingAgreementPartitionCoefficientResponseEndState.OPEN;

function coefficient(
  id: string,
  applicationState: SharingAgreementPartitionCoefficientResponseApplicationState,
): SharingAgreementPartitionCoefficientResponse {
  return {
    coefficientId: id,
    supply: { id: `s${id}`, name: `Punto ${id}`, code: `ES00313000000000${id}AB` },
    coefficient: 0.2,
    applicationState,
    validFrom: null,
    validTo: null,
    endState: OPEN,
    endDate: null,
    currentCoefficient: null,
  };
}

/** Three pending, two applied — never a single-element collection. */
const MIXED = [
  coefficient("1", APPLIED),
  coefficient("2", APPLIED),
  coefficient("3", PENDING),
  coefficient("4", PENDING),
  coefficient("5", PENDING),
];

function renderPanel(props: Partial<Parameters<typeof SharingAgreementApplicationPanel>[0]> = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <SharingAgreementApplicationPanel coefficients={MIXED} {...props} />
    </ThemeProvider>,
  );
}

describe("SharingAgreementApplicationPanel", () => {
  // AC6.
  it("names the section and says what an application date is", () => {
    renderPanel();

    expect(screen.getByRole("heading", { level: 2, name: "Aplicación del reparto" })).toBeInTheDocument();
    expect(
      screen.getByText("Desde qué día empieza a contar el coeficiente de reparto de cada punto de suministro."),
    ).toBeVisible();
  });

  it("reports how many points have a date, against the total", () => {
    renderPanel();

    expect(screen.getByText("2 de 5 puntos con fecha de aplicación")).toBeVisible();
  });

  it("states the zero-distribution consequence as visible text", () => {
    renderPanel();

    expect(screen.getByText(/no reciben producción de la planta/)).toBeVisible();
  });

  it("says what happens to self-consumption and surplus in the meantime, without naming the pipeline", () => {
    // The admin needs the consequence — the figures lag — not the name of the
    // provider the fallback data comes from.
    renderPanel();

    expect(
      screen.getByText(/su autoconsumo y sus excedentes solo se muestran con los datos de la distribuidora/i),
    ).toBeVisible();
    expect(screen.queryByText(/datadis/i)).not.toBeInTheDocument();
  });

  it("reports progress against a fully applied set without claiming anything is pending", () => {
    renderPanel({ coefficients: [coefficient("1", APPLIED), coefficient("2", APPLIED)] });

    expect(screen.getByText("2 de 2 puntos con fecha de aplicación")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Registrar fechas/ })).not.toBeInTheDocument();
  });

  it("reports the outstanding points without repeating the next step's action", () => {
    // "Registrar fechas" is the next-step banner's stage-5 action, offered for
    // exactly as long as points are outstanding. The panel reports progress; a
    // button here would put the same action twice on one screen.
    renderPanel();

    expect(screen.getByText("2 de 5 puntos con fecha de aplicación")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Registrar fechas/ })).not.toBeInTheDocument();
  });

  it("offers no action of its own at all", () => {
    renderPanel();

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  describe("on a superseded agreement", () => {
    it("offers no action to start, and says why the schedule is finished", () => {
      renderPanel({ isClosed: true });

      expect(screen.queryByRole("button", { name: /Registrar fechas/ })).not.toBeInTheDocument();
      expect(screen.getByText("Todos los puntos tienen fecha de fin.")).toBeVisible();
    });

    it("never claims the record is read-only — row-level corrections stay reachable", () => {
      // Correcting a date and reopening a closed coefficient are still offered
      // in the coefficient table, and reopening one revives the agreement.
      renderPanel({ isClosed: true });

      expect(screen.queryByText(/solo lectura|no admite cambios/i)).not.toBeInTheDocument();
    });

    it("still reports the closing progress", () => {
      renderPanel({ isClosed: true });

      expect(screen.getByText("2 de 5 puntos con fecha de aplicación")).toBeVisible();
    });
  });
});
