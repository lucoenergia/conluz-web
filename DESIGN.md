---
name: Conluz Web
description: The web interface to Conluz, an energy management system run by and for Spanish renewable energy communities.
colors:
  cooperative-blue: "#5267cd"
  cooperative-blue-dark: "#3e50b2"
  cooperative-blue-panel: "#3443a1"
  cooperative-blue-decorative: "#667eea"
  cooperative-blue-soft: "#eff3ff"
  cooperative-blue-surface: "#f0f2fd"
  success: "#008058"
  success-dark: "#006646"
  success-decorative: "#00a975"
  success-surface: "#e7f8f2"
  caution: "#9f6400"
  caution-dark: "#7e4e00"
  caution-decorative: "#d08400"
  caution-surface: "#fef5e7"
  fault: "#d12a30"
  fault-dark: "#b5041c"
  fault-decorative: "#ef4444"
  fault-surface: "#fdecec"
  notice: "#0077aa"
  notice-dark: "#005f89"
  notice-decorative: "#009ee1"
  notice-surface: "#e7f6fd"
  ink: "#1e293b"
  ink-secondary: "#64748b"
  ink-body: "#374151"
  ink-subtle: "#6b7280"
  ink-muted: "#717782"
  ink-placeholder: "#6a788a"
  ink-disabled: "#9ca3af"
  slate: "#475569"
  slate-dark: "#1e293b"
  hairline: "#e5e7eb"
  border-light: "#e2e8f0"
  border-inactive: "#d1d5db"
  page: "#f5f7fa"
  paper: "#ffffff"
  surface: "#f8fafc"
  production: "#8050e8"
  consumption: "#286cdb"
  integration: "#0078ac"
typography:
  display:
    fontFamily: "Inter, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 700
    lineHeight: 1.235
  headline:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.334
  title:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.6
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.cooperative-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "6px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.cooperative-blue-dark}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
  button-outlined:
    backgroundColor: "transparent"
    textColor: "{colors.cooperative-blue}"
    rounded: "{rounded.md}"
    padding: "5px 15px"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.lg}"
    padding: "24px"
  banner:
    backgroundColor: "{colors.cooperative-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "24px"
  chip-status:
    backgroundColor: "{colors.cooperative-blue-surface}"
    textColor: "{colors.cooperative-blue}"
    rounded: "{rounded.lg}"
    padding: "0 8px"
    height: "24px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16.5px 14px"
---

# Design System: Conluz Web

## Overview

**Creative North Star: "The Cooperative Utility"**

Conluz was built by an energy co-op for its own neighbours, and the interface is
supposed to feel like it. It is not sold as a dashboard and does not need to
impress anyone into buying it; it needs a seventy-year-old member checking their
share on a phone and an administrator racing a distributor deadline to both
succeed on the same calm surfaces. Warmth here comes from plain Spanish and
generous room to act, never from decoration.

The system's real signature is how little it leaves to taste. Every hue is a set
of roles rather than a value, each derived in OKLCH with its contrast solved to a
target and verified rather than eyeballed. Touch targets grow from the *pointer
type*, not the viewport width, so a touchscreen laptop is covered where a
breakpoint would have missed it. Locale bundles ship with the theme so assistive
technology does not announce English pagination on a Spanish screen. The same
discipline that keeps a coefficient exact to six decimals keeps the type legible.

One honest caveat, recorded in PRODUCT.md and repeated here: **nothing in this
palette is yet a brand commitment.** The blue is a working scaffold the
maintainer has explicitly left open to replacement. Treat the *structure* of this
system — role-based hues, verified ratios, pointer-keyed targets — as the durable
part, and the specific values as current rather than sacred.

**Key Characteristics:**
- Plain civic language over product voice; no insider shorthand on a member's screen
- Role-based colour with every pairing verified to a contrast target, not sampled
- One self-hosted variable typeface, no third-party font dependency
- Generous, pointer-aware touch targets that never shrink for density
- Regulated figures shown exactly, never rounded to read nicer

