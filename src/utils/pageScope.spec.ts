import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolvePageScope } from "./routes";

/**
 * Every path an authenticated user can reach, read from the route table in
 * src/App.tsx rather than restated here, so a route added there without a
 * scope fails this spec instead of rendering no scope surface in silence.
 *
 * Routes under LoginLayout, with or without props, are skipped: that layout
 * renders no scope surface.
 */
function authenticatedPaths(): string[] {
  const source = readFileSync("src/App.tsx", "utf8");
  const paths: string[] = [];
  const stack: Array<{ path: string; skipped: boolean }> = [{ path: "", skipped: false }];

  let cursor = 0;
  while (cursor < source.length) {
    const open = source.indexOf("<Route", cursor);
    const close = source.indexOf("</Route>", cursor);
    if (open === -1 && close === -1) break;

    if (close !== -1 && (open === -1 || close < open)) {
      stack.pop();
      cursor = close + "</Route>".length;
      continue;
    }

    // Scan to the end of the opening tag, skipping JSX expressions in braces,
    // which may themselves contain "/>" (element={<Page />}).
    let depth = 0;
    let end = open;
    while (end < source.length) {
      const char = source[end];
      if (char === "{") depth++;
      else if (char === "}") depth--;
      else if (char === ">" && depth === 0) break;
      end++;
    }
    const tag = source.slice(open, end + 1);
    const selfClosing = source[end - 1] === "/";
    cursor = end + 1;

    // Guard names start with "<Route" too (<RouteFallback>); only <Route> counts.
    if (!/^<Route[\s>]/.test(tag)) continue;

    const parent = stack[stack.length - 1];
    const segment = tag.match(/\spath="([^"]+)"/)?.[1];
    const isIndex = /\sindex[\s/>]/.test(tag);
    const path = segment
      ? `${parent.path}/${segment.replace(/:\w+/g, "sample-id")}`
      : parent.path;
    const skipped = parent.skipped || /element=\{<LoginLayout\b[^}]*\/>\}/.test(tag);

    if (!skipped && (segment || isIndex)) paths.push(path === "" ? "/" : path);
    if (!selfClosing) stack.push({ path, skipped });
  }

  return paths;
}

describe("resolvePageScope", () => {
  test("reads the route table (guards the parser itself)", () => {
    const paths = authenticatedPaths();
    expect(paths).toContain("/");
    expect(paths).toContain("/production/sample-id/sharing-agreements/sample-id");
    expect(paths).toContain("/users/sample-id/edit");
    expect(paths).toContain("/contact");
    expect(paths).not.toContain("/login");
  });

  test("classifies every authenticated route in App.tsx", () => {
    const unclassified = authenticatedPaths().filter((path) => resolvePageScope(path) === "unknown");
    expect(unclassified).toEqual([]);
  });

  test.each([
    ["/", "community"],
    ["/home", "community"],
    ["/home/member", "community"],
    ["/home/management", "community"],
    ["/production", "community"],
    ["/production/new", "community"],
    ["/production/p-1/sharing-agreements/a-1", "community"],
    ["/supply-points", "community"],
    ["/supply-points/s-1/edit", "community"],
    ["/members", "community"],
    ["/integrations", "community"],
    ["/platform", "platform"],
    ["/communities", "platform"],
    ["/communities/c-1/edit", "platform"],
    ["/users", "platform"],
    ["/users/new", "platform"],
    ["/profile", "personal"],
    ["/change-password", "personal"],
    ["/contact", "personal"],
    ["/no-community", "none"],
  ] as const)("%s is %s", (path, scope) => {
    expect(resolvePageScope(path)).toBe(scope);
  });

  test("an unlisted route is unknown, never defaulted to a stated scope", () => {
    expect(resolvePageScope("/something-new")).toBe("unknown");
    // A prefix only matches whole segments.
    expect(resolvePageScope("/usersettings")).toBe("unknown");
  });
});
