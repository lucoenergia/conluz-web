/**
 * The confirmation code of a platform-admin invitation (lucoenergia/conluz#452,
 * #288): 8 characters from 0-9 and A-Z, given to the person by whoever invited
 * them, and accepted in any case, with or without spaces and hyphens.
 */

/** `ABCD-EFGH`: two groups of four are easier to read out on the phone than eight in a row. */
export function groupedCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/**
 * Whether a typed code can be a code at all: 8 letters or digits once spaces
 * and hyphens are removed. Checked before sending, because every wrong code
 * counts against the invitation and the fifth one revokes its link; which
 * letters the backend generates is left to the backend.
 */
export function isWellFormedConfirmationCode(typed: string): boolean {
  return /^[0-9A-Za-z]{8}$/.test(typed.replace(/[\s-]/g, ""));
}
