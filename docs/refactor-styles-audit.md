# Styling audit — Baseline for refactor (Phase 0)

> Date: 2026-05-20
> Branch: `feature/conluzweb-99`
> Goal: measure the starting point of the current styling before centralizing it in the MUI theme. **No code is modified outside `docs/`.**

---

## 1. Actual styling stack

### Installed libraries (per `package.json`)

| Library | Declared version | Status |
|---|---|---|
| `@mui/material` | `^7.2.0` | Installed and in use |
| `@mui/icons-material` | `^7.2.0` | Installed and in use |
| `@mui/x-date-pickers` | `^8.10.0` | Installed and in use |
| `@emotion/react` | `^11.14.0` | Installed (MUI peer) |
| `@emotion/styled` | `^11.14.1` | **Installed but unused** (0 occurrences of `styled(`) |
| Tailwind CSS | — | **Not installed** |
| PostCSS | — | **Not installed** |

### Discrepancy with the README

The `README.md` advertises **"Material-UI (MUI) 7.2 + Tailwind CSS 4.1"**. Verification:

- `grep -i tailwind package.json package-lock.json` → **0 matches**.
- `find . -maxdepth 3 -name "tailwind.config.*"` → **does not exist**.
- `find . -maxdepth 3 -name "postcss.config.*"` → **does not exist**.
- `rg "@tailwind|@theme"` across the whole repo → **0 matches**.

**Conclusion:** Tailwind is not installed nor configured. The README is out of date.

### CSS files

| File | Size | Content |
|---|---|---|
| `src/App.css` | 0 bytes | Empty (only imported) |
| `src/index.css` | 0 bytes | Empty (only imported) |

No `.scss` nor `.module.css` files exist. All live styling lives in `sx={…}` and `className=…`.

### Dead Tailwind-like classes

Despite Tailwind not being present, **13 files still use utility-style classes such as `rounded-xl`, `grid`, `flex`, `p-4`, `mt-5`, `text-2xl`, `font-bold`, `md:grid-cols-4`, etc.** These classes do not resolve to any CSS rule and therefore **produce no visual effect**. They are leftover debt from an earlier Tailwind-based version.

Affected files (partial list, see reproduction script):

- `src/components/CardTemplate/CardTemplate.tsx`
- `src/components/CardList/CardList.tsx`
- `src/components/DropdownCard/DropdownCard.tsx`
- `src/components/DropdownCard/LoadingDropdownCard.tsx`
- `src/components/SupportCard/SupportCard.tsx`
- `src/components/SupplyDetailCard/SupplyDetailCard.tsx`
- `src/components/SupplyDetailCard/loadingSupplyDetailCard.tsx`
- `src/components/SupplyStatsCard/SupplyStatsCard.tsx`
- `src/components/SupplyStatsCard/LoadingSupplyStatsCard.tsx`
- `src/components/StatsCard/StatsCard.tsx`
- `src/components/Graph/LoadingGraphCard.tsx`
- `src/components/Errors/ErrorDisplay.tsx`
- `src/layouts/public.layout.tsx`, `src/layouts/login.layout.tsx`

### Configured `ThemeProvider`

- **Location:** `src/main.tsx`.
- **Single instance** wrapping the whole app. A local `ThemeProvider` also exists in `src/components/Pagination/Pagination.spec.tsx`, used only for unit tests (`createTheme()` defaults).

**What the current theme defines** (minimal palette):

```ts
createTheme({
  palette: {
    primary: {
      main: "#eeaf11",
      light: "#f2d152",
      dark: "#ed8d06",
      contrastText: "#fff",
    },
  },
});
```

**What the theme does NOT define:**

- `palette.secondary`, `success`, `warning`, `error`, `info`, `text`, `background`, `divider`, `action`.
- `typography` (family, sizes, weights).
- `spacing` (stays at the default 8px).
- `shape.borderRadius` (stays at 4 by default).
- `shadows` (defaults).
- `components.*` overrides — **not a single global override exists**.
- `breakpoints` (defaults).

> Critical note: the defined `primary.main` (`#eeaf11`, yellow) **is not used anywhere in the source code**. The dominant UI color is `#667eea` (purple), hand-applied 217 times. The theme and the visual reality do not match.

---

## 2. Quantitative metrics

Exclusions applied to every count: `src/api/**` (Orval-generated) and `*.spec.*`. Folders not listed (`src/main.tsx`, `src/App.tsx`, `src/context`, `src/utils`) are grouped under "Other".

