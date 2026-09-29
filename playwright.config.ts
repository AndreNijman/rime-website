import { defineConfig, devices } from "@playwright/test";
// Serves the built site (npm run build first) and runs the suites in all three
// engines; the visual baselines run in Chromium only.
// BASE_URL=http://127.0.0.1:8788 runs against `wrangler pages dev dist` (real
// _headers and _redirects) instead of the Astro preview server.
const BASE = process.env.BASE_URL ?? "http://localhost:4321";
export default defineConfig({
  testDir: "tests/e2e",
  snapshotPathTemplate: "tests/visual/{arg}{ext}",
  fullyParallel: true,
  reporter: [["list"]],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" } },
  use: { baseURL: BASE, contextOptions: { reducedMotion: "reduce" } },
  webServer: process.env.BASE_URL ? undefined : { command: "npx astro preview --port 4321", url: BASE, reuseExistingServer: true, timeout: 60_000 },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, testIgnore: /visual/ },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, testIgnore: /visual/ },
  ],
});
