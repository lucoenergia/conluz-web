/**
 * The value the CSS cascade gives `property` on `element`, read from the
 * style rules emotion wrote. jsdom's getComputedStyle does not read MUI's
 * styles, which sit in a CSS layer, so this resolves the cascade itself:
 * among the rules that match the element now and declare the property, an
 * unlayered rule beats a layered one, then the higher specificity wins, then
 * the later rule. It ignores inheritance, `!important`, inline styles and
 * media conditions (every rule inside an @media counts), which the field
 * styles it was written for do not use.
 */
export function cascadedValue(element: Element, property: string): string | undefined {
  let best: { layered: boolean; specificity: number[]; order: number; value: string } | undefined;
  collectRules().forEach(({ rule, layered }, order) => {
    const value = rule.style.getPropertyValue(property);
    if (!value) return;
    const specificity = matchingSpecificity(element, rule.selectorText);
    if (!specificity) return;
    const candidate = { layered, specificity, order, value };
    if (!best || wins(candidate, best)) best = candidate;
  });
  return best?.value;
}

interface CollectedRule {
  rule: CSSStyleRule;
  layered: boolean;
}

function collectRules(): CollectedRule[] {
  const walk = (rules: CSSRuleList, layered: boolean): CollectedRule[] =>
    [...rules].flatMap((rule) => {
      if ("selectorText" in rule) return [{ rule: rule as CSSStyleRule, layered }];
      if ("cssRules" in rule) return walk((rule as CSSGroupingRule).cssRules, layered || rule.constructor.name === "CSSLayerBlockRule");
      return [];
    });
  return [...document.styleSheets].flatMap((sheet) => walk(sheet.cssRules, false));
}

function wins(a: { layered: boolean; specificity: number[]; order: number }, b: typeof a): boolean {
  if (a.layered !== b.layered) return !a.layered;
  for (let index = 0; index < 3; index++) {
    if (a.specificity[index] !== b.specificity[index]) return a.specificity[index] > b.specificity[index];
  }
  return a.order > b.order;
}

/** The highest specificity among the selectors of the list that match `element`, or undefined if none does. */
function matchingSpecificity(element: Element, selectorList: string): number[] | undefined {
  let best: number[] | undefined;
  for (const selector of splitTopLevel(selectorList)) {
    let matches = false;
    try {
      matches = element.matches(selector);
    } catch {
      // A selector jsdom cannot parse, e.g. a vendor pseudo-element.
    }
    if (!matches) continue;
    const specificity = specificityOf(selector);
    if (!best || compare(specificity, best) > 0) best = specificity;
  }
  return best;
}

function compare(a: number[], b: number[]): number {
  for (let index = 0; index < 3; index++) if (a[index] !== b[index]) return a[index] - b[index];
  return 0;
}

/** Splits a selector list on its top-level commas, leaving those inside parentheses. */
function splitTopLevel(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of list) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += char;
  }
  parts.push(current.trim());
  return parts.filter(Boolean);
}

/** [ids, classes/attributes/pseudo-classes, types/pseudo-elements], with :not() and :is() counting their argument and :where() nothing. */
function specificityOf(selector: string): number[] {
  const result = [0, 0, 0];
  let index = 0;
  while (index < selector.length) {
    const char = selector[index];
    if (char === "#") {
      result[0]++;
      index = skipName(selector, index + 1);
    } else if (char === ".") {
      result[1]++;
      index = skipName(selector, index + 1);
    } else if (char === "[") {
      result[1]++;
      index = selector.indexOf("]", index) + 1;
    } else if (char === ":") {
      const isElement = selector[index + 1] === ":";
      const nameStart = index + (isElement ? 2 : 1);
      const nameEnd = skipName(selector, nameStart);
      const name = selector.slice(nameStart, nameEnd);
      index = nameEnd;
      if (selector[index] === "(") {
        const close = matchingParen(selector, index);
        const argument = selector.slice(index + 1, close);
        index = close + 1;
        if (name === "not" || name === "is" || name === "has") {
          const inner = splitTopLevel(argument).map(specificityOf).reduce((max, next) => (compare(next, max) > 0 ? next : max), [0, 0, 0]);
          inner.forEach((count, position) => (result[position] += count));
          continue;
        }
        if (name === "where") continue;
      }
      if (isElement) result[2]++;
      else result[1]++;
    } else if (/[a-zA-Z*]/.test(char)) {
      if (char !== "*") result[2]++;
      index = skipName(selector, index + 1);
    } else index++;
  }
  return result;
}

function skipName(selector: string, from: number): number {
  let index = from;
  while (index < selector.length && /[\w-]/.test(selector[index])) index++;
  return index;
}

function matchingParen(selector: string, open: number): number {
  let depth = 0;
  for (let index = open; index < selector.length; index++) {
    if (selector[index] === "(") depth++;
    if (selector[index] === ")" && --depth === 0) return index;
  }
  return selector.length;
}
