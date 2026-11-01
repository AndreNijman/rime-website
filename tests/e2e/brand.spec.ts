// The layered ridge as a visitor's browser draws it: the header is page 2's
// lockup (symbol + "rime"), planes 1, 2, 4 and the word in the text ink, plane 3
// in Rime Blue whatever the scene or scheme; the icons it advertises resolve.
import { test, expect } from "@playwright/test";
import { useScheme } from "./pages";

const RIME_BLUE = "rgb(145, 194, 220)";
for (const scheme of ["dark", "light"] as const)
  for (const palette of ["rime-default", "ember"])
    test(`header lockup, ${scheme}, ${palette}`, async ({ page }) => {
      await useScheme(page, scheme);
      await page.addInitScript((p) => localStorage.setItem("rime.palette", p), palette);
      await page.goto("/docs/install");
      const mark = page.locator(".zone-left .frame-home svg.rime-mark");
      await expect(mark).toBeVisible();
      const got = await mark.evaluate((svg) => ({
        ink: getComputedStyle(svg).color,
        planes: [...svg.querySelectorAll("polygon")].map((p) => getComputedStyle(p).fill),
        word: [...svg.querySelectorAll("path")].map((p) => getComputedStyle(p).fill),
        ids: svg.querySelectorAll("[id]").length,
      }));
      expect(got.planes).toHaveLength(4);
      expect(got.planes[2]).toBe(RIME_BLUE);
      for (const i of [0, 1, 3]) expect(got.planes[i]).toBe(got.ink);
      expect(got.word).toHaveLength(4);
      for (const f of got.word) expect(f).toBe(got.ink);
      expect(got.ink).not.toBe(RIME_BLUE);
      expect(got.ids).toBe(0);
    });

test("the brand page's role tile takes the scene accent on plane 3 only", async ({ page }) => {
  await page.goto("/brand");
  const svg = page.locator(".mark-role svg.rime-mark");
  const got = await svg.evaluate((el) => ({
    accent: getComputedStyle(document.documentElement).getPropertyValue("--rime-accent").trim(),
    planes: [...el.querySelectorAll("polygon")].map((p) => getComputedStyle(p).fill),
    ink: getComputedStyle(el).color,
  }));
  const probe = await page.evaluate((c) => { const d = document.createElement("div"); d.style.color = c; document.body.append(d); const v = getComputedStyle(d).color; d.remove(); return v; }, got.accent);
  expect(got.planes[2]).toBe(probe);
  for (const i of [0, 1, 3]) expect(got.planes[i]).toBe(got.ink);
});

test("every icon the head advertises is served", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').evaluateAll((ls) => ls.map((l) => l.getAttribute("href")!));
  expect(hrefs).toEqual(expect.arrayContaining(["/favicon.svg", "/favicon-32.png", "/apple-touch-icon.png"]));
  for (const h of [...hrefs, "/favicon.ico"]) expect((await request.get(h)).status(), h).toBe(200);
  expect(await (await request.get("/favicon.svg")).text()).toContain('id="plane-3"');
});
