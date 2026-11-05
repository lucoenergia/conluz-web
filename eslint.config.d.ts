/**
 * Types for the list eslint.config.js exports for
 * src/contracts/mutationHooks.spec.ts, which holds it honest.
 *
 * Only the exports the spec reads are declared. The default export is the flat
 * config, which ESLint consumes directly and nothing in src/ should touch.
 */

/** Modules allowed to import the community-implicit read hooks. */
export declare const COMMUNITY_SCOPE_WRAPPERS: string[];

/** Files still allowed to import MUI's overlay primitives, each with a reason or the issue that migrates it. */
export declare const OVERLAY_PRIMITIVE_ALLOWLIST: string[];

/** The options of the overlay import restriction (`@typescript-eslint/no-restricted-imports`). */
export declare const OVERLAY_IMPORT_RESTRICTION: Record<string, unknown>;