**Anti-references.** This system is explicitly not a trading or analytics
dashboard: no dark data-wall, no KPI grid as a home screen, no chart-first
landing for households. It is not a consumer app with a personality: no mascots,
no illustration set, no celebratory animation, no gamification of an energy
share. And it is not an enterprise admin console: no grey-on-grey density, no
nested settings trees, no domain jargon promoted into a UI label.

## Colors

A restrained, cool palette in which saturation is rationed: one working blue
carries the product, four semantic hues carry state, and everything else is a
neutral doing structural work.

### Primary
- **Cooperative Blue** (`#5267cd`): the product's working tone — page banners,
  primary buttons, links, selected chips, brand-coloured type. Chosen because it
  is safe in *every* direction at once: 5.02:1 as type on white, and it carries
  white text at 5.01:1, so a single value serves as type, icon and fill without a
  second check.
- **Cooperative Blue Dark** (`#3e50b2`): hover and active states (7.01:1 behind
  white text).
- **Cooperative Blue Panel** (`#3443a1`): an inset well *on* a blue banner, where
  a tint would disappear into the surface behind it.
- **Cooperative Blue Decorative** (`#667eea`): large fills and gradient ends only.
  At 3.66:1 it can neither carry small text nor sit behind white text.
- **Cooperative Blue Soft** (`#eff3ff`): secondary type sitting on a blue banner
  (4.52:1). This token exists to replace `opacity: 0.9`, which made legibility
  depend on whatever happened to be underneath.
- **Cooperative Blue Surface** (`#f0f2fd`): the tint behind blue type on white.

### Secondary
- **Slate** (`#475569`) and **Slate Dark** (`#1e293b`): a neutral secondary used
  where an action needs weight without claiming brand meaning.

### Tertiary
Three accent hues carry data identity rather than state, each safe in every
direction so they can label a figure as well as fill a mark:
- **Production Violet** (`#8050e8`): production figures and series.
- **Consumption Blue** (`#286cdb`): consumption figures and series.
- **Integration Cyan** (`#0078ac`): third-party provider marks (Datadis, Huawei
  FusionSolar, Shelly).

### Neutral
- **Ink** (`#1e293b`): primary text.
- **Ink Secondary** (`#64748b`) / **Ink Body** (`#374151`) / **Ink Subtle**
  (`#6b7280`) / **Ink Muted** (`#717782`): a descending ladder of de-emphasised
  text, all of which still clear 4.5:1.
- **Ink Placeholder** (`#6a788a`): input placeholders and empty-state glyphs.
- **Ink Disabled** (`#9ca3af`): disabled controls *only*. At 2.54:1 it is exempt
  from the contrast minimum precisely because it marks something inert; using it
  for de-emphasised live text is a defect.
- **Hairline** (`#e5e7eb`), **Border Light** (`#e2e8f0`), **Border Inactive**
  (`#d1d5db`): dividers, field strokes, inactive dropzones.
- **Page** (`#f5f7fa`), **Paper** (`#ffffff`), **Surface** (`#f8fafc`): the three
  planes every screen is built from.

### State
Each semantic hue ships four roles — working tone, hover, decorative, and an
explicit surface tint:
- **Success** (`#008058`), **Caution** (`#9f6400`), **Fault** (`#d12a30`),
  **Notice** (`#0077aa`).

### Named Rules

**The Safe-Tone Rule.** `main` is the only tone permitted to carry type. Every
`main` clears 4.5:1 both as text on white and behind white text, which is why the
obvious call site is also the correct one. `*-decorative` is roughly 3:1 — the
bar for a graphic object, never for a word. A chart bar may use it; a label on
that bar may not.

**The Explicit Tint Rule.** A tint that will sit behind type is a named `surface`
token, never an alpha overlay. Alpha makes the effective contrast depend on
whatever happens to be underneath, which means the ratio can no longer be
verified — only guessed.

**The Rationed Accent Rule.** Colour marks state and identity, nothing else. A
screen that uses a semantic hue for emphasis has spent the signal that tells a
member something is wrong.

## Typography

