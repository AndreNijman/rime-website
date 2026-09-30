// The site is dark until the visitor chooses otherwise: a light system, no
// stored choice and no JavaScript all give the dark site. Light and Auto are
// choices the footer stores; Auto follows the system, and keeps following it.
import { test, expect, type Page } from "@playwright/test";

const DARK = "#121315";   // rime-default's dark surfaceBase
const LIGHT = "#faf9fb";  // and its light one
const base = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--rime-surface-base").trim());
const themeColor = (page: Page) => page.locator('meta[name="theme-color"]').getAttribute("content");
const choose = (page: Page, v: "auto" | "dark" | "light") =>
  page.locator(`[data-prefs] [data-name="scheme"] input[value="${v}"]`).check({ force: true });

test("a light system with nothing stored gets the dark site", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  expect(await base(page)).toBe(DARK);
  expect(await themeColor(page)).toBe(DARK);
  await expect(page.locator('[data-prefs] [data-name="scheme"] input[value="dark"]')).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem("rime.scheme"))).toBeNull();
});

test("Light is kept from page to page", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await choose(page, "light");
  expect(await base(page)).toBe(LIGHT);
  expect(await themeColor(page)).toBe(LIGHT);
  await page.goto("/download");
  expect(await base(page)).toBe(LIGHT);
  await expect(page.locator('[data-prefs] [data-name="scheme"] input[value="light"]')).toBeChecked();
});

test("Auto follows the system, and keeps following it", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await choose(page, "auto");
  expect(await base(page)).toBe(LIGHT);
  expect(await page.evaluate(() => localStorage.getItem("rime.scheme"))).toBe("auto");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => base(page)).toBe(DARK);
  await expect.poll(() => themeColor(page)).toBe(DARK);
  await page.reload();
  expect(await base(page)).toBe(DARK);
  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => base(page)).toBe(LIGHT);
});

test("Dark after Light goes back to dark", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("rime.scheme", "light"); sessionStorage.setItem("seeded", "1"); } });
  await page.goto("/");
  expect(await base(page)).toBe(LIGHT);
  await choose(page, "dark");
  expect(await base(page)).toBe(DARK);
  await page.reload();
  expect(await base(page)).toBe(DARK);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false, colorScheme: "light" });
  test("a light system still gets the dark site and the dark recording", async ({ page }) => {
    await page.goto("/");
    expect(await base(page)).toBe(DARK);
    await expect(page.locator("#hero-stage .stage-nojs--dark")).toBeVisible();
    await expect(page.locator("#hero-stage .stage-nojs--light")).toBeHidden();
  });
});
