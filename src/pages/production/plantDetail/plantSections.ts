import type { CSSObject, Theme } from "@mui/material/styles";

/** The sections of the plant detail that something on the screen can jump to. */
export const PLANT_SECTION_IDS = {
  agreements: "plant-agreements",
  integrations: "plant-integrations",
} as const;

export type PlantSectionId = (typeof PLANT_SECTION_IDS)[keyof typeof PLANT_SECTION_IDS];

/** The id of a section's heading: the element that takes focus after a jump. */
export const sectionHeadingId = (sectionId: PlantSectionId) => `${sectionId}-heading`;

/**
 * Brings a section into view and moves focus to its heading, so a keyboard or
 * screen-reader user lands where the page scrolled to instead of staying on the
 * control they activated.
 */
export function scrollToSection(sectionId: PlantSectionId): void {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById(sectionHeadingId(sectionId))?.focus({ preventScroll: true });
}

/**
 * Keeps a section that was scrolled to clear of the fixed app bar. The bar is a
 * toolbar plus its own vertical padding (Header.tsx), so the margin is the
 * toolbar's height, at each breakpoint the theme defines it for, plus room for
 * that padding and some air.
 */
export const sectionScrollMarginSx = (theme: Theme): CSSObject => {
  const clearance = theme.spacing(4);
  const margin = (height: unknown) => `calc(${String(height)}px + ${clearance})`;
  const sx: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(theme.mixins.toolbar)) {
    if (key === "minHeight") sx.scrollMarginTop = margin(value);
    else if (value && typeof value === "object" && "minHeight" in value) {
      sx[key] = { scrollMarginTop: margin((value as { minHeight: unknown }).minHeight) };
    }
  }
  return sx as CSSObject;
};

