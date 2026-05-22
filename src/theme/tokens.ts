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
  error: "#ef4444",
  warning: "#f59e0b",
  text: {
    primary: "#1e293b",
    secondary: "#64748b",
  },
  divider: "#e5e7eb",
  background: {
    default: "#f5f7fa",
    // #f8fafc is a lighter table/surface shade used for TableRow headers and code blocks.
    // It is kept as a literal in those callsites for now; it will be promoted to a
    // named surface token in Phase 2 when all background tokens are consolidated.
    paper: "#ffffff",
  },
} as const;
