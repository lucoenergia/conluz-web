import { readFileSync } from "node:fs";
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";

// ─── Styling guard-rail rules ─────────────────────────────────────────────────
// Prevent anti-patterns the Phases 1-8 refactor removed from creeping back.
// Theme files (src/theme/**) are EXPLICITLY exempt — that's where literals live.
// Test files (*.spec.*) are exempt — fixture data uses literal strings by design.
const STYLING_SELECTORS = [
    // 1. Hardcoded hex colour, ANYWHERE inside a string — not just as the whole
    //    value. The earlier anchored form (/^#[0-9a-f]{6}$/) only saw a literal
    //    that WAS a colour, so every hex embedded in a longer declaration slipped
    //    through untouched: gradient stops, `1px solid #e5e7eb`, and colours
    //    inlined into chart-tooltip HTML. That blind spot covered the loudest
    //    brand surfaces in the app while the contract read as fully enforced.
    {
      selector:
        "Literal[value=/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]",
      message:
        "Use theme.palette.* or a token from src/theme/tokens.ts instead of a hardcoded hex colour — including inside gradients, borders and other composite values. See references/styling-conventions.md",
    },
    // 2. The same blind spot for template literals: a `${...}` string is made of
    //    TemplateElement nodes, never a Literal, so no Literal selector can see
    //    a colour written inside one.
    {
      selector:
        "TemplateElement[value.raw=/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]",
      message:
        "Use theme.palette.* or a token from src/theme/tokens.ts instead of a hardcoded hex colour inside a template string. See references/styling-conventions.md",
    },
    // 3. rgb/rgba anywhere in a string, and inside template literals
    {
      selector: "Literal[value=/rgba?\\(/]",
      message:
        "Use alphas.* tokens from src/theme/tokens.ts or alpha() from @mui/material instead of an inline rgb/rgba string. See references/styling-conventions.md",
    },
    {
      selector: "TemplateElement[value.raw=/rgba?\\(/]",
      message:
        "Use alphas.* tokens from src/theme/tokens.ts or alpha() from @mui/material instead of an inline rgb/rgba string inside a template. See references/styling-conventions.md",
    },
    // 5. Hand-written boxShadow string literals (use shadows.* tokens)
    {
      selector:
        "Property[key.name='boxShadow'] > Literal",
      message:
        "Use a named shadow token from src/theme/tokens.ts instead of a hand-written boxShadow string. See docs/styling-conventions.md",
    },
    // 6. Inline fontSize rem/em strings (use fontSizes.* tokens or Typography variants)
    {
      selector:
        "Property[key.name='fontSize'] > Literal[value=/^[\\d.]+r?em$/]",
      message:
        "Use a fontSizes.* token from src/theme/tokens.ts or a MUI Typography variant instead of an inline rem/em fontSize. See docs/styling-conventions.md",
    },
    // 7. Phantom Tailwind utility-class strings in className props
    {
      selector:
        "JSXAttribute[name.name='className'] > Literal[value=/\\b(p-\\d|px-\\d|py-\\d|m-\\d|gap-\\d|rounded|text-xs|text-sm|text-base|text-lg|text-xl|text-2xl|font-bold|font-semibold|font-medium|items-center|items-start|justify-center|justify-between|justify-start|w-full|h-full|grid-flow-col)\\b/]",
      message:
        "Tailwind utility classes have no effect — use MUI sx prop or Box with theme tokens instead. See docs/styling-conventions.md",
  },
];

// ─── Capability guard rail ────────────────────────────────────────────────────
// Visibility is the backend's answer, carried on the resource it concerns. A
// role or the platform-admin flag is the old way of guessing at that answer,
// and guessing is how the menu came to offer pages the router refuses and how
// a platform admin came to reach a community's integrations page that 403s
// every call it makes.
//
// So the two hooks that produce those values, and any comparison against the
// CommunityRole enum, stay inside src/hooks/permissions. Reading
// `user.isPlatformAdmin` as a field to display is untouched: it is deciding on
// it that this forbids.
const COMMUNITY_ROLE_SELECTOR = {
  selector: "MemberExpression[object.name='CommunityRole']",
  message:
    "Do not decide anything from a CommunityRole. Ask the backend through src/hooks/permissions -- useActiveCommunityCapabilities, usePlatformCapabilities or usePlantCapabilities -- and use useActiveCommunityRoleLabel if you only need to render the role's name.",
};

const PERMISSION_HOOKS = [
  {
    group: ["**/hooks/permissions/useActiveCommunityRole"],
    importNames: ["useActiveCommunityRole", "useIsPlatformAdmin"],
    message:
      "Only src/hooks/permissions may read a role or the platform-admin flag. Gate on a capability instead (useActiveCommunityCapabilities / usePlatformCapabilities / usePlantCapabilities), or use useActiveCommunityRoleLabel to render the role's name.",
  },
];

