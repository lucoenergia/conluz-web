import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { MENU_SECTIONS, CONTACT_ITEM, type MenuItem } from "../utils/constants";
import type { MenuRequirement } from "../hooks/permissions";

/**
 * Who may reach each page, decided once and checked by the build.
 *
 * Every other contract in this folder reads the API; this one reads the router.
 * It exists because `CapabilityRoute`'s own spec hands the requirement in
 * directly, so until now a changed line in App.tsx broke nothing: a route could
 * lose its guard, or gain the wrong one, and the only thing standing between
 * that and production was review.
 *
 * The source of truth is src/App.tsx, parsed rather than imported. Importing it
 * would execute the lazy page graph and still not say which guard wraps which
 * path, because by then the routes are React elements, and a guard on a parent
 * element is indistinguishable from one on the leaf. The AST says exactly.
 */

const APP_PATH = "src/App.tsx";

/** The layout whose children this spec governs. Routes under the others are public or anonymous. */
const AUTHENTICATED_LAYOUT = "AuthenticatedLayout";

type Requirement = { scope: string; capability: string };

type Access =
  /** Wrapped in CapabilityRoute with exactly this requirement. */
  | { require: Requirement }
  /**
   * Reachable by any authenticated caller. The string is the reason, and it is
   * the whole point of the entry: "unguarded" is a decision, so it has to read
   * like one.
   */
  | { authenticated: string };

/**
 * Every path under AuthenticatedLayout. A new route fails this spec until it
 * appears here, which is the only way the question "who may see this" gets
 * asked before the page ships rather than after.
 */
const ROUTE_ACCESS: Record<string, Access> = {
  // Guarding "/" would loop: CapabilityRoute sends a denied caller here, so a
  // denial on this route would redirect to itself. It is also where a caller
  // with no community lands, and the page renders its own empty state.
  "/": { authenticated: "the redirect target of every denial; guarding it would loop" },
  "/no-community": { authenticated: "the landing page for a caller with no membership" },
  "/profile": { authenticated: "acts on the caller and takes no id" },
  "/change-password": { authenticated: "acts on the caller and takes no id" },

  // GET /supplies/{id} authorises the supply's own community admin OR its
  // owner, so a member reaching either of these is entitled to what the page
  // shows. The page scopes its own data to the active community; the route
  // cannot, because the capability that would answer belongs to the resource.
  "/supply-points": { authenticated: "a member sees their own supplies; the page scopes its data" },
  "/supply-points/:supplyPointId": { authenticated: "the endpoint authorises the owner or the community admin" },
  "/supply-points/new": { require: { scope: "community", capability: "canManage" } },
  "/supply-points/:supplyPointId/edit": { require: { scope: "supply", capability: "canEdit" } },

  "/production": { authenticated: "a member may list the community's plants; the page scopes its data" },
  "/production/:plantId": { authenticated: "the endpoint authorises any member of the plant's community" },
  "/production/new": { require: { scope: "community", capability: "canCreatePlants" } },
  "/production/:plantId/edit": { require: { scope: "plant", capability: "canManage" } },
  "/production/:plantId/sharing-agreements": {
    require: { scope: "plant", capability: "canListSharingAgreements" },
  },
  "/production/:plantId/sharing-agreements/:sharingAgreementId": {
    require: { scope: "plant", capability: "canListSharingAgreements" },
  },

  "/integrations": { require: { scope: "community", capability: "canManage" } },
  "/members": { require: { scope: "community", capability: "canManageMemberships" } },
  // Which of the two views is a further decision, made by HomeViewRoute, and a
  // caller who lacks one is sent elsewhere rather than refused.
  "/home": { require: { scope: "community", capability: "canRead" } },
  "/home/member": { require: { scope: "community", capability: "canRead" } },
  "/home/management": { require: { scope: "community", capability: "canRead" } },

  "/communities": { require: { scope: "platform", capability: "canAdministerPlatform" } },
  "/communities/new": { require: { scope: "platform", capability: "canCreateCommunity" } },
  // The community named in the URL, not the active one: a platform admin
  // editing a community administers it without being a member.
  "/communities/:communityId/edit": { require: { scope: "communityById", capability: "canUpdate" } },

  "/platform": { require: { scope: "platform", capability: "canAdministerPlatform" } },
  "/users": { require: { scope: "platform", capability: "canListUsers" } },
  "/users/new": { require: { scope: "platform", capability: "canCreateUsers" } },
  "/users/:userId/edit": { require: { scope: "user", capability: "canEdit" } },
};

