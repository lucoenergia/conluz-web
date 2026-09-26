import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
  SharingAgreementReferenceResponseStatus,
} from "../../api/models";
import type { CurrentCoefficientResponse, SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import { SharingAgreementApplicationPanel } from "./SharingAgreementApplicationPanel";

const PENDING = SharingAgreementPartitionCoefficientResponseApplicationState.PENDING;
const APPLIED = SharingAgreementPartitionCoefficientResponseApplicationState.APPLIED;
const OPEN = SharingAgreementPartitionCoefficientResponseEndState.OPEN;

const NEW_SUPPLY_CONSEQUENCE =
  "Los puntos de suministro nuevos en la planta no reciben producción hasta que registres su fecha de aplicación. " +
  "Mientras tanto, su autoconsumo y sus excedentes solo se muestran con los datos de la distribuidora, que llegan " +
  "con varios días de retraso.";

const IN_FORCE: CurrentCoefficientResponse = {
  coefficient: 0.25,
  validFrom: "2023-01-01T00:00:00Z",
  sharingAgreement: { id: "sa-previous", name: "Reparto 2023", status: SharingAgreementReferenceResponseStatus.SUPERSEDED },
};

function coefficient(
  id: string,
  applicationState: SharingAgreementPartitionCoefficientResponseApplicationState,
  currentCoefficient: CurrentCoefficientResponse | null = null,
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
    currentCoefficient,
  };
}

/**
 * Three pending, two applied — never a single-element collection. One pending
 * point is new to the plant (no coefficient in force); the other two stay on
 * their previous coefficient.
 */
const MIXED = [
  coefficient("1", APPLIED, IN_FORCE),
  coefficient("2", APPLIED),
  coefficient("3", PENDING, IN_FORCE),
  coefficient("4", PENDING),
  coefficient("5", PENDING, IN_FORCE),
];

/** Every pending point still has a coefficient in force, so none goes without production. */
const PENDING_ALL_IN_FORCE = [
  coefficient("1", APPLIED),
  coefficient("2", PENDING, IN_FORCE),
  coefficient("3", PENDING, IN_FORCE),
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

  // AC9.
  it("warns about points new to the plant while one of them is still pending", () => {
    renderPanel();

    expect(screen.getByText(NEW_SUPPLY_CONSEQUENCE)).toBeVisible();
  });

  // AC8.
  it("reports progress without the warning when every pending point still has a coefficient in force", () => {
    renderPanel({ coefficients: PENDING_ALL_IN_FORCE });

    expect(screen.getByText("1 de 3 puntos con fecha de aplicación")).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Puntos con fecha de aplicación" })).toHaveAttribute(
      "aria-valuenow",
      String(Math.round((1 / 3) * 100)),
    );
    expect(screen.queryByText(/no reciben producción/)).not.toBeInTheDocument();
  });

  it("never styles the warning as an alert — an incomplete application is a normal state", () => {
    renderPanel();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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

  it("drops the zero-distribution warning once every point has a date", () => {
    // A historical agreement has had its dates recorded for a long time. The
    // warning describes points without one, so on that agreement it describes
    // nothing and reads as a contradiction under "2 de 2".
    renderPanel({ coefficients: [coefficient("1", APPLIED), coefficient("2", APPLIED)] });

    expect(screen.queryByText(/no reciben producción/)).not.toBeInTheDocument();
  });

  it("drops the zero-distribution warning on a closed agreement whose points all have dates", () => {
    renderPanel({ coefficients: [coefficient("1", APPLIED), coefficient("2", APPLIED)], isClosed: true });

    expect(screen.queryByText(/no reciben producción/)).not.toBeInTheDocument();
    expect(screen.getByText("Todos los puntos tienen fecha de fin.")).toBeVisible();
  });

  it("shows no warning when the agreement has no coefficients at all", () => {
    renderPanel({ coefficients: [] });

    expect(screen.queryByText(/no reciben producción/)).not.toBeInTheDocument();
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
