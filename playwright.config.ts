import { defineConfig, devices } from "@playwright/test";
// Serves the built site (npm run build first) and runs the suites in all three
// engines; the visual baselines run in Chromium only.
export default defineConfig({
  testDir: "tests/e2e",
  snapshotPathTemplate: "tests/visual/{arg}{ext}",
  fullyParallel: true,
  reporter: [["list"]],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" } },
  use: { baseURL: "http://localhost:4321", contextOptions: { reducedMotion: "reduce" } },
  webServer: { command: "npx astro preview --port 4321", url: "http://localhost:4321", reuseExistingServer: true, timeout: 60_000 },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, testIgnore: /visual/ },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, testIgnore: /visual/ },
  ],
});