| Metric | Total | components | pages | layouts | Other |
|---|---:|---:|---:|---:|---:|
| `.ts`/`.tsx` files | 113 | 76 | 22 | 4 | 11 |
| `sx={…}` usages | **731** | 369 | 361 | 1 | 0 |
| `styled(...)` usages | **0** | 0 | 0 | 0 | 0 |
| `.css`/`.scss`/`.module.css` files (size) | 2 files / 0 B | — | — | — | `src/App.css`, `src/index.css` (empty) |
| `className=…` usages | 56 | 53 | 0 | 3 | 0 |
| Hardcoded hex colors (`#xxx`/`#xxxxxx`) | **562** | 355 | 203 | 0 | 4 (in `src/main.tsx`) |
| Literal `rgb(` / `rgba(` | 186 | 132 | 54 | 0 | 0 |
| Literal `hsl(` | 0 | 0 | 0 | 0 | 0 |
| Hardcoded `px` in TS/TSX | **349** | 238 | 111 | 0 | 0 |
| `theme.palette.*` usages | 0 | 0 | 0 | 0 | 0 |
| `theme.spacing(` usages | 0 | 0 | 0 | 0 | 0 |
| `theme.shape.*` usages | 0 | 0 | 0 | 0 | 0 |
| `useTheme()` (all uses) | 7 | 7 | 0 | 0 | 0 |
| `theme.{breakpoints,typography,zIndex}` | 9 | 8 | 0 | 1 (header) | 0 |
| `!important` in TS/TSX | **44** | 44 | 0 | 0 | 0 |
| `style={…}` (raw inline attribute) | 8 | 8 | 0 | 0 | 0 |

**Reconciliation:** the sum `components + pages + layouts + Other` matches the total reported in each row (manually verified: e.g. hex 355+203+0+4 = 562 ✓; sx 369+361+1+0 = 731 ✓).

### Immediate observations about the theme

- **The theme is practically unused** (0 references to `theme.palette/spacing/shape`).
- `useTheme()` only appears to read `breakpoints.down("sm")` or `typography.fontFamily` in ApexCharts — never to source color/spacing tokens.
- MUI's `spacing` system is largely ignored (`p:`, `m:`, `gap:` partly use the unit system, but absolute dimensions are expressed in literal `px`).

### Complexity concentration

Top-10 files by `sx={…}` count:

| File | sx |
|---|---:|
| `src/pages/Home.tsx` | 52 |
| `src/pages/partners/Partners.page.tsx` | 39 |
| `src/components/Modals/ImportSuppliesModal.tsx` | 34 |
| `src/components/Modals/ImportPartnersModal.tsx` | 34 |
| `src/pages/integrations/IntegrationCard.tsx` | 30 |
| `src/components/PlantCard/PlantCard.tsx` | 27 |
| `src/pages/Contact.page.tsx` | 26 |
| `src/pages/Profile.tsx` | 24 |
| `src/pages/auth/Login.tsx` | 22 |
| `src/components/PlantDetailHeader/PlantDetailHeader.tsx` | 21 |

Top-5 files by hardcoded hex colors:

| File | hex |
|---|---:|
| `src/components/Graph/GraphFilter.tsx` | 38 |
| `src/components/Modals/ImportSuppliesModal.tsx` | 37 |
| `src/components/Modals/ImportPartnersModal.tsx` | 37 |
| `src/pages/partners/Partners.page.tsx` | 33 |
| `src/pages/Home.tsx` | 33 |

---

## 3. Top 20 most repeated `sx` patterns

Extracted with a one-shot Node script (see "Commands used"). Literal `sx={{...}}` blocks, whitespace-normalized, grouped by exact equality. Total: **348 distinct patterns** across 731 occurrences.

