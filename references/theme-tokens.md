# Theme Tokens Reference

Source: `src/theme/tokens.ts`

All tokens are `as const` — TypeScript will catch typos at the call site.

---

## `radii` — Border radius

| Token | Value | Typical use |
|---|---|---|
| `radii.small` | `"4px"` | Chip/badge accents |
| `radii.default` | `"8px"` | Cards, inputs, buttons (canonical) |
| `radii.large` | `"12px"` | Panels, modals, hero cards |

`"50%"` (circles) is kept as a literal at call sites.

---

## `shadows` — Box shadow

| Token | Value | Typical use |
|---|---|---|
| `shadows.soft` | `0 4px 20px 0 rgba(0,0,0,0.08)` | Cards / panels default |
| `shadows.medium` | `0 2px 4px 0 rgba(0,0,0,0.12)` | Button / element default |
| `shadows.strong` | `0 4px 8px 0 rgba(0,0,0,0.16)` | Button / element hover |
| `shadows.dataCard` | `0 4px 20px 0 rgba(0,0,0,0.12)` | Data/feature cards |
| `shadows.dataCardHover` | `0 6px 24px 0 rgba(0,0,0,0.15)` | Data card hover lift |
| `shadows.auth` | `0 8px 32px 0 rgba(0,0,0,0.2)` | Auth-page login card |
| `shadows.breadcrumb` | `0 2px 8px 0 rgba(0,0,0,0.08)` | Subtle separator from page bg |
| `shadows.dropdown` | `0 10px 25px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)` | Dropdown / popover menu |

Brand-tinted shadows are computed at call sites using `alpha(theme.palette.primary.main, 0.4/0.5)`.

---

## `colors` — Colour palette

Every hue is a set of **roles**, not one value. The role you pick decides which
contrast bar the colour has to clear, which is how a call site stays accessible
without anyone re-measuring it. `main` is deliberately the safe one, so the
obvious choice is also the correct one.

| Role | What it is for | Bar it clears |
|---|---|---|
| `main` | the working tone — type, icons, and fills behind white text | ≥ 4.5:1 **both** as type on white and behind white text |
| `dark` | hover / active | ≥ 7:1 |
| `vivid` | **decorative only** — chart marks, large fills | ~3:1 — a graphic-object bar, *never* put type on it |
| `onBrand` | type sitting on `brand.panel` | ≥ 4.5:1 on that panel |
| `surface` | the tint behind `main` type | explicit hex, never an alpha overlay |

Values were derived in OKLCH (hue preserved, lightness solved to the target
ratio, chroma tapered toward the extremes) and every pair is verified.

### Brand
| Token | Value | Use |
|---|---|---|
| `colors.brand.light` | `#667eea` | **Decorative only** — 3.66:1. Large fills and gradient ends. Never behind white text, never under small type. |
| `colors.brand.main` | `#5267cd` | Actions, banners, brand-coloured type. 5.02:1 on white, 4.80:1 on `background.surface`, and carries white text at 5.01:1. |
| `colors.brand.dark` | `#3e50b2` | Hover / active — white text at 7.01:1 |
| `colors.brand.panel` | `#3443a1` | Inset well on a brand banner — white text at 8.52:1 |
| `colors.brand.onSoft` | `#eff3ff` | Secondary type on `brand.main` (4.53:1). Use instead of `opacity: 0.9` on white. |
| `colors.brand.surface` | `#f0f2fd` | Brand-tinted chip background |
| `colors.brand.contrastText` | `#fff` | |

### Secondary
| Token | Value |
|---|---|
| `colors.secondary.main` | `#475569` |
| `colors.secondary.dark` | `#1e293b` |

### Semantic
| Hue | `main` | `dark` | `vivid` | `onBrand` | `surface` |
|---|---|---|---|---|---|
| success | `#008058` | `#006646` | `#00a975` | `#49d49b` | `#e7f8f2` |
| error | `#d12a30` | `#b5041c` | `#ef4444` | `#ffa59c` | `#fdecec` |
| warning | `#9f6400` | `#7e4e00` | `#d08400` | `#ffab33` | `#fef5e7` |
| info | `#0077aa` | `#005f89` | `#009ee1` | `#66c6ff` | `#e7f6fd` |

