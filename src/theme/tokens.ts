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
// Every hue is a set of ROLES, not a single value, and `main` is deliberately
// the safe one so the obvious call site is also the correct one:
//
//   main     the working tone. ≥ 4.5:1 as text on white AND behind white text,
//            so it is safe as type, as an icon, and as a fill — all directions.
//   dark     hover / active. ≥ 7:1.
//   vivid    decorative ONLY — chart marks and large fills. ~3:1, which is the
//            bar for a graphic object but NOT for text. Never put type on it.
//   onBrand  type sitting on `brand.panel`. ≥ 4.5:1 on that panel.
//   surface  the tint behind `main` type. Explicit, never an alpha overlay:
//            alpha made the effective contrast depend on whatever was beneath.
//
// Derived in OKLCH — hue preserved, lightness solved to the target ratio, chroma
// tapered toward the extremes — and every pair verified rather than eyeballed.
export const colors = {
  brand: {
    // Decorative only: large fills and gradient ends. 3.66:1, so it can never
    // carry small text and can never sit behind white text.
    light: "#667eea",
    // The working brand tone: actions, banners, brand-coloured type.
    // 5.02:1 on white, 4.79:1 on background.surface, 4.50:1 on brand.surface,
    // and carries white text at 5.01:1 — one value safe in every direction.
    main: "#5267cd",
    dark: "#3e50b2",    // hover / active — white text at 7.01:1
    panel: "#3443a1",   // inset well on a brand banner — white text at 8.52:1
    onSoft: "#eff3ff",  // secondary type on brand.main (4.52:1); replaces opacity:0.9
    surface: "#f0f2fd", // brand-tinted chip background
    contrastText: "#fff",
  },
  success: {
    main:    "#008058", // 4.97:1 either direction
    dark:    "#006646", // 7.03:1
    vivid:   "#00a975", // 3.03:1 — chart marks / large fills only
    onBrand: "#49d49b", // 4.54:1 on brand.panel
    surface: "#e7f8f2", // `main` clears 4.52:1 on this tint
  },
  error: {
    main:    "#d12a30", // 5.14:1 either direction
    dark:    "#b5041c", // 7.00:1 — destructive hover
    vivid:   "#ef4444", // 3.76:1 — chart marks / large fills only
    onBrand: "#ffa59c", // 4.51:1 on brand.panel
    surface: "#fdecec", // `main` clears 4.50:1 on this tint
  },
  warning: {
    main:    "#9f6400", // 4.89:1 either direction
    dark:    "#7e4e00", // 7.05:1
    vivid:   "#d08400", // 3.01:1 — chart marks / large fills only
    onBrand: "#ffab33", // 4.52:1 on brand.panel
    surface: "#fef5e7", // `main` clears 4.52:1 on this tint
  },
  info: {
    main:    "#0077aa", // 4.98:1 either direction
    dark:    "#005f89", // 7.00:1
    vivid:   "#009ee1", // 3.01:1 — chart marks / large fills only
    onBrand: "#66c6ff", // 4.50:1 on brand.panel
    surface: "#e7f6fd", // `main` clears 4.50:1 on this tint
  },
  secondary: {
    main: "#475569",
    dark: "#1e293b",
  },
  text: {
    primary:     "#1e293b",
    secondary:   "#64748b",
    body:        "#374151", // card body text, slightly lighter than primary
    subtle:      "#6b7280", // deemphasized body / caption text
    muted:       "#717782", // deemphasized text that is still text — 4.50:1
    disabled:    "#9ca3af", // disabled controls ONLY — 2.54:1, exempt from 1.4.3
    placeholder: "#6a788a", // input placeholders / empty-state icons — 4.50:1
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
  info: {
    light:  "rgba(14, 165, 233, 0.1)",
    subtle: "rgba(14, 165, 233, 0.08)",
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

// ─── Transitions ──────────────────────────────────────────────────────────────
// The properties every interactive surface in this app actually animates on
// hover, focus and press. None of them drive layout, so they stay on the
// compositor / paint path.
//
// Use this instead of `transition: "all ..."`. `all` asks the browser to watch
// every animatable property, and — more importantly — it silently starts
// animating width, height, padding or margin the moment someone adds one to a
// hover rule, turning a cheap effect into a reflow per frame. Naming the
// properties makes that a deliberate choice rather than an accident.
const INTERACTIVE_PROPERTIES = [
  "transform",
  "box-shadow",
  "border-color",
  "background-color",
  "color",
] as const;

export const interactiveTransition = (duration = "0.3s", easing = "ease") =>
  INTERACTIVE_PROPERTIES.map((property) => `${property} ${duration} ${easing}`).join(", ");
