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
    // 1. Hardcoded hex colour strings (use theme.palette.* or token constants)
    {
      selector: "Literal[value=/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/]",
      message:
        "Use theme.palette.* or a token from src/theme/tokens.ts instead of a hardcoded hex colour. See docs/styling-conventions.md",
    },
    // 2. rgb/rgba literal strings (use alphas.* tokens or alpha() from @mui/material)
    {
      selector: "Literal[value=/^rgba?\\(/]",
      message:
        "Use alphas.* tokens from src/theme/tokens.ts or alpha() from @mui/material instead of an inline rgb/rgba string. See docs/styling-conventions.md",
    },
    // 3. Hand-written boxShadow string literals (use shadows.* tokens)
    {
      selector:
        "Property[key.name='boxShadow'] > Literal",
      message:
        "Use a named shadow token from src/theme/tokens.ts instead of a hand-written boxShadow string. See docs/styling-conventions.md",
    },
    // 4. Inline fontSize rem/em strings (use fontSizes.* tokens or Typography variants)
    {
      selector:
        "Property[key.name='fontSize'] > Literal[value=/^[\\d.]+r?em$/]",
      message:
        "Use a fontSizes.* token from src/theme/tokens.ts or a MUI Typography variant instead of an inline rem/em fontSize. See docs/styling-conventions.md",
    },
    // 5. Phantom Tailwind utility-class strings in className props
    {
      selector:
        "JSXAttribute[name.name='className'] > Literal[value=/\\b(p-\\d|px-\\d|py-\\d|m-\\d|gap-\\d|rounded|text-xs|text-sm|text-base|text-lg|text-xl|text-2xl|font-bold|font-semibold|font-medium|items-center|items-start|justify-center|justify-between|justify-start|w-full|h-full|grid-flow-col)\\b/]",
      message:
        "Tailwind utility classes have no effect — use MUI sx prop or Box with theme tokens instead. See docs/styling-conventions.md",
    },
  ],
};

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
]);
