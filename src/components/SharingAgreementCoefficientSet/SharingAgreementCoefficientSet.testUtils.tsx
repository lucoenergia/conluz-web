/**
 * Shared helpers for the SharingAgreementCoefficientSet spec files. Contains no
 * vi.mock call: mocks are per test file, and this module imports the component,
 * so it must stay free of module mocking. Each spec mocks the success context,
 * the supplies module and the sharing-agreements mutation hooks with the
 * substitutes in SharingAgreementCoefficientSet.mocks.ts; this module sets
 * their results before every test and renders through the shared harness.
 */
import { beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { mutation, query } from "../../test/queryState";
import { buildSharingAgreement, buildSharingAgreementCapabilities, buildSupply } from "../../test/fixtures";
import {
  getAllSupplies,
  // eslint-disable-next-line no-restricted-imports -- test helper: imported only to set the mocked hook's result, never called
  useGetPartitionCoefficientHistory,
  type getPartitionCoefficientHistory,
} from "../../api/supplies/supplies";
import {
  getSharingAgreementById,
  /* eslint-disable no-restricted-imports -- test helper: these five are imported
     only to type and set the mocked hooks' results, never called. Not numbered:
     this file is test infrastructure and is not migrating to the actions layer. */
  useActivatePartitionCoefficients,
  useGetPlantActivePartitionCoefficients,
  type getPlantActivePartitionCoefficients,
  useClosePartitionCoefficients,
  useDeactivatePartitionCoefficients,
  useReopenPartitionCoefficients,
  useReplacePartitionCoefficients,
  /* eslint-enable no-restricted-imports */
} from "../../api/sharing-agreements/sharing-agreements";
import {
  SharingAgreementCoefficientSet,
  type SharingAgreementCoefficientSetProps,
} from "./SharingAgreementCoefficientSet";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type {
  SharingAgreementPartitionCoefficientResponse,
  SharingAgreementResponseStatus as StatusValue,
} from "../../api/models";
import {
  mockActivateMutateAsync,
  mockCloseMutateAsync,
  mockDeactivateMutateAsync,
  mockMutateAsync,
  mockReopenMutateAsync,
  mutationPending,
} from "./SharingAgreementCoefficientSet.mocks";

export {
  mockActivateMutateAsync,
  mockCloseMutateAsync,
  mockDeactivateMutateAsync,
  mockMutateAsync,
  mockReopenMutateAsync,
  mockSuccessDispatch,
  mutationPending,
} from "./SharingAgreementCoefficientSet.mocks";

const PLANT_ID = "plant-1";
const AGREEMENT_ID = "agreement-1";

// Registered at module scope, so it runs before every test in each spec file
// that imports this module, ahead of the spec's own beforeEach hooks.
beforeEach(() => {
  mutationPending.activating = false;
  mutationPending.deactivating = false;
  mutationPending.closing = false;
  mutationPending.reopening = false;

  vi.mocked(getAllSupplies).mockResolvedValue({
    items: [buildSupply({ id: "s10", name: "Trastero Nuevo", code: "ES999" })],
    number: 0,
    totalPages: 1,
  });
  // Enabled only while the history drawer is open; resolved-and-empty then, so
  // it never interferes with the specs' own assertions.
  vi.mocked(useGetPartitionCoefficientHistory).mockImplementation((_supplyId, _params, options) =>
    options?.query?.enabled ? query.success<typeof getPartitionCoefficientHistory>([]) : query.disabled(),
  );

  // Nothing in force elsewhere in the plant, unless a spec says otherwise. The
  // hook is read only for a DRAFT; for any other status it stays disabled.
  vi.mocked(useGetPlantActivePartitionCoefficients).mockImplementation((_plantId, options) =>
    options?.query?.enabled ? query.success<typeof getPlantActivePartitionCoefficients>([]) : query.disabled(),
  );
  // An agreement a spec has not provided is a failed read, which renders as
  // "Vigente —" rather than inventing an installed power.
  vi.mocked(getSharingAgreementById).mockImplementation((_plantId, sharingAgreementId) =>
    Promise.reject(new Error(`No agreement fixture for ${sharingAgreementId}`)),
  );

  const target = { plantId: PLANT_ID, sharingAgreementId: AGREEMENT_ID };
  vi.mocked(useReplacePartitionCoefficients).mockImplementation(() => mutation.idle({ mutateAsync: mockMutateAsync }));
  // A lifecycle mutation is in flight while its mutationPending flag is set.
  vi.mocked(useActivatePartitionCoefficients).mockImplementation(() =>
    mutationPending.activating
      ? mutation.pending(
          { ...target, data: { appliedOn: "2001-01-01", coefficientIds: [] } },
          { mutateAsync: mockActivateMutateAsync },
        )
      : mutation.idle({ mutateAsync: mockActivateMutateAsync }),
  );
  vi.mocked(useDeactivatePartitionCoefficients).mockImplementation(() =>
    mutationPending.deactivating
      ? mutation.pending({ ...target, data: { coefficientIds: [] } }, { mutateAsync: mockDeactivateMutateAsync })
      : mutation.idle({ mutateAsync: mockDeactivateMutateAsync }),
  );
  vi.mocked(useClosePartitionCoefficients).mockImplementation(() =>
    mutationPending.closing
      ? mutation.pending(
          { ...target, data: { closedOn: "2001-01-01", coefficientIds: [] } },
          { mutateAsync: mockCloseMutateAsync },
        )
      : mutation.idle({ mutateAsync: mockCloseMutateAsync }),
  );
  vi.mocked(useReopenPartitionCoefficients).mockImplementation(() =>
    mutationPending.reopening
      ? mutation.pending({ ...target, data: { coefficientIds: [] } }, { mutateAsync: mockReopenMutateAsync })
      : mutation.idle({ mutateAsync: mockReopenMutateAsync }),
  );
});

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

export type SetProps = Partial<SharingAgreementCoefficientSetProps> &
  Pick<SharingAgreementCoefficientSetProps, "coefficients"> & {
    /**
     * Shorthand for "an agreement in this status that this caller may manage".
     * Most cases here are about a status rule, not about who the caller is; the
     * ones that are about the caller pass `agreement` instead.
     */
    agreementStatus?: StatusValue;
  };

/**
 * The agreement the set is rendered against. Every write in the set gates on
 * its `canManage`, so the default permits them -- a spec whose subject is a
 * caller who may not manage it passes its own `agreement`.
 */
export function buildSetAgreement(overrides: Parameters<typeof buildSharingAgreement>[0] = {}) {
  return buildSharingAgreement({
    id: AGREEMENT_ID,
    plantId: PLANT_ID,
    status: SharingAgreementResponseStatus.PUBLISHED,
    capabilities: buildSharingAgreementCapabilities({ canRead: true, canManage: true }),
    ...overrides,
  });
}

export function setTree({ agreementStatus, ...props }: SetProps) {
  return (
    <SharingAgreementCoefficientSet
      plantId={PLANT_ID}
      agreement={buildSetAgreement(agreementStatus ? { status: agreementStatus } : {})}
      installedPowerKw={100}
      {...props}
    />
  );
}

/** Renders a coefficient-set element inside the harness, with the active community the specs assume. */
export function renderCoefficientSet(ui: ReactElement) {
  return renderWithProviders(ui, { activeCommunityId: "community-1" });
}

export function renderWithTheme(props: SetProps) {
  return renderCoefficientSet(setTree(props));
}

/** Re-renders in place with new props — the component tree keeps its identity, so component state survives, exactly as it does when a refetch lands behind an open panel. */
export function rerenderWithTheme(rerender: ReturnType<typeof renderWithProviders>["rerender"], props: SetProps) {
  rerender(setTree(props));
}

export const coefficients: SharingAgreementPartitionCoefficientResponse[] = [
  { coefficientId: "1", supply: { id: "s1", name: "Vivienda A", code: "ES0031300000000001AB" }, coefficient: 0.4, applicationState: APPLIED, ...OPEN_UNCLOSED },
  { coefficientId: "2", supply: { id: "s2", name: "Vivienda B", code: "ES0031300000000002CD" }, coefficient: 0.6, applicationState: PENDING, ...OPEN_UNCLOSED },
  { coefficientId: "3", supply: { id: "s3", name: "Nave Vacía", code: "ES0031300000000003EF" }, coefficient: 0, applicationState: APPLIED, ...OPEN_UNCLOSED },
];
