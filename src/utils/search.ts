/**
 * Case- and accent-insensitive normalization for search matching
 * ("histórico" and "historico" must match).
 */
export function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
