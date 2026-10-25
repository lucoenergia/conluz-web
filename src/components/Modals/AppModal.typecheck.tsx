/**
 * Type-level test: a modal cannot be rendered without an accessible name
 * (#310). Checked by `tsc -b`; never executed: it has no `.spec` suffix, so
 * Vitest does not collect it, and nothing imports it.
 *
 * Every `@ts-expect-error` below must stay an error. If a change to the props
 * lets one of these compile, the directive becomes unused and `tsc -b` fails.
 * The positive controls keep the file from passing just because everything is
 * an error.
 */
import { AppModal } from "./AppModal";
import { BasicModal } from "./BasicModal";
import { ConfirmationModal } from "./ConfirmationModal";

const close = () => {};

// ── Positive controls: each way of naming the dialog compiles ───────────────

export const titled = <AppModal isOpen onClose={close} title="Importar" />;
export const labelledByHeading = <AppModal isOpen onClose={close} labelledBy="heading-id" />;
export const labelled = <AppModal isOpen onClose={close} label="Importar" />;
export const basicLabelledBy = (
  <BasicModal isOpen onClose={close} labelledBy="heading-id">
    x
  </BasicModal>
);
export const basicLabelled = (
  <BasicModal isOpen onClose={close} label="Aviso">
    x
  </BasicModal>
);
export const confirmation = (
  <ConfirmationModal isOpen title="¿Eliminar?" confirmLabel="Eliminar" onCancel={close} onConfirm={close}>
    x
  </ConfirmationModal>
);

// ── Each nameless modal is an error ─────────────────────────────────────────

// @ts-expect-error -- an AppModal with no title, labelledBy or label is unnamed.
export const unnamedAppModal = <AppModal isOpen onClose={close} />;

export const unnamedBasicModal = (
  // @ts-expect-error -- a BasicModal with neither labelledBy nor label is unnamed.
  <BasicModal isOpen onClose={close}>
    x
  </BasicModal>
);

// @ts-expect-error -- two names at once: which one is announced would be a guess.
export const twoNames = <AppModal isOpen onClose={close} title="Importar" labelledBy="heading-id" />;

export const untitledConfirmation = (
  // @ts-expect-error -- a confirmation is named by its title, so the title is required.
  <ConfirmationModal isOpen confirmLabel="Eliminar" onCancel={close} onConfirm={close}>
    x
  </ConfirmationModal>
);
