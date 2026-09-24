/**
 * Shared, mock-free helpers for the SharingAgreementCoefficientSet spec files.
 * Every spec keeps its own vi.mock blocks: mocks are per test file, and this
 * module imports the component, so it must stay free of module mocking.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN } = SharingAgreementPartitionCoefficientResponseEndState;
// Real coefficients never omit these; unused by any assertion in the spec files, so
// every fixture below spreads this in and only overrides what it's testing.
export const OPEN_UNCLOSED = { validFrom: null, validTo: null, endState: OPEN, endDate: null, currentCoefficient: null };

/** Clicks a checkbox by accessible name — table and card render in parallel in jsdom (CSS-only breakpoint), so index [0] always picks the table's. */
export async function selectPendingRow(user: ReturnType<typeof userEvent.setup>, supplyName: string) {
  await user.click(screen.getAllByRole("checkbox", { name: `Seleccionar ${supplyName}` })[0]);
}

/** Types a date into whichever DatePicker is currently rendered, via its section spinbuttons — the only interaction MUI's v7 field accepts under jsdom (no plain &lt;input&gt;, sections are contenteditable spinbuttons). */
export async function typeDate(user: ReturnType<typeof userEvent.setup>, day: string, month: string, year: string) {
  await user.click(screen.getByRole("spinbutton", { name: "Dia" }));
  await user.keyboard(day);
  await user.keyboard(month);
  await user.keyboard(year);
}

/** Opens the batch bar's "Acciones" menu and selects the item by its (visible) label — the entry point for every batch-dialog test since Part A's inline field was replaced. */
export async function openBatchAction(user: ReturnType<typeof userEvent.setup>, actionLabel: string) {
  await user.click(screen.getByRole("button", { name: "Acciones" }));
  await user.click(screen.getByRole("menuitem", { name: new RegExp(actionLabel) }));
}

export type SetProps = Partial<SharingAgreementCoefficientSetProps> & Pick<SharingAgreementCoefficientSetProps, "coefficients">;

export function setTree(props: SetProps) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
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
    </QueryClientProvider>
  );
}

export function renderWithTheme(props: SetProps) {
  return render(setTree(props));
}

/** Re-renders in place with new props — the component tree keeps its identity, so component state survives, exactly as it does when a refetch lands behind an open panel. */
export function rerenderWithTheme(rerender: ReturnType<typeof render>["rerender"], props: SetProps) {
  rerender(setTree(props));
}

export const coefficients: SharingAgreementPartitionCoefficientResponse[] = [
  { coefficientId: "1", supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" }, coefficient: 0.4, applicationState: APPLIED, ...OPEN_UNCLOSED },
  { coefficientId: "2", supply: { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" }, coefficient: 0.6, applicationState: PENDING, ...OPEN_UNCLOSED },
  { coefficientId: "3", supply: { id: "s3", name: "Nave Vacía", code: "ES0031300000000003EF" }, coefficient: 0, applicationState: APPLIED, ...OPEN_UNCLOSED },
];
