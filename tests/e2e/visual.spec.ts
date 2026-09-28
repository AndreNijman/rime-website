// Visual baselines (spec §19.1): key pages × viewports × schemes, under
// reduced motion so a frame is deterministic. Update with --update-snapshots.
import { test, expect } from "@playwright/test";
const VIEWS = [{ name: "phone", width: 390, height: 844 }, { name: "laptop", width: 1440, height: 900 }, { name: "ultrawide", width: 2560, height: 1080 }];
for (const v of VIEWS)
  for (const scheme of ["dark", "light"] as const)
    for (const path of ["/", "/download", "/updates/2026.09.28.4"])
      test(`${path} ${v.name} ${scheme}`, async ({ page }) => {
        await page.setViewportSize({ width: v.width, height: v.height });
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.goto(path);
        await page.waitForTimeout(600);
        await expect(page).toHaveScreenshot(`${path.replace(/\W+/g, "_") || "home"}-${v.name}-${scheme}.png`, { mask: [page.locator(".lab-hz")] });
      });
