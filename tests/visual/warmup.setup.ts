import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { test, type Page } from "@playwright/test";
import { waitForRouteMounted } from "./fixtures/session";

const VISUAL_DIR = dirname(fileURLToPath(import.meta.url));

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

// Transforming the whole app from cold is minutes of work on a loaded machine,
// and it is paid once for the entire suite.
const WARMUP_TIMEOUT_MS = 300_000;

/**
 * How a module import fails when the document that issued it went away or the
 * dev server could not serve the module at that moment -- a reload while Vite
 * re-optimises dependencies, or a request dropped on a saturated machine.
 * Both are about the moment, not the module, so one retry in a fresh document
 * tells them apart from a module that is genuinely broken.
 */
const TRANSIENT_IMPORT_FAILURE =
  /Execution context was destroyed|Failed to fetch dynamically imported module|Importing a module script failed/;

/**
 * Loads /login and waits until the app has booted, i.e. the entry's graph is
 * served. On a cold server that is the first transform of the whole entry, so
 * it gets the warm-up's own budget, not the per-route one the tests use.
 */
async function openApp(page: Page, baseURL: string | undefined) {
  await page.goto(`${baseURL}/login`);
  await waitForRouteMounted(page, WARMUP_TIMEOUT_MS);
}

async function importModule(page: Page, moduleUrl: string) {
  await page.evaluate(async (url) => {
    await import(/* @vite-ignore */ url);
  }, moduleUrl);
}

test("warm the dev server's lazy page modules", async ({ page, baseURL }) => {
  test.setTimeout(WARMUP_TIMEOUT_MS);

  const moduleUrls = lazyPageModuleUrls();

  // Any app URL will do — this only needs a document on the dev server's
  // origin to issue the imports from. /login is unguarded. Waiting for it to
  // mount means the entry's own dependencies are served before the first
  // import asks for more.
  await openApp(page, baseURL);

  // Sequential on purpose: the point is to finish the work, not to race the
  // dev server with one transform request per page, which is the contention
  // this warm-up exists to avoid in the first place.
  for (const moduleUrl of moduleUrls) {
    try {
      await importModule(page, moduleUrl);
    } catch (error) {
      if (!TRANSIENT_IMPORT_FAILURE.test(String(error))) throw error;
      // A fresh document: the browser may remember a failed import for the
      // life of the one that saw it. A second failure is not transient.
      await page.reload({ waitUntil: "load" });
      await waitForRouteMounted(page, WARMUP_TIMEOUT_MS);
      await importModule(page, moduleUrl);
    }
  }
});

/**
 * Every toHaveScreenshot() name must be unique across the whole visual suite.
 *
 * playwright.config.ts builds the baseline path as {projectName}/{arg}: the
 * name passed to toHaveScreenshot(), without the spec file. Two specs passing
 * the same name would therefore read and write one PNG, and each would
 * silently overwrite the other's baseline on the next update. Nothing in
 * Playwright flags that, so it is checked here, before either viewport project
 * runs. The check reads the source, so an unnamed or computed name is refused
 * too: it could collide without this check ever seeing it.
 */
test("screenshot names are unique across the visual specs", () => {
  const specFiles = readdirSync(VISUAL_DIR, { recursive: true, encoding: "utf8" })
    .filter((file) => /\.spec\.ts$/.test(file))
    .sort();

  const filesByName = new Map<string, string[]>();
  const unnamedCalls: string[] = [];
  for (const file of specFiles) {
    // Comments are dropped first: prose that mentions toHaveScreenshot() is not a call.
    const source = readFileSync(resolve(VISUAL_DIR, file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    for (const call of source.matchAll(/\.toHaveScreenshot\(\s*([^,)\s]*)/g)) {
      const literal = /^(["'`])([^"'`$]+)\1$/.exec(call[1]);
      if (!literal) {
        unnamedCalls.push(`${file}: toHaveScreenshot(${call[1]}…)`);
        continue;
      }
      filesByName.set(literal[2], [...(filesByName.get(literal[2]) ?? []), file]);
    }
  }

  const problems = [
    ...[...filesByName]
      .filter(([, files]) => files.length > 1)
      .map(([name, files]) => `"${name}" is declared ${files.length} times, in: ${files.join(", ")}`),
    ...unnamedCalls.map((call) => `${call} — pass a string literal name`),
  ];
  if (filesByName.size === 0) {
    problems.push(`No toHaveScreenshot() calls found under ${VISUAL_DIR} — the check would be a no-op.`);
  }
  if (problems.length > 0) {
    throw new Error(`Screenshot names must be unique string literals across the visual specs:\n  ${problems.join("\n  ")}`);
  }
});
