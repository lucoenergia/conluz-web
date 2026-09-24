import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "../../theme";
import { ErrorProvider } from "../../context/error.context";
import {
  SharingAgreementCoefficientSet,
  type SharingAgreementCoefficientSetProps,
} from "./SharingAgreementCoefficientSet";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";
import {
  OPEN_UNCLOSED,
  selectPendingRow,
  typeDate,
  openBatchAction,
  renderWithTheme,
  coefficients,
} from "./SharingAgreementCoefficientSet.testUtils";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN, OPEN_ORPHAN, CLOSED } = SharingAgreementPartitionCoefficientResponseEndState;

const mockMutateAsync = vi.fn();
const mockActivateMutateAsync = vi.fn();
const mockDeactivateMutateAsync = vi.fn();
const mockCloseMutateAsync = vi.fn();
const mockReopenMutateAsync = vi.fn();
const mockSuccessDispatch = vi.fn();
// Mutable so a single test can exercise the in-flight (isActivating) state —
// mirrors how the real hook forwards the mutation's own isPending.
let mockIsActivating = false;
let mockIsDeactivating = false;
let mockIsClosing = false;
let mockIsReopening = false;

vi.mock("../../context/community.context", async () => {
  const actual = await vi.importActual<typeof import("../../context/community.context")>("../../context/community.context");
  return { ...actual, useActiveCommunity: () => "community-1" };
});

vi.mock("../../context/success.context", () => ({
  useSuccessDispatch: () => mockSuccessDispatch,
}));

