/**
 * Heights of the fixed batch-selection bar, and of the spacer that keeps the
 * page's last content clear of it.
 *
 * These are authoritative rather than measured after the fact: they set both the
 * bar's own height and the spacer's, so the two can never disagree. Measured
 * from the bar's natural content height, worst case being the two-part
 * hidden-count text ("N seleccionados · M ocultos por el filtro"), which did not
 * wrap to a second line at either viewport. Changing the bar's content
 * invalidates them.
 *
 * They live outside the component because the spacer belongs to the *page*: the
 * bar is `position: fixed` over everything, so reserving room inside the
 * coefficient panel left every section below it — the distributor-file panel —
 * still covered.
 */

/**
 * 390px: 124.3px natural content height (count text + "Limpiar selección"
 * stacked above the "Acciones" button), rounded up with headroom for a device's
 * safe-area-inset-bottom, which the measurement doesn't simulate.
 */
export const BATCH_BAR_HEIGHT_MOBILE = 144;

/**
 * 1440px: 53.5px natural content height (count text, "Limpiar selección" and
 * "Acciones" all on one row), rounded up with headroom on the same basis.
 */
export const BATCH_BAR_HEIGHT_DESKTOP = 72;