**Display / Body / Label Font:** Inter (with `sans-serif` fallback)

**Character:** One neutral, highly legible grotesque doing every job. Inter was
chosen for its large x-height and unambiguous figures — the difference between
`0,300000` and `0,030000` has to survive a phone screen in daylight. Personality
comes from weight and spacing, never from a second face.

Inter ships as a **variable** font, self-hosted from `public/fonts/` with
`font-weight: 100 900`, declared inline in `index.html` and preloaded for the
Latin subset. The Latin-Extended subset is fetched only when a glyph demands it,
so the usual cost is a single 48 KB file.

### Hierarchy
- **Display** (700, 2.125rem): page and entity titles. Rendered as `variant="h4"`
  with `component="h1"` so the visual scale and the document outline can differ.
- **Headline** (700, 1.5rem): section headings inside a page.
- **Title** (600, 1.25rem): dialog titles and panel headings.
- **Body** (400, 1rem): default reading size.
- **Label** (400, 0.875rem): table cells, captions, dense form text. Supporting
  steps of 0.75rem, 0.8125rem, 0.9375rem and 1.125rem exist for modal and form
  density that does not map onto a MUI variant.

### Named Rules

**The One Face Rule.** Inter, self-hosted, forever. A runtime dependency on a
font CDN would quietly break an air-gapped community instance, transmit member IP
addresses to a third party, and contradict the self-hostability claim the product
actually makes. Never reintroduce one `@font-face` block per weight; one variable
file per subset serves every weight.

**The Tabular Figures Rule.** Any number a reader compares against another number
— a coefficient, a sum, an energy value — is set with `font-variant-numeric:
tabular-nums`. Proportional digits make decimal columns jitter between rows, and
these are regulatory figures.

## Layout

Pages are a single vertical column of full-width panels on a `#f5f7fa` page
plane, separated by a 16–24px gap and padded 0/16/24px as the viewport grows.
There is no multi-column page grid; density is achieved inside a panel, never by
splitting the page.

The authenticated shell places a persistent side menu beside the content, which
collapses below **768px** (`MIN_DESKTOP_WIDTH`). Component-level responsive
behaviour uses MUI's own breakpoints (`sm` 600, `md` 900, `lg` 1200), most often
to turn a table into a stacked card list.

Spacing runs on an 8px base: `1` = 8px, `2` = 16px, `3` = 24px in every `sx`
prop. Panels pad `16px` on mobile and `24px` from `sm` up.

**Two device classes are treated as real**, not as a desktop design that reflows:
mobile at 390×844 and desktop at 1440×900, both captured in visual regression.

### Named Rules

**The Pointer Rule.** Touch targets grow from the pointer type, not the viewport
width. Every small icon button, clickable chip and menu item expands its *hit
area* to 44px under `@media (pointer: coarse)` while its drawn size stays
unchanged — so dense tables stay dense for a mouse, a finger still clears the
platform minimum, and a touchscreen laptop is covered where a width breakpoint
would have missed it entirely.

**The First Viewport Rule.** On a 390px screen the first viewport must contain
the page's actual subject, not only its header. A hero that consumes the entire
fold has failed, however handsome it is.

## Elevation & Depth

**Surfaces are flat at rest.** Depth is a response to state, not a decoration:
hierarchy comes from the three background planes (`page` → `paper` → `surface`),
from type weight and from colour, and a shadow appears to confirm that something
is interactive or lifted above the page. Where a shadow is used it is diffuse and
low-contrast — wide blur, minimal offset, never above ~16% black — so it reads as
separation rather than drama.

**Current state (recorded honestly).** The shipped implementation has not
converged on this yet: `sxStyles.softPanel` and the `MuiCard` override both carry
a *resting* soft shadow (`0 4px 20px 0 rgba(0,0,0,0.08)`), with a heavier shadow
on hover. The doctrine above is the target; the resting shadow is the gap. New
surfaces should be authored flat and lift on state, and existing panels can move
that way without touching anything else.

