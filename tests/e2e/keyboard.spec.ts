// The frame from the keyboard: "/" opens the lens, Esc clears then closes,
// focus returns to where it was, and Tab stays inside the open surface.
import { test, expect } from "@playwright/test";
test("search opens with / and closes with Esc", async ({ page }) => {
  await page.goto("/shell");
  await page.keyboard.press("/");
  const input = page.locator("[data-lens-input]");
  await expect(input).toBeFocused();
  await input.fill("rollback");
  await expect(page.locator(".lens-row").first()).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(input).toHaveValue("");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-bloom]")).toBeHidden();
});
test("the site map traps Tab and gives focus back", async ({ page }) => {
  await page.goto("/system");
  const trigger = page.locator("[data-bloom-trigger]");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-bloom]")).toBeVisible();
  for (let i = 0; i < 40; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest("[data-bloom]"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});
test("the download panel pours from the right notch", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.locator(".frame-download").click();
  const pour = page.locator("[data-pour]");
  await expect(pour).toBeVisible();
  await expect(pour.getByRole("link", { name: /Download ISO/ })).toBeVisible();
  await page.mouse.click(200, 600);
  await expect(pour).toBeHidden();
});
test("focus rings appear for the keyboard, not after a click", async ({ page }) => {
  await page.goto("/download");
  const copy = page.locator(".cmd-copy").first();
  await copy.click();
  expect(await copy.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("none");
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)).toBe("solid");
});
