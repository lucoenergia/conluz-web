# Styling Conventions

## Core rule

Never write raw hex colors, rgba strings, hand-written shadow strings, rem/em font-size strings, or Tailwind classNames in component code. Use the design tokens from `src/theme/tokens.ts` or MUI palette shorthands instead.

Violations are caught by ESLint (`no-restricted-syntax` rules in `eslint.config.js`).

---

## Token imports

```ts
import { colors, alphas, shadows, radii, fontSizes } from "../../theme/tokens";
```

Import only what you need. Paths are relative — components use `../../theme/tokens`, pages use `../../theme/tokens`.

---

## Color — hex literals

**Wrong:**
```tsx
sx={{ color: "#667eea" }}
sx={{ backgroundColor: "#1e293b" }}
```

**Right — MUI palette shorthand (preferred when the color maps to a semantic role):**
```tsx
sx={{ color: "primary.main" }}
sx={{ bgcolor: "text.primary" }}
sx={{ color: "error.main" }}
sx={{ color: "success.main" }}
sx={{ color: "text.secondary" }}
```

**Right — explicit token (when shorthand isn't available):**
```tsx
import { colors } from "../../theme/tokens";

sx={{ color: colors.text.subtle }}        // #6b7280
sx={{ color: colors.text.body }}          // #374151
sx={{ color: colors.error.dark }}         // #dc2626
sx={{ bgcolor: colors.background.default }} // #f5f7fa
sx={{ bgcolor: colors.background.surface }} // #f8fafc
```

**Right — theme callback (when you need a palette value inside a computed string):**
```tsx
sx={(theme) => ({ borderColor: theme.palette.primary.main })}
```

---

## Color — rgba/alpha strings

**Wrong:**
```tsx
sx={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
```

**Right:**
```tsx
import { alphas } from "../../theme/tokens";

sx={{ bgcolor: alphas.white.soft }}      // rgba(255,255,255,0.2)
sx={{ bgcolor: alphas.white.subtle }}    // rgba(255,255,255,0.15)
sx={{ bgcolor: alphas.white.hairline }}  // rgba(255,255,255,0.1)
sx={{ bgcolor: alphas.error.light }}     // rgba(239,68,68,0.1)
sx={{ bgcolor: alphas.black.overlay }}   // rgba(0,0,0,0.5) — modal backdrop
```

For values not in `alphas`, use MUI's `alpha()` with a hex color token (never a bare hex literal):
```tsx
import { alpha } from "@mui/material/styles";
import { colors } from "../../theme/tokens";

sx={(theme) => ({ boxShadow: `0 4px 15px 0 ${alpha(theme.palette.primary.main, 0.4)}` })}
```

---

## Shadows

**Wrong:**
```tsx
sx={{ boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)" }}
```

**Right:**
```tsx
import { shadows } from "../../theme/tokens";

sx={{ boxShadow: shadows.soft }}         // cards / panels default
sx={{ boxShadow: shadows.medium }}       // buttons default
sx={{ boxShadow: shadows.strong }}       // buttons hover
sx={{ boxShadow: shadows.dataCard }}     // data/feature cards
sx={{ boxShadow: shadows.dataCardHover }}// data card hover lift
sx={{ boxShadow: shadows.auth }}         // auth-page login card
sx={{ boxShadow: shadows.breadcrumb }}   // very subtle separator
sx={{ boxShadow: shadows.dropdown }}     // popover/menu
```

Brand-tinted CTA shadows are always computed at call sites (they depend on `theme.palette.primary.main`):
```tsx
sx={(theme) => ({
  boxShadow: `0 4px 15px 0 ${alpha(theme.palette.primary.main, 0.4)}`,
  "&:hover": { boxShadow: `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.5)}` },
})}
```

---

## Border radius

**Wrong:**
```tsx
sx={{ borderRadius: "8px" }}
```

**Right:**
```tsx
import { radii } from "../../theme/tokens";

sx={{ borderRadius: radii.small }}    // 4px — chips, badges
sx={{ borderRadius: radii.default }}  // 8px — cards, inputs, buttons
sx={{ borderRadius: radii.large }}    // 12px — panels, modals, hero cards
```

For circles: use `"50%"` as a literal (self-documenting, not a design token).

---

## Font sizes

For sizes that fall outside MUI's Typography variants, use `fontSizes.*` instead of inline strings:

**Wrong:**
```tsx
sx={{ fontSize: "0.875rem" }}
```

**Right:**
```tsx
import { fontSizes } from "../../theme/tokens";

sx={{ fontSize: fontSizes.xs }}   // 0.75rem — 12px (caption)
sx={{ fontSize: fontSizes.sm }}   // 0.8125rem — 13px
sx={{ fontSize: fontSizes.md }}   // 0.875rem — 14px (body2)
sx={{ fontSize: fontSizes.lg }}   // 0.9375rem — 15px
sx={{ fontSize: fontSizes.xl }}   // 1rem — 16px (body1)
sx={{ fontSize: fontSizes["2xl"] }} // 1.125rem — 18px
```

When MUI Typography variants cover the use case, prefer `variant="body2"` etc. over any `fontSize` prop.

---

## Tailwind classNames

Tailwind has no effect in this MUI project — classes resolve to nothing at runtime.

**Wrong:**
```tsx
<Box className="p-4 grid gap-3 text-gray-600" />
```

**Right:**
```tsx
<Box sx={{ p: 2, display: "grid", gap: 3, color: colors.text.subtle }} />
```

MUI sx spacing: `p: 1` = 8px, `p: 2` = 16px, `gap: 3` = 24px.

---

## sx prop patterns

### Static object
```tsx
<Box sx={{ p: 2, borderRadius: radii.default, boxShadow: shadows.soft }} />
```

### Theme callback (for palette/zIndex access)
```tsx
<Box sx={(theme) => ({ borderColor: theme.palette.primary.main, zIndex: theme.zIndex.drawer + 1 })} />
```

### Extracted helper (shared between siblings)
```tsx
import { sxStyles } from "../../theme/sx";

<Box sx={sxStyles.softPanel} />
<Box sx={sxStyles.flexRowCenter} />
<Box sx={sxStyles.pageContainer} />
```

See `src/theme/sx.ts` for all helpers.

---

## When to add a token vs disable the rule

Add a token when:
- The value appears in ≥2 unrelated call sites, OR
- It has a clear semantic name (e.g., "error faint surface").

Disable the rule when:
- The value is a genuine one-off (a single component's brand accent, a gradient stop).
- The value falls between two existing tokens and the visual distinction matters.

Disable format:
```tsx
// Single-line property (inside sx object):
// eslint-disable-next-line no-restricted-syntax -- <reason>
color: "#ec4899",

// JSX element on the next line:
{/* eslint-disable-next-line no-restricted-syntax -- <reason> */}
<Component sx={{ color: "#ec4899" }} />
```

---

## Verification gates

```bash
npm run lint     # must pass with 0 no-restricted-syntax errors
npm test         # must pass (3 pre-existing form-spec timeouts are known failures)
```