| # | Pattern (truncated to 120 chars) | Count | Files | Examples |
|---:|---|---:|---:|---|
| 1 | `{ px: { xs: 2, sm: 0 } }` | 21 | 4 | `pages/production/PlantDetailPage.tsx`, `pages/production/PlantsPage.tsx`, `pages/supply-points/SupplyDetailPage.tsx` |
| 2 | `{ px: { xs: 2, sm: 0 }, width: "100%" }` | 19 | 10 | `pages/Profile.tsx`, `pages/auth/ChangePassword.tsx`, `pages/integrations/IntegrationsPage.tsx` |
| 3 | `{ opacity: 0.9 }` | 16 | 15 | `components/PageHeader/PageHeaderWithStats.tsx`, `components/PlantCard/PlantCard.tsx`, `components/PlantDetailHeader/PlantDetailHeader.tsx` |
| 4 | `{ "& .MuiOutlinedInput-root": { "&:hover fieldset": { borderColor: "#667eea" }, "&.Mui-focused fieldset": { borderColor: "#…"` | 16 | 4 | `components/PlantForm/PlantForm.tsx`, `components/SupplyForm/SupplyForm.tsx`, `pages/Home.tsx` |
| 5 | `{ fontSize: 32 }` | 14 | 13 | `components/PlantDetailHeader/PlantDetailHeader.tsx`, `components/SupplyDetailHeader/SupplyDetailHeader.tsx`, `pages/Contact.page.tsx` |
| 6 | `{ display: "flex", alignItems: "center", gap: 2 }` | 11 | 11 | `components/PlantCard/PlantCard.tsx`, `components/SupplyCard/SupplyCard.tsx`, `pages/Profile.tsx` |
| 7 | `{ bgcolor: "rgba(255, 255, 255, 0.2)", width: 56, height: 56 }` | 11 | 11 | `components/PlantDetailHeader/PlantDetailHeader.tsx`, `components/SupplyDetailHeader/SupplyDetailHeader.tsx`, `pages/Contact.page.tsx` |
| 8 | `{ fontSize: 24 }` | 11 | 3 | `pages/Home.tsx`, `pages/production/PlantDetailPage.tsx`, `pages/supply-points/SupplyDetailPage.tsx` |
| 9 | `{ opacity: 0.8, display: "block", mb: 0.5 }` | 10 | 2 | `components/PlantDetailHeader/PlantDetailHeader.tsx`, `components/SupplyDetailHeader/SupplyDetailHeader.tsx` |
| 10 | `{ p: { xs: 2, sm: 3 }, borderRadius: { xs: 2, sm: 3 }, bgcolor: "white", boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)" }` | 9 | 9 | `components/Graph/GraphFilter.tsx`, `pages/partners/CreatePartner.tsx`, `pages/partners/EditPartner.tsx` |
| 11 | `{ flex: 1 }` | 9 | 9 | `components/Modals/DeleteConfirmationModal.tsx`, `components/Modals/DisableConfirmationModal.tsx`, … |
| 12 | `{ display: "flex", flexDirection: "column", gap: 3 }` | 9 | 8 | `components/PartnerForm/PartnerForm.tsx`, `components/PlantForm/PlantForm.tsx`, `components/SupplyForm/SupplyForm.tsx` |
| 13 | `fieldSx` (referenced variable) | 9 | 1 | `components/PartnerForm/PartnerForm.tsx` (sx object already extracted to a const) |
| 14 | `{ display: "flex", alignItems: "center", gap: 2, mb: 2 }` | 8 | 8 | `components/Modals/DeleteConfirmationModal.tsx`, `components/Modals/DisableConfirmationModal.tsx`, … |
| 15 | `{ bgcolor: "rgba(255, 255, 255, 0.15)", backdropFilter: "blur(10px)", borderRadius: 2, p: 2 }` | 8 | 2 | `components/PlantDetailHeader/PlantDetailHeader.tsx`, `components/SupplyDetailHeader/SupplyDetailHeader.tsx` |
| 16 | `{ px: 3, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%', '&:hover': { backgroun…` | 7 | 3 | `components/Menu/DisplayMenu.tsx`, `components/Menu/ProfileMenu.tsx`, `components/PlantCard/PlantCard.tsx` |
| 17 | `{ mr: 2, fontSize: 20, color: '#6b7280', flexShrink: 0 }` | 7 | 3 | `components/Menu/DisplayMenu.tsx`, `components/Menu/ProfileMenu.tsx`, `components/PlantCard/PlantCard.tsx` |
| 18 | `{ color: '#374151', fontWeight: 500, textAlign: 'left' }` | 7 | 3 | `components/Menu/DisplayMenu.tsx`, `components/Menu/ProfileMenu.tsx`, `components/PlantCard/PlantCard.tsx` |
| 19 | `{ fontWeight: 600, color: "#475569" }` | 7 | 1 | `pages/partners/Partners.page.tsx` |
| 20 | `{ fontFamily: "Inter, sans-serif", fontSize: "1.25rem", fontWeight: 600, color: "#1e293b" }` | 6 | 6 | `components/Modals/DeleteConfirmationModal.tsx`, `components/Modals/DisableConfirmationModal.tsx`, … |

