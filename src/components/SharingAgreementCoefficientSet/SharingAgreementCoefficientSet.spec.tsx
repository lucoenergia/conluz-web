import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "../../theme";
import { ErrorProvider } from "../../context/error.context";
import { SharingAgreementCoefficientSet, type SharingAgreementCoefficientSetProps } from "./SharingAgreementCoefficientSet";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN, OPEN_ORPHAN, CLOSED } = SharingAgreementPartitionCoefficientResponseEndState;
// Real coefficients never omit these; unused by any assertion in this file, so
// every fixture below spreads this in and only overrides what it's testing.
const OPEN_UNCLOSED = { validFrom: null, validTo: null, endState: OPEN, endDate: null };

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

/** Clicks a checkbox by accessible name — table and card render in parallel in jsdom (CSS-only breakpoint), so index [0] always picks the table's. */
async function selectPendingRow(user: ReturnType<typeof userEvent.setup>, supplyName: string) {
  await user.click(screen.getAllByRole("checkbox", { name: `Seleccionar ${supplyName}` })[0]);
}

/** Types a date into the batch bar's DatePicker via its section spinbuttons — the only interaction MUI's v7 field accepts under jsdom (no plain &lt;input&gt;, sections are contenteditable spinbuttons). */
async function typeDate(user: ReturnType<typeof userEvent.setup>, day: string, month: string, year: string) {
  await user.click(screen.getByRole("spinbutton", { name: "Day" }));
  await user.keyboard(day);
  await user.keyboard(month);
  await user.keyboard(year);
}

function renderWithTheme(props: Partial<SharingAgreementCoefficientSetProps> & Pick<SharingAgreementCoefficientSetProps, "coefficients">) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>,
  );
}

