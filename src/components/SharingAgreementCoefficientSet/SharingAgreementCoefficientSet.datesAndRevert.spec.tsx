import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementReferenceResponseStatus,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import { getAllSupplies } from "../../api/supplies/supplies";
import { buildSupply } from "../../test/fixtures";
import {
  FIXTURE_COEFFICIENTS,
  FIXTURE_INSTALLED_POWER_KW,
  REPRODUCTION_ROW_NAME,
  REPRODUCTION_ROW_SUPPLY_ID,
} from "../../pages/production/__fixtures__/coefficientSet63kw";
import {
  OPEN_UNCLOSED,
  renderWithTheme,
  rerenderWithTheme,
  renderCoefficientSet,
  setTree,
  mockMutateAsync,
  mockSuccessDispatch,
} from "./SharingAgreementCoefficientSet.testUtils";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;

vi.mock(import("../../context/success.context"), (orig) => import("./SharingAgreementCoefficientSet.mocks").then((m) => m.successContextModule(orig)));
vi.mock(import("../../api/supplies/supplies"), () => import("./SharingAgreementCoefficientSet.mocks").then((m) => m.suppliesModule()));
vi.mock(import("../../api/sharing-agreements/sharing-agreements"), (orig) => import("./SharingAgreementCoefficientSet.mocks").then((m) => m.sharingAgreementsModule(orig)));