**Quick read:** patterns 4, 10, 15, 16, 20 (plus 22 and 25 just outside the top 20) are direct candidates for:

- **`components.MuiTextField.styleOverrides.root`** (pattern 4 and its derivatives).
- **A new `Card`/`Paper` variant** (pattern 10 = "card panel with soft shadow").
- **A new `Box`/`Paper` variant** for detail headers (patterns 7, 15).
- **`components.MuiMenuItem.styleOverrides.root`** (patterns 16-18).
- **`typography.h6` or a custom variant** (pattern 20, repeated across every modal).

---

## 4. Top 15 most repeated literal values

### 4.1 Hex colors

Total distinct hex values: **54**. Top-15:

| Color | Count | Probable role |
|---|---:|---|
| `#667eea` | **217** | Real brand/primary (purple) — not in the theme |
| `#10b981` | 43 | Success (green) |
| `#ef4444` | 38 | Error/destructive (red) |
| `#475569` | 33 | Dark secondary text (slate 600) |
| `#5568d3` | 29 | Hover/dark variant of purple `#667eea` |
| `#1e293b` | 23 | Primary text (slate 800) |
| `#64748b` | 18 | Tertiary text (slate 500) |
| `#f5f7fa` | 17 | Subtle background |
| `#6b7280` | 14 | Alt secondary text (gray 500) |
| `#f8fafc` | 12 | Very light background (slate 50) |
| `#9ca3af` | 12 | Disabled text (gray 400) |
| `#f59e0b` | 11 | Warning (amber 500) |
| `#374151` | 9 | Alt primary text (gray 700) |
| `#e5e7eb` | 7 | Border/divider (gray 200) |
| `#dc2626` | 6 | Error hover (red 600) |

### 4.2 `rgba(...)` colors

Top-10:

| Value | Count | Probable role |
|---|---:|---|
| `rgba(0,0,0,0.08)` | 25 | Standard soft shadow |
| `rgba(255,255,255,0.2)` | 20 | Light overlay over colored background |
| `rgba(0,0,0,0.12)` | 19 | Medium shadow |
| `rgba(102,126,234,0.04)` | 12 | Translucent purple hover background |
| `rgba(0,0,0,0.16)` | 12 | Strong shadow |
| `rgba(255,255,255,0.15)` | 11 | Light overlay (variant) |
| `rgba(102,126,234,0.1)` | 11 | More visible purple hover background |
| `rgba(16,185,129,0.1)` | 8 | Soft success background |
| `rgba(102,126,234,0.5)` | 7 | Brand-tinted shadow |
| `rgba(102,126,234,0.4)` | 7 | Brand-tinted shadow (variant) |

### 4.3 `px` values

Top-10 (out of 349 occurrences):

| Value | Count | Probable role |
|---|---:|---|
| `4px` | 67 | Shadow offset / border |
| `6px` | 53 | `borderRadius` (form fields) |
| `8px` | 45 | Small spacing |
| `20px` | 39 | Shadow blur / large spacing |
| `2px` | 36 | Thin border / shadow |
| `10px` | 21 | Mid shadow blur |
| `12px` | 17 | Large shadow blur |
| `1px` | 12 | Border |
| `24px` | 9 | Spacing |
| `16px` | 8 | Spacing |

### 4.4 Shadows (literal `boxShadow:`)

Top-5:

| Value | Count |
|---|---:|
| `"0 4px 20px 0 rgba(0,0,0,0.08)"` | 21 |
| `"0 2px 4px 0 rgba(0,0,0,0.12)"` | 13 |
| `"0 4px 8px 0 rgba(0,0,0,0.16)"` | 12 |
| `"0 6px 20px 0 rgba(102,126,234,0.5)"` | 5 |
| `"0 4px 15px 0 rgba(102,126,234,0.4)"` | 5 |

### 4.5 `borderRadius` (raw value)

| Value | Count |
|---|---:|
| `2` (MUI unit) | 44 |
| `"6px"` | 39 |
| `{ xs: 2, sm: 3 }` | 16 |
| `"50%"` | 14 |
| `{ xs: 0, sm: 3 }` | 11 |
| `3` | 8 |
| `1` | 6 |
| `6` | 3 |
| `8`, `5`, `4` | 1 each |

