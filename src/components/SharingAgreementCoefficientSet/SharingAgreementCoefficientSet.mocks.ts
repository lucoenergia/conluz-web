/**
 * Mock state and module substitutes shared by the SharingAgreementCoefficientSet
 * spec files. Contains no vi.mock call: mocks are per test file, so each spec
 * keeps its own vi.mock lines and pulls these substitutes into them with an
 * `import()` inside the factory. At runtime it imports nothing but vitest (the
 * real modules appear only in types), which is what makes that import safe from
 * inside a factory: no cycle back into a module being mocked.
 *
 * Specs read and drive this state through SharingAgreementCoefficientSet.testUtils,
 * which re-exports it and sets the hook results before every test.
 */
import { vi } from "vitest";

export const mockMutateAsync = vi.fn();
export const mockActivateMutateAsync = vi.fn();
export const mockDeactivateMutateAsync = vi.fn();
export const mockCloseMutateAsync = vi.fn();
export const mockReopenMutateAsync = vi.fn();
export const mockSuccessDispatch = vi.fn();

/**
 * Which lifecycle mutation is in flight. Mutable so a single test can exercise
 * the in-flight state (e.g. isDeactivating), mirroring how the real hook
 * forwards the mutation's own isPending. Reset to all-false before each test.
 */
export const mutationPending = {
  activating: false,
  deactivating: false,
  closing: false,
  reopening: false,
};

const sharingAgreementMutationHooks = {
  useReplacePartitionCoefficients: vi.fn(),
  useActivatePartitionCoefficients: vi.fn(),
  useDeactivatePartitionCoefficients: vi.fn(),
  useClosePartitionCoefficients: vi.fn(),
  useReopenPartitionCoefficients: vi.fn(),
};

const supplies = {
  getAllSupplies: vi.fn(),
  // The row menu's history drawer reads this; its own behaviour is covered in
  // CoefficientHistoryDrawer.spec.tsx.
  useGetPartitionCoefficientHistory: vi.fn(),
};

// Factories for the specs' own vi.mock calls, e.g.
//   vi.mock(import("../../api/supplies/supplies"), () => import("./SharingAgreementCoefficientSet.mocks").then((m) => m.suppliesModule()));
type SharingAgreementsModule = typeof import("../../api/sharing-agreements/sharing-agreements");
type SuccessContextModule = typeof import("../../context/success.context");

/** The sharing-agreements module with its mutation hooks replaced; the rest (query keys, fetchers) stays real. */
export async function sharingAgreementsModule(importOriginal: () => Promise<SharingAgreementsModule>) {
  return { ...(await importOriginal()), ...sharingAgreementMutationHooks };
}

/** The supplies module: only what the coefficient set reaches. */
export function suppliesModule() {
  return supplies;
}

/** The success context with its dispatch replaced; the Provider stays real. */
export async function successContextModule(importOriginal: () => Promise<SuccessContextModule>) {
  return { ...(await importOriginal()), useSuccessDispatch: () => mockSuccessDispatch };
}
