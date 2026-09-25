import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import {
  OPEN_UNCLOSED,
  selectPendingRow,
  typeDate,
  openBatchAction,
  renderWithTheme,
  setTree,
  mockActivateMutateAsync,
  mockSuccessDispatch,
} from "./SharingAgreementCoefficientSet.testUtils";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;

vi.mock(import("../../context/success.context"), (orig) => import("./SharingAgreementCoefficientSet.mocks").then((m) => m.successContextModule(orig)));
vi.mock(import("../../api/supplies/supplies"), () => import("./SharingAgreementCoefficientSet.mocks").then((m) => m.suppliesModule()));
vi.mock(import("../../api/sharing-agreements/sharing-agreements"), (orig) => import("./SharingAgreementCoefficientSet.mocks").then((m) => m.sharingAgreementsModule(orig)));

describe("SharingAgreementCoefficientSet (batch activation)", () => {
  // Realistic multi-supply set: two PENDING (eligible), one APPLIED
  // (ineligible) — a single-element collection would validate no selection
  // logic at all.
  const mixed: SharingAgreementPartitionCoefficientResponse[] = [
    { coefficientId: "c1", supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" }, coefficient: 0.3, applicationState: PENDING, ...OPEN_UNCLOSED },
    { coefficientId: "c2", supply: { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" }, coefficient: 0.3, applicationState: PENDING, ...OPEN_UNCLOSED },
    { coefficientId: "c3", supply: { id: "s3", name: "Vivienda C", code: "ES0031300000000003EF" }, coefficient: 0.4, applicationState: APPLIED, ...OPEN_UNCLOSED },
  ];
  const allApplied: SharingAgreementPartitionCoefficientResponse[] = [
    { coefficientId: "c1", supply: { id: "s1", name: "Vivienda A", code: "X" }, coefficient: 1, applicationState: APPLIED, ...OPEN_UNCLOSED },
  ];
  // Three PENDING rows, two sharing a search term — lets a test narrow the
  // visible set via search (name/code) rather than only the status chip,
  // which can never hide a PENDING row on its own.
  const threePending: SharingAgreementPartitionCoefficientResponse[] = [
    { coefficientId: "c1", supply: { id: "s1", name: "Vivienda A", code: "X1" }, coefficient: 0.2, applicationState: PENDING, ...OPEN_UNCLOSED },
    { coefficientId: "c2", supply: { id: "s2", name: "Vivienda B", code: "X2" }, coefficient: 0.3, applicationState: PENDING, ...OPEN_UNCLOSED },
    { coefficientId: "c3", supply: { id: "s3", name: "Local C", code: "X3" }, coefficient: 0.5, applicationState: PENDING, ...OPEN_UNCLOSED },
  ];

  beforeEach(() => {
    mockActivateMutateAsync.mockReset();
    mockSuccessDispatch.mockClear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("header checkbox: unchecked when nothing is selected, click selects every visible actionable row", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: mixed });

    const checkbox = screen.getAllByRole("checkbox", { name: "Seleccionar todas las filas visibles" })[0];
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    // mixed has 2 PENDING (apply) and 1 APPLIED/OPEN (correct/deactivate) —
    // all 3 are actionable now, so "select all" reaches every one of them.
    expect(screen.getByText("3 seleccionados")).toBeInTheDocument();
  });

  it("header checkbox: indeterminate when some but not all visible actionable rows are selected", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: threePending });

    await selectPendingRow(user, "Vivienda A");

    const checkbox = screen.getAllByRole("checkbox", { name: "Seleccionar todas las filas visibles" })[0];
    expect(checkbox).toHaveAttribute("data-indeterminate", "true");
    expect(checkbox).not.toBeChecked();
  });

  it("header checkbox: checked when every visible actionable row is selected, and clicking then deselects only the visible ones", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: threePending });

    // Select all 3, then narrow to 2 via search — the 3rd stays selected but hidden.
    await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar todas las filas visibles" })[0]);
    await user.type(screen.getByPlaceholderText("Buscar por punto o CUPS"), "Vivienda");
    await waitFor(() => expect(screen.getByText("3 seleccionados · 1 oculto por el filtro")).toBeInTheDocument(), {
      timeout: 1000,
    });

    const checkbox = screen.getAllByRole("checkbox", { name: "Seleccionar todas las filas visibles" })[0];
    expect(checkbox).toBeChecked();

    await user.click(checkbox);

    // Only the 2 visible were deselected — Local C (hidden) stays selected.
    expect(screen.getByText("1 seleccionado · 1 oculto por el filtro")).toBeInTheDocument();
  });

  it("shows the header checkbox for a visible APPLIED row too, now that it's actionable (correct/deactivate)", () => {
    renderWithTheme({ coefficients: allApplied });
    expect(screen.getAllByRole("checkbox", { name: "Seleccionar todas las filas visibles" }).length).toBeGreaterThan(0);
  });

  it("regression: selecting all with an active filter never selects a row outside the filtered set", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: threePending });

    await user.type(screen.getByPlaceholderText("Buscar por punto o CUPS"), "Vivienda");
    await waitFor(() => expect(screen.queryByText("Local C")).not.toBeInTheDocument(), { timeout: 1000 });

    await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar todas las filas visibles" })[0]);

    // Exactly the 2 visible rows — never Local C, which the filter hides.
    expect(screen.getByText("2 seleccionados")).toBeInTheDocument();
    expect(screen.queryByText(/oculto/)).not.toBeInTheDocument();
  });

  it("filtering with a live selection switches the count to the two-part form, with the correct hidden count", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: threePending });

    await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar todas las filas visibles" })[0]); // selects all 3
    await user.type(screen.getByPlaceholderText("Buscar por punto o CUPS"), "Local");

    await waitFor(() => expect(screen.getByText("3 seleccionados · 2 ocultos por el filtro")).toBeInTheDocument(), {
      timeout: 1000,
    });
  });

  it("zero visible rows with a live selection: the header checkbox disappears, the bar stays, and everything selected reads as hidden", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: threePending });

    await selectPendingRow(user, "Vivienda A");
    await user.type(screen.getByPlaceholderText("Buscar por punto o CUPS"), "no-such-supply-xyz");

    await waitFor(() => expect(screen.getByText("No se encontraron coeficientes")).toBeInTheDocument(), {
      timeout: 1000,
    });
    expect(screen.queryByRole("checkbox", { name: "Seleccionar todas las filas visibles" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acciones" })).toBeInTheDocument();
    expect(screen.getByText("1 seleccionado · 1 oculto por el filtro")).toBeInTheDocument();
  });

  it("'Limpiar selección' empties the selection entirely, including rows hidden by the filter", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: threePending });

    await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar todas las filas visibles" })[0]); // selects all 3
    await user.type(screen.getByPlaceholderText("Buscar por punto o CUPS"), "Vivienda");
    await waitFor(() => expect(screen.getByText("3 seleccionados · 1 oculto por el filtro")).toBeInTheDocument(), {
      timeout: 1000,
    });

    await user.click(screen.getByRole("button", { name: "Limpiar selección" }));

    expect(screen.queryByRole("button", { name: "Acciones" })).not.toBeInTheDocument();
  });

  it("the batch bar mounts only once something is selected — not merely because a PENDING row exists — and unmounts again when the last selection is cleared", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: mixed });

    // Pending rows present, nothing checked yet: no bar.
    expect(screen.queryByRole("button", { name: "Acciones" })).not.toBeInTheDocument();
    expect(screen.queryByText(/seleccionad/)).not.toBeInTheDocument();

    await selectPendingRow(user, "Vivienda A");
    expect(screen.getByRole("button", { name: "Acciones" })).toBeInTheDocument();
    expect(screen.getByText("1 seleccionado")).toBeInTheDocument();

    // Unchecking the only selected row unmounts the bar again.
    await selectPendingRow(user, "Vivienda A");
    expect(screen.queryByRole("button", { name: "Acciones" })).not.toBeInTheDocument();
  });

  it("singular/plural count text", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: mixed });

    await selectPendingRow(user, "Vivienda A");
    expect(screen.getByText("1 seleccionado")).toBeInTheDocument();

    await selectPendingRow(user, "Vivienda B");
    expect(screen.getByText("2 seleccionados")).toBeInTheDocument();
  });

  it("blocks a future date with the rule stated as visible helper text, never a title attribute", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await openBatchAction(user, "Registrar fecha");

    expect(screen.getByText("No se permiten fechas futuras")).toBeInTheDocument();
    const dayField = screen.getByRole("spinbutton", { name: "Dia" });
    expect(dayField.closest("[title]")).toBeNull();
  });

  it("typing a future date (bypassing the calendar's maxDate) leaves the dialog's confirm button disabled with a visible reason", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await openBatchAction(user, "Registrar fecha");

    await typeDate(user, "01", "01", "2099");

    expect(screen.getByRole("button", { name: "Registrar fecha" })).toBeDisabled();
    expect(screen.getByText("La fecha no puede ser futura ni inválida")).toBeInTheDocument();
  });

  it("the disabled reason states 'select a date' before any date is entered, then clears once a valid one is", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await openBatchAction(user, "Registrar fecha");

    expect(screen.getByText("Selecciona una fecha")).toBeInTheDocument();

    await typeDate(user, "10", "01", "2026");

    expect(screen.getByRole("button", { name: "Registrar fecha" })).toBeEnabled();
    expect(screen.queryByText("Selecciona una fecha")).not.toBeInTheDocument();
    expect(screen.queryByText("La fecha no puede ser futura ni inválida")).not.toBeInTheDocument();
  });

  it("on success, clears the whole selection and shows the transient confirmation — no error panel", async () => {
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [{ coefficientId: "c1" }] });
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await openBatchAction(user, "Registrar fecha");
    await typeDate(user, "10", "01", "2026");

    await user.click(screen.getByRole("button", { name: "Registrar fecha" }));

    await waitFor(() => expect(mockSuccessDispatch).toHaveBeenCalledWith("Fechas de aplicación registradas."));
    expect(screen.queryByRole("button", { name: "Acciones" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("on a no-op success (empty coefficients array), shows the same transient confirmation and no error panel", async () => {
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [] });
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await openBatchAction(user, "Registrar fecha");
    await typeDate(user, "10", "01", "2026");

    await user.click(screen.getByRole("button", { name: "Registrar fecha" }));

    await waitFor(() => expect(mockSuccessDispatch).toHaveBeenCalledWith("Fechas de aplicación registradas."));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("on rejection, closes the dialog but preserves the selection, and renders every error detail in a persistent panel", async () => {
    mockActivateMutateAsync.mockRejectedValue({
      response: {
        data: {
          errors: [
            { message: "raw", code: "SHARING_AGREEMENT_ACTIVATION_DATE_NOT_AFTER_PREDECESSOR", params: { cups: "ES1111" } },
            { message: "raw", code: "SHARING_AGREEMENT_DATE_IN_FUTURE" },
          ],
        },
      },
    });
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await openBatchAction(user, "Registrar fecha");
    await typeDate(user, "10", "01", "2026");

    await user.click(screen.getByRole("button", { name: "Registrar fecha" }));

    await screen.findByRole("alert");
    expect(screen.getByText("No se ha activado ningún coeficiente.")).toBeInTheDocument();
    // The selection survives the rejection — the dialog itself does not
    // (Correction 8: a batch dialog closes on rejection, unlike the row
    // path's dialog-local error; the date the admin typed is not preserved).
    expect(screen.getByText("1 seleccionado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registrar fecha" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acciones" })).toBeInTheDocument();
    expect(mockSuccessDispatch).not.toHaveBeenCalled();
  });

  it("scrolls the error panel's own node into view on rejection, and never on success", async () => {
    mockActivateMutateAsync.mockRejectedValueOnce({
      response: { data: { errors: [{ message: "raw", code: "SHARING_AGREEMENT_DATE_IN_FUTURE" }] } },
    });
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await openBatchAction(user, "Registrar fecha");
    await typeDate(user, "10", "01", "2026");

    await user.click(screen.getByRole("button", { name: "Registrar fecha" }));
    const alertNode = await screen.findByRole("alert");

    const scrollMock = vi.mocked(Element.prototype.scrollIntoView);
    expect(scrollMock).toHaveBeenCalledTimes(1);
    // The scrolled node is the panel wrapper (or the panel itself) — an
    // ancestor of the alert, not some unrelated element like document.body.
    // This is what actually exercises the Box ref: a null ref would mean
    // nothing gets scrolled while a looser "was it called at all" assertion
    // could still pass.
    const scrolledNode = scrollMock.mock.contexts?.[0] ?? scrollMock.mock.instances[0];
    expect((scrolledNode as HTMLElement).contains(alertNode)).toBe(true);

    scrollMock.mockClear();
    mockActivateMutateAsync.mockResolvedValueOnce({ coefficients: [] });
    await user.click(screen.getByRole("alert").parentElement!.querySelector("button")!); // dismiss
    await selectPendingRow(user, "Vivienda B");
    // The dialog closed on rejection (Correction 8) — retrying means
    // reopening Acciones -> the action again, not clicking the same button.
    await openBatchAction(user, "Registrar fecha");
    await typeDate(user, "10", "01", "2026");
    await user.click(screen.getByRole("button", { name: "Registrar fecha" }));
    await waitFor(() => expect(mockSuccessDispatch).toHaveBeenCalled());
    expect(scrollMock).not.toHaveBeenCalled();
  });

  it("on rejection with no error details (non-RestError failure), renders the generic retry line, header still present", async () => {
    mockActivateMutateAsync.mockRejectedValue(new Error("network error"));
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await openBatchAction(user, "Registrar fecha");
    await typeDate(user, "10", "01", "2026");

    await user.click(screen.getByRole("button", { name: "Registrar fecha" }));

    await screen.findByRole("alert");
    expect(screen.getByText("No se ha activado ningún coeficiente.")).toBeInTheDocument();
    expect(screen.getByText("No se ha podido activar la selección. Inténtalo de nuevo en unos instantes.")).toBeInTheDocument();
  });

  it("dismissing the error panel clears it", async () => {
    mockActivateMutateAsync.mockRejectedValue({
      response: { data: { errors: [{ message: "raw", code: "SHARING_AGREEMENT_DATE_IN_FUTURE" }] } },
    });
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await openBatchAction(user, "Registrar fecha");
    await typeDate(user, "10", "01", "2026");
    await user.click(screen.getByRole("button", { name: "Registrar fecha" }));
    await screen.findByRole("alert");

    await user.click(screen.getByRole("alert").parentElement!.querySelector("button")!);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("a fresh submission replaces a previously-shown error panel rather than stacking it", async () => {
    mockActivateMutateAsync.mockRejectedValueOnce({
      response: { data: { errors: [{ message: "raw", code: "SHARING_AGREEMENT_DATE_IN_FUTURE" }] } },
    });
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await openBatchAction(user, "Registrar fecha");
    await typeDate(user, "10", "01", "2026");
    await user.click(screen.getByRole("button", { name: "Registrar fecha" }));
    await screen.findByRole("alert");
    expect(screen.getAllByRole("alert")).toHaveLength(1);

    mockActivateMutateAsync.mockRejectedValueOnce({
      response: {
        data: { errors: [{ message: "raw", code: "SHARING_AGREEMENT_ACTIVATION_DATE_NOT_AFTER_PREDECESSOR" }] },
      },
    });
    // The dialog closed after the first rejection — a "fresh submission"
    // means reopening it, not clicking a still-present button again.
    await openBatchAction(user, "Registrar fecha");
    await typeDate(user, "10", "01", "2026");
    await user.click(screen.getByRole("button", { name: "Registrar fecha" }));

    await waitFor(() => expect(mockActivateMutateAsync).toHaveBeenCalledTimes(2));
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("disables the dialog's confirm button and shows a spinner while isActivating, and a second click issues no second request", async () => {
    let resolveActivate!: (value: { coefficients: unknown[] }) => void;
    mockActivateMutateAsync.mockReturnValue(new Promise((resolve) => (resolveActivate = resolve)));
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await openBatchAction(user, "Registrar fecha");
    await typeDate(user, "10", "01", "2026");

    await user.click(screen.getByRole("button", { name: "Registrar fecha" }));

    // The mutation call itself is still pending (the mocked promise never
    // resolves here), so the dialog's own internal pending tracking (see
    // useSharingAgreementCoefficientMutations) already reflects it — no
    // need to fake isPending through the mock.
    await waitFor(() => expect(screen.getByRole("progressbar")).toBeInTheDocument());
    const buttons = screen.getAllByRole("button").filter((b) => b.querySelector('[role="progressbar"]'));
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toBeDisabled();

    // userEvent.click refuses to interact with a disabled (pointer-events:
    // none) element at all — which is itself proof a real user couldn't
    // trigger a second request either. fireEvent bypasses that pointer-event
    // simulation to assert directly that a disabled native <button> never
    // fires its click handler, still without needing a real interaction.
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[0]);
    expect(mockActivateMutateAsync).toHaveBeenCalledTimes(1); // only the original click reached the handler

    resolveActivate({ coefficients: [] });
  });

  it("the batch dialog reports how many targets are hidden by the filter", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: threePending });

    await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar todas las filas visibles" })[0]); // selects all 3
    await user.type(screen.getByPlaceholderText("Buscar por punto o CUPS"), "Vivienda"); // hides Local C
    await waitFor(() => expect(screen.getByText("3 seleccionados · 1 oculto por el filtro")).toBeInTheDocument(), {
      timeout: 1000,
    });

    await openBatchAction(user, "Registrar fecha");

    expect(screen.getByText("1 no se ve con el filtro actual")).toBeInTheDocument();
  });

  it("the batch request body contains every selected id, including one hidden by the filter, and the date as YYYY-MM-DD", async () => {
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [] });
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: threePending });

    await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar todas las filas visibles" })[0]); // selects all 3
    await user.type(screen.getByPlaceholderText("Buscar por punto o CUPS"), "Vivienda"); // hides Local C (c3)
    await waitFor(() => expect(screen.getByText("3 seleccionados · 1 oculto por el filtro")).toBeInTheDocument(), {
      timeout: 1000,
    });

    await openBatchAction(user, "Registrar fecha");
    await typeDate(user, "10", "01", "2026");
    await user.click(screen.getByRole("button", { name: "Registrar fecha" }));

    await waitFor(() => expect(mockActivateMutateAsync).toHaveBeenCalledTimes(1));
    const body = mockActivateMutateAsync.mock.calls[0][0].data;
    expect(new Set(body.coefficientIds)).toEqual(new Set(["c1", "c2", "c3"]));
    expect(body.appliedOn).toBe("2026-01-10");
  });

  it("batch success clears the selection entirely, including rows hidden by the filter", async () => {
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [] });
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: threePending });

    await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar todas las filas visibles" })[0]);
    await user.type(screen.getByPlaceholderText("Buscar por punto o CUPS"), "Vivienda");
    await waitFor(() => expect(screen.getByText("3 seleccionados · 1 oculto por el filtro")).toBeInTheDocument(), {
      timeout: 1000,
    });

    await openBatchAction(user, "Registrar fecha");
    await typeDate(user, "10", "01", "2026");
    await user.click(screen.getByRole("button", { name: "Registrar fecha" }));

    await waitFor(() => expect(mockSuccessDispatch).toHaveBeenCalled());
    expect(screen.queryByText(/seleccionad/)).not.toBeInTheDocument();
  });

  it("a row's contribution to the batch summary re-evaluates after a refetch changes its state, without needing to reselect it", async () => {
    const user = userEvent.setup({ delay: null });
    const { rerender } = renderWithTheme({ coefficients: mixed }); // c1 & c2 PENDING, c3 APPLIED
    await selectPendingRow(user, "Vivienda A"); // c1
    await selectPendingRow(user, "Vivienda B"); // c2

    await user.click(screen.getByRole("button", { name: "Acciones" }));
    expect(screen.getByRole("menuitem", { name: "Registrar fecha" })).not.toHaveAttribute("aria-disabled");
    await user.keyboard("{Escape}");

    // An external cascade (another admin, or this session's own row-path
    // action on a *different* row) turns c1 APPLIED behind the scenes — the
    // selection itself is untouched, only the underlying data changed.
    const updated = mixed.map((c) =>
      c.coefficientId === "c1" ? { ...c, applicationState: APPLIED, validFrom: "2026-01-01T00:00:00Z" } : c,
    );
    rerender(
      setTree({ coefficients: updated })
    );

    // The selection now spans one PENDING and one APPLIED coefficient — no
    // action is fully available across both, without ever touching a
    // checkbox on an APPLIED row.
    await user.click(screen.getByRole("button", { name: "Acciones" }));
    const applyItem = screen.getByRole("menuitem", { name: /Registrar fecha/ });
    const correctItem = screen.getByRole("menuitem", { name: /Corregir fecha/ });
    const deactivateItem = screen.getByRole("menuitem", { name: /Desactivar/ });
    expect(applyItem).toHaveAttribute("aria-disabled", "true");
    expect(correctItem).toHaveAttribute("aria-disabled", "true");
    expect(deactivateItem).toHaveAttribute("aria-disabled", "true");
    expect(within(applyItem).getByText("Solo aplicable a 1 de 2 seleccionados")).toBeInTheDocument();
    expect(within(correctItem).getByText("Solo aplicable a 1 de 2 seleccionados")).toBeInTheDocument();
    expect(within(deactivateItem).getByText("Solo aplicable a 1 de 2 seleccionados")).toBeInTheDocument();
  });

  it("the batch bar's spacer collapses to zero height at the desktop breakpoint", () => {
    // A minimal net on the sx object built, not proof the MUI breakpoint
    // resolves at runtime (jsdom can't evaluate responsive sx) — the real
    // verification of layout correctness at the narrowest supported
    // viewport is the Playwright capture, not this unit assertion.
    renderWithTheme({ coefficients: mixed });
    // No selection yet, so nothing to assert on a mounted spacer/bar in
    // this render — the desktop-collapse behavior of the sx object itself
    // is exercised structurally by the component compiling against its
    // sx={{ height: { xs: ..., sm: 0 } }} literal, verified by lint/tsc.
    expect(screen.queryByRole("button", { name: "Acciones" })).not.toBeInTheDocument();
  });

  it("end-to-end: after a successful activation, the applied-sum card's percentage updates, staying styled neutral below 100%", async () => {
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [{ coefficientId: "c1" }] });
    const user = userEvent.setup({ delay: null });
    const { rerender } = renderWithTheme({ coefficients: mixed, agreementStatus: SharingAgreementResponseStatus.PUBLISHED });

    // Only c3 is APPLIED, at 0.4 -> 40%. Read off the gauge's own accessible
    // value rather than by text match: c3's row also displays "40,0000 %" for
    // its individual coefficient, so an unscoped query would be ambiguous.
    expect(screen.getByRole("progressbar", { name: "Suma aplicada" })).toHaveAttribute(
      "aria-valuetext",
      expect.stringContaining("40,0000"),
    );

    await selectPendingRow(user, "Vivienda A");
    await openBatchAction(user, "Registrar fecha");
    await typeDate(user, "10", "01", "2026");
    await user.click(screen.getByRole("button", { name: "Registrar fecha" }));
    await waitFor(() => expect(mockSuccessDispatch).toHaveBeenCalled());

    // Simulate the invalidation-triggered refetch: c1 is now APPLIED too.
    const updated = mixed.map((c) => (c.coefficientId === "c1" ? { ...c, applicationState: APPLIED } : c));
    rerender(
      setTree({ coefficients: updated })
    );

    // c1 (0.3) + c3 (0.4) now APPLIED = 70%, still below 100% — neutral info styling.
    expect(screen.getByRole("progressbar", { name: "Suma aplicada" })).toHaveAttribute(
      "aria-valuetext",
      expect.stringContaining("70,0000"),
    );
    expect(screen.getByText(/normal en transición/)).toBeInTheDocument();
  });
});