> **Inconsistency:** `borderRadius: "6px"` (literal px value) coexists with `borderRadius: 2` (theme multiplier: 2 × 4 = 8 px by default). In practice **6 px ≠ 8 px** and the visual result differs slightly between components — the user probably does not notice, but changing `shape.borderRadius` will not propagate uniformly.

---

## 5. Card components inventory

| Component | Lines | MUI wrapper | Children | Style props (summary) | Notes |
|---|---:|---|---|---|---|
| `CardTemplate` | 11 | `Card` | `children` | Only propagated `className` with dead Tailwind-like classes: `border-black rounded-xl focus:border-yellow-50 w-full` | **0 sx**, fully dependent on the missing Tailwind → renders a bare `MuiCard`. |
| `CardList` | 43 | `Box` (not a Card) | `children` | `className="mt-5 grid content-center"` (dead Tailwind). Internally wraps a paginated `<ul>`. | Misnamed: it's not a card, it's a paginator. |
| `DropdownCard` | 20 | `Accordion` | `children` + `title` | `className="rounded p-2"` (dead Tailwind) + `Typography` with `className="text-2xl font-bold"` (dead). | Not a `Card`; an `Accordion` wrapper. |
| `StatsCard` | 173 | `Card` | hardcodes internal structure; receives `stats[]`, `title`, `icon` | `sx`: `width:"100%"`, `borderRadius: 2`, `boxShadow:"0 4px 20px 0 rgba(0,0,0,0.12)"`, `&:hover boxShadow:"0 6px 24px 0 rgba(0,0,0,0.15)"`; header `Box` with `background:"#667eea"`, `p:2`; iconBg `rgba(255,255,255,0.2)`, `borderRadius:"50%"`. Mixes `sx` with dead classes (`text-center`, `flex justify-center mb-2`). | The most complete "Stats". |
| `SupplyCard` | 287 | `Card` | hardcodes internal structure (header + 3 metrics + address) | `sx`: `cursor:pointer`, `transition`, `borderRadius:2`, dynamic `boxShadow` on hover (`0 4px 20px 0 rgba(0,0,0,0.08)` ↔ `0 8px 30px 0 rgba(0,0,0,0.12)`), `transform: translateY(-4px)` on hover. Header with `background:"#667eea"`, `p:2`. Avatars with `bgcolor:"rgba(255,255,255,0.2)"`. 3 metric boxes with different `bgcolor` (`rgba(236,72,153,0.08)`, `rgba(102,126,234,0.08)`, `rgba(16,185,129,0.08)`). | "Rich" card with its own token system. |
| `SupplyDetailCard` | 52 | `CardTemplate` (desktop) / `DropdownCard` (mobile) | fixed `Stat` children (CUPS, address, coefficient) | Only dead Tailwind classes (`p-4 grid grid-flow-col auto-cols-fr gap-2 …`). | Different mobile vs desktop render. |
| `SupplyStatsCard` | 44 | `CardTemplate` | fixed `Stat` children (consumption, self-consumption, etc.) | Only dead Tailwind classes (`grid md:grid-flow-col md:auto-cols-max …`). | Visually styleless. |
| `SupportCard` | 19 | `CardTemplate` | `children` + `label` + `icon` | Only dead Tailwind classes (`p-4 grid grid-cols-2 md:grid-cols-4 items-center`). | Low coupling. |

### Comparative conclusion

Two "families" coexist without speaking to each other:

- **Family A — "Pure MUI with sx"**: `StatsCard`, `SupplyCard`. They hardcode their content, use `#667eea`, standard shadows, and `rgba(...,0.08)` backgrounds for metric tiles. Padding `p:2`/`p:3`. Modern design.
- **Family B — "Dead Tailwind over CardTemplate"**: `SupplyDetailCard`, `SupplyStatsCard`, `SupportCard`, `DropdownCard`, `CardList`, `CardTemplate` itself. Classes don't resolve → the card looks flat, with no shadow, no padding, no radius (everything falls back to `MuiCard`/`MuiAccordion` defaults). **Visually broken or degraded compared to the intended design.**

The refactor should:

1. **Drop `CardTemplate` and its Tailwind-style consumers** or, better, rewrite them against the theme.
2. **Promote Family A** (StatsCard/SupplyCard) to the baseline — extract the "card with colored header + soft boxShadow + hover lift" pattern into a single parameterizable component or into a theme `variant`.

---

## 6. Findings and risks

