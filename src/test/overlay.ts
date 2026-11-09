import { act } from "@testing-library/react";
import { vi } from "vitest";

/**
 * Helpers for specs of flows in the shared overlay (`ResponsiveOverlay`).
 */

/** jsdom has no layout: answer each (min-width) query as a viewport `width` px wide would. */
export function stubViewport(width: number) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: Number(/min-width:\s*([\d.]+)px/.exec(query)?.[1] ?? Infinity) <= width,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as MediaQueryList,
  );
}

/**
 * The declarations emotion wrote for an element's own classes. MUI's styles sit
 * in a CSS layer, which jsdom's getComputedStyle does not read.
 */
export function declaredStyles(element: Element): string {
  const css = [...document.querySelectorAll("style")].map((style) => style.textContent ?? "").join("\n");
  return [...element.classList]
    .filter((name) => name.startsWith("css-"))
    .flatMap((name) => [...css.matchAll(new RegExp(`\\.${name}\\{([^}]*)\\}`, "g"))].map((match) => match[1]))
    .join(";");
}

/**
 * The declarations of every style rule whose selector matches `element` now, `:focus` included,
 * joined like `declaredStyles`. Unlike it, this sees a rule an ancestor's class declares for its
 * descendants. Media and layer conditions are not evaluated: every rule inside them counts.
 */
export function matchedStyles(element: Element): string {
  const styleRules = (rules: CSSRuleList): CSSStyleRule[] =>
    [...rules].flatMap((rule) =>
      "selectorText" in rule ? [rule as CSSStyleRule] : "cssRules" in rule ? styleRules((rule as CSSGroupingRule).cssRules) : [],
    );
  return [...document.styleSheets]
    .flatMap((sheet) => styleRules(sheet.cssRules))
    .filter((rule) => {
      try {
        return element.matches(rule.selectorText);
      } catch {
        // A selector jsdom cannot parse, e.g. a vendor pseudo-element.
        return false;
      }
    })
    .map((rule) => rule.style.cssText.replace(/\s/g, ""))
    .join(";");
}

/** Presses back and resolves once the `popstate` has been handled. */
export async function pressBack() {
  const landed = new Promise<void>((resolve) => window.addEventListener("popstate", () => resolve(), { once: true }));
  await act(async () => {
    window.history.back();
    await landed;
  });
}

/** Whether the current history entry is one an open overlay pushed. */
export const hasOverlayEntry = () => !!window.history.state && "__overlay" in window.history.state;

/** The elements between `content` and `dialog` whose declared styles let them scroll. */
export function scrollingAncestors(content: HTMLElement, dialog: HTMLElement): HTMLElement[] {
  const found: HTMLElement[] = [];
  for (let element = content.parentElement; element && element !== dialog; element = element.parentElement) {
    if (/overflow(-y)?:auto/.test(declaredStyles(element))) found.push(element);
  }
  return found;
}
