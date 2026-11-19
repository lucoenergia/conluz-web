import { buttonClasses, inputBaseClasses, selectClasses } from "@mui/material";
import { colors, radii, shadows } from "./tokens";
import { fieldOutline } from "./fieldOutline";

/**
 * An outlined Button standing in for a field, such as a picker's sheet
 * trigger: the shared field outline and fill (UI-FRM-004), its focus drawn
 * 2 px wide by an inner outline, so the button does not shift.
 */
const fieldButton = {
  [`&.${buttonClasses.outlined}`]: {
    backgroundColor: fieldOutline.fill,
    borderColor: fieldOutline.color,
    color: colors.text.primary,
    "&:hover": { backgroundColor: fieldOutline.fill, borderColor: fieldOutline.hoverColor },
    "&:focus-visible": {
      borderColor: fieldOutline.focusedColor,
      outline: "1px solid",
      outlineColor: fieldOutline.focusedColor,
      outlineOffset: "-2px",
    },
  },
} as const;

export const sxStyles = {
  // The root of every page under the authenticated layout: one full-width column
  // on the page plane (UI-LAY-001, UI-LAY-002). No maxWidth, ever. A page that
  // needs more (overflow: "hidden") adds it in an sx array.
  pageRoot: {
    display: "flex",
    flexDirection: "column" as const,
    gap: { xs: 2, sm: 3 },
    p: { xs: 0, sm: 2, md: 3 },
    minHeight: "100vh",
    background: colors.background.default,
    width: "100%",
    boxSizing: "border-box" as const,
  },
  // Responsive horizontal padding: mobile indent removed at sm breakpoint.
  pageContainer: {
    px: { xs: 2, sm: 0 },
  },
  // Same + full width — standard breadcrumb / form-section wrapper.
  // border-box keeps the mobile padding inside the 100% width (#211).
  pageContainerFull: {
    px: { xs: 2, sm: 0 },
    width: "100%",
    boxSizing: "border-box",
  },
  // Horizontal flex row: centre-aligned items, standard gap.
  flexRowCenter: {
    display: "flex",
    alignItems: "center",
    gap: 2,
  },
  // Vertical flex column: standard section gap.
  flexColumnGap3: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 3,
  },
  // Unconditional 44px hit area for an icon-only control.
  //
  // The theme already grows `size="small"` buttons on coarse pointers. Use this
  // where the control belongs to a layout that is mobile BY DESIGN rather than
  // by input method — the stacked RecordList, which also renders in a narrow
  // desktop window where the pointer is still fine.
  touchTarget: {
    minWidth: 44,
    minHeight: 44,
  },
  // Grows a small control's HIT AREA to 44px under a coarse pointer without
  // changing its drawn size. The overlay is vertical only, so it never reaches
  // a horizontal neighbour. Use where the visual size is deliberate but the
  // target is not finger-sized — a breadcrumb link, for instance.
  coarseHitArea: {
    "@media (pointer: coarse)": {
      position: "relative",
      "&::after": {
        content: '""',
        position: "absolute",
        left: 0,
        right: 0,
        top: "50%",
        transform: "translateY(-50%)",
        height: 44,
      },
    },
  },
  // An outlined Button drawn as a field (UI-FRM-004); see fieldButton above.
  fieldButton,
  // The field of a selector heading a page's filters, the supply and the
  // period selectors alike (#432): at least 64 px tall, its value centred, so
  // a two-line value fits and the selectors side by side match. On the
  // dropdown it sizes the select; on the sheet trigger, an outlined Button,
  // it also draws the shared field outline and fill.
  filterField: {
    [`& .${inputBaseClasses.root}`]: { minHeight: 64 },
    [`& .${selectClasses.select}`]: { display: "flex", alignItems: "center" },
    [`&.${buttonClasses.root}`]: { minHeight: 64, alignItems: "center" },
    ...fieldButton,
  },
  // Padded white surface: responsive radius and soft drop-shadow.
  softPanel: {
    p: { xs: 2, sm: 3 },
    borderRadius: { xs: radii.default, sm: radii.large },
    bgcolor: "white",
    boxShadow: shadows.soft,
  },
} as const;
