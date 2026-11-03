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

/**
 * Every declaration under a rule whose selector names one of the element's own
 * classes, including the rules emotion writes for its descendants
 * (`.css-x .MuiChip-icon{…}`) and its states (`.css-x:hover{…}`), as
 * `[selector, property, value]`. For a spec that must see everything an
 * element paints, where `declaredStyle` sees only its plain rule.
 */
export function declaredStyleWithin(element: Element): [selector: string, property: string, value: string][] {
  const css = [...document.querySelectorAll("style[data-emotion]")].map((style) => style.textContent ?? "").join("\n");
  const own = [...element.classList].filter((className) => className.startsWith("css-")).map((className) => `.${className}`);
  const declared: [string, string, string][] = [];
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selector.split(/[\s,>+~:]/).some((part) => own.includes(part))) continue;
    for (const declaration of body.split(";")) {
      const colon = declaration.indexOf(":");
      if (colon > 0) declared.push([selector.trim(), declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()]);
    }
  }
  return declared;
}
