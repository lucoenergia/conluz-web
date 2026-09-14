import { radii, shadows } from "./tokens";

export const sxStyles = {
  // Responsive horizontal padding: mobile indent removed at sm breakpoint.
  pageContainer: {
    px: { xs: 2, sm: 0 },
  },
  // Same + full width — standard breadcrumb / form-section wrapper.
  pageContainerFull: {
    px: { xs: 2, sm: 0 },
    width: "100%",
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
  // Padded white surface: responsive radius and soft drop-shadow.
  softPanel: {
    p: { xs: 2, sm: 3 },
    borderRadius: { xs: radii.default, sm: radii.large },
    bgcolor: "white",
    boxShadow: shadows.soft,
  },
} as const;
