// axe-core on the main pages, dark and light: no serious or critical issues.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PAGES } from "./pages";
for (const scheme of ["dark", "light"] as const)
  for (const path of PAGES.slice(0, 10))
    test(`axe ${scheme}: ${path}`, async ({ page, browserName }) => {
      test.skip(browserName !== "chromium", "one engine is enough for axe");
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      await page.waitForTimeout(300);
      const r = await new AxeBuilder({ page }).exclude(".stage-desk").analyze();
      const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
