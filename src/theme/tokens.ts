// ─── Radius ──────────────────────────────────────────────────────────────────
// MUI shape.borderRadius is set to 8 so these px strings are the canonical
// values for every explicit borderRadius in sx props.
// "50%" (circles) is kept as a literal at call sites — it's self-documenting.
export const radii = {
  small: "4px",   // chip/badge accents
  default: "8px", // cards, inputs, buttons (canonical)
  large: "12px",  // panels, modals, hero cards
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────
// Three neutral tokens cover the common card/button progression.
// Brand-tinted CTA shadows are derived at call sites:
//   `0 4px 15px 0 ${alpha(theme.palette.primary.main, 0.4)}` (default)
//   `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.5)}` (hover)
export const shadows = {
  soft:   "0 4px 20px 0 rgba(0,0,0,0.08)", // cards / panels default
  medium: "0 2px 4px 0 rgba(0,0,0,0.12)",  // button / element default
  strong: "0 4px 8px 0 rgba(0,0,0,0.16)",  // button / element hover
  // Extended — data/feature cards need a slightly heavier shadow than soft
  dataCard:     "0 4px 20px 0 rgba(0,0,0,0.12)",
  dataCardHover:"0 6px 24px 0 rgba(0,0,0,0.15)",
  // Auth pages use a prominent shadow to lift the login card
  auth:         "0 8px 32px 0 rgba(0,0,0,0.2)",
  // Breadcrumb uses a very subtle shadow to separate from page bg
  breadcrumb:   "0 2px 8px 0 rgba(0,0,0,0.08)",
  // Dropdown / popover menu shadow
  dropdown:     "0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
} as const;

// ─── Colours ─────────────────────────────────────────────────────────────────
export const colors = {
  brand: {
    main: "#667eea",
    dark: "#5568d3",
    contrastText: "#fff",
  },
  secondary: {
    main: "#475569",
    dark: "#1e293b",
  },
  success: "#10b981",
  error: {
    main: "#ef4444",
    dark: "#dc2626", // destructive action hover / darker danger variant
  },
  warning: "#f59e0b",
  text: {
    primary:     "#1e293b",
    secondary:   "#64748b",
    body:        "#374151", // card body text, slightly lighter than primary
    subtle:      "#6b7280", // deemphasized body / caption text
    muted:       "#9ca3af", // disabled / very deemphasized text
    placeholder: "#94a3b8", // empty-state icons, search placeholder
  },
  divider: "#e5e7eb",
  border: {
    light:    "#e2e8f0", // input / graph subtle border
    inactive: "#d1d5db", // inactive form element border (e.g. file dropzone)
  },
  background: {
    default:  "#f5f7fa",
    paper:    "#ffffff",
    surface:  "#f8fafc", // lighter table-header / code-block surface
    inactive: "#f9fafb", // inactive dropzone / input background
    errorFaint: "#fef2f2", // very-light error tint
  },
  chart: {
    violet: "#8b5cf6", // production energy stat
    blue:   "#3b82f6", // consumption energy stat
    cyan:   "#0ea5e9", // integration status colour
  },
} as const;

// ─── Alpha surfaces ───────────────────────────────────────────────────────────
// Pre-computed rgba values for coloured icon backgrounds and tinted surfaces.
// All values are derived from the semantic palette above so they stay in sync.
export const alphas = {
  error: {
    light:  "rgba(239, 68, 68, 0.1)",  // icon circle bg
    subtle: "rgba(239, 68, 68, 0.08)", // tinted surface
  },
  success: {
    light:  "rgba(16, 185, 129, 0.1)",
    subtle: "rgba(16, 185, 129, 0.08)",
  },
  warning: {
    light: "rgba(245, 158, 11, 0.1)",
  },
  white: {
    hairline: "rgba(255, 255, 255, 0.1)",
    subtle:   "rgba(255, 255, 255, 0.15)",
    soft:     "rgba(255, 255, 255, 0.2)",
    cloud:    "rgba(255, 255, 255, 0.3)",
    heavy:    "rgba(255, 255, 255, 0.7)",
    strong:   "rgba(255, 255, 255, 0.9)",
  },
  black: {
    ghost:   "rgba(0, 0, 0, 0.02)", // near-transparent zebra stripe
    overlay: "rgba(0, 0, 0, 0.5)",  // modal/drawer backdrop
  },
} as const;

// ─── Font sizes ───────────────────────────────────────────────────────────────
// Non-standard rem sizes used in modals and dense forms that don't map to a
// MUI Typography variant. Use these tokens instead of inline string literals.
export const fontSizes = {
  xs:  "0.75rem",    // 12px — MUI caption equivalent
  sm:  "0.8125rem",  // 13px
  md:  "0.875rem",   // 14px — MUI body2 equivalent
  lg:  "0.9375rem",  // 15px — between body2 and body1
  xl:  "1rem",       // 16px — MUI body1 equivalent
  "2xl": "1.125rem", // 18px
} as const;
