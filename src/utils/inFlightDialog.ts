/**
 * The closing props of an MUI `Dialog` that sends a write (#310): while the
 * write is in flight, neither Escape nor a backdrop click closes it, so the
 * dialog stays until the write settles and then closes or shows its result.
 * Its "Cancelar" takes `disabled={inFlight}` alongside.
 *
 * `ConfirmationModal` and `AppModal` follow the same rule through their own
 * `inFlight` and `dismissible` props.
 */
export function inFlightDialogProps<Close extends (...args: never[]) => void>(
  inFlight: boolean,
  onClose: Close,
): { onClose: Close | undefined; disableEscapeKeyDown: boolean } {
  return { onClose: inFlight ? undefined : onClose, disableEscapeKeyDown: inFlight };
}
