/**
 * The plant CIL's rule and words, shared by the plant form and the error
 * catalogue (#407). A leaf module, importing nothing, so the catalogue can use
 * it without a cycle.
 *
 * The rule is the backend's `PlantCil.normalise` (lucoenergia/conluz#567):
 * every whitespace or space character is removed, an empty result is no CIL,
 * what is left must be exactly 25 ASCII letters or digits before it is
 * upper-cased, and then it is upper-cased. Checking before upper-casing refuses
 * a letter whose upper case is longer or ASCII ("ß" becomes "SS"), as the
 * backend does.
 */

/** The format refusal, said by the form and for the backend's `PLANT_CIL_INVALID` alike. */
export const CIL_FORMAT_MESSAGE = "El CIL debe tener 25 letras o números.";

/** The backend's `PLANT_CIL_ALREADY_IN_USE`. */
export const CIL_IN_USE_MESSAGE = "Ya hay otra planta con este CIL.";

/**
 * What Java's `Character.isWhitespace || Character.isSpaceChar` removes: `\s`
 * and `\p{Zs}` (U+00A0 among them), plus the separators U+001C to U+001F that
 * `\s` leaves out. `\s` also takes U+FEFF, which Java keeps; the client removes
 * it before sending, so the backend never sees it.
 */
// eslint-disable-next-line no-control-regex -- U+001C to U+001F are matched on purpose: Java counts them as whitespace.
const CIL_SPACES = /[\s\p{Zs}\u001C-\u001F]/gu;

const CIL_FORMAT = /^[A-Za-z0-9]{25}$/;

export type NormalisedCil = { valid: true; cil: string | undefined } | { valid: false };

/** The CIL as the backend stores it, `undefined` for none, or invalid. */
export function normaliseCil(input: string): NormalisedCil {
  const stripped = input.replace(CIL_SPACES, "");
  if (stripped === "") return { valid: true, cil: undefined };
  if (!CIL_FORMAT.test(stripped)) return { valid: false };
  return { valid: true, cil: stripped.toLocaleUpperCase("en-US") };
}
