# Conluz Web — how to build with it

Conluz is the web app of Spanish renewable-energy communities: supplies (puntos de suministro),
plants, sharing agreements (acuerdos de reparto) and their coefficients. UI copy is **Spanish**:
numbers use a decimal comma (`182,4 kWh`, `45,60 kW`, `62 %`); supplies have CUPS codes like
`ES0031406912345678JN0F`.

## Setup: always wrap in `ConluzProvider`

Styling is MUI (CSS-in-JS) driven by the Conluz theme. Without the provider everything renders
in MUI defaults, and components with links or confirmation dialogs throw.

```jsx
const { ConluzProvider } = window.ConluzWeb;
<ConluzProvider>{/* the whole screen */}</ConluzProvider>
```

It supplies the theme (palette, Inter type scale, Spanish locale), the date-picker locale, an
in-memory router (`initialPath` prop picks the current route; links don't navigate away) and the
community context the dialogs read. There is no signed-in user, so community-scoped dialogs say
"la comunidad activa".

## Styling idiom: MUI `sx` + Conluz tokens — no CSS classes

- **Layout and primitives come from `ConluzWeb.Mui`** (`Mui.Box`, `Mui.Stack`, `Mui.Grid`,
  `Mui.Typography`, `Mui.Button`, `Mui.Chip`, `Mui.Avatar`, `Mui.Paper`, `Mui.TextField`,
  `Mui.Table…`, `Mui.Alert`, `Mui.Divider`…). Never import your own MUI: only this instance shares
  the Conluz theme.
- **Icons come from `ConluzWeb.Icons`** — Material icons by name: `Icons.Bolt`, `Icons.SolarPower`,
  `Icons.LocationOn`, `Icons.MoreVert`, `Icons.EditOutlined`, `Icons.DeleteOutline`, `Icons.History`…
- **Colours**: theme shorthands in `sx` (`color: "primary.main"`, `bgcolor: "background.default"`,
  `color: "text.secondary"`, `"error.main"`) or the exported `colors` token object:
  `colors.brand.main` (#5267cd) / `.dark` / `.surface`, `colors.success|error|warning|info.main`
  / `.surface`, `colors.text.primary|secondary|body|subtle`, `colors.background.default|paper|surface`,
  `colors.border.light`, `colors.accent.violet` (production) / `.blue` (consumption).
  Rules: `main` is the only role safe as text; `vivid` and `colors.brand.light` are decorative only;
  put tinted backgrounds on `*.surface`, never an alpha overlay under text.
- **Other tokens**: `radii.small|default|large` (4/8/12px), `shadows.soft|medium|dataCard|dropdown`,
  `fontSizes.xs…xl` (12–16px), shared `sxStyles` (`pageContainer`, `softPanel`, `flexRowCenter`,
  `touchTarget`).

## Patterns the app always follows

- Lists: desktop `ListTable` + `RowActionsMenu`; row actions live **only** in the kebab menu. Mobile:
  `RecordList`. Card grids: `CardGrid` (pass `fadeTimeout={0}` for static mockups).
- Any action that changes data opens a confirmation dialog (`ConfirmationModal`,
  `DeleteConfirmationModal`, …); success is confirmed with the matching `*SuccessModal`.
- Pages open with `DetailHeader` / `SupplyDetailHeader` / `PlantDetailHeader` and `BreadCrumb`;
  empty, loading and error states use `EmptyState`, the `Loading*` skeletons and `LoadErrorAlert`.
- Components that take API records (`SharingAgreementCard`, `PlantDetailHeader`, the coefficient
  rows…) need realistic objects: their shapes are in `guidelines/data-shapes.md`.
  `selectSharingAgreementNextStep` / `selectSharingAgreementLifecycleView` derive the
  `SharingAgreementNextStepBanner` / `SharingAgreementLifecycleSpine` view as the app does.

## Where the truth lives

`guidelines/DESIGN.md` (visual language and principles), `guidelines/theme-tokens.md` (every token
and its role), `guidelines/data-shapes.md`, and each `components/<group>/<Name>/<Name>.prompt.md`.

## Example

```jsx
const { ConluzProvider, Mui, Icons, SupplyCard } = window.ConluzWeb;

<ConluzProvider initialPath="/supply-points">
  <Mui.Box sx={{ p: 3, bgcolor: "background.default" }}>
    <Mui.Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
      <Mui.Typography variant="h5" sx={{ fontWeight: 600 }}>Puntos de suministro</Mui.Typography>
      <Mui.Button variant="contained" startIcon={<Icons.Add />}>Añadir punto</Mui.Button>
    </Mui.Stack>
    <SupplyCard id="s1" code="ES0031406912345678JN0F" name="Casa de Lucía"
      address="Calle del Sol 14, 46900 Torrent, Valencia" enabled
      lastConnection="Hace 2 horas" lastMeasurement={37} />
  </Mui.Box>
</ConluzProvider>
```
