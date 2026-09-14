import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // Scope to src/ only so Playwright specs in tests/visual/ are not picked up by vitest
    include: ["src/**/*.spec.{ts,tsx}"],
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