const coefficients: SharingAgreementPartitionCoefficientResponse[] = [
  { coefficientId: "1", supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" }, coefficient: 0.4, applicationState: APPLIED, ...OPEN_UNCLOSED },
  { coefficientId: "2", supply: { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" }, coefficient: 0.6, applicationState: PENDING, ...OPEN_UNCLOSED },
  { coefficientId: "3", supply: { id: "s3", name: "Nave Vacía", code: "ES0031300000000003EF" }, coefficient: 0, applicationState: APPLIED, ...OPEN_UNCLOSED },
];

describe("SharingAgreementCoefficientSet", () => {
  it("uses the exact search placeholder", () => {
    renderWithTheme({ coefficients });
    expect(screen.getByPlaceholderText("Buscar por punto o CUPS")).toBeInTheDocument();
  });

  it("renders the zero-coefficients empty state when the agreement has none at all", () => {
    renderWithTheme({ coefficients: [] });
    expect(screen.getByText("Sin coeficientes de reparto")).toBeInTheDocument();
    expect(screen.queryByText("No se encontraron coeficientes")).not.toBeInTheDocument();
  });

  it("never hides a coefficient: 0 row by default", () => {
    renderWithTheme({ coefficients });
    expect(screen.getAllByText("Nave Vacía").length).toBeGreaterThan(0);
  });

  it("renders the assigned energy column, derived from coefficient x installedPowerKw", () => {
    renderWithTheme({ coefficients });
    expect(screen.getByText("Energía asignada")).toBeInTheDocument();
    // Vivienda A: 40% of 100 kW
    expect(screen.getAllByText("40,00 kW").length).toBeGreaterThan(0);
  });

  it("renders the filtered-empty state (distinct copy) when a chip filter matches nothing", () => {
    const allPending: SharingAgreementPartitionCoefficientResponse[] = [
      { coefficientId: "1", supply: { id: "s1", name: "Vivienda A", code: "X" }, coefficient: 1, applicationState: PENDING, ...OPEN_UNCLOSED },
    ];
    renderWithTheme({ coefficients: allPending });

    fireEvent.click(screen.getByRole("button", { name: "En vigor" }));

    expect(screen.getByText("No se encontraron coeficientes")).toBeInTheDocument();
    expect(screen.queryByText("Sin coeficientes de reparto")).not.toBeInTheDocument();
  });

  it("filters rows by applicationState chip", () => {
    renderWithTheme({ coefficients });

    fireEvent.click(screen.getByRole("button", { name: "Sin aplicar" }));

    expect(screen.getAllByText("Vivienda B").length).toBeGreaterThan(0);
    expect(screen.queryByText("Vivienda A")).not.toBeInTheDocument();
  });

  it("renders the coefficient sum cards in read mode", () => {
    renderWithTheme({ coefficients });
    expect(screen.getByText("Suma de los coeficientes")).toBeInTheDocument();
  });
});

describe("SharingAgreementCoefficientSet (DRAFT editing)", () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
    mockSuccessDispatch.mockClear();
  });

  it("shows the edit action only for a DRAFT agreement", () => {
    renderWithTheme({ coefficients, agreementStatus: SharingAgreementResponseStatus.PUBLISHED });
    expect(screen.queryByRole("button", { name: "Editar coeficientes" })).not.toBeInTheDocument();
  });

  it("hides the coefficient sum cards while editing, in favor of the live readout", () => {
    renderWithTheme({ coefficients, agreementStatus: SharingAgreementResponseStatus.DRAFT });
    expect(screen.getByText("Suma de los coeficientes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Editar coeficientes" }));

    expect(screen.queryByText("Suma de los coeficientes")).not.toBeInTheDocument();
    expect(screen.getByText(/Suma del fichero:/)).toBeInTheDocument();
  });

  it("entering edit mode opens in kW mode by default, seeding inputs in kW including a real zero", () => {
    renderWithTheme({ coefficients, agreementStatus: SharingAgreementResponseStatus.DRAFT });

    fireEvent.click(screen.getByRole("button", { name: "Editar coeficientes" }));

    expect(screen.getByRole("button", { name: "kW" })).toHaveAttribute("aria-pressed", "true");
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    const values = inputs.map((input) => input.value);
    expect(values).toContain("40,00"); // Vivienda A: 0.4 * 100 kW, fixed at 2dp
    expect(values).toContain("0,00"); // Nave Vacía's real zero, not blank, fixed at 2dp
  });

  it("toggling to coefficient mode converts every row's displayed value, keeping it (not clearing it)", () => {
    renderWithTheme({ coefficients, agreementStatus: SharingAgreementResponseStatus.DRAFT });

    fireEvent.click(screen.getByRole("button", { name: "Editar coeficientes" }));
    fireEvent.click(screen.getByRole("button", { name: "Coeficiente" }));

    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    const values = inputs.map((input) => input.value);
    expect(values).toContain("0,400000"); // 40 kW / 100 kW installed, fixed at 6dp
    expect(values).toContain("0,000000");
  });

  it("falls back to coefficient mode, with kW disabled, when the agreement has no installedPowerKw", () => {
    renderWithTheme({ coefficients, installedPowerKw: undefined, agreementStatus: SharingAgreementResponseStatus.DRAFT });

    fireEvent.click(screen.getByRole("button", { name: "Editar coeficientes" }));

    expect(screen.getByRole("button", { name: "Coeficiente" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "kW" })).toBeDisabled();
  });

  it("reaches edit mode from the empty state via its action button, for a DRAFT with zero coefficients", () => {
    renderWithTheme({ coefficients: [], agreementStatus: SharingAgreementResponseStatus.DRAFT });

    expect(screen.getByRole("button", { name: /Editar coeficientes/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Editar coeficientes/ }));

    expect(screen.getByRole("button", { name: "Añadir suministro" })).toBeInTheDocument();
  });

  it("adding a supply via the picker appends it with an empty coefficient, not zero", async () => {
    const user = userEvent.setup();
    renderWithTheme({ coefficients: [], agreementStatus: SharingAgreementResponseStatus.DRAFT });

    fireEvent.click(screen.getByRole("button", { name: /Editar coeficientes/ }));
    await user.click(screen.getByRole("button", { name: "Añadir suministro" }));

    await screen.findByText("Trastero Nuevo");
    await user.click(screen.getByText("Trastero Nuevo"));
    await user.click(screen.getByRole("button", { name: /Añadir \(1\)/ }));

    await waitFor(() => expect(screen.getAllByText("Trastero Nuevo").length).toBeGreaterThan(0));
    const emptyInputs = screen
      .getAllByRole("textbox")
      .filter((el) => (el as HTMLInputElement).placeholder === "0,00" && (el as HTMLInputElement).value === "");
    expect(emptyInputs.length).toBeGreaterThan(0);
  });

  it("save is disabled while any row is empty, and enabled once every row is valid", async () => {
    const user = userEvent.setup();
    renderWithTheme({
      coefficients: [
        {
          coefficientId: "c1",
          supply: { id: "s1", name: "Vivienda A", code: "X" },
          coefficient: undefined as unknown as number,
          applicationState: PENDING,
          ...OPEN_UNCLOSED,
        },
      ],
      agreementStatus: SharingAgreementResponseStatus.DRAFT,
    });

    fireEvent.click(screen.getByRole("button", { name: "Editar coeficientes" }));
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();

    // Table and card rows are both present in the DOM (CSS-only breakpoint
    // switch, invisible to jsdom) and share the same underlying row state —
    // typing into one keeps both in sync, so only the first needs driving.
    await user.type(screen.getAllByPlaceholderText("0,00")[0], "1");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
  });

  it("issues exactly one PUT on save, and exits edit mode on success", async () => {
    mockMutateAsync.mockResolvedValue({ coefficients: [] });
    const user = userEvent.setup();
    renderWithTheme({
      coefficients: [
        { coefficientId: "c1", supply: { id: "s1", name: "Vivienda A", code: "X" }, coefficient: 0.5, applicationState: PENDING, ...OPEN_UNCLOSED },
      ],
      agreementStatus: SharingAgreementResponseStatus.DRAFT,
    });

    fireEvent.click(screen.getByRole("button", { name: "Editar coeficientes" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument());
  });

  it("dispatches a transient save confirmation on success, never rendering the raw backend coefficientSumWarning string", async () => {
    // The backend's coefficientSumWarning is informational for API consumers with
    // no UI; this screen already shows the resulting sum persistently in the KPI,
    // so the save confirmation stays generic regardless of whether it's present.
    mockMutateAsync.mockResolvedValue({ coefficients: [], coefficientSumWarning: "coefficient set sum is 0.4, expected 1" });
    const user = userEvent.setup();
    renderWithTheme({
      coefficients: [
        { coefficientId: "c1", supply: { id: "s1", name: "Vivienda A", code: "X" }, coefficient: 0.4, applicationState: PENDING, ...OPEN_UNCLOSED },
        { coefficientId: "c2", supply: { id: "s2", name: "Vivienda B", code: "Y" }, coefficient: 0.3, applicationState: PENDING, ...OPEN_UNCLOSED },
      ],
      agreementStatus: SharingAgreementResponseStatus.DRAFT,
    });

    fireEvent.click(screen.getByRole("button", { name: "Editar coeficientes" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockSuccessDispatch).toHaveBeenCalledWith("Coeficientes guardados."));
    expect(screen.queryByText(/coefficient set sum/)).not.toBeInTheDocument();
    expect(screen.queryByText(/se esperaba 100,0000/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("dispatches the same save confirmation when the backend reports no sum warning at all", async () => {
    mockMutateAsync.mockResolvedValue({ coefficients: [], coefficientSumWarning: null });
    const user = userEvent.setup();
    renderWithTheme({
      coefficients: [
        { coefficientId: "c1", supply: { id: "s1", name: "Vivienda A", code: "X" }, coefficient: 0.5, applicationState: PENDING, ...OPEN_UNCLOSED },
        { coefficientId: "c2", supply: { id: "s2", name: "Vivienda B", code: "Y" }, coefficient: 0.5, applicationState: PENDING, ...OPEN_UNCLOSED },
      ],
      agreementStatus: SharingAgreementResponseStatus.DRAFT,
    });

    fireEvent.click(screen.getByRole("button", { name: "Editar coeficientes" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockSuccessDispatch).toHaveBeenCalledWith("Coeficientes guardados."));
  });

  it("the percentage sum line is always shown, even in kW mode, and is never demoted", () => {
    renderWithTheme({ coefficients, agreementStatus: SharingAgreementResponseStatus.DRAFT });

    fireEvent.click(screen.getByRole("button", { name: "Editar coeficientes" }));

    // 0.4 + 0.6 + 0 = 100%.
    expect(screen.getByText("Suma del fichero: 100,0000 %")).toBeInTheDocument();
    expect(screen.getByText(/Suma completa \(100%\)/)).toBeInTheDocument();
    expect(screen.getByText(/100,00 kW de 100,00 kW instalados/)).toBeInTheDocument();
  });

  it("kW mode shows the outstanding percentage gap, with the rounding caveat, when kW rounds to installedPowerKw but the coefficient sum isn't exactly 100%", () => {
    // Three rows summing to 999,999 units (short by one) but each row's kW,
    // rounded to 2dp, still totals to exactly the 60 kW installed.
    const rows: SharingAgreementPartitionCoefficientResponse[] = [
      { coefficientId: "1", supply: { id: "s1", name: "A", code: "X1" }, coefficient: 0.333333, applicationState: PENDING, ...OPEN_UNCLOSED },
      { coefficientId: "2", supply: { id: "s2", name: "B", code: "X2" }, coefficient: 0.333333, applicationState: PENDING, ...OPEN_UNCLOSED },
      { coefficientId: "3", supply: { id: "s3", name: "C", code: "X3" }, coefficient: 0.333333, applicationState: PENDING, ...OPEN_UNCLOSED },
    ];
    renderWithTheme({ coefficients: rows, installedPowerKw: 60, agreementStatus: SharingAgreementResponseStatus.DRAFT });

    fireEvent.click(screen.getByRole("button", { name: "Editar coeficientes" }));

    expect(screen.getByText("Suma del fichero: 99,9999 %")).toBeInTheDocument();
    expect(screen.getByText(/con redondeo a céntimos/)).toBeInTheDocument();
    expect(screen.getByText(/faltan 0,0001 % por ajustar en modo porcentaje/)).toBeInTheDocument();
    // No standalone "cuadra" claim in the copy.
    expect(screen.queryByText(/cuadra/i)).not.toBeInTheDocument();
  });
});

describe("SharingAgreementCoefficientSet — DRAFT column visibility", () => {
  // A real DRAFT is guaranteed all-PENDING/all-OPEN by the backend: APPLIED
  // requires publishing first, and revert-to-draft is refused once anything
  // is applied. This is what a real user sees.
  const cleanDraftCoefficients: SharingAgreementPartitionCoefficientResponse[] = [
    { coefficientId: "1", supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" }, coefficient: 0.4, applicationState: PENDING, ...OPEN_UNCLOSED },
    { coefficientId: "2", supply: { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" }, coefficient: 0.6, applicationState: PENDING, ...OPEN_UNCLOSED },
  ];

  it("hides the state columns and filter chips for a clean DRAFT", () => {
    renderWithTheme({ coefficients: cleanDraftCoefficients, agreementStatus: SharingAgreementResponseStatus.DRAFT });

    expect(screen.queryByText("Estado de aplicación")).not.toBeInTheDocument();
    expect(screen.queryByText("Estado de fin")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Todos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sin aplicar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "En vigor" })).not.toBeInTheDocument();
  });

  // `coefficients` (the module-level fixture) contains APPLIED rows, which a
  // real DRAFT can never have — the backend guarantees this can't happen. It
  // exists here purely to prove the frontend doesn't silently hide unexpected
  // data if that guarantee is ever violated by a backend regression.
  it("still shows the state columns and chips for a DRAFT containing anomalous (non-PENDING) rows", () => {
    renderWithTheme({ coefficients, agreementStatus: SharingAgreementResponseStatus.DRAFT });

    expect(screen.getByText("Estado de aplicación")).toBeInTheDocument();
    expect(screen.getByText("Estado de fin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todos" })).toBeInTheDocument();
  });

  // DRAFT safety used to fall out of getAvailableCoefficientActions alone
  // (every DRAFT row was PENDING, and PENDING returned []). Now that PENDING
  // returns ["apply"], DRAFT safety depends entirely on the !isDraft gates
  // below — the contract still rejects activate/deactivate/close/reopen on a
  // DRAFT agreement with 409, so offering either control here would be a
  // dead end.
  it("renders no row action menu and no checkbox for a DRAFT agreement, even though apply would otherwise be available on every PENDING row", () => {
    renderWithTheme({ coefficients: cleanDraftCoefficients, agreementStatus: SharingAgreementResponseStatus.DRAFT });

    expect(screen.queryByRole("button", { name: /Más acciones/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("renders no row action menu and no checkbox while editing, even for a DRAFT with actionable rows", () => {
    renderWithTheme({ coefficients: cleanDraftCoefficients, agreementStatus: SharingAgreementResponseStatus.DRAFT });

    fireEvent.click(screen.getByRole("button", { name: "Editar coeficientes" }));

    expect(screen.queryByRole("button", { name: /Más acciones/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});

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
    mockIsActivating = false;
    mockIsDeactivating = false;
    mockIsClosing = false;
    mockIsReopening = false;
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("header checkbox: unchecked when nothing is selected, click selects every visible pending row", async () => {
    const user = userEvent.setup();
    renderWithTheme({ coefficients: mixed });

    const checkbox = screen.getAllByRole("checkbox", { name: "Seleccionar todos los pendientes" })[0];
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    expect(screen.getByText("2 seleccionados")).toBeInTheDocument();
    // Only PENDING rows ever render a checkbox at all (verified by the row
    // spec); this proves the *count* matches "all pending", not more.
  });

  it("header checkbox: indeterminate when some but not all visible pending rows are selected", async () => {
    const user = userEvent.setup();
    renderWithTheme({ coefficients: threePending });

    await selectPendingRow(user, "Vivienda A");

    const checkbox = screen.getAllByRole("checkbox", { name: "Seleccionar todos los pendientes" })[0];
    expect(checkbox).toHaveAttribute("data-indeterminate", "true");
    expect(checkbox).not.toBeChecked();
  });

  it("header checkbox: checked when every visible pending row is selected, and clicking then deselects only the visible ones", async () => {
    const user = userEvent.setup();
    renderWithTheme({ coefficients: threePending });

    // Select all 3, then narrow to 2 via search — the 3rd stays selected but hidden.
    await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar todos los pendientes" })[0]);
    await user.type(screen.getByPlaceholderText("Buscar por punto o CUPS"), "Vivienda");
    await waitFor(() => expect(screen.getByText("3 seleccionados · 1 oculto por el filtro")).toBeInTheDocument(), {
      timeout: 1000,
    });

    const checkbox = screen.getAllByRole("checkbox", { name: "Seleccionar todos los pendientes" })[0];
    expect(checkbox).toBeChecked();

    await user.click(checkbox);

    // Only the 2 visible were deselected — Local C (hidden) stays selected.
    expect(screen.getByText("1 seleccionado · 1 oculto por el filtro")).toBeInTheDocument();
  });

  it("hides the header checkbox entirely when no visible row is pending", () => {
    renderWithTheme({ coefficients: allApplied });
    expect(screen.queryByRole("checkbox", { name: "Seleccionar todos los pendientes" })).not.toBeInTheDocument();
  });

  it("regression: selecting all with an active filter never selects a row outside the filtered set", async () => {
    const user = userEvent.setup();
    renderWithTheme({ coefficients: threePending });

    await user.type(screen.getByPlaceholderText("Buscar por punto o CUPS"), "Vivienda");
    await waitFor(() => expect(screen.queryByText("Local C")).not.toBeInTheDocument(), { timeout: 1000 });

    await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar todos los pendientes" })[0]);

    // Exactly the 2 visible rows — never Local C, which the filter hides.
    expect(screen.getByText("2 seleccionados")).toBeInTheDocument();
    expect(screen.queryByText(/oculto/)).not.toBeInTheDocument();
  });

  it("filtering with a live selection switches the count to the two-part form, with the correct hidden count", async () => {
    const user = userEvent.setup();
    renderWithTheme({ coefficients: threePending });

    await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar todos los pendientes" })[0]); // selects all 3
    await user.type(screen.getByPlaceholderText("Buscar por punto o CUPS"), "Local");

    await waitFor(() => expect(screen.getByText("3 seleccionados · 2 ocultos por el filtro")).toBeInTheDocument(), {
      timeout: 1000,
    });
  });

  it("zero visible rows with a live selection: the header checkbox disappears, the bar stays, and everything selected reads as hidden", async () => {
    const user = userEvent.setup();
    renderWithTheme({ coefficients: threePending });

    await selectPendingRow(user, "Vivienda A");
    await user.type(screen.getByPlaceholderText("Buscar por punto o CUPS"), "no-such-supply-xyz");

    await waitFor(() => expect(screen.getByText("No se encontraron coeficientes")).toBeInTheDocument(), {
      timeout: 1000,
    });
    expect(screen.queryByRole("checkbox", { name: "Seleccionar todos los pendientes" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aplicar fecha/ })).toBeInTheDocument();
    expect(screen.getByText("1 seleccionado · 1 oculto por el filtro")).toBeInTheDocument();
  });

  it("'Limpiar selección' empties the selection entirely, including rows hidden by the filter", async () => {
    const user = userEvent.setup();
    renderWithTheme({ coefficients: threePending });

    await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar todos los pendientes" })[0]); // selects all 3
    await user.type(screen.getByPlaceholderText("Buscar por punto o CUPS"), "Vivienda");
    await waitFor(() => expect(screen.getByText("3 seleccionados · 1 oculto por el filtro")).toBeInTheDocument(), {
      timeout: 1000,
    });

    await user.click(screen.getByRole("button", { name: "Limpiar selección" }));

    expect(screen.queryByRole("button", { name: /Aplicar fecha/ })).not.toBeInTheDocument();
  });

  it("the batch bar mounts only once something is selected — not merely because a PENDING row exists — and unmounts again when the last selection is cleared", async () => {
    const user = userEvent.setup();
    renderWithTheme({ coefficients: mixed });

    // Pending rows present, nothing checked yet: no bar.
    expect(screen.queryByRole("button", { name: /Aplicar fecha/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/seleccionad/)).not.toBeInTheDocument();

    await selectPendingRow(user, "Vivienda A");
    expect(screen.getByRole("button", { name: /Aplicar fecha/ })).toBeInTheDocument();
    expect(screen.getByText("1 seleccionado")).toBeInTheDocument();

    // Unchecking the only selected row unmounts the bar again.
    await selectPendingRow(user, "Vivienda A");
    expect(screen.queryByRole("button", { name: /Aplicar fecha/ })).not.toBeInTheDocument();
  });

  it("singular/plural count text", async () => {
    const user = userEvent.setup();
    renderWithTheme({ coefficients: mixed });

    await selectPendingRow(user, "Vivienda A");
    expect(screen.getByText("1 seleccionado")).toBeInTheDocument();

    await selectPendingRow(user, "Vivienda B");
    expect(screen.getByText("2 seleccionados")).toBeInTheDocument();
  });

  it("blocks a future date with the rule stated as visible helper text, never a title attribute", async () => {
    const user = userEvent.setup();
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");

    expect(screen.getByText("No se permiten fechas futuras")).toBeInTheDocument();
    const dayField = screen.getByRole("spinbutton", { name: "Day" });
    expect(dayField.closest("[title]")).toBeNull();
  });

  it("typing a future date (bypassing the calendar's maxDate) leaves the button disabled with a visible reason", async () => {
    const user = userEvent.setup();
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");

    await typeDate(user, "01", "01", "2099");

    expect(screen.getByRole("button", { name: /Aplicar fecha/ })).toBeDisabled();
    expect(screen.getByText("La fecha no puede ser futura ni inválida")).toBeInTheDocument();
  });

  it("the disabled reason states 'select a date' before any date is entered, then clears once a valid one is", async () => {
    const user = userEvent.setup();
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");

    expect(screen.getByText("Selecciona una fecha")).toBeInTheDocument();

    await typeDate(user, "10", "01", "2026");

    expect(screen.getByRole("button", { name: /Aplicar fecha/ })).toBeEnabled();
    expect(screen.queryByText("Selecciona una fecha")).not.toBeInTheDocument();
    expect(screen.queryByText("La fecha no puede ser futura ni inválida")).not.toBeInTheDocument();
  });

  it("on success, clears the selection and the date, and shows the transient confirmation — no error panel", async () => {
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [{ coefficientId: "c1" }] });
    const user = userEvent.setup();
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await typeDate(user, "10", "01", "2026");

    await user.click(screen.getByRole("button", { name: /Aplicar fecha/ }));

    await waitFor(() => expect(mockSuccessDispatch).toHaveBeenCalledWith("Fechas de aplicación registradas."));
    expect(screen.queryByRole("button", { name: /Aplicar fecha/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("on a no-op success (empty coefficients array), shows the same transient confirmation and no error panel", async () => {
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [] });
    const user = userEvent.setup();
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await typeDate(user, "10", "01", "2026");

    await user.click(screen.getByRole("button", { name: /Aplicar fecha/ }));

    await waitFor(() => expect(mockSuccessDispatch).toHaveBeenCalledWith("Fechas de aplicación registradas."));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("on rejection, preserves the selection and date, and renders every error detail in a persistent panel", async () => {
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
    const user = userEvent.setup();
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await typeDate(user, "10", "01", "2026");

    await user.click(screen.getByRole("button", { name: /Aplicar fecha/ }));

    await screen.findByRole("alert");
    expect(screen.getByText("No se ha activado ningún coeficiente.")).toBeInTheDocument();
    // Selection and the entered date survive the rejection.
    expect(screen.getByText("1 seleccionado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aplicar fecha/ })).toBeInTheDocument();
    expect(mockSuccessDispatch).not.toHaveBeenCalled();
  });

  it("scrolls the error panel's own node into view on rejection, and never on success", async () => {
    mockActivateMutateAsync.mockRejectedValueOnce({
      response: { data: { errors: [{ message: "raw", code: "SHARING_AGREEMENT_DATE_IN_FUTURE" }] } },
    });
    const user = userEvent.setup();
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await typeDate(user, "10", "01", "2026");

    await user.click(screen.getByRole("button", { name: /Aplicar fecha/ }));
    const alertNode = await screen.findByRole("alert");

    const scrollMock = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
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
    await typeDate(user, "10", "01", "2026");
    await user.click(screen.getByRole("button", { name: /Aplicar fecha/ }));
    await waitFor(() => expect(mockSuccessDispatch).toHaveBeenCalled());
    expect(scrollMock).not.toHaveBeenCalled();
  });

  it("on rejection with no error details (non-RestError failure), renders the generic retry line, header still present", async () => {
    mockActivateMutateAsync.mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await typeDate(user, "10", "01", "2026");

    await user.click(screen.getByRole("button", { name: /Aplicar fecha/ }));

    await screen.findByRole("alert");
    expect(screen.getByText("No se ha activado ningún coeficiente.")).toBeInTheDocument();
    expect(screen.getByText("No se ha podido activar la selección. Inténtalo de nuevo en unos instantes.")).toBeInTheDocument();
  });

  it("dismissing the error panel clears it", async () => {
    mockActivateMutateAsync.mockRejectedValue({
      response: { data: { errors: [{ message: "raw", code: "SHARING_AGREEMENT_DATE_IN_FUTURE" }] } },
    });
    const user = userEvent.setup();
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await typeDate(user, "10", "01", "2026");
    await user.click(screen.getByRole("button", { name: /Aplicar fecha/ }));
    await screen.findByRole("alert");

    await user.click(screen.getByRole("alert").parentElement!.querySelector("button")!);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("a fresh submission replaces a previously-shown error panel rather than stacking it", async () => {
    mockActivateMutateAsync.mockRejectedValueOnce({
      response: { data: { errors: [{ message: "raw", code: "SHARING_AGREEMENT_DATE_IN_FUTURE" }] } },
    });
    const user = userEvent.setup();
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await typeDate(user, "10", "01", "2026");
    await user.click(screen.getByRole("button", { name: /Aplicar fecha/ }));
    await screen.findByRole("alert");
    expect(screen.getAllByRole("alert")).toHaveLength(1);

    mockActivateMutateAsync.mockRejectedValueOnce({
      response: {
        data: { errors: [{ message: "raw", code: "SHARING_AGREEMENT_ACTIVATION_DATE_NOT_AFTER_PREDECESSOR" }] },
      },
    });
    await user.click(screen.getByRole("button", { name: /Aplicar fecha/ }));

    await waitFor(() => expect(mockActivateMutateAsync).toHaveBeenCalledTimes(2));
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("disables the button and shows a spinner while isActivating, and a second click issues no second request", async () => {
    mockIsActivating = true;
    let resolveActivate!: (value: { coefficients: unknown[] }) => void;
    mockActivateMutateAsync.mockReturnValue(new Promise((resolve) => (resolveActivate = resolve)));
    const user = userEvent.setup();
    renderWithTheme({ coefficients: mixed });
    await selectPendingRow(user, "Vivienda A");
    await typeDate(user, "10", "01", "2026");

    const applyButton = screen.getByRole("button", { name: "" }); // spinner replaces the text label while pending
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
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
    expect(mockActivateMutateAsync).not.toHaveBeenCalled(); // disabled — clicks never reach the handler

    resolveActivate({ coefficients: [] });
    void applyButton;
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
    expect(screen.queryByRole("button", { name: /Aplicar fecha/ })).not.toBeInTheDocument();
  });

  it("end-to-end: after a successful activation, the applied-sum card's percentage updates, staying styled neutral below 100%", async () => {
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [{ coefficientId: "c1" }] });
    const user = userEvent.setup();
    const { rerender } = renderWithTheme({ coefficients: mixed, agreementStatus: SharingAgreementResponseStatus.PUBLISHED });

    // Only c3 is APPLIED, at 0.4 -> 40%. Scoped via the "Suma aplicada"
    // caption's sibling rather than a bare text match: c3's own row also
    // displays "40,0000 %" for its individual coefficient, so an unscoped
    // query would be ambiguous between the sum card and that row.
    expect(screen.getByText("Suma aplicada").previousElementSibling).toHaveTextContent("40,0000 %");

    await selectPendingRow(user, "Vivienda A");
    await typeDate(user, "10", "01", "2026");
    await user.click(screen.getByRole("button", { name: /Aplicar fecha/ }));
    await waitFor(() => expect(mockSuccessDispatch).toHaveBeenCalled());

    // Simulate the invalidation-triggered refetch: c1 is now APPLIED too.
    const updated = mixed.map((c) => (c.coefficientId === "c1" ? { ...c, applicationState: APPLIED } : c));
    rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <ErrorProvider>
          <ThemeProvider theme={theme}>
            <SharingAgreementCoefficientSet
              plantId="plant-1"
              sharingAgreementId="agreement-1"
              installedPowerKw={100}
              agreementStatus={SharingAgreementResponseStatus.PUBLISHED}
              coefficients={updated}
            />
          </ThemeProvider>
        </ErrorProvider>
      </QueryClientProvider>,
    );

    // c1 (0.3) + c3 (0.4) now APPLIED = 70%, still below 100% — neutral info styling.
    expect(screen.getByText("70,0000 %")).toBeInTheDocument();
    expect(screen.getByText(/normal en transición/)).toBeInTheDocument();
  });
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
    const user = userEvent.setup();
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
    const user = userEvent.setup();
    renderWithTheme({ coefficients: lifecycleMixed });

    await openRowMenu(user, "Vivienda A");
    await user.click(screen.getByRole("menuitem", { name: "Corregir fecha" }));

    expect(screen.getByText("Vivienda A (CUPS ES0031300000000001AB)")).toBeInTheDocument();
  });

  it("registering a date via apply on a PENDING row calls activateCoefficients, the same mutation correct uses", async () => {
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [{ coefficientId: "c3" }] });
    const user = userEvent.setup();
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
    const user = userEvent.setup();
    renderWithTheme({ coefficients: lifecycleMixed });

    await openRowMenu(user, "Vivienda C");
    await user.click(screen.getByRole("menuitem", { name: "Registrar fecha" }));

    expect(screen.queryByText(/cambiará de forma retroactiva/)).not.toBeInTheDocument();
  });

  it("names the CUPS only, never the UUID, when the supply has no name", async () => {
    const user = userEvent.setup();
    renderWithTheme({ coefficients: lifecycleMixed });

    await openRowMenu(user, "ES0031300000000002CD");
    await user.click(screen.getByRole("menuitem", { name: "Reabrir" }));

    expect(screen.getByText("CUPS ES0031300000000002CD")).toBeInTheDocument();
    expect(screen.queryByText("s2")).not.toBeInTheDocument();
  });

  it("correcting an APPLIED coefficient calls activateCoefficients, not a new mutation", async () => {
    mockActivateMutateAsync.mockResolvedValue({ coefficients: [{ coefficientId: "c1" }] });
    const user = userEvent.setup();
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

  it("on rejection, the close dialog stays open and renders every returned message", async () => {
    mockCloseMutateAsync.mockRejectedValue({
      response: {
        data: {
          errors: [{ message: "raw", code: "SHARING_AGREEMENT_COEFFICIENT_NOT_ACTIVE", params: { cups: "ES0031300000000001AB" } }],
        },
      },
    });
    const user = userEvent.setup();
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
    const user = userEvent.setup();
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
    const user = userEvent.setup();
    const { rerender } = renderWithTheme({ coefficients: lifecycleMixed });

    await openRowMenu(user, "Vivienda A");
    await user.click(screen.getByRole("menuitem", { name: "Cerrar (baja)" }));
    expect(screen.getByRole("button", { name: "Cerrar (baja)" })).toBeInTheDocument();

    const withoutC1 = lifecycleMixed.filter((c) => c.coefficientId !== "c1");
    rerender(coefficientSetElement({ coefficients: withoutC1 }));

    expect(screen.queryByRole("button", { name: "Cerrar (baja)" })).not.toBeInTheDocument();
  });

  it("changing the filter to hide the dialog's row leaves the dialog open — it resolves from the full list, not the filtered one", async () => {
    const user = userEvent.setup();
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
    const user = userEvent.setup();
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