vi.mock("../../api/supplies/supplies", () => ({
  getAllSupplies: vi.fn().mockResolvedValue({
    items: [{ id: "s10", name: "Trastero Nuevo", code: "ES999" }],
    number: 0,
    totalPages: 1,
  }),
  // The row menu's history drawer reads this. Resolved-and-empty by default so
  // it never interferes with the assertions in this file; the drawer's own
  // behaviour is covered in CoefficientHistoryDrawer.spec.tsx.
  useGetPartitionCoefficientHistory: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock("../../api/sharing-agreements/sharing-agreements", async () => {
  const actual = await vi.importActual<typeof import("../../api/sharing-agreements/sharing-agreements")>(
    "../../api/sharing-agreements/sharing-agreements",
  );
  return {
    ...actual,
    useReplacePartitionCoefficients: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
    useActivatePartitionCoefficients: () => ({ mutateAsync: mockActivateMutateAsync, isPending: mockIsActivating }),
    useDeactivatePartitionCoefficients: () => ({ mutateAsync: mockDeactivateMutateAsync, isPending: mockIsDeactivating }),
    useClosePartitionCoefficients: () => ({ mutateAsync: mockCloseMutateAsync, isPending: mockIsClosing }),
    useReopenPartitionCoefficients: () => ({ mutateAsync: mockReopenMutateAsync, isPending: mockIsReopening }),
  };
});

describe("SharingAgreementCoefficientSet (lifecycle actions)", () => {
  // Realistic multi-supply set covering both end-action states plus a
  // PENDING row (no menu at all) and a supply with no name (CUPS-only naming).
  const lifecycleMixed: SharingAgreementPartitionCoefficientResponse[] = [
    {
      coefficientId: "c1",
      supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" },
      coefficient: 0.3,
      applicationState: APPLIED,
      validFrom: "2024-01-01T00:00:00Z",
      validTo: null,
      endState: OPEN_ORPHAN,
      endDate: null,
      currentCoefficient: null,
    },
    {
      coefficientId: "c2",
      supply: { id: "s2", name: "", code: "ES0031300000000002CD" },
      coefficient: 0.3,
      applicationState: APPLIED,
      validFrom: "2024-01-01T00:00:00Z",
      validTo: "2024-06-01T00:00:00Z",
      endState: CLOSED,
      endDate: "2024-06-01T00:00:00Z",
      currentCoefficient: null,
    },
    {
      coefficientId: "c3",
      supply: { id: "s3", name: "Vivienda C", code: "ES0031300000000003EF" },
      coefficient: 0.4,
      applicationState: PENDING,
      ...OPEN_UNCLOSED,
    },
  ];

  const allPendingLifecycle: SharingAgreementPartitionCoefficientResponse[] = [
    { coefficientId: "p1", supply: { id: "s1", name: "Vivienda A", code: "X1" }, coefficient: 0.5, applicationState: PENDING, ...OPEN_UNCLOSED },
    { coefficientId: "p2", supply: { id: "s2", name: "Vivienda B", code: "X2" }, coefficient: 0.5, applicationState: PENDING, ...OPEN_UNCLOSED },
  ];

  beforeEach(() => {
    mockActivateMutateAsync.mockReset();
    mockDeactivateMutateAsync.mockReset();
    mockCloseMutateAsync.mockReset();
    mockReopenMutateAsync.mockReset();
    mockSuccessDispatch.mockClear();
    mockIsActivating = false;
    mockIsDeactivating = false;
    mockIsClosing = false;
    mockIsReopening = false;
    Element.prototype.scrollIntoView = vi.fn();
  });

  function coefficientSetElement(props: Partial<SharingAgreementCoefficientSetProps> & Pick<SharingAgreementCoefficientSetProps, "coefficients">) {
    return (
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <ErrorProvider>
          <ThemeProvider theme={theme}>
            <SharingAgreementCoefficientSet
              plantId="plant-1"
              sharingAgreementId="agreement-1"
              installedPowerKw={100}
              agreementStatus={SharingAgreementResponseStatus.PUBLISHED}
              {...props}
            />
          </ThemeProvider>
        </ErrorProvider>
      </QueryClientProvider>
    );
  }

  /** Opens the row menu via its accessible name — matches the ⋯ button's own aria-label (supply name, or CUPS when there's no name). */
  async function openRowMenu(user: ReturnType<typeof userEvent.setup>, label: string) {
    const buttons = screen.getAllByRole("button", { name: `Más acciones para ${label}` });
    await user.click(buttons[0]);
  }

  it("renders the actions column even when every visible row is PENDING — apply is now available on every one", () => {
    // Table and card render in parallel in jsdom (CSS-only breakpoint), so
    // every row's button appears twice.
    renderWithTheme({ coefficients: allPendingLifecycle });
    expect(screen.getAllByRole("button", { name: /Más acciones/ })).toHaveLength(allPendingLifecycle.length * 2);
  });

  it("keeps the actions column visible once every visible row is actionable, including under a filter that leaves only PENDING rows", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: lifecycleMixed });

    expect(screen.getAllByRole("button", { name: /Más acciones/ }).length).toBeGreaterThan(0);

    // "Sin aplicar" leaves only c3 (PENDING) visible — it offers apply, so
    // the column stays, unlike before "apply" existed as a row action.
    // Table + card render in parallel in jsdom, so the one visible row's
    // button still appears twice.
    await user.click(screen.getByRole("button", { name: "Sin aplicar" }));

    expect(screen.getAllByRole("button", { name: /Más acciones/ })).toHaveLength(2);
  });

  it("names the CUPS with the supply name when one exists", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: lifecycleMixed });

    await openRowMenu(user, "Vivienda A");
    await user.click(screen.getByRole("menuitem", { name: "Corregir fecha" }));

    expect(screen.getByText("Vivienda A (CUPS ES0031300000000001AB)")).toBeInTheDocument();
  });

  it("registering a date via apply on a PENDING row calls activateCoefficients, the same mutation correct uses", async () => {
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [{ coefficientId: "c3" }] });
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: lifecycleMixed });

    await openRowMenu(user, "Vivienda C");
    await user.click(screen.getByRole("menuitem", { name: "Registrar fecha" }));
    await typeDate(user, "10", "01", "2026");
    await user.click(screen.getByRole("button", { name: "Registrar fecha" }));

    await waitFor(() => expect(mockActivateMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockActivateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ coefficientIds: ["c3"], appliedOn: "2026-01-10" }) }),
    );
  });

  it("the apply dialog carries no retroactivity warning, unlike correct", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: lifecycleMixed });

    await openRowMenu(user, "Vivienda C");
    await user.click(screen.getByRole("menuitem", { name: "Registrar fecha" }));

    expect(screen.queryByText(/cambiará de forma retroactiva/)).not.toBeInTheDocument();
  });

  it("names the CUPS only, never the UUID, when the supply has no name", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: lifecycleMixed });

    await openRowMenu(user, "ES0031300000000002CD");
    await user.click(screen.getByRole("menuitem", { name: "Reabrir" }));

    expect(screen.getByText("CUPS ES0031300000000002CD")).toBeInTheDocument();
    expect(screen.queryByText("s2")).not.toBeInTheDocument();
  });

  it("correcting an APPLIED coefficient calls activateCoefficients, not a new mutation", async () => {
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [{ coefficientId: "c1" }] });
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: lifecycleMixed });

    await openRowMenu(user, "Vivienda A");
    await user.click(screen.getByRole("menuitem", { name: "Corregir fecha" }));
    await typeDate(user, "10", "01", "2026");
    await user.click(screen.getByRole("button", { name: "Confirmar y recalcular" }));

    await waitFor(() => expect(mockActivateMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockActivateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ coefficientIds: ["c1"], appliedOn: "2026-01-10" }) }),
    );
    expect(mockDeactivateMutateAsync).not.toHaveBeenCalled();
    expect(mockCloseMutateAsync).not.toHaveBeenCalled();
    expect(mockReopenMutateAsync).not.toHaveBeenCalled();
  });

  it("a batch correction excludes a row already corrected individually via ⋯ — APPLIED rows are selectable now", async () => {
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [] });
    const threeApplied: SharingAgreementPartitionCoefficientResponse[] = [
      { coefficientId: "a1", supply: { id: "s1", name: "Vivienda A", code: "X1" }, coefficient: 0.3, applicationState: APPLIED, validFrom: "2025-01-01T00:00:00Z", validTo: null, endState: OPEN, endDate: null, currentCoefficient: null },
      { coefficientId: "a2", supply: { id: "s2", name: "Vivienda B", code: "X2" }, coefficient: 0.3, applicationState: APPLIED, validFrom: "2025-02-01T00:00:00Z", validTo: null, endState: OPEN, endDate: null, currentCoefficient: null },
      { coefficientId: "a3", supply: { id: "s3", name: "Vivienda C", code: "X3" }, coefficient: 0.4, applicationState: APPLIED, validFrom: "2025-03-01T00:00:00Z", validTo: null, endState: OPEN, endDate: null, currentCoefficient: null },
    ];
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: threeApplied });

    await selectPendingRow(user, "Vivienda A");
    await selectPendingRow(user, "Vivienda B");
    await selectPendingRow(user, "Vivienda C");
    expect(screen.getByText("3 seleccionados")).toBeInTheDocument();

    // Correct Vivienda A individually via its own ⋯ menu.
    await openRowMenu(user, "Vivienda A");
    await user.click(screen.getByRole("menuitem", { name: "Corregir fecha" }));
    await typeDate(user, "10", "01", "2026");
    await user.click(screen.getByRole("button", { name: "Confirmar y recalcular" }));
    await waitFor(() => expect(screen.getByText("2 seleccionados")).toBeInTheDocument());

    // Now batch-correct the remaining two.
    await openBatchAction(user, "Corregir fecha");
    await typeDate(user, "15", "01", "2026");
    await user.click(screen.getByRole("button", { name: "Confirmar y recalcular" }));

    await waitFor(() => expect(mockActivateMutateAsync).toHaveBeenCalledTimes(2));
    const secondCallBody = mockActivateMutateAsync.mock.calls[1][0].data;
    expect(new Set(secondCallBody.coefficientIds)).toEqual(new Set(["a2", "a3"]));
  });

  it("on rejection, the close dialog stays open and renders every returned message", async () => {
    mockCloseMutateAsync.mockRejectedValue({
      response: {
        data: {
          errors: [{ message: "raw", code: "SHARING_AGREEMENT_COEFFICIENT_NOT_ACTIVE", params: { cups: "ES0031300000000001AB" } }],
        },
      },
    });
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: lifecycleMixed });

    await openRowMenu(user, "Vivienda A");
    await user.click(screen.getByRole("menuitem", { name: "Cerrar (baja)" }));
    await typeDate(user, "10", "01", "2026");
    await user.click(screen.getByRole("button", { name: "Cerrar (baja)" }));

    await waitFor(() => expect(mockCloseMutateAsync).toHaveBeenCalledTimes(1));
    // The bullet prefix ("• ") lives in the same text node as the message, so
    // match on the message content rather than the full exact string.
    expect(
      await screen.findByText(/El coeficiente de ES0031300000000001AB no está activo, así que no se puede cerrar\./),
    ).toBeInTheDocument();
    // The dialog itself is still open — its own confirm button is still present.
    expect(screen.getByRole("button", { name: "Cerrar (baja)" })).toBeInTheDocument();
  });

  it("closes the dialog silently, with no error, when the underlying coefficient's actions no longer include the open action", async () => {
    const user = userEvent.setup({ delay: null });
    const { rerender } = renderWithTheme({ coefficients: lifecycleMixed });

    await openRowMenu(user, "Vivienda A");
    await user.click(screen.getByRole("menuitem", { name: "Cerrar (baja)" }));
    expect(screen.getByRole("button", { name: "Cerrar (baja)" })).toBeInTheDocument();

    // c1 is no longer OPEN_ORPHAN — "close" is no longer among its actions.
    const updated = lifecycleMixed.map((c) => (c.coefficientId === "c1" ? { ...c, endState: CLOSED, endDate: "2026-01-01T00:00:00Z" } : c));
    rerender(coefficientSetElement({ coefficients: updated }));

    expect(screen.queryByRole("button", { name: "Cerrar (baja)" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("closes the dialog silently when the underlying coefficient disappears entirely", async () => {
    const user = userEvent.setup({ delay: null });
    const { rerender } = renderWithTheme({ coefficients: lifecycleMixed });

    await openRowMenu(user, "Vivienda A");
    await user.click(screen.getByRole("menuitem", { name: "Cerrar (baja)" }));
    expect(screen.getByRole("button", { name: "Cerrar (baja)" })).toBeInTheDocument();

    const withoutC1 = lifecycleMixed.filter((c) => c.coefficientId !== "c1");
    rerender(coefficientSetElement({ coefficients: withoutC1 }));

    expect(screen.queryByRole("button", { name: "Cerrar (baja)" })).not.toBeInTheDocument();
  });

  it("changing the filter to hide the dialog's row leaves the dialog open — it resolves from the full list, not the filtered one", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: lifecycleMixed });

    await openRowMenu(user, "Vivienda A");
    await user.click(screen.getByRole("menuitem", { name: "Cerrar (baja)" }));
    expect(screen.getByRole("button", { name: "Cerrar (baja)" })).toBeInTheDocument();

    // "Sin aplicar" hides c1 (APPLIED) from the visible list entirely. The
    // open modal marks the rest of the page aria-hidden, so the chip must be
    // queried with hidden:true — same as a screen-reader user, a sighted one
    // still can't reach it behind the modal, which is exactly the point:
    // this proves the *state* survives, not that it's reachable mid-dialog.
    await user.click(screen.getByRole("button", { name: "Sin aplicar", hidden: true }));

    expect(screen.getByRole("button", { name: "Cerrar (baja)" })).toBeInTheDocument();
  });

  it("a successful row-path action drops that row from a live selection, leaving the others selected", async () => {
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [{ coefficientId: "p1" }] });
    const threePendingRows: SharingAgreementPartitionCoefficientResponse[] = [
      { coefficientId: "p1", supply: { id: "s1", name: "Vivienda A", code: "X1" }, coefficient: 0.3, applicationState: PENDING, ...OPEN_UNCLOSED },
      { coefficientId: "p2", supply: { id: "s2", name: "Vivienda B", code: "X2" }, coefficient: 0.3, applicationState: PENDING, ...OPEN_UNCLOSED },
      { coefficientId: "p3", supply: { id: "s3", name: "Vivienda C", code: "X3" }, coefficient: 0.4, applicationState: PENDING, ...OPEN_UNCLOSED },
    ];
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: threePendingRows });

    await selectPendingRow(user, "Vivienda A");
    await selectPendingRow(user, "Vivienda B");
    await selectPendingRow(user, "Vivienda C");
    expect(screen.getByText("3 seleccionados")).toBeInTheDocument();

    await openRowMenu(user, "Vivienda A");
    await user.click(screen.getByRole("menuitem", { name: "Registrar fecha" }));
    await typeDate(user, "10", "01", "2026");
    await user.click(screen.getByRole("button", { name: "Registrar fecha" }));

    await waitFor(() => expect(screen.getByText("2 seleccionados")).toBeInTheDocument());
    expect(screen.getAllByRole("checkbox", { name: "Seleccionar Vivienda A" })[0]).not.toBeChecked();
  });

  it("a failed row-path action leaves the selection untouched", async () => {
    mockActivateMutateAsync.mockRejectedValue({
      response: { data: { errors: [{ message: "raw", code: "SHARING_AGREEMENT_DATE_IN_FUTURE" }] } },
    });
    const threePendingRows: SharingAgreementPartitionCoefficientResponse[] = [
      { coefficientId: "p1", supply: { id: "s1", name: "Vivienda A", code: "X1" }, coefficient: 0.3, applicationState: PENDING, ...OPEN_UNCLOSED },
      { coefficientId: "p2", supply: { id: "s2", name: "Vivienda B", code: "X2" }, coefficient: 0.3, applicationState: PENDING, ...OPEN_UNCLOSED },
    ];
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients: threePendingRows });

    await selectPendingRow(user, "Vivienda A");
    await selectPendingRow(user, "Vivienda B");
    expect(screen.getByText("2 seleccionados")).toBeInTheDocument();

    await openRowMenu(user, "Vivienda A");
    await user.click(screen.getByRole("menuitem", { name: "Registrar fecha" }));
    await typeDate(user, "10", "01", "2026");
    await user.click(screen.getByRole("button", { name: "Registrar fecha" }));

    await waitFor(() => expect(mockActivateMutateAsync).toHaveBeenCalledTimes(1));
    expect(screen.getByText("2 seleccionados")).toBeInTheDocument();
  });

  it("disables every row's ⋯ button while any coefficient mutation is pending, not just the one in flight", () => {
    // A deactivate elsewhere on the page is pending — every row's menu
    // button must freeze, not only the row whose action is actually running,
    // since re-opening another row's menu would act on data the in-flight
    // mutation's refetch hasn't refreshed yet.
    mockIsDeactivating = true;
    renderWithTheme({ coefficients: lifecycleMixed });

    const buttons = screen.getAllByRole("button", { name: /Más acciones/ });
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((button) => expect(button).toBeDisabled());
  });

  it("a dialog cannot be dismissed via Cancel while its own mutation is pending", async () => {
    // Escape and backdrop-click route through the same onCancel handler as
    // the Cancel button, so guarding it here guards all three dismissal
    // vectors at once.
    const user = userEvent.setup({ delay: null });
    const { rerender } = renderWithTheme({ coefficients: lifecycleMixed });

    await openRowMenu(user, "Vivienda A");
    await user.click(screen.getByRole("menuitem", { name: "Cerrar (baja)" }));
    expect(screen.getByRole("button", { name: "Cerrar (baja)" })).toBeInTheDocument();

    mockIsClosing = true;
    rerender(coefficientSetElement({ coefficients: lifecycleMixed }));

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByRole("button", { name: "Cerrar (baja)" })).toBeInTheDocument();
  });

  it("reserves the same fixed-width action cell on every row, whether or not it has a visible button", () => {
    renderWithTheme({ coefficients: lifecycleMixed });

    const dataRows = screen.getAllByRole("row").slice(1); // drop the header row
    expect(dataRows).toHaveLength(3);
    for (const row of dataRows) {
      const cells = within(row).getAllByRole("cell");
      const actionCell = cells[cells.length - 1];
      expect(actionCell.className).toContain("MuiTableCell-paddingCheckbox");
    }
  });
});