1. **The MUI theme is empty.** It only declares `palette.primary` and, on top of that, **it isn't used** (`#eeaf11` appears only in `main.tsx`; the real product color is `#667eea`, 217 literal occurrences). Highest-ROI single fix.
2. **Phantom Tailwind.** 13 files use non-existent utility classes; the README still mentions "Tailwind CSS 4.1". This gives a false sense of typography/spacing while reading the code that doesn't exist at runtime.
3. **`StatsCard` and `SupplyCard` are the same idea repeated with two APIs.** Same pattern (header `#667eea` + body, shadow `0 4px 20px 0 rgba(0,0,0,0.08)`, hover lift) reimplemented in each file.
4. **5 `sx` patterns appear ≥9 times across ≥8 files each** (`{ display:"flex", alignItems:"center", gap:2 }`, `{ flex:1 }`, `{ opacity:0.9 }`, `{ display:"flex", flexDirection:"column", gap:3 }`, `{ p:{xs:2,sm:3}, borderRadius:{xs:2,sm:3}, bgcolor:"white", boxShadow:"…" }`). Direct candidates for primitives or variants.
5. **44 `!important`** in `PlantForm.tsx` and `Graph/GraphFilter.tsx`, all of them forcing `#667eea` over the theme's `primary.main`. A direct symptom of the theme/reality mismatch.
6. **Radius inconsistencies.** `borderRadius: "6px"` (39 uses in forms), `borderRadius: 2` (44 uses = 8 px), `borderRadius: 3` (8 uses = 12 px), and `borderRadius: { xs: 2, sm: 3 }` (16 uses) all coexist. There is no "canonical radius".
7. **Shadow inconsistencies**: 3 very similar "neutral" shadows coexist without a token: `0 4px 20px 0 rgba(0,0,0,0.08)` (21×), `0 2px 4px 0 rgba(0,0,0,0.12)` (13×), `0 4px 8px 0 rgba(0,0,0,0.16)` (12×).
8. **`PartnerForm` already extracted `fieldSx` into a constant** (9 uses in the file). It's the only signal that someone started tokenizing. Useful as a reference for "what the user wants".
9. **Inline `style={…}` in 4 files under `Menu/`** (8 occurrences). Mixed with `sx={…}`. Beware when migrating: `style` takes precedence over `sx`, so a naïve refactor may introduce regressions.
10. **Concrete refactor risks:**
    - **No snapshots nor visual regression**: no `__snapshots__/`, no Playwright under `src/`, no jest-image-snapshot. Blind migration → either manual review or install visual regression first (e.g. Playwright traces).
    - **Unit tests**: 28 `.spec.tsx` files. Several of them (`CardList`, `DropdownCard`, `SupplyDetailCard`, `SupplyStatsCard`, `Pagination`) cover cards. The `ThemeProvider` in `Pagination.spec.tsx` instantiates a default `createTheme()`, which means **any override of `components.MuiPagination` would break the assert if the test cares about rendered behavior**.
    - **Components with multiple consumers**: `CardTemplate` is imported by 6 components. Changing (or removing) it requires coordination.
    - **Dynamic coupling**: `SupplyCard` computes `boxShadow` and `transform` from state (`isHovered`) inside JSX. Migrating to `&:hover` in `sx`/theme is functionally equivalent but requires removing the manual state machine.

---

## 7. Recommended attack order

Based on the data above, I propose the following order for the upcoming phases. Numeric justification accompanies each item.

### Phase 1 — Color tokens in the theme (max impact, low risk)

Reason: **217 + 29 (hover) = 246 occurrences of `#667eea`/`#5568d3`** + tinted shadows = ~265 sites would change with ONE theme line. Replacing the theme's `primary.main` with `#667eea` (with `dark: #5568d3` and `contrastText: white`) also enables removing the 44 `!important`.

- Extend `palette` with `secondary` (slate `#475569`/`#1e293b` for text), `success: #10b981`, `error: #ef4444`, `warning: #f59e0b`.
- **Do not touch components yet**: just the theme + a mechanical find-and-replace of `#667eea` → `(theme) => theme.palette.primary.main` across the 24 files where it appears. Test: visual smoke test (log in, list supplies, open a modal).

### Phase 2 — Radius, shadow, and spacing tokens

Reason: 144 `borderRadius` and 53 `box-shadow` literals collapse into ~6 unique values. Define:

- `shape.borderRadius = 8` (aligned with `borderRadius: 2`).
- `shadows[2]`, `shadows[4]`, `shadows[8]` tuned to the three standard shadows detected.
- Use the opportunity to replace the literal `"6px"` with `borderRadius: 1` (= 4 px… contrast to be reviewed) or `0.75` inside `MuiTextField`'s `styleOverrides`.