// ─── Community-scope guard rail ───────────────────────────────────────────────
// A family of generated hooks is keyed by an entity id -- a plant or a supply --
// with the community left implicit. The backend authorises them on membership,
// so they answer for ANY of the user's communities regardless of which one is
// selected, and because the id usually comes from the URL their React Query key
// cannot change when the selection does. Calling one directly from a page is how
// a screen ends up rendering one community's data under another's name.
//
// Each must therefore be reached through a wrapper that applies the guard. Only
// reads are restricted: mutations take an explicit id from a screen the keyed
// Outlet already resets.
const COMMUNITY_IMPLICIT_HOOKS = [
  {
    group: ["**/api/plants/plants"],
    importNames: ["useGetPlantById"],
    message:
      "Use usePlantInActiveCommunity (src/pages/production/usePlantInActiveCommunity.ts) instead: useGetPlantById is keyed by a plant id from the URL and answers for any community the user belongs to.",
  },
  {
    group: ["**/api/sharing-agreements/sharing-agreements"],
    importNames: [
      "useGetSharingAgreements",
      "useGetSharingAgreementById",
      "useGetSharingAgreementPartitionCoefficients",
      "useGetSharingAgreementFile",
    ],
    message:
      "Read sharing agreements through useSharingAgreementsData / useSharingAgreementDetailData: those apply the active-community guard, these hooks are keyed by a plant id alone.",
  },
  {
    group: ["**/api/supplies/supplies"],
    importNames: [
      "useGetSupply",
      "useGetSupplyEnergyMetrics",
      "useGetSupplyHourlyConsumption",
      "useGetSupplyDailyConsumption",
      "useGetSupplyMonthlyConsumption",
      "useGetSupplyYearlyConsumption",
      "useGetSupplyHourlyProduction",
      "useGetSupplyDailyProduction",
      "useGetSupplyMonthlyProduction",
      "useGetPartitionCoefficientHistory",
      "useGetActivePartitionCoefficient",
      "useGetPartitionCoefficientAtTimestamp",
      "useGetSuppliesByUserId",
    ],
    message:
      "Use useSupplyInActiveCommunity (src/pages/supply-points/useSupplyInActiveCommunity.ts) instead: these hooks are keyed by a supply id alone and answer for any community the user belongs to.",
  },
];

// Modules allowed to import them: the wrappers that apply the guard, plus the
// call sites that scope their own data and say so in a comment.
const COMMUNITY_SCOPE_WRAPPERS = [
  "src/pages/production/usePlantInActiveCommunity.ts",
  "src/pages/production/useSharingAgreementsData.ts",
  "src/pages/production/useSharingAgreementDetailData.ts",
  "src/pages/supply-points/useSupplyInActiveCommunity.ts",
  // Filters its own response through selectPeriodsInCommunity -- the original
  // and still correct way to scope an entity-keyed response.
  "src/components/SupplyCoefficientHistorySection/SupplyCoefficientHistorySection.tsx",
  "src/components/CoefficientHistoryDrawer/CoefficientHistoryDrawer.tsx",
  // Drives these from a community-scoped supply list, and is remounted by the
  // keyed Outlet when the community changes.
  "src/pages/Home.tsx",
  "src/pages/supply-points/SupplyDetailPage.tsx",
];

// ─── Mutation guard rail ──────────────────────────────────────────────────────
// A generated mutation hook is a button that writes to the backend, and until
// now any component could import one and render it. Nothing in the import asked
// who may press it, so the answer was whatever the author happened to remember
// -- which is how production/new and supply-points/new came to serve forms that
// 403 on submit, and how a member came to be offered Editar and Eliminar on
// cards the backend refuses to change.
//
// So every non-GET operation's hook is reachable only from src/hooks/actions,
// where it is paired with the capability the backend answers on and withheld
// entirely when the answer is no. Queries and getGet...QueryKey getters are
// untouched: this restricts writes.
//
// The names are generated from api-docs.json by
// scripts/generate-mutation-hook-list.mjs, run from orval's afterAllFilesWrite,
// so a new endpoint is restricted the moment the client is regenerated rather
// than the day somebody notices. src/contracts/mutationHooks.spec.ts fails if
// that file goes stale.
// A path relative to the working directory, not to import.meta.url: eslint and
// vitest both run from the repository root, and src/contracts/mutationHooks.spec.ts
// imports this file, where the bundler rewrites import.meta.url to a non-file URL.
// endpointScope.spec.ts reads api-docs.json the same way.
const GENERATED_MUTATION_HOOKS = JSON.parse(
  readFileSync("src/contracts/generatedMutationHooks.json", "utf8"),
);