describe("SharingAgreementCoefficientSet (anomalous draft)", () => {
  const ANOMALY_COPY = /contiene coeficientes marcados como aplicados o cerrados/;

  // A DRAFT is guaranteed all-PENDING/all-OPEN by the backend: APPLIED requires
  // publishing first, and revert-to-draft is refused once anything is applied.
  // Rendering this combination as an ordinary draft is what guarantees nobody
  // reports the integrity breach it represents.
  const anomalousDraft: SharingAgreementPartitionCoefficientResponse[] = [
    { coefficientId: "a1", supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" }, coefficient: 0.6, applicationState: APPLIED, ...OPEN_UNCLOSED },
    { coefficientId: "a2", supply: { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" }, coefficient: 0.4, applicationState: PENDING, ...OPEN_UNCLOSED },
  ];

  const healthyDraft: SharingAgreementPartitionCoefficientResponse[] = [
    { coefficientId: "h1", supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" }, coefficient: 0.6, applicationState: PENDING, ...OPEN_UNCLOSED },
    { coefficientId: "h2", supply: { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" }, coefficient: 0.4, applicationState: PENDING, ...OPEN_UNCLOSED },
  ];

  it("says so, rather than silently growing two columns and leaving the reader to notice", () => {
    renderWithTheme({ coefficients: anomalousDraft, agreementStatus: SharingAgreementResponseStatus.DRAFT });

    const warning = screen.getByText(ANOMALY_COPY);
    expect(warning).toBeInTheDocument();
    expect(warning.closest(".MuiAlert-root")).toHaveClass("MuiAlert-colorWarning");
  });

  it("names what to do about it — review before publishing or deleting", () => {
    renderWithTheme({ coefficients: anomalousDraft, agreementStatus: SharingAgreementResponseStatus.DRAFT });

    expect(screen.getByText(/antes de poner el acuerdo en vigor o eliminarlo/)).toBeInTheDocument();
  });

  it("stays silent for a healthy draft", () => {
    renderWithTheme({ coefficients: healthyDraft, agreementStatus: SharingAgreementResponseStatus.DRAFT });

    expect(screen.queryByText(ANOMALY_COPY)).not.toBeInTheDocument();
  });

  it("stays silent for a PUBLISHED agreement, where applied coefficients are the normal shape", () => {
    renderWithTheme({ coefficients: anomalousDraft, agreementStatus: SharingAgreementResponseStatus.PUBLISHED });

    expect(screen.queryByText(ANOMALY_COPY)).not.toBeInTheDocument();
  });

  it("stays silent for a SUPERSEDED agreement", () => {
    renderWithTheme({ coefficients: anomalousDraft, agreementStatus: SharingAgreementResponseStatus.SUPERSEDED });

    expect(screen.queryByText(ANOMALY_COPY)).not.toBeInTheDocument();
  });
});

describe("SharingAgreementCoefficientSet (installed power)", () => {
  it("carries the installed power while editing in kW, where it is the working reference", () => {
    renderWithTheme({ coefficients, agreementStatus: SharingAgreementResponseStatus.DRAFT });

    // Identity, in read mode, belongs to the header's tiles — printing it here
    // too would be the same number in two places on one screen.
    expect(screen.queryByText(/Potencia instalada de la planta/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Editar a mano" }));

    expect(screen.getByText("Potencia instalada de la planta: 100,00 kW")).toBeInTheDocument();
  });

  it("omits it when the agreement has none", () => {
    renderWithTheme({
      coefficients,
      installedPowerKw: undefined,
      agreementStatus: SharingAgreementResponseStatus.PUBLISHED,
    });

    expect(screen.queryByText(/^Potencia instalada:/)).not.toBeInTheDocument();
  });
});

describe("SharingAgreementCoefficientSet (the split section)", () => {
  const DRAFT = SharingAgreementResponseStatus.DRAFT;

  it("names the section and says what it is for", () => {
    renderWithTheme({ coefficients, agreementStatus: DRAFT });

    expect(screen.getByRole("heading", { level: 2, name: "Reparto" })).toBeInTheDocument();
    expect(screen.getByText(/Qué parte de la producción de la planta corresponde a cada punto de suministro/)).toBeVisible();
  });

  // Phase 3: what the coefficients actually affect, stated where they are edited.
  it("states that the coefficients drive real-time self-consumption and surplus, not only the production split", () => {
    renderWithTheme({ coefficients, agreementStatus: DRAFT });

    expect(
      screen.getByText(/base del cálculo de autoconsumo y excedentes en tiempo real/),
    ).toBeVisible();
  });

  // AC14 — the figure most likely to be misread as an entitlement. The
  // explanation used to be a paragraph above the list; it now sits on the
  // column itself so the dense read-only screen carries less standing prose.
  it("explains the assigned-power column from an info affordance on the column", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients, agreementStatus: DRAFT });

    expect(screen.queryByText(/parte de la potencia instalada que corresponde a cada punto/)).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Qué es la potencia asignada" })[0]);

    const explanation = await screen.findByRole("tooltip");
    expect(explanation).toHaveTextContent(/parte de la potencia instalada que corresponde a cada punto/);
    expect(explanation).toHaveTextContent(/No es potencia garantizada/);
  });

  // AC9 — importing authors coefficients, so it belongs next to manual editing.
  it("offers manual editing and TXT import side by side on a draft", async () => {
    const onImportRequest = vi.fn();
    const user = userEvent.setup({ delay: null });
    renderWithTheme({ coefficients, agreementStatus: DRAFT, onImportRequest });

    expect(screen.getByRole("button", { name: "Editar a mano" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Importar TXT" }));
    expect(onImportRequest).toHaveBeenCalledTimes(1);
  });

  it("offers both authoring actions on an empty draft too, rather than only manual editing", () => {
    const onImportRequest = vi.fn();
    renderWithTheme({ coefficients: [], agreementStatus: DRAFT, onImportRequest });

    expect(screen.getByRole("heading", { level: 2, name: "Reparto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar a mano" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importar TXT" })).toBeInTheDocument();
  });

  it.each([
    ["published", SharingAgreementResponseStatus.PUBLISHED],
    ["superseded", SharingAgreementResponseStatus.SUPERSEDED],
  ])("offers neither authoring action on a %s agreement — both endpoints 409 there", (_label, agreementStatus) => {
    renderWithTheme({ coefficients, agreementStatus, onImportRequest: vi.fn() });

    expect(screen.queryByRole("button", { name: "Editar a mano" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Importar TXT" })).not.toBeInTheDocument();
  });

  it("yields its authoring actions when the next-step banner is already promoting them", () => {
    // Two identically-labelled buttons on one screen is the duplication this
    // section exists to avoid; the banner wins while authoring is the step.
    renderWithTheme({
      coefficients,
      agreementStatus: DRAFT,
      onImportRequest: vi.fn(),
      showAuthoringActions: false,
    });

    expect(screen.queryByRole("button", { name: "Editar a mano" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Importar TXT" })).not.toBeInTheDocument();
    // The section itself is unaffected.
    expect(screen.getByRole("heading", { level: 2, name: "Reparto" })).toBeInTheDocument();
  });

  it("starts editing when the page asks for it, without the user touching the section's own button", async () => {
    const { rerender } = renderWithTheme({ coefficients, agreementStatus: DRAFT, editRequestId: 0 });

    expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();

    rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
        <ErrorProvider>
          <ThemeProvider theme={theme}>
            <SharingAgreementCoefficientSet
              plantId="plant-1"
              sharingAgreementId="agreement-1"
              installedPowerKw={100}
              coefficients={coefficients}
              agreementStatus={DRAFT}
              editRequestId={1}
            />
          </ThemeProvider>
        </ErrorProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("brings the section into view when the editor is opened from elsewhere on the page", async () => {
    // The banner that asked for it sits at the top; opening a table the user
    // cannot see is the same as not opening it.
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;

    try {
      const { rerender } = renderWithTheme({ coefficients, agreementStatus: DRAFT, editRequestId: 0 });
      expect(scrollIntoView).not.toHaveBeenCalled();

      rerender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
          <ErrorProvider>
            <ThemeProvider theme={theme}>
              <SharingAgreementCoefficientSet
                plantId="plant-1"
                sharingAgreementId="agreement-1"
                installedPowerKw={100}
                coefficients={coefficients}
                agreementStatus={DRAFT}
                editRequestId={1}
              />
            </ThemeProvider>
          </ErrorProvider>
        </QueryClientProvider>,
      );

      expect(await screen.findByRole("button", { name: "Guardar" })).toBeInTheDocument();
      expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "start" }));
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("does not open the editor on mount just because a request id is present", () => {
    // A page that remounts with a non-zero nonce must not land in the editor.
    renderWithTheme({ coefficients, agreementStatus: DRAFT, editRequestId: 7 });

    expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
  });
});

// AC8. Three PENDING and two APPLIED: a single-element collection would prove
// nothing about which rows are surfaced.