### Phase 3 — Global `MuiTextField` override

Reason: pattern `#4` (`& .MuiOutlinedInput-root { hover/focus borderColor #667eea }`) appears 16 times across 4 files plus a similar pattern `#25` 6 more times. A single override on `theme.components.MuiTextField.styleOverrides.root` removes them and aligns with the newly defined `palette.primary`.

### Phase 4 — Unify Cards (the most user-visible step)

Reason: cards are section 5 of the audit and the most overlapping piece. Concrete plan:

1. **Create `<AppCard variant="…">`** or a `MuiCard` theme variant with:
    - `borderRadius: 2`, `boxShadow: shadows[2]`, `&:hover: shadows[4]`, `transition`.
2. **Replace `StatsCard` and `SupplyCard`** so their container delegates to `AppCard`. Keep their public API (props) → consumers won't notice.
3. **Remove `CardTemplate`** and migrate its 6 consumers to `AppCard`/`Paper`. Take the chance to delete the dead Tailwind classes.
4. **`DropdownCard`**: rename to `<AppAccordion>` and clean it up.
5. **`CardList`**: rename to `<PaginatedList>` (not a Card).

### Phase 5 — Detail headers (`PlantDetailHeader`, `SupplyDetailHeader`)

Reason: patterns `#7` (`bgcolor: rgba(255,255,255,0.2), width: 56, height: 56`) and `#15` (`bgcolor: rgba(255,255,255,0.15), backdropFilter: blur(10px), borderRadius: 2, p: 2`) live exclusively in these two near-twin files. Extract to a shared `<DetailHeader>` or to variants.

### Phase 6 — Import / confirmation modals

Reason: `ImportSuppliesModal` and `ImportPartnersModal` (34 sx each) are **clones**. Together with the 6 `*ConfirmationModal` + `*SuccessModal` they repeat patterns #14 and #20. A single `<AppModal title icon>` covers them all.

### Phase 7 — Final cleanup

- Delete `src/App.css` and `src/index.css` (empty).
- Delete `border-black rounded-xl …` and the rest of the dead Tailwind classes.
- Update the README (remove the Tailwind mention).
- Consider adding a visual regression test (Playwright traces) **before Phase 1** as a safety net.

### Numeric prioritization summary

| Phase | Estimated changes | Risk | Numeric justification |
|---|---|---|---|
| 1 — Palette tokens | ~265 sites | Low | 217 × `#667eea` + 44 `!important` disappear |
| 2 — Radius/shadow tokens | ~200 sites | Low-medium | 144 radii + 53 shadows are groupable |
| 3 — `MuiTextField` override | 22 sites | Low | Patterns #4 and #25 |
| 4 — Cards | 8 components | Medium | 6 `CardTemplate` consumers, 2 "rich" cards |
| 5 — Detail headers | 2 files | Low | Only `PlantDetailHeader`+`SupplyDetailHeader` |
| 6 — Modals | 8 files | Medium | `ImportSupplies/Partners` + 6 confirmation/success |
| 7 — Cleanup | n/a | Low | Cosmetic + docs |

---

## Commands used

All executed from the repo root (`/home/viktorkhan/workspaces/lucoenergia/sources/conluz-web`). Standard exclusions: `-g '!src/api/**' -g '!*.spec.*'`.

