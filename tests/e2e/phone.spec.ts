// Phones (spec §4.4, §11.2): no page scrolls sideways at 390 or 320 px, and
// every control a thumb can hit is at least 44 × 44 px. Inline links in
// running text are exempt (WCAG 2.5.8), as are the visually hidden radios
// whose label is the target. Chromium and WebKit; Firefox has no mobile mode.
import { test, expect } from "@playwright/test";
import { PAGES } from "./pages";

const EXTRA = ["/docs/updating", "/docs/shortcuts", "/journal/springs-on-the-wall-clock"];
for (const [w, h] of [[390, 844], [320, 640]] as const)
  test.describe(`phone ${w}`, () => {
    test.skip(({ browserName }) => browserName === "firefox", "no isMobile in Firefox");
    test.use({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
    for (const path of [...PAGES, ...EXTRA])
      test(`fits and has 44 px targets: ${path}`, async ({ page }) => {
        await page.goto(path);
        await page.waitForTimeout(300);
        const r = await page.evaluate(() => {
          const small: string[] = [];
          for (const el of document.querySelectorAll<HTMLElement>("a[href], button, input, select, summary")) {
            if (el.closest(".fluid-layer, [hidden], .stage-desk")) continue;
            if (el.matches(".segmented-opt input, .f-chip input, .rail-item input")) continue;
            const cs = getComputedStyle(el), rc = el.getBoundingClientRect();
            if (cs.display === "none" || cs.visibility === "hidden" || !rc.width || !rc.height) continue;
            if (el.tagName === "A" && cs.display === "inline" && el.closest("p, li, td, dd, figcaption")) continue;
            if (rc.width < 43.5 || rc.height < 43.5) small.push(`${el.tagName} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${Math.round(rc.width)}×${Math.round(rc.height)}`);
          }
          return { sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth, small };
        });
        expect(r.sw, "scrolls sideways").toBeLessThanOrEqual(r.vw);
        expect(r.small, r.small.join("\n")).toEqual([]);
      });
  });

test.describe("phone surfaces", () => {
  test.skip(({ browserName }) => browserName === "firefox", "no isMobile in Firefox");
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("the site map opens as a dialog, not a keyboard, and closes from its own button", async ({ page }) => {
    await page.goto("/");
    await page.tap("[data-bloom-trigger]");
    await expect(page.locator("#site-bloom")).toBeVisible();
    await expect(page.locator("#site-bloom")).toBeFocused();
    await page.tap(".lens-close");
    await expect(page.locator("#site-bloom")).toBeHidden();
    await page.tap("[data-search-trigger]");
    await expect(page.locator("#lens-input")).toBeFocused();
  });
  test("the download sheet rises from the bottom and its targets are 44 px", async ({ page }) => {
    await page.goto("/");
    await page.tap(".frame-get");
    const sheet = page.locator("#download-pour .pour-content");
    await expect(sheet).toBeVisible();
    await page.waitForTimeout(900);
    const box = (await page.locator("#download-pour [data-reveal]").boundingBox())!;
    expect(box.y + box.height).toBeGreaterThan(840);
    for (const b of await page.locator("#download-pour a.btn, #download-pour .sha-chip").all())
      expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});
