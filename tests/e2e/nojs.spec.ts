// With JavaScript off the site is still complete: real links, a real download,
// full release notes, and a stage that shows its finished state (spec §10.4).
import { test, expect } from "@playwright/test";
test.use({ javaScriptEnabled: false });
test("home works without JavaScript", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("A Linux desktop");
  await expect(page.locator(".frame-trigger")).toHaveAttribute("href", "/sitemap");
  await expect(page.locator(".frame-download")).toHaveAttribute("href", "/download");
  // the stage's no-JS still: the recorded Dashboard, open
  await expect(page.locator("#hero-stage .stage-nojs:visible")).toHaveCount(1);   // the page's scheme picks dark or light
  await expect(page.locator("#hero-stage .stage-base:visible")).toHaveCount(0);
  await expect(page.locator(".reveal").first()).toBeVisible();
});
test("download links straight to the published ISO", async ({ page }) => {
  await page.goto("/download");
  const href = await page.locator("[data-download-start]").first().getAttribute("href");
  expect(href).toMatch(/^https:\/\/github\.com\/AndreNijman\/rime-os\/releases\/download\/v\d+\.\d+\.\d+\/.+\.iso$/);
});
test("release notes are complete", async ({ page }) => {
  await page.goto("/updates/2026.09.28.4");
  await expect(page.locator("#known-issues li").first()).toBeVisible();
  await expect(page.locator("#provenance")).toContainText("2d9c5438acf8bd5ea83e9c7d05332415b05be295");
});
test("the site map lists every section", async ({ page }) => {
  await page.goto("/sitemap");
  for (const t of ["Shell", "System", "Personalise", "Updates", "Docs", "Download"]) await expect(page.getByRole("link", { name: t, exact: true }).first()).toBeVisible();
});
