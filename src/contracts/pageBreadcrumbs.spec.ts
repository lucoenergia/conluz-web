// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { APP_PATH, extractRoutes } from "./appRoutes";

/**
 * UI-LAY-003: every authenticated page except the landing pages shows a
 * breadcrumb above its title, starting at "Inicio" (#432). Three energy pages
 * shipped without one because nothing required it.
 *
 * Static on purpose, as routeAccess.spec.ts is: no harness renders every route,
 * and rendering each page would mean mocking every page's reads. For each route
 * under AuthenticatedLayout, src/App.tsx names the page it lazy-loads; that
 * page's module must render a BreadCrumb whose first step is "Inicio" at "/".
 * A new route whose page has none fails here until it gets one, or an
 * exemption below with its reason.
 */

const EXEMPT: Record<string, string> = {
  "/": "Not a page: LandingRoute redirects to the caller's landing.",
  "/home": "Not a page: HomeIndexRedirect picks the member or the management view.",
  "/home/member": "Inicio itself, the member's landing.",
  "/home/management": "Inicio itself, the community admin's landing.",
  "/platform": "The landing of a platform admin with no membership, where '/' sends them: their Inicio.",
  "/no-community": "The landing of a caller with no membership and no platform role, where '/' sends them: their Inicio.",
};

const FIRST_STEP = `{ label: "Inicio", href: "/" }`;

const appSource = readFileSync(APP_PATH, "utf8");
const routes = extractRoutes(appSource);

/** `const TodayPage = lazyPage(() => import("./pages/today/TodayPage"), "TodayPage");` → TodayPage → src/pages/today/TodayPage.tsx */
const lazyPages = new Map(
  [...appSource.matchAll(/const (\w+) = lazyPage\(\(\) => import\("\.\/([^"]+)"\)/g)].map(([, name, path]) => [name, `src/${path}.tsx`]),
);

/** The lazy-loaded page modules a route's element renders. */
function pagesOf(element: string): string[] {
  return [...lazyPages.entries()].filter(([name]) => new RegExp(`<${name}\\b`).test(element)).map(([, file]) => file);
}

describe("UI-LAY-003 every authenticated page shows a breadcrumb", () => {
  const pages = routes.filter((route) => !(route.path in EXEMPT));

  it("UI-LAY-003 finds the routes and their pages", () => {
    expect(routes.length).toBeGreaterThan(10);
    expect(lazyPages.size).toBeGreaterThan(10);
  });

  it.each(pages.map((route) => [route.path, route.element] as const))(
    "UI-LAY-003 %s renders a page whose breadcrumb starts at Inicio",
    (_path, element) => {
      const files = pagesOf(element);
      expect(files, "the route should render exactly one lazy-loaded page").toHaveLength(1);
      expect(existsSync(files[0])).toBe(true);
      const source = readFileSync(files[0], "utf8");
      expect(source, `${files[0]} renders no BreadCrumb`).toMatch(/<BreadCrumb\b/);
      expect(source, `${files[0]}'s breadcrumb does not start at Inicio`).toContain(FIRST_STEP);
    },
  );

  it("UI-LAY-003 keeps no exemption for a route that is gone, and gives each a reason", () => {
    const paths = new Set(routes.map((route) => route.path));
    expect(Object.keys(EXEMPT).filter((path) => !paths.has(path))).toEqual([]);
    expect(Object.entries(EXEMPT).filter(([, reason]) => reason.trim().length < 20)).toEqual([]);
  });
});
