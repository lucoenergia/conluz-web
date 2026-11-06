/**
 * Type-level test: the shared overlay cannot be rendered without an accessible
 * name (UI-OVL-006, #369). Checked by `tsc -b`; never executed: it has no
 * `.spec` suffix, so Vitest does not collect it, and nothing imports it.
 *
 * Every `@ts-expect-error` below must stay an error. If a change to the props
 * lets one of these compile, the directive becomes unused and `tsc -b` fails.
 * The positive controls keep the file from passing just because everything is
 * an error.
 */
import { ResponsiveOverlay } from "./ResponsiveOverlay";

const close = () => {};

// ── Positive controls: each way of naming the overlay compiles ──────────────

export const titled = (
  <ResponsiveOverlay open size="form" onClose={close} title="Editar canal">
    x
  </ResponsiveOverlay>
);
export const labelledByHeading = (
  <ResponsiveOverlay open size="compact" onClose={close} labelledBy="heading-id">
    x
  </ResponsiveOverlay>
);
export const labelled = (
  <ResponsiveOverlay open size="compact" onClose={close} label="Punto de suministro deshabilitado">
    x
  </ResponsiveOverlay>
);

// ── Each nameless overlay is an error ───────────────────────────────────────

export const unnamed = (
  // @ts-expect-error -- an overlay with no title, labelledBy or label is unnamed.
  <ResponsiveOverlay open size="form" onClose={close}>
    x
  </ResponsiveOverlay>
);

export const twoNames = (
  // @ts-expect-error -- two names at once: which one is announced would be a guess.
  <ResponsiveOverlay open size="form" onClose={close} title="Editar canal" label="Canal">
    x
  </ResponsiveOverlay>
);
