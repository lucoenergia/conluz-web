import ts from "typescript";

/**
 * Reads the route tree of src/App.tsx from its TypeScript AST, for the
 * contract tests that govern the router. Why it is parsed rather than
 * imported is in routeAccess.spec.ts.
 */

export const APP_PATH = "src/App.tsx";

/** The layout whose children routeAccess.spec.ts governs. Routes under the others are public or anonymous. */
export const AUTHENTICATED_LAYOUT = "AuthenticatedLayout";

export type Requirement = { scope: string; capability: string };

export interface ExtractedRoute {
  path: string;
  /** The requirement of the nearest CapabilityRoute wrapping this leaf, parent elements included. */
  require: Requirement | null;
}

function attribute(element: ts.JsxSelfClosingElement | ts.JsxOpeningElement, name: string) {
  return element.attributes.properties.find(
    (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === name,
  );
}

function tagName(node: ts.Node): string | null {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText();
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText();
  return null;
}

function openingOf(node: ts.Node): ts.JsxOpeningElement | ts.JsxSelfClosingElement | null {
  if (ts.isJsxElement(node)) return node.openingElement;
  if (ts.isJsxSelfClosingElement(node)) return node;
  return null;
}

/** The `require={{ scope: "x", capability: "y" }}` of a CapabilityRoute, as literals. */
function requirementOf(node: ts.Node): Requirement | null {
  const opening = openingOf(node);
  if (!opening) return null;
  const attr = attribute(opening, "require");
  if (!attr?.initializer || !ts.isJsxExpression(attr.initializer)) return null;
  const literal = attr.initializer.expression;
  if (!literal || !ts.isObjectLiteralExpression(literal)) return null;

  const read = (key: string): string | null => {
    const prop = literal.properties.find(
      (p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && p.name.getText() === key,
    );
    return prop && ts.isStringLiteral(prop.initializer) ? prop.initializer.text : null;
  };
  const scope = read("scope");
  const capability = read("capability");
  return scope && capability ? { scope, capability } : null;
}

/**
 * The CapabilityRoute guarding a route's element, whether it wraps the page
 * directly or sits on an ancestor route. Searching the element subtree rather
 * than only its root is what makes a guard on a parent countable.
 */
function guardWithin(node: ts.Node): Requirement | null {
  if (tagName(node) === "CapabilityRoute") return requirementOf(node);
  let found: Requirement | null = null;
  node.forEachChild((child) => {
    if (!found) found = guardWithin(child);
  });
  return found;
}

function joinPath(segments: string[]): string {
  const joined = segments.filter(Boolean).join("/");
  return joined ? `/${joined}` : "/";
}

export function extractRoutes(source: string): ExtractedRoute[] {
  const file = ts.createSourceFile(APP_PATH, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const routes: ExtractedRoute[] = [];

  /**
   * `inherited` carries a guard found on an ancestor route's element. There are
   * none today -- the prefix routes carry no element at all -- but a guard
   * moved onto one must keep counting, or this spec would start demanding a
   * second guard on every child.
   */
  function walkRoute(node: ts.Node, segments: string[], inherited: Requirement | null) {
    const opening = openingOf(node);
    if (!opening) return;

    const pathAttr = attribute(opening, "path");
    const segment =
      pathAttr?.initializer && ts.isStringLiteral(pathAttr.initializer) ? pathAttr.initializer.text : "";
    const here = [...segments, segment];

    const elementAttr = attribute(opening, "element");
    const ownGuard =
      elementAttr?.initializer && ts.isJsxExpression(elementAttr.initializer) && elementAttr.initializer.expression
        ? guardWithin(elementAttr.initializer.expression)
        : null;
    const guard = ownGuard ?? inherited;

    const children = ts.isJsxElement(node)
      ? node.children.filter((c) => tagName(c) === "Route")
      : [];

    // A route with an element and no Route children is a page; `index` is the
    // same thing addressed by its parent's path.
    if (elementAttr && children.length === 0) {
      routes.push({ path: joinPath(here), require: guard });
      return;
    }

    for (const child of children) walkRoute(child, here, guard);
  }

  function findAuthenticatedLayout(node: ts.Node) {
    if (tagName(node) === "Route") {
      const opening = openingOf(node);
      const elementAttr = opening && attribute(opening, "element");
      const text = elementAttr?.initializer?.getText() ?? "";
      if (text.includes(AUTHENTICATED_LAYOUT) && ts.isJsxElement(node)) {
        for (const child of node.children.filter((c) => tagName(c) === "Route")) {
          walkRoute(child, [], null);
        }
        return;
      }
    }
    node.forEachChild(findAuthenticatedLayout);
  }

  findAuthenticatedLayout(file);
  return routes;
}

export interface SplatRoute {
  /** The `element` source of every enclosing Route, outermost first. */
  ancestors: string[];
  element: string;
}

/**
 * Every `path="*"` route, with what wraps it. The catch-all is the one route
 * outside AuthenticatedLayout that this spec still has to place: under that
 * layout it would demand a session, and under an anonymous one it would send a
 * signed-in caller away.
 */
export function extractSplatRoutes(source: string): SplatRoute[] {
  const file = ts.createSourceFile(APP_PATH, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const splats: SplatRoute[] = [];

  function walk(node: ts.Node, ancestors: string[]) {
    if (tagName(node) === "Route") {
      const opening = openingOf(node)!;
      const element = attribute(opening, "element")?.initializer?.getText() ?? "";
      const pathAttr = attribute(opening, "path");
      if (pathAttr?.initializer && ts.isStringLiteral(pathAttr.initializer) && pathAttr.initializer.text === "*") {
        splats.push({ ancestors, element });
      }
      node.forEachChild((child) => walk(child, [...ancestors, element]));
      return;
    }
    node.forEachChild((child) => walk(child, ancestors));
  }

  walk(file, []);
  return splats;
}
