/**
 * Case- and accent-insensitive normalization for search matching
 * ("histórico" and "historico" must match).
 */
export function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * A DNI/NIE/NIF the way the backend stores it: upper case, with no spaces,
 * hyphens or dots, so "12.345.678-z" and "12345678Z" compare equal.
 */
export function normalizePersonalId(text: string): string {
  return text.toUpperCase().replace(/[\s.-]/g, "");
}
