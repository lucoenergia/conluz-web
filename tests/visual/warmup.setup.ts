import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { test } from "@playwright/test";

/**
 * Warms the Vite dev server's module graph before any visual test navigates.
 *
 * Every page in src/App.tsx is React.lazy, so in dev its module subtree is
 * transformed on the FIRST request that reaches that route — hundreds of files
 * for a screen like /production. While the server is doing that work no request
 * is in flight, which makes `waitForLoadState("networkidle")` fire against a
 * page whose #root is still empty behind the Suspense fallback. The navigation
 * helpers then hunt for elements that do not exist yet, and with two projects
 * hitting a cold server in parallel that wait could outlast the 30s test
 * timeout. `retries: 0` turned every such cold start into a red run.
 *
 * `webServer.url` only proves the port answers; it says nothing about the graph
 * being transformed. This closes that gap: the projects below depend on it, so
 * by the time they run every page module is transformed and cached.
 *
 * Importing the modules directly, rather than driving the UI to each route,
 * keeps the warm-up free of auth, route guards and API mocking — a dynamic
 * import pulls the same transitive graph the lazy route would, and nothing
 * here can start failing because a guard's redirect rules changed.
 */

/**
 * The page specifiers App.tsx lazy-loads, as dev-server URLs.
 *
 * Read out of App.tsx rather than hardcoded: a stale list would silently stop
 * covering new pages, and the symptom of that is the flake this file exists to
 * remove coming back on whichever screen was added last.
 */
function lazyPageModuleUrls(): string[] {
  const appPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../src/App.tsx");
  const source = readFileSync(appPath, "utf8");
  const specifiers = [...source.matchAll(/import\("\.\/([^"]+)"\)/g)].map((match) => match[1]);
  if (specifiers.length === 0) {
    throw new Error(`No lazy page imports found in ${appPath} — the warm-up would be a no-op.`);
  }
  return [...new Set(specifiers)].map((specifier) => `/src/${specifier}`);
}

test("warm the dev server's lazy page modules", async ({ page, baseURL }) => {
  // Transforming the whole app from cold is minutes of work on a loaded
  // machine, and it is paid once for the entire suite.
  test.setTimeout(300_000);

  const moduleUrls = lazyPageModuleUrls();

  // Any app URL will do — this only needs a document on the dev server's
  // origin to issue the imports from. /login is unguarded.
  await page.goto(`${baseURL}/login`);

  // Sequential on purpose: the point is to finish the work, not to race the
  // dev server with 27 parallel transform requests, which is the contention
  // this warm-up exists to avoid in the first place.
  for (const moduleUrl of moduleUrls) {
    await page.evaluate(async (url) => {
      await import(/* @vite-ignore */ url);
    }, moduleUrl);
  }
});