describe("SharingAgreementCoefficientSet (registering dates)", () => {
  // A new request id scrolls the table into view, and jsdom has no
  // scrollIntoView. This used to pass only because earlier describes in the
  // same file left their stub installed.
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  const mixed: SharingAgreementPartitionCoefficientResponse[] = [
    { coefficientId: "1", supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" }, coefficient: 0.2, applicationState: APPLIED, ...OPEN_UNCLOSED },
    { coefficientId: "2", supply: { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" }, coefficient: 0.2, applicationState: APPLIED, ...OPEN_UNCLOSED },
    { coefficientId: "3", supply: { id: "s3", name: "Local C", code: "ES0031300000000003EF" }, coefficient: 0.2, applicationState: PENDING, ...OPEN_UNCLOSED },
    { coefficientId: "4", supply: { id: "s4", name: "Nave D", code: "ES0031300000000004GH" }, coefficient: 0.2, applicationState: PENDING, ...OPEN_UNCLOSED },
    { coefficientId: "5", supply: { id: "s5", name: "Taller E", code: "ES0031300000000005IJ" }, coefficient: 0.2, applicationState: PENDING, ...OPEN_UNCLOSED },
  ];

  function renderWithRequestId(registerDatesRequestId: number) {
    return setTree({ coefficients: mixed, registerDatesRequestId });
  }

  it("narrows the table to the rows still waiting for a date", async () => {
    const { rerender } = renderCoefficientSet(renderWithRequestId(0));

    expect(screen.getAllByText("Vivienda A").length).toBeGreaterThan(0);

    rerender(renderWithRequestId(1));

    await waitFor(() => expect(screen.queryByText("Vivienda A")).not.toBeInTheDocument());
    expect(screen.queryByText("Vivienda B")).not.toBeInTheDocument();
    for (const name of ["Local C", "Nave D", "Taller E"]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("button", { name: "Sin aplicar" })).toHaveClass(/MuiChip-colorWarning/);
  });

  it("selects nothing — which rows share a date is the admin's judgement, not a default", async () => {
    // The distributor rarely applies every point on the same day. Arriving with
    // every row ticked invites a bulk action nobody decided on.
    const { rerender } = renderCoefficientSet(renderWithRequestId(0));
    rerender(renderWithRequestId(1));

    await waitFor(() => expect(screen.queryByText("Vivienda A")).not.toBeInTheDocument());

    expect(screen.queryByRole("button", { name: "Acciones" })).not.toBeInTheDocument();
    for (const checkbox of screen.queryAllByRole("checkbox")) {
      expect(checkbox).not.toBeChecked();
    }
  });

  it("still lets the admin select the rows it surfaced, and only then offers the batch bar", async () => {
    const user = userEvent.setup({ delay: null });
    const { rerender } = renderCoefficientSet(renderWithRequestId(0));
    rerender(renderWithRequestId(1));

    await waitFor(() => expect(screen.queryByText("Vivienda A")).not.toBeInTheDocument());

    await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar Local C" })[0]);
    await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar Nave D" })[0]);

    expect(await screen.findByRole("button", { name: "Acciones" })).toBeInTheDocument();
    expect(screen.getByText("2 seleccionados")).toBeInTheDocument();
    expect(screen.queryByText(/oculto/)).not.toBeInTheDocument();
  });

  it("clears a leftover search, so nothing the filter surfaced stays hidden behind it", async () => {
    const user = userEvent.setup({ delay: null });
    const { rerender } = renderCoefficientSet(renderWithRequestId(0));

    await user.type(screen.getByPlaceholderText("Buscar por punto o CUPS"), "Taller");
    await waitFor(() => expect(screen.queryByText("Local C")).not.toBeInTheDocument());

    rerender(renderWithRequestId(1));

    await waitFor(() => expect(screen.getAllByText("Local C").length).toBeGreaterThan(0));
    expect(screen.getByPlaceholderText("Buscar por punto o CUPS")).toHaveValue("");
  });

  it("brings the table into view, since the panel that asked is above it", async () => {
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;

    try {
      const { rerender } = renderCoefficientSet(renderWithRequestId(0));
      expect(scrollIntoView).not.toHaveBeenCalled();

      rerender(renderWithRequestId(1));

      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "start" })));
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("does nothing on mount just because a request id is present", () => {
    renderCoefficientSet(renderWithRequestId(4));

    expect(screen.getAllByText("Vivienda A").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Acciones" })).not.toBeInTheDocument();
  });
});

describe("SharingAgreementCoefficientSet (current coefficient column)", () => {
  const IN_FORCE = {
    coefficient: 0.35,
    validFrom: "2024-01-01T00:00:00Z",
    sharingAgreement: {
      id: "a0",
      name: "Acuerdo anterior",
      status: SharingAgreementReferenceResponseStatus.SUPERSEDED,
    },
  };

  /** A clean DRAFT set where the first two supplies are already on a coefficient. */
  const withCurrent: SharingAgreementPartitionCoefficientResponse[] = [
    { coefficientId: "1", supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" }, coefficient: 0.4, applicationState: PENDING, ...OPEN_UNCLOSED, currentCoefficient: IN_FORCE },
    { coefficientId: "2", supply: { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" }, coefficient: 0.35, applicationState: PENDING, ...OPEN_UNCLOSED, currentCoefficient: IN_FORCE },
    { coefficientId: "3", supply: { id: "s3", name: "Local C", code: "ES0031300000000003EF" }, coefficient: 0.25, applicationState: PENDING, ...OPEN_UNCLOSED },
  ];

  const withoutCurrent = withCurrent.map((c) => ({ ...c, currentCoefficient: null }));

  it("mounts the column on a DRAFT where at least one supply is already on a coefficient", () => {
    renderWithTheme({ coefficients: withCurrent, agreementStatus: SharingAgreementResponseStatus.DRAFT });
    expect(screen.getByText("Coeficiente actual")).toBeInTheDocument();
  });

  it("is absent on PUBLISHED even when every row carries one — the row's own value IS the one in force", () => {
    renderWithTheme({ coefficients: withCurrent, agreementStatus: SharingAgreementResponseStatus.PUBLISHED });
    expect(screen.queryByText("Coeficiente actual")).not.toBeInTheDocument();
  });

  it("is absent on SUPERSEDED for the same reason", () => {
    renderWithTheme({ coefficients: withCurrent, agreementStatus: SharingAgreementResponseStatus.SUPERSEDED });
    expect(screen.queryByText("Coeficiente actual")).not.toBeInTheDocument();
  });

  it("is absent on a DRAFT where no supply is on one yet — a first agreement, where the column would be all dashes", () => {
    renderWithTheme({ coefficients: withoutCurrent, agreementStatus: SharingAgreementResponseStatus.DRAFT });
    expect(screen.queryByText("Coeficiente actual")).not.toBeInTheDocument();
  });

  it("stays mounted while a search filters out every row that has one", () => {
    // Deliberately unlike the actions column, which does track the filter: a
    // display-only column appearing and vanishing as the admin types is noise.
    renderWithTheme({ coefficients: withCurrent, agreementStatus: SharingAgreementResponseStatus.DRAFT });
    fireEvent.change(screen.getByPlaceholderText(/Buscar/i), { target: { value: "Local C" } });
    expect(screen.getByText("Coeficiente actual")).toBeInTheDocument();
  });
});

/**
 * These are integration tests over the deliberately large 29-supply fixture
 * AC12 calls for, and the component renders a table row AND a card for every
 * one of them (a CSS-only breakpoint, so jsdom mounts both). One mount costs
 * ~400ms locally and several tests need two full editor sessions, which puts
 * them around 1.4s here — comfortably inside the 5s default on a fast machine
 * and over it on a loaded one.
 *
 * Raised for the whole block rather than the one test that tipped over first,
 * since they all share the same fixed cost. The cost is mount time, not a
 * hang: repeated runs land within ~50ms of each other, and profiling put the
 * element lookups at effectively zero. 20s leaves a real regression or a
 * genuine hang still failing, just later.
 */

describe("SharingAgreementCoefficientSet (per-row revert)", { timeout: 20_000 }, () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
    mockSuccessDispatch.mockClear();
    vi.mocked(getAllSupplies).mockResolvedValue({
      items: [buildSupply({ id: REPRODUCTION_ROW_SUPPLY_ID, name: REPRODUCTION_ROW_NAME, code: "ES0031300000000015XY" })],
      number: 0,
      totalPages: 1,
    });
  });

  function renderEditor() {
    const view = renderWithTheme({
      coefficients: FIXTURE_COEFFICIENTS,
      installedPowerKw: FIXTURE_INSTALLED_POWER_KW,
      agreementStatus: SharingAgreementResponseStatus.DRAFT,
    });
    fireEvent.click(screen.getByRole("button", { name: "Editar a mano" }));
    return view;
  }

  /**
   * Scopes queries to one supply's desktop table row. The mobile card renders
   * in parallel in jsdom (CSS-only breakpoint) and shares the same row state,
   * so driving the table instance is enough — but only the table rows carry
   * role="row", which is what makes the scoping unambiguous.
   */
  const rowOf = (supplyName: string) =>
    screen.getAllByRole("row").find((row) => within(row).queryByText(supplyName))!;
  const inputOf = (supplyName: string) => within(rowOf(supplyName)).getByRole("textbox") as HTMLInputElement;
  const revertButtonsIn = (supplyName: string) =>
    within(rowOf(supplyName)).queryAllByRole("button", { name: /Restaurar valor inicial/ });
  /** Every instance on screen — two per modified row, since table and card both render. */
  const allRevertButtons = () => screen.queryAllByRole("button", { name: /Restaurar valor inicial/ });

  // AC2
  it("offers no revert control until a row actually differs from its session-start value", () => {
    renderEditor();
    expect(allRevertButtons()).toHaveLength(0);

    fireEvent.change(inputOf(REPRODUCTION_ROW_NAME), { target: { value: "1,90" } });

    expect(revertButtonsIn(REPRODUCTION_ROW_NAME)).toHaveLength(1);
    // Only that row: the control is per-row state, not a session-wide flag.
    expect(allRevertButtons()).toHaveLength(2);
    expect(revertButtonsIn("Vivienda 1ºA")).toHaveLength(0);
  });

  // AC1, end to end through the UI. The displayed text reads "1,94" both
  // before and after the detour, so the sum is what proves the coefficient
  // itself came back.
  it("restores the exact coefficient, and the exact sum, when the control is used", async () => {
    const user = userEvent.setup({ delay: null });
    renderEditor();
    expect(screen.getByText("Suma de los coeficientes: 100,0000 %")).toBeInTheDocument();
    expect(inputOf(REPRODUCTION_ROW_NAME)).toHaveValue("1,94");

    fireEvent.change(inputOf(REPRODUCTION_ROW_NAME), { target: { value: "1,90" } });
    expect(screen.getByText("Suma de los coeficientes: 99,9389 %")).toBeInTheDocument();

    await user.click(revertButtonsIn(REPRODUCTION_ROW_NAME)[0]);

    expect(inputOf(REPRODUCTION_ROW_NAME)).toHaveValue("1,94");
    expect(screen.getByText("Suma de los coeficientes: 100,0000 %")).toBeInTheDocument();
    expect(allRevertButtons()).toHaveLength(0);
  });

  // The regression the issue opens with: retyping the value you saw does NOT
  // bring the set back, which is why an explicit control is needed at all.
  it("a hand-retyped kW value leaves the set off 100 %, and the control is still offered", async () => {
    const user = userEvent.setup({ delay: null });
    renderEditor();

    await user.clear(inputOf(REPRODUCTION_ROW_NAME));
    await user.type(inputOf(REPRODUCTION_ROW_NAME), "1,94");

    expect(inputOf(REPRODUCTION_ROW_NAME)).toHaveValue("1,94");
    expect(screen.getByText("Suma de los coeficientes: 100,0024 %")).toBeInTheDocument();
    expect(revertButtonsIn(REPRODUCTION_ROW_NAME)).toHaveLength(1);

    await user.click(revertButtonsIn(REPRODUCTION_ROW_NAME)[0]);

    expect(screen.getByText("Suma de los coeficientes: 100,0000 %")).toBeInTheDocument();
  });

  // AC7, through the UI: one change event restating what the field shows.
  it.each([
    ["kW", "kw", "1,94"],
    ["percentage", "%", "3,0770"],
  ])("restating the displayed %s value in a single edit changes nothing", async (_label, toggle, displayed) => {
    const user = userEvent.setup({ delay: null });
    renderEditor();
    if (toggle === "%") await user.click(screen.getByRole("button", { name: "%" }));
    expect(inputOf(REPRODUCTION_ROW_NAME)).toHaveValue(displayed);

    fireEvent.change(inputOf(REPRODUCTION_ROW_NAME), { target: { value: displayed } });

    expect(screen.getByText("Suma de los coeficientes: 100,0000 %")).toBeInTheDocument();
    expect(allRevertButtons()).toHaveLength(0);
  });

  // AC3 — visibility is a comparison of values, never a "touched" flag.
  it("withdraws the control when a row is retyped by hand to its exact original value", async () => {
    const user = userEvent.setup({ delay: null });
    renderEditor();
    await user.click(screen.getByRole("button", { name: "%" }));

    fireEvent.change(inputOf(REPRODUCTION_ROW_NAME), { target: { value: "3,0000" } });
    expect(revertButtonsIn(REPRODUCTION_ROW_NAME)).toHaveLength(1);

    fireEvent.change(inputOf(REPRODUCTION_ROW_NAME), { target: { value: "3,0770" } });

    expect(revertButtonsIn(REPRODUCTION_ROW_NAME)).toHaveLength(0);
    expect(screen.getByText("Suma de los coeficientes: 100,0000 %")).toBeInTheDocument();
  });

  // AC4 — nothing to go back to.
  it("never offers the control on a supply added during the session", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({
      coefficients: [],
      installedPowerKw: FIXTURE_INSTALLED_POWER_KW,
      agreementStatus: SharingAgreementResponseStatus.DRAFT,
    });
    fireEvent.click(screen.getByRole("button", { name: /Editar a mano/ }));

    await user.click(screen.getByRole("button", { name: "Añadir suministro" }));
    await screen.findByText(REPRODUCTION_ROW_NAME);
    await user.click(screen.getByText(REPRODUCTION_ROW_NAME));
    await user.click(screen.getByRole("button", { name: /Añadir \(1\)/ }));
    await waitFor(() => expect(screen.getAllByText(REPRODUCTION_ROW_NAME).length).toBeGreaterThan(0));

    expect(allRevertButtons()).toHaveLength(0);

    fireEvent.change(inputOf(REPRODUCTION_ROW_NAME), { target: { value: "2,00" } });

    expect(allRevertButtons()).toHaveLength(0);
  });

  // AC5 — a removed-and-re-added supply is still in the snapshot, so it is
  // measured like any other row. It returns with no value at all, which
  // already differs from what it started as.
  it("offers the control on a re-added supply before anything is typed, and restores its original value", async () => {
    const user = userEvent.setup({ delay: null });
    renderEditor();

    await user.click(within(rowOf(REPRODUCTION_ROW_NAME)).getByRole("button", { name: /^Quitar/ }));
    await waitFor(() => expect(screen.queryByText(REPRODUCTION_ROW_NAME)).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Añadir suministro" }));
    await screen.findByText(REPRODUCTION_ROW_NAME);
    await user.click(screen.getByText(REPRODUCTION_ROW_NAME));
    await user.click(screen.getByRole("button", { name: /Añadir \(1\)/ }));
    await waitFor(() => expect(screen.getAllByText(REPRODUCTION_ROW_NAME).length).toBeGreaterThan(0));

    expect(inputOf(REPRODUCTION_ROW_NAME)).toHaveValue("");
    expect(revertButtonsIn(REPRODUCTION_ROW_NAME)).toHaveLength(1);

    await user.click(revertButtonsIn(REPRODUCTION_ROW_NAME)[0]);

    expect(inputOf(REPRODUCTION_ROW_NAME)).toHaveValue("1,94");
    expect(screen.getByText("Suma de los coeficientes: 100,0000 %")).toBeInTheDocument();
  });

  // AC8 — the text regenerates in whichever unit is active.
  it("regenerates the field in the active unit when reverting in percentage mode", async () => {
    const user = userEvent.setup({ delay: null });
    renderEditor();
    await user.click(screen.getByRole("button", { name: "%" }));

    fireEvent.change(inputOf(REPRODUCTION_ROW_NAME), { target: { value: "1,0000" } });
    await user.click(revertButtonsIn(REPRODUCTION_ROW_NAME)[0]);

    expect(inputOf(REPRODUCTION_ROW_NAME)).toHaveValue("3,0770");
  });

  // AC6 — several rows modified, all reverted, the set exactly as loaded.
  it("returns the sum to exactly the loaded sum once every modified row is reverted", async () => {
    const user = userEvent.setup({ delay: null });
    renderEditor();
    const targets = ["Vivienda 1ºB", REPRODUCTION_ROW_NAME, "Local Comercial 1", "Sala de la comunidad"];

    for (const name of targets) {
      fireEvent.change(inputOf(name), { target: { value: "2,50" } });
    }
    expect(screen.queryByText("Suma de los coeficientes: 100,0000 %")).not.toBeInTheDocument();
    expect(allRevertButtons()).toHaveLength(targets.length * 2);

    for (const name of targets) {
      await user.click(revertButtonsIn(name)[0]);
    }

    expect(screen.getByText("Suma de los coeficientes: 100,0000 %")).toBeInTheDocument();
    expect(allRevertButtons()).toHaveLength(0);
  });

  // AC9 — the editor closes on save, so the next session necessarily rebuilds
  // the snapshot from whatever the server now reports.
  it("rebuilds the snapshot from the saved set when the editor is reopened after a save", async () => {
    mockMutateAsync.mockResolvedValue({ coefficients: [] });
    const user = userEvent.setup({ delay: null });
    const { rerender } = renderEditor();

    fireEvent.change(inputOf(REPRODUCTION_ROW_NAME), { target: { value: "1,90" } });
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument());

    // What the server now returns for that supply: the value just saved.
    const saved = FIXTURE_COEFFICIENTS.map((c) =>
      c.supply?.id === REPRODUCTION_ROW_SUPPLY_ID ? { ...c, coefficient: 0.030159 } : c,
    );
    rerenderWithTheme(rerender, {
      coefficients: saved,
      installedPowerKw: FIXTURE_INSTALLED_POWER_KW,
      agreementStatus: SharingAgreementResponseStatus.DRAFT,
    });
    fireEvent.click(screen.getByRole("button", { name: "Editar a mano" }));

    // The saved value is the new baseline: unmodified, so no control.
    expect(inputOf(REPRODUCTION_ROW_NAME)).toHaveValue("1,90");
    expect(allRevertButtons()).toHaveLength(0);

    // And reverting now goes back to the saved value, not the pre-save one.
    fireEvent.change(inputOf(REPRODUCTION_ROW_NAME), { target: { value: "2,50" } });
    await user.click(revertButtonsIn(REPRODUCTION_ROW_NAME)[0]);

    expect(inputOf(REPRODUCTION_ROW_NAME)).toHaveValue("1,90");
  });

  it("drops the snapshot on cancel, so a later session cannot revert to an earlier one's values", async () => {
    const user = userEvent.setup({ delay: null });
    renderEditor();

    fireEvent.change(inputOf(REPRODUCTION_ROW_NAME), { target: { value: "1,90" } });
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar a mano" }));

    expect(inputOf(REPRODUCTION_ROW_NAME)).toHaveValue("1,94");
    expect(allRevertButtons()).toHaveLength(0);
  });

  it("names the supply in the control's accessible label, so 29 of them stay distinguishable", () => {
    renderEditor();

    fireEvent.change(inputOf(REPRODUCTION_ROW_NAME), { target: { value: "1,90" } });

    expect(
      screen.getAllByRole("button", { name: `Restaurar valor inicial de ${REPRODUCTION_ROW_NAME}` }),
    ).toHaveLength(2);
  });
});
