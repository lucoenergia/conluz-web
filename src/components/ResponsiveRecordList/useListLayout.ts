import useWindowDimensions from "../../utils/useWindowDimensions";
import { LIST_TABLE_MIN_WIDTH } from "../../utils/constants";

export type ListLayout = "narrow" | "wide";

/**
 * Which layout a records list shows: its table from `LIST_TABLE_MIN_WIDTH`,
 * its stacked list below it (UI-LST-001). Read from the viewport, never from a
 * measured container or a per-page override, so every list switches at the
 * same width.
 */
export function useListLayout(): ListLayout {
  const { width } = useWindowDimensions();
  return width >= LIST_TABLE_MIN_WIDTH ? "wide" : "narrow";
}