/**
 * Menu entries allowed to be stricter than the page they lead to, with the
 * reason. Anything else must name the same requirement as its route, so an
 * entry and its destination cannot drift apart.
 */
const STRICTER_THAN_ROUTE: Record<string, string> = {
  "/production": "an operational entry needs a community to be about; the page itself renders without one",
  "/supply-points": "as /production",
};

// ---------------------------------------------------------------------------
// Reading App.tsx
// ---------------------------------------------------------------------------

interface ExtractedRoute {
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

function extractRoutes(source: string): ExtractedRoute[] {
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

function describeRequirement(requirement: Requirement | MenuRequirement | null): string {
  if (!requirement) return "no guard";
  return "capability" in requirement
    ? `${requirement.scope}/${requirement.capability}`
    : requirement.scope;
}

// ---------------------------------------------------------------------------

describe("route access", () => {
  const routes = extractRoutes(readFileSync(APP_PATH, "utf8"));
  const byPath = new Map(routes.map((r) => [r.path, r]));

  // Without this, a parser that silently stops matching turns every assertion
  // below into a tautology over an empty list.
  it("reads the route tree at all", () => {
    expect(
      routes.length,
      `Found no routes under ${AUTHENTICATED_LAYOUT} in ${APP_PATH}; has the route shape changed?`,
    ).toBeGreaterThan(15);
    expect(new Set(routes.map((r) => r.path)).size, "Two routes extracted to the same path").toBe(routes.length);
  });

  it("classifies every authenticated route", () => {
    const unclassified = routes.map((r) => r.path).filter((path) => !(path in ROUTE_ACCESS));

    expect(
      unclassified,
      "New routes must say who may reach them. Add an entry to ROUTE_ACCESS above: either the " +
        "capability its CapabilityRoute requires, or `authenticated` with the reason any signed-in " +
        "caller may see it.",
    ).toEqual([]);
  });

  it("keeps no entry for a route that no longer exists", () => {
    const stale = Object.keys(ROUTE_ACCESS).filter((path) => !byPath.has(path));
    expect(stale, `These paths are classified but are not in ${APP_PATH}`).toEqual([]);
  });

  it("guards each route exactly as its classification says", () => {
    const mismatched = routes
      .filter((route) => route.path in ROUTE_ACCESS)
      .flatMap((route) => {
        const access = ROUTE_ACCESS[route.path];
        const expected = "require" in access ? access.require : null;
        const actual = route.require;
        const same =
          expected === null
            ? actual === null
            : actual !== null && actual.scope === expected.scope && actual.capability === expected.capability;
        return same
          ? []
          : [`${route.path}: classified as ${describeRequirement(expected)}, guarded by ${describeRequirement(actual)}`];
      });

    expect(
      mismatched,
      "A route's guard and its classification disagree. Change both together, or the map stops " +
        "describing the router.",
    ).toEqual([]);
  });

  it("offers no menu entry whose requirement differs from the page it leads to", () => {
    const items: MenuItem[] = [...MENU_SECTIONS.flatMap((section) => section.items), CONTACT_ITEM];

    const drifted = items.flatMap((item) => {
      const access = ROUTE_ACCESS[item.to];
      // CONTACT_ITEM leads outside AuthenticatedLayout, so it has no entry here.
      if (!access) return [];
      if (item.to in STRICTER_THAN_ROUTE) return [];

      const required = "require" in access ? access.require : null;
      const menu = item.requires;
      const same =
        required === null
          ? menu.scope === "always"
          : "capability" in menu && menu.scope === required.scope && menu.capability === required.capability;
      return same
        ? []
        : [`${item.to}: menu asks ${describeRequirement(menu)}, route asks ${describeRequirement(required)}`];
    });

    expect(
      drifted,
      "A menu entry and its destination must name the same rule, or the menu offers pages the " +
        "router refuses -- or hides pages the caller could use. If the entry is deliberately " +
        "stricter, say why in STRICTER_THAN_ROUTE.",
    ).toEqual([]);
  });

  it("keeps no stale reason for a menu entry that now matches its route", () => {
    const menuPaths = new Set([...MENU_SECTIONS.flatMap((s) => s.items), CONTACT_ITEM].map((i) => i.to));
    const stale = Object.keys(STRICTER_THAN_ROUTE).filter((path) => !menuPaths.has(path));
    expect(stale, "These paths are recorded as stricter than their route but are not in the menu").toEqual([]);
  });
});
