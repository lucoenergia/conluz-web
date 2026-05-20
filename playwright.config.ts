import { defineConfig, devices } from "@playwright/test";

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
    {
      name: "mobile",
      use: {
        // Full iPhone 13 descriptor: realistic DPR (3x), touch, Safari user-agent
        ...devices["iPhone 13"],
        reducedMotion: "reduce",
      },
    },
    {
      name: "desktop",
      use: {
        viewport: { width: 1440, height: 900 },
        reducedMotion: "reduce",
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3001",
    // In CI always start a fresh server; locally reuse if already running
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
