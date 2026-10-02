/**
 * Types for the list eslint.config.js exports for
 * src/contracts/mutationHooks.spec.ts, which holds it honest.
 *
 * Only the exports the spec reads are declared. The default export is the flat
 * config, which ESLint consumes directly and nothing in src/ should touch.
 */

/** Modules allowed to import the community-implicit read hooks. */
export declare const COMMUNITY_SCOPE_WRAPPERS: string[];