### Shadow Vocabulary
- **Soft** (`0 4px 20px 0 rgba(0,0,0,0.08)`): panel and card separation.
- **Medium** (`0 2px 4px 0 rgba(0,0,0,0.12)`): a contained button at rest.
- **Strong** (`0 4px 8px 0 rgba(0,0,0,0.16)`): button hover.
- **Data card** (`0 4px 20px 0 rgba(0,0,0,0.12)`) and its hover
  (`0 6px 24px 0 rgba(0,0,0,0.15)`): feature cards that need slightly more lift.
- **Auth** (`0 8px 32px 0 rgba(0,0,0,0.2)`): the login card, the one place a
  surface is deliberately isolated from the page.
- **Dropdown** (`0 10px 25px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)`):
  popovers and menus.
- **Menu filter** (`drop-shadow(0px 2px 8px rgba(0,0,0,0.32))`): applied to
  `filter`, not `box-shadow`, so a menu's arrow pseudo-element is included in the
  silhouette instead of being clipped off a rectangle.

### Named Rules

**The Flat-By-Default Rule.** A new surface ships flat. If it gains a shadow, the
shadow must name the state it represents — hover, focus, elevation above the page
— and be removable without the layout losing meaning.

**The Motion-Without-Movement Rule.** Reduced motion means *less movement, not
less feedback*. Hover distance is expressed as CSS custom properties
(`--motion-lift`, `--motion-lift-card`, `--motion-nudge`) so a single
`prefers-reduced-motion` rule collapses the travel to zero while colour, border
and shadow transitions still confirm the action registered.

## Shapes

A three-step radius scale and nothing else: **4px** for chip and badge accents,
**8px** for the canonical surface (cards, inputs, buttons, menus), **12px** for
large panels, modals and hero banners. Circles are written as `50%` at the call
site because that is self-documenting.

Corners soften as surfaces grow, and flatten at the viewport edge: panels drop to
a `0` radius on mobile where they meet the screen edge, so a card never floats
with slivers of page beside it on a 390px screen.

Borders are hairline and structural — a single 1px stroke in `#e2e8f0` or
`#e5e7eb` to separate a field or a row. There is no decorative border language: no
coloured left-borders on callouts, no double rules, no dashed frames except where
dashed genuinely means provisional.

### Named Rules

**The Three-Radius Rule.** 4, 8, 12. A fourth value is a mistake, not a
refinement.

## Components

**Character: calm and unhurried.** Controls are sized for a finger and labelled
with the verb they perform. Nothing in the system rewards speed or familiarity —
no chorded shortcuts standing in for a visible control, no hover-only
affordances, no density that assumes the user has been here recently.

### Buttons
- **Shape:** the canonical surface radius (8px), never pill or square.
- **Case:** sentence case. `textTransform` is disabled globally; shouting at a
  member is not the house voice.
- **Primary:** Cooperative Blue fill with white text, a medium resting shadow and
  a stronger one on hover.
- **Outlined:** a Cooperative Blue stroke and label on transparent, with a 4%
  brand wash on hover. The default secondary.
- **Text:** for the lowest-emphasis move in a group.
- **On a blue banner:** the emphasis order inverts — a white fill with blue label
  is primary, a white-stroked transparent button is secondary.
- **Height:** at least 44px under a coarse pointer.

### Gated controls
A control that cannot currently act stays in the tab order with
`aria-disabled="true"` and names its reason in visible text bound via
`aria-describedby` — it is never `disabled`. A disabled button removes its own
explanation from the keyboard, which is the opposite of what a blocked regulatory
action needs. The reason's line is reserved whether or not it is showing, so
gaining one never moves the button.

### Cards and panels
- **Corner:** 12px from `sm` up, squared to 0 at the mobile viewport edge.
- **Background:** `paper` on the `page` plane.
- **Padding:** 16px on mobile, 24px from `sm`.
- **Nesting:** panels do not nest. A panel inside a panel is a layout that has not
  been decided.

### Tables and row actions
Tables are the desktop presentation only; below `md` the same data is a stacked
card list. When a list offers selection, every row reserves the selection slot
whether or not that row is actionable, so names form a column instead of stepping
in and out.

