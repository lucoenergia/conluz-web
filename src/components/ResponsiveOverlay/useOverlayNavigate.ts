import { useCallback } from "react";
import { useNavigate, type NavigateOptions, type To } from "react-router";
import { afterPendingBacks, claimCurrentEntryForNavigation } from "./overlayHistory";

/**
 * `navigate` for a flow that leaves the page as an overlay closes: a create
 * that opens the new record, or a delete from a detail page (#368).
 *
 * A plain `navigate` right after closing an overlay can race the back that
 * gives the overlay's history entry up, and the back would undo the
 * navigation. This one does not depend on timing:
 *
 * - while the current entry is an overlay's, the navigation replaces it, and
 *   the overlay gives up no entry, so one back lands where the overlay was
 *   opened;
 * - once the overlay has started giving its entry back, the navigation waits
 *   for that back to land, then pushes as usual;
 * - with no overlay involved, it is `navigate`.
 *
 * Several stacked overlays open at that moment are all closed; the entries
 * below the top one stay behind, inert.
 */
export function useOverlayNavigate(): (to: To, options?: NavigateOptions) => void {
  const navigate = useNavigate();
  return useCallback(
    (to: To, options?: NavigateOptions) =>
      afterPendingBacks(() => {
        if (claimCurrentEntryForNavigation()) void navigate(to, { ...options, replace: true });
        else void navigate(to, options);
      }),
    [navigate],
  );
}
