/** Spanish function words that carry no identity in a community name. */
const STOP_WORDS = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "en"]);

/**
 * Up to two uppercase initials for a community name, e.g.
 * "Comunidad Energética de Luco" → "CE". Falls back to the first letters of
 * the whole name when every word is a function word.
 */
export function communityInitials(name: string | undefined | null): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";

  const significant = words.filter((word) => !STOP_WORDS.has(word.toLowerCase()));
  const source = significant.length > 0 ? significant : words;

  const initials =
    source.length === 1
      ? Array.from(source[0]).slice(0, 2).join("")
      : source.slice(0, 2).map((word) => Array.from(word)[0]).join("");

  return initials.toLocaleUpperCase("es");
}
