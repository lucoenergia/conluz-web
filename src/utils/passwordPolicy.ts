/**
 * The password policy the backend enforces (#196), checked on the client too
 * so a member sees why before sending anything. The server stays the
 * authority: these checks only spare a round trip.
 *
 * Length is counted in Unicode code points, as the backend counts it, not in
 * UTF-16 units: `"😀".length` is 2, but it is one character to the person
 * typing it. The backend also caps the UTF-8 encoding at 72 bytes, so a long
 * non-ASCII passphrase can be within 64 characters and still too long.
 */
export const PASSWORD_MIN_CHARS = 15;
export const PASSWORD_MAX_CHARS = 64;
export const PASSWORD_MAX_BYTES = 72;

/** The rule names the backend reports in `params.rule` of USER_PASSWORD_POLICY_VIOLATION. */
export type PasswordRule = "TOO_SHORT" | "TOO_LONG" | "TOO_MANY_BYTES";

export const PASSWORD_RULE_MESSAGES: Record<PasswordRule, string> = {
  TOO_SHORT: `La contraseña debe tener al menos ${PASSWORD_MIN_CHARS} caracteres.`,
  TOO_LONG: `La contraseña no puede tener más de ${PASSWORD_MAX_CHARS} caracteres.`,
  TOO_MANY_BYTES:
    "La contraseña es demasiado larga: algunos caracteres especiales (tildes, eñes, emojis) ocupan más de uno. Acórtala un poco.",
};

export const PASSWORD_POLICY_TEXT = `Usa entre ${PASSWORD_MIN_CHARS} y ${PASSWORD_MAX_CHARS} caracteres. Puedes usar espacios: una frase que recuerdes es más fácil y más segura que una palabra corta.`;

export const PASSWORD_POLICY_EXAMPLE = "el gato duerme junto a la ventana";

export function isPasswordRule(value: unknown): value is PasswordRule {
  return value === "TOO_SHORT" || value === "TOO_LONG" || value === "TOO_MANY_BYTES";
}

/** The first rule the value breaks, or null when it satisfies the policy. */
export function checkPasswordPolicy(value: string): PasswordRule | null {
  const codePoints = [...value].length;
  if (codePoints < PASSWORD_MIN_CHARS) return "TOO_SHORT";
  if (codePoints > PASSWORD_MAX_CHARS) return "TOO_LONG";
  if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) return "TOO_MANY_BYTES";
  return null;
}
