/**
 * The CSS declarations emotion generated for an element's own classes, as
 * written in the source: `{ "background-color": "#00a975" }`.
 *
 * The harness renders with `enableCssLayer`, as production does, so MUI's
 * rules sit inside `@layer mui`, and jsdom does not cascade layered rules:
 * `getComputedStyle` reports nothing for them. This reads the rule text
 * instead. It covers plain `.css-…{…}` rules only -- no pseudo-classes, media
 * queries or descendant selectors -- which is what an `sx` object of plain
 * values produces.
 */
export function declaredStyle(element: Element): Record<string, string> {
  const css = [...document.querySelectorAll("style[data-emotion]")].map((style) => style.textContent ?? "").join("\n");
  const declared: Record<string, string> = {};
  for (const className of element.classList) {
    if (!className.startsWith("css-")) continue;
    for (const [, body] of css.matchAll(new RegExp(`\\.${className}\\{([^}]*)\\}`, "g"))) {
      for (const declaration of body.split(";")) {
        const colon = declaration.indexOf(":");
        if (colon > 0) declared[declaration.slice(0, colon).trim()] = declaration.slice(colon + 1).trim();
      }
    }
  }
  return declared;
}