### Chips
Status chips are filled with their hue's explicit `surface` tint carrying the
matching working tone, sized `small`. On a blue banner they invert to a
near-opaque white pill with the hue carried by the *label and icon* — the tints
share the banner's own hue and would otherwise vanish into it. Clickable chips
(filters) gain a 44px hit area under a coarse pointer; a status chip in a table
is not a target and does not.

### Inputs
Outlined fields on white with the canonical 8px radius. Hover and focus both move
the stroke to Cooperative Blue, and the floating label follows on focus. Errors
state the problem beneath the field in the fault tone; disabled fields are the
only place `Ink Disabled` is allowed.

### Dialogs
A dialog names the entity it is about, restates the values that will change, and
carries an `Alert severity="info"` explaining consequences when the action is not
trivially reversible. The confirm button's colour is the *semantics* of the act,
not its weight: destructive acts confirm in fault red, constructive ones in
Cooperative Blue. While a mutation is in flight the confirm button swaps its
label for a spinner and keeps its accessible name.

### Signature: the lifecycle rail
A horizontal five-stage rail rendered inside the page banner, carrying an
agreement's position in its regulatory cycle along with the action for the
current stage. Markers are numerals in circles: filled white for a completed
stage, filled with a ring for the current one, hairline-outlined for a pending
one, and **dashed with a mail glyph for a stage the application cannot observe**.
Simultaneously-live stages are grouped under one translucent band rather than
pretending a single point is current.

Its rule is the interesting part: a stage the system cannot verify is never drawn
as done. The distributor file leaves Conluz by email and no backend field records
it, so that stage stays permanently marked unverifiable in every state.

### Named Rules

**The Kebab Rule.** Row-level actions in a data table live behind a single
three-dot menu; a `Select`, toggle or button never sits loose in a row, because
an inline control bypasses the confirmation step that a server-state change
requires. This governs *rows* — it is not a licence to bury a page's primary verb.

**The Named-Verb Rule.** A control that changes server state is labelled with the
verb it performs, in the product's own words. An unlabelled icon is acceptable
only for a menu of secondary actions.

## Do's and Don'ts

### Do:
- **Do** take every colour, radius, shadow and non-variant font size from
  `src/theme/tokens.ts`, `theme.palette.*` or `src/theme/sx.ts`. ESLint enforces
  this with `no-restricted-syntax`, and the rule matches a colour *anywhere inside
  a string* — `1px solid #e5e7eb` counts.
- **Do** use `main` for anything that carries type, and reserve `*-decorative`
  for fills and chart marks.
- **Do** express a tint behind type as an explicit `surface` token.
- **Do** grow hit areas from `@media (pointer: coarse)`, leaving the drawn size
  alone.
- **Do** set comparative figures in tabular numerals, and show regulated values at
  their full committed precision.
- **Do** keep copy extractable: no Spanish-formatted numbers baked into sentence
  constants, no plurals built from a `count === 1` ternary. Use `Intl.PluralRules`.
- **Do** write a genuine one-off as
  `// eslint-disable-next-line no-restricted-syntax -- <reason>`.

### Don't:
- **Don't** write a raw hex, `rgba()` string, hand-authored shadow, rem font-size
  literal, or a Tailwind `className` in component code.
- **Don't** put small text on a `*-decorative` tone, or white text on
  `cooperative-blue-decorative` (`#667eea`) — it is 3.66:1 and cannot carry it.
- **Don't** use `Ink Disabled` (`#9ca3af`) for anything but a disabled control.
- **Don't** use `opacity` to de-emphasise type on a coloured surface; use the
  surface's own `onSoft` token so the ratio stays verifiable.
- **Don't** add a fourth corner radius, or a decorative coloured border.
- **Don't** nest a card inside a card.
- **Don't** mark a step, state or figure as confirmed when the system has no way
  to observe it. An unverifiable stage stays unverifiable.
- **Don't** round a regulated figure to read more nicely, or restate the same
  requirement in three different wordings on one screen.
