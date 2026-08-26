import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "../../theme";
import { ErrorProvider } from "../../context/error.context";
import { SharingAgreementCoefficientSet, type SharingAgreementCoefficientSetProps } from "./SharingAgreementCoefficientSet";
import { SharingAgreementPartitionCoefficientResponseApplicationState, SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;

const mockMutateAsync = vi.fn();

vi.mock("../../context/community.context", async () => {
  const actual = await vi.importActual<typeof import("../../context/community.context")>("../../context/community.context");
  return { ...actual, useActiveCommunity: () => "community-1" };
});

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
  };
});

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
  { coefficientId: "1", supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" }, coefficient: 0.4, applicationState: APPLIED },
  { coefficientId: "2", supply: { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" }, coefficient: 0.6, applicationState: PENDING },
  { coefficientId: "3", supply: { id: "s3", name: "Nave Vacía", code: "ES0031300000000003EF" }, coefficient: 0, applicationState: APPLIED },
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
      { coefficientId: "1", supply: { name: "Vivienda A", code: "X" }, coefficient: 1, applicationState: PENDING },
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
});

describe("SharingAgreementCoefficientSet (DRAFT editing)", () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
  });

  it("shows the edit action only for a DRAFT agreement", () => {
    renderWithTheme({ coefficients, agreementStatus: SharingAgreementResponseStatus.PUBLISHED });
    expect(screen.queryByRole("button", { name: "Editar coeficientes" })).not.toBeInTheDocument();
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
      coefficients: [{ coefficientId: "c1", supply: { id: "s1", name: "Vivienda A" }, coefficient: undefined }],
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
      coefficients: [{ coefficientId: "c1", supply: { id: "s1", name: "Vivienda A" }, coefficient: 0.5 }],
      agreementStatus: SharingAgreementResponseStatus.DRAFT,
    });

    fireEvent.click(screen.getByRole("button", { name: "Editar coeficientes" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument());
  });

  it("shows a fully Spanish warning with the client-computed sum when the backend flags an invalid sum", async () => {
    mockMutateAsync.mockResolvedValue({ coefficients: [], coefficientSumWarning: "coefficient set sum is 0.4, expected 1" });
    const user = userEvent.setup();
    renderWithTheme({
      coefficients: [{ coefficientId: "c1", supply: { id: "s1", name: "Vivienda A" }, coefficient: 0.4 }],
      agreementStatus: SharingAgreementResponseStatus.DRAFT,
    });

    fireEvent.click(screen.getByRole("button", { name: "Editar coeficientes" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(
        screen.getByText("Los coeficientes se han guardado, pero la suma es 40,0000 % (se esperaba 100,0000 %)."),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText(/coefficient set sum/)).not.toBeInTheDocument();
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
      { coefficientId: "1", supply: { id: "s1", name: "A" }, coefficient: 0.333333 },
      { coefficientId: "2", supply: { id: "s2", name: "B" }, coefficient: 0.333333 },
      { coefficientId: "3", supply: { id: "s3", name: "C" }, coefficient: 0.333333 },
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
    { coefficientId: "1", supply: { name: "Vivienda A", code: "ES0031300000000001AB" }, coefficient: 0.4, applicationState: PENDING },
    { coefficientId: "2", supply: { name: "Vivienda B", code: "ES0031300000000002CD" }, coefficient: 0.6, applicationState: PENDING },
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
});