// One entry per tag module rather than one glob over all of them: an entry pairs
// a group with importNames, so a single `**/api/*/*` would also fire on a
// same-named export in an unrelated module -- and a per-module message can name
// the hook that actually replaces it. The names are generated; these are the
// hand-written half.
const ACTION_LAYER_REPLACEMENTS = {
  "src/api/authentication/authentication": "useSessionActions",
  "src/api/communities/communities": "usePlatformActions / useCommunityActions",
  "src/api/configuration/configuration": "the actions layer (no hook yet -- first-run bootstrap)",
  "src/api/consumption/consumption": "useCommunityActions",
  "src/api/memberships/memberships": "useMembershipActions",
  "src/api/plants/plants": "usePlantActions / useSupplyActions / useCommunityActions",
  "src/api/production/production": "usePlantActions",
  "src/api/sharing-agreements/sharing-agreements":
    "usePlantActions / useSharingAgreementActions / useSharingAgreementCoefficientActions",
  "src/api/supplies/supplies": "useSupplyActions / useCommunityActions",
  "src/api/users/users": "useUserActions / usePlatformActions / useProfileActions / useCommunityActions",
};

const MUTATION_HOOKS = GENERATED_MUTATION_HOOKS.modules.map(({ module, hooks }) => ({
  // Every import of an api module in this repo is relative, never aliased, so
  // this has to be a pattern group rather than an exact `paths` entry.
  group: [`**/${module.replace(/^src\//, "")}`],
  importNames: hooks,
  message:
    `Mutations are reached through the actions layer, never imported directly: use ` +
    `${ACTION_LAYER_REPLACEMENTS[module]} from src/hooks/actions. An action the caller may not ` +
    `perform is undefined, and its pending flag lives inside it, so a control cannot be rendered ` +
    `for one they did not receive. If the action you need is not there yet, add it -- the ` +
    `capability it gates on is already decided in src/contracts/mutationHooks.spec.ts.`,
}));

export default tseslint.config([
  globalIgnores(["dist"]),
  {
    // Base rules for all TS/TSX source (includes tests, excludes api/ via ignore below)
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // Styling guard rails: all src/ EXCEPT theme files (where literals are defined)
    // and test/spec files (fixture data legitimately uses string literals).
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/api/**",         // auto-generated — never edit
      "src/theme/**",       // token definitions live here — literals are allowed
      "src/**/*.spec.{ts,tsx}", // test fixtures use literal colours intentionally
    ],
    rules: { "no-restricted-syntax": ["error", ...STYLING_SELECTORS, COMMUNITY_ROLE_SELECTOR] },
  },
  {
    // The permissions module is where roles are legitimately read, so it keeps
    // the styling rules and drops the capability one.
    files: ["src/hooks/permissions/**/*.{ts,tsx}"],
    rules: { "no-restricted-syntax": ["error", ...STYLING_SELECTORS] },
  },
  {
    // Community-scope guard rail. Specs are exempt: they mock these modules by
    // path, which is how the wrappers themselves get tested.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/api/**", "src/**/*.spec.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...COMMUNITY_IMPLICIT_HOOKS, ...PERMISSION_HOOKS, ...MUTATION_HOOKS] },
      ],
    },
  },
  {
    // The wrappers, and the call sites that scope their own data. They are
    // exempt from the community-implicit restriction only -- re-stated rather
    // than turned off, because this list includes src/pages/Home.tsx, which is
    // one of the files the capability rule exists to catch.
    //
    // MUTATION_HOOKS has to be re-stated here too. No file in this list imports
    // a mutation today, which is exactly why leaving it out would go unnoticed:
    // the hole would open the first time one of these eight files grew a write.
    files: COMMUNITY_SCOPE_WRAPPERS,
    rules: {
      "no-restricted-imports": ["error", { patterns: [...PERMISSION_HOOKS, ...MUTATION_HOOKS] }],
    },
  },
  {
    // The permissions module may import the hooks it owns. It decides; it must
    // never write, so it keeps the mutation restriction.
    files: ["src/hooks/permissions/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [...COMMUNITY_IMPLICIT_HOOKS, ...MUTATION_HOOKS] }],
    },
  },
  {
    // The actions layer is the one place a generated mutation hook may be
    // imported -- that is what it is for. Everything else still applies.
    //
    // Specs stay out, as they are everywhere else: re-stating a rule for this
    // folder without repeating that exemption would restrict the layer's own
    // specs, which have to name the modules they mock.
    files: ["src/hooks/actions/**/*.{ts,tsx}"],
    ignores: ["src/hooks/actions/**/*.spec.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [...COMMUNITY_IMPLICIT_HOOKS, ...PERMISSION_HOOKS] }],
    },
  },
]);

// Read by src/contracts/mutationHooks.spec.ts, which is what keeps the list
// above honest. Exported rather than duplicated so the two cannot disagree.
//
// There is no companion list of screens exempt from the mutation rule any
// more: every screen goes through src/hooks/actions, and
// mutationHooks.spec.ts asserts that over the whole tree rather than over a
// list of names.
export { COMMUNITY_SCOPE_WRAPPERS };
