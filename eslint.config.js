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
const stylingRules = {
  "no-restricted-syntax": [
    "error",
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
  ],
};

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
    rules: stylingRules,
  },
  {
    // Community-scope guard rail. Specs are exempt: they mock these modules by
    // path, which is how the wrappers themselves get tested.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/api/**", "src/**/*.spec.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: COMMUNITY_IMPLICIT_HOOKS }],
    },
  },
  {
    // The wrappers, and the call sites that scope their own data.
    files: COMMUNITY_SCOPE_WRAPPERS,
    rules: { "no-restricted-imports": "off" },
  },
]);
