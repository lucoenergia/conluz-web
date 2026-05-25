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
  // Padded white surface: responsive radius and soft drop-shadow.
  softPanel: {
    p: { xs: 2, sm: 3 },
    borderRadius: { xs: radii.default, sm: radii.large },
    bgcolor: "white",
    boxShadow: shadows.soft,
  },
} as const;
