// Deliberately loose: one "@", something on each side and a dot in the domain.
// It catches a typo before a request is spent on it; the backend's @Email is
// the rule that decides.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_SHAPE.test(value);
}