```bash
# Section 1 — stack
grep -i "tailwind" package.json package-lock.json
find . -maxdepth 3 -name "tailwind.config.*"
find . -maxdepth 3 -name "postcss.config.*"
rg "@tailwind|@theme"
rg "ThemeProvider|createTheme" src/
find src -name "*.css" -o -name "*.scss" -o -name "*.module.css"
rg "className=\"[^\"]*(rounded|grid |flex |p-[0-9]|m-[0-9]|mb-[0-9]|mt-[0-9]|gap-[0-9]|text-(xs|sm|base|lg|xl|2xl|3xl|center)|font-(bold|semibold|extrabold))[^\"]*\"" src/ -g '!src/api/**' -g '!*.spec.*' -l

# Section 2 — metrics
rg --files src/ -g '*.tsx' -g '*.ts' -g '!src/api/**' -g '!*.spec.*' | wc -l
rg "sx=\{"           src/ -g '!src/api/**' -g '!*.spec.*' --count-matches | awk -F: '{s+=$2} END{print s}'
rg "styled\("         src/ -g '!src/api/**' -g '!*.spec.*' --count-matches
rg "className="       src/ -g '!src/api/**' -g '!*.spec.*' --count-matches | awk -F: '{s+=$2} END{print s}'
rg "#[0-9a-fA-F]{3,8}\b" src/ -g '!src/api/**' -g '!*.spec.*' --count-matches | awk -F: '{s+=$2} END{print s}'
rg "rgba?\("         src/ -g '!src/api/**' -g '!*.spec.*' --count-matches | awk -F: '{s+=$2} END{print s}'
rg "hsl\("           src/ -g '!src/api/**' -g '!*.spec.*' --count-matches
rg "\b\d+px\b"       src/ -g '*.ts' -g '*.tsx' -g '!src/api/**' -g '!*.spec.*' --count-matches | awk -F: '{s+=$2} END{print s}'
rg "theme\.(palette|spacing|shape)\." src/ -g '!src/api/**' -g '!*.spec.*' --count-matches
rg "useTheme\(\)"     src/ -g '!src/api/**' -g '!*.spec.*' --count-matches
rg "!important"       src/ -g '!src/api/**' -g '!*.spec.*'
rg "(\s|<)style=\{"   src/ -g '!src/api/**' -g '!*.spec.*' --count-matches

# Section 3 — sx patterns (one-shot script in /tmp, not committed)
node /tmp/sx-extract.mjs    # parses sx={{...}} blocks with brace balancing, normalizes whitespace, group-by

# Section 4 — top literals
rg -oI "#[0-9a-fA-F]{3,8}\b" src/ -g '!src/api/**' -g '!*.spec.*' \
  | awk -F: '{print tolower($NF)}' | sort | uniq -c | sort -rn | head -30
rg -oI "rgba?\([^)]+\)"      src/ -g '!src/api/**' -g '!*.spec.*' \
  | awk -F: '{print $NF}' | sed 's/ //g' | sort | uniq -c | sort -rn | head -20
rg -oI "\b[0-9]+px\b"        src/ -g '*.ts' -g '*.tsx' -g '!src/api/**' -g '!*.spec.*' \
  | awk -F: '{print $NF}' | sort | uniq -c | sort -rn | head -20
rg -oI "boxShadow:\s*[\"'][^\"']+[\"']" src/ -g '!src/api/**' -g '!*.spec.*' \
  | awk -F: '{$1=""; print $0}' | sed 's/^ *//' | sort | uniq -c | sort -rn | head -10
rg -oI "borderRadius:\s*[^,\}]+" src/ -g '!src/api/**' -g '!*.spec.*' --no-filename \
  | sort | uniq -c | sort -rn | head -20

# Section 5 — card inventory
for d in CardTemplate CardList DropdownCard StatsCard SupplyCard SupplyDetailCard SupplyStatsCard SupportCard; do
  echo "=== $d ==="; ls src/components/$d/
done
wc -l src/components/{CardTemplate,CardList,DropdownCard,StatsCard,SupplyCard,SupplyDetailCard,SupplyStatsCard,SupportCard}/*.tsx
rg "from \"\.\./CardTemplate" src/    # consumers of CardTemplate

# Section 6 — anomalies
rg "!important"   src/ -g '!src/api/**' -g '!*.spec.*'
rg "(\s|<)style=\{" src/ -g '!src/api/**' -g '!*.spec.*' --count-matches
rg "sx=\{"        src/ -g '!src/api/**' -g '!*.spec.*' --count-matches | sort -t: -k2 -rn | head -10
```

### `sx` pattern extraction script (reference snapshot)

Stored at `/tmp/sx-extract.mjs`, **deleted at the end of the audit**. Idea: for each non-excluded `.ts(x)` file, look for `sx={`, find the closing `}` by balancing braces (respecting strings and template literals), normalize whitespace, and group by textual equality. Sort by descending frequency. Quick reproduction:

```js
// /tmp/sx-extract.mjs (pseudocode)
walk("src", file => {
  if (file in src/api/ || /\.(spec|test)\./.test(file)) skip;
  src = read(file);
  for each "sx={" in src:
    extract { ... } with brace-balance, ignoring strings/templates;
    normalize whitespace -> key;
    map.set(key, { count++, files += file });
});
sort by count desc; print top 25.
```

---

_End of audit. Total: 7 sections + commands. No files were modified outside `docs/`._
