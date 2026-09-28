/**
 * Types for the two lists eslint.config.js exports for
 * src/contracts/mutationHooks.spec.ts, which holds them honest.
 *
 * Only the exports the spec reads are declared. The default export is the flat
 * config, which ESLint consumes directly and nothing in src/ should touch.
 */

/** Screens that imported a generated mutation before the actions layer existed, and the exact hooks each is exempted for. */
export declare const MUTATION_CALL_SITES: Record<string, string[]>;

/** Modules allowed to import the community-implicit read hooks. */
export declare const COMMUNITY_SCOPE_WRAPPERS: string[];
