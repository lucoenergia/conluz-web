import type { MenuRequirement } from "../hooks/permissions";
import type { MenuSection } from "./constants";

/**
 * Answers whether one requirement is met. The layout builds this from the
 * capability hooks; a spec can pass a plain function.
 */
export type RequirementResolver = (requirement: MenuRequirement) => boolean;

/**
 * The menu, filtered to what the caller may actually reach.
 *
 * Items are filtered first and a section survives only if something in it did,
 * so a section never appears as an empty heading, and two entries that sit
 * together but answer to different capabilities are decided separately.
 *
 * Pure, and exported, so the layout and its spec run the same rule. The
 * previous version lived inline in the layout and was copied by hand into the
 * spec, which meant the test could keep passing while the menu changed.
 */
export function selectVisibleSections(
  sections: MenuSection[],
  isAllowed: RequirementResolver,
): MenuSection[] {
  return sections
    .map((section) => ({ ...section, items: section.items.filter((item) => isAllowed(item.requires)) }))
    .filter((section) => section.items.length > 0);
}
