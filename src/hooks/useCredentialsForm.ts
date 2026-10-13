import { useState } from "react";
import {
  CREDENTIALS_FIELDS,
  validateCredentials,
  type CredentialsErrors,
  type CredentialsField,
  type CredentialsValues,
} from "../utils/integrationCredentials";

export interface CredentialsForm {
  /** The messages to render now, one per field at most. */
  errors: CredentialsErrors;
  /** The field lost focus: its rule may speak from now on. */
  touch: (field: CredentialsField) => void;
  /** Called on Guardar. Every rule speaks from now on; `true` when the values may be sent. */
  attemptSave: () => boolean;
  /** Puts a refusal on the password field, for as long as the password is the one that was sent. */
  showPasswordRefusal: (message: string, sentPassword: string) => void;
  /** Back to first render, after a save went through. */
  reset: () => void;
}

/**
 * When the rules of a credentials form speak, and what the backend said last.
 *
 * A field's message shows once it has been touched or a save was attempted,
 * never on first render: an empty form is the normal state of a first setup,
 * not a mistake (#245). A refusal from the backend stays on the password field
 * until the password changes, since typing one is what answers it.
 */
export function useCredentialsForm(values: CredentialsValues, passwordSet: boolean | undefined): CredentialsForm {
  const [touched, setTouched] = useState<Partial<Record<CredentialsField, boolean>>>({});
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [refusal, setRefusal] = useState<{ message: string; sentPassword: string } | null>(null);

  const broken = validateCredentials(values, { passwordSet });

  const errors: CredentialsErrors = {};
  for (const field of CREDENTIALS_FIELDS) {
    if (broken[field] && (saveAttempted || touched[field])) errors[field] = broken[field];
  }
  if (!errors.password && refusal && refusal.sentPassword === values.password) errors.password = refusal.message;

  return {
    errors,
    touch: (field) => setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true })),
    attemptSave: () => {
      setSaveAttempted(true);
      return Object.keys(broken).length === 0;
    },
    showPasswordRefusal: (message, sentPassword) => setRefusal({ message, sentPassword }),
    reset: () => {
      setTouched({});
      setSaveAttempted(false);
      setRefusal(null);
    },
  };
}
