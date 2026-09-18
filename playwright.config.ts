import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  snapshotDir: "./tests/visual/__screenshots__",
  // {projectName} separates mobile and desktop baselines; {arg} is the screenshot name passed to toHaveScreenshot()
  snapshotPathTemplate: "{snapshotDir}/{projectName}/{arg}{ext}",
  fullyParallel: false,
  retries: 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:3001",
    reducedMotion: "reduce",
    trace: "on-first-retry",
  },
  expect: {
    toHaveScreenshot: {
      // Small ratio absorbs sub-pixel font rendering differences while still catching real color changes
      maxDiffPixelRatio: 0.02,
    },
  },
  projects: [
    // Transforms every React.lazy page module before the two viewport projects
    // start, so neither of them pays a cold Vite transform mid-navigation.
    // See tests/visual/warmup.setup.ts.
    {
      name: "warmup",
      testMatch: /warmup\.setup\.ts/,
    },
    {
      name: "mobile",
      testIgnore: /warmup\.setup\.ts/,
      dependencies: ["warmup"],
      use: {
        // iPhone 13 dimensions and touch using Chromium (not WebKit) for environment-agnostic rendering.
        // WebKit's text rendering is tightly coupled to the host OS font stack, causing 2–13 px height
        // differences between local Ubuntu and GitHub Actions Ubuntu. Chromium bundles its own renderer
        // (installed via --with-deps) and produces identical screenshots across environments.
        // The responsive sx breakpoints react to viewport width, not browser engine, so the mobile
        // layouts (xs values) render correctly.
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        reducedMotion: "reduce",
      },
    },
    {
      name: "desktop",
      testIgnore: /warmup\.setup\.ts/,
      dependencies: ["warmup"],
      use: {
        viewport: { width: 1440, height: 900 },
        reducedMotion: "reduce",
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3001",
    // In CI always start a fresh server; locally reuse if already running.
    // This only waits for the port to answer — it says nothing about Vite
    // having transformed the app's module graph, which is what the "warmup"
    // project above exists to guarantee.
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
