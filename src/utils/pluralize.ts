/**
 * Picks a plural form through `Intl.PluralRules` rather than a `count === 1`
 * check, so copy stays correct when the interface gains a language with more
 * than two plural categories. Spanish and English both have two, which is
 * exactly why a hand-rolled ternary looks harmless here and stops working the
 * moment anyone adds a third locale.
 */
export function pluralize(count: number, one: string, other: string, locale = "es-ES"): string {
  return new Intl.PluralRules(locale).select(count) === "one" ? one : other;
}