In the MUI palette these map so that MUI's own components are accessible by
default: `palette.<hue>.main` → `main`, `.dark` → `dark`, `.light` → `vivid`.
A `<Chip color="success">` or `<Button color="error">` is therefore safe with no
call-site opt-in. `.light` is the vivid tone — never put small text on it.

### Text
| Token | Value | Use |
|---|---|---|
| `colors.text.primary` | `#1e293b` | Main body text |
| `colors.text.secondary` | `#64748b` | Secondary / supporting text |
| `colors.text.body` | `#374151` | Card body text |
| `colors.text.subtle` | `#6b7280` | De-emphasized body / caption |
| `colors.text.muted` | `#717782` | De-emphasized text that is still text — 4.50:1 |
| `colors.text.disabled` | `#9ca3af` | **Disabled controls only** — 2.54:1, exempt from WCAG 1.4.3. Never for live text. |
| `colors.text.placeholder` | `#6a788a` | Input placeholders, empty-state icons — 4.50:1 |

### Structure
| Token | Value | Use |
|---|---|---|
| `colors.divider` | `#e5e7eb` | Dividers, borders |
| `colors.border.light` | `#e2e8f0` | Input / graph subtle border |
| `colors.border.inactive` | `#d1d5db` | Inactive form element border |

### Background
| Token | Value | Use |
|---|---|---|
| `colors.background.default` | `#f5f7fa` | Page background |
| `colors.background.paper` | `#ffffff` | Card / modal surface |
| `colors.background.surface` | `#f8fafc` | Table header / code block |
| `colors.background.inactive` | `#f9fafb` | Inactive dropzone / input |
| `colors.background.errorFaint` | `#fef2f2` | Very-light error tint (hover) |

### Chart
| Token | Value | Use |
|---|---|---|
| `colors.chart.violet` | `#8b5cf6` | Production energy stat |
| `colors.chart.blue` | `#3b82f6` | Consumption energy stat |
| `colors.chart.cyan` | `#0ea5e9` | Integration status colour |

---

## `alphas` — Pre-computed rgba surfaces

Used for icon circle backgrounds and tinted surfaces. Named to describe their visual weight, not their exact opacity.

### `alphas.error`
| Token | Value | Use |
|---|---|---|
| `alphas.error.light` | `rgba(239,68,68,0.1)` | Icon circle background |
| `alphas.error.subtle` | `rgba(239,68,68,0.08)` | Tinted surface |

### `alphas.success`
| Token | Value | Use |
|---|---|---|
| `alphas.success.light` | `rgba(16,185,129,0.1)` | Icon circle background |
| `alphas.success.subtle` | `rgba(16,185,129,0.08)` | Tinted surface |

### `alphas.warning`
| Token | Value | Use |
|---|---|---|
| `alphas.warning.light` | `rgba(245,158,11,0.1)` | Icon circle background |

### `alphas.white`
| Token | Value | Use |
|---|---|---|
| `alphas.white.hairline` | `rgba(255,255,255,0.1)` | Very subtle white tint |
| `alphas.white.subtle` | `rgba(255,255,255,0.15)` | Overlay tile on primary bg |
| `alphas.white.soft` | `rgba(255,255,255,0.2)` | Avatar bg on primary banner |
| `alphas.white.cloud` | `rgba(255,255,255,0.3)` | Slightly more visible tint |
| `alphas.white.heavy` | `rgba(255,255,255,0.7)` | Near-opaque overlay |
| `alphas.white.strong` | `rgba(255,255,255,0.9)` | Almost solid white tint |

### `alphas.black`
| Token | Value | Use |
|---|---|---|
| `alphas.black.ghost` | `rgba(0,0,0,0.02)` | Near-transparent zebra stripe |
| `alphas.black.overlay` | `rgba(0,0,0,0.5)` | Modal / drawer backdrop |

---

## `fontSizes` — Non-standard rem sizes

Use these when MUI Typography variants don't cover the size. Prefer variants (`body2`, `caption`, etc.) first.

| Token | Value | Equivalent |
|---|---|---|
| `fontSizes.xs` | `"0.75rem"` | 12px — MUI caption |
| `fontSizes.sm` | `"0.8125rem"` | 13px |
| `fontSizes.md` | `"0.875rem"` | 14px — MUI body2 |
| `fontSizes.lg` | `"0.9375rem"` | 15px |
| `fontSizes.xl` | `"1rem"` | 16px — MUI body1 |
| `fontSizes["2xl"]` | `"1.125rem"` | 18px |
