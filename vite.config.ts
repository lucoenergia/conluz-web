import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // Fails any test that makes a real network request (#211).
    setupFiles: ["src/test/networkGuard.setup.ts"],
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          // Scope to src/ only so Playwright specs in tests/visual/ are not picked up by vitest
          include: ["src/**/*.spec.{ts,tsx}"],
          exclude: ["src/**/*.tz.spec.{ts,tsx}"],
        },
      },
      {
        // Specs proving that dates and chart labels follow APP_TIME_ZONE, not the
        // device's (#255), run as a device in another zone. TZ is process-wide,
        // so it is never set from test code: Vitest applies this project's env
        // in the worker before any setup file or spec is imported, and forks
        // with isolation give each spec file a process of its own, so no other
        // file can see it. Pinned rather than left to the defaults, which is
        // what the guarantee rests on. Each spec asserts the zone it runs in.
        extends: true,
        test: {
          name: "app-time-zone",
          include: ["src/**/*.tz.spec.{ts,tsx}"],
          env: { TZ: "America/New_York" },
          pool: "forks",
          isolate: true,
        },
      },
    ],
  },
  envPrefix: "CONLUZ_",
  server: {
    port: 3001,
  },
  build: {
    // No manualChunks. Rollup's automatic chunking beat every hand-rolled rule
    // tried here, because it distributes shared library code into the route
    // chunks that actually use it instead of hoisting whole packages into an
    // eager vendor chunk. Measured on the initial critical path:
    //
    //   one chunk per npm package (previous)  1444.7 kB raw / 426.3 kB gzip
    //   grouped vendor chunks by hand          873.5 kB raw / 271.6 kB gzip
    //   automatic (this)                       532.4 kB raw / 170.0 kB gzip
    //
    // A hand-rolled rule also captured a shared CommonJS interop helper into
    // the chart chunk, which made every other chunk import it and dragged
    // 583 kB of charting back onto the critical path. Leave this alone unless
    // a measurement says otherwise.
    chunkSizeWarningLimit: 700,
  },
} as UserConfig);
