import { sectionHeadingId } from "../../../components/PlantSection/sectionAnchors";

/** The sections of the plant detail that something on the screen can jump to. */
export const PLANT_SECTION_IDS = {
  agreements: "plant-agreements",
  integrations: "plant-integrations",
} as const;

export type PlantSectionId = (typeof PLANT_SECTION_IDS)[keyof typeof PLANT_SECTION_IDS];

/**
 * Brings a section into view and moves focus to its heading, so a keyboard or
 * screen-reader user lands where the page scrolled to instead of staying on the
 * control they activated.
 */
export function scrollToSection(sectionId: PlantSectionId): void {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById(sectionHeadingId(sectionId))?.focus({ preventScroll: true });
}
