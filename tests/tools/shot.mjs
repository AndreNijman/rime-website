// Screenshot pages of a running preview: node tests/tools/shot.mjs <out-dir> <path>[@WxH][#dark|#light] ...
import { chromium } from "@playwright/test";
const [out, ...targets] = process.argv.slice(2);
const base = process.env.BASE ?? "http://localhost:4321";
const browser = await chromium.launch();
for (const t of targets) {
  const m = t.match(/^([^@#]+)(?:@(\d+)x(\d+))?(?:#(dark|light))?(?:!(full))?$/);
  const [, path, w = "1440", h = "900", scheme = "dark", full] = m;
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, colorScheme: scheme, deviceScaleFactor: 1, reducedMotion: process.env.REDUCED ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(+(process.env.WAIT ?? 900));
  const name = `${out}/${path.replace(/[\/?=&]/g, "_") || "home"}-${w}x${h}-${scheme}.png`;
  await page.screenshot({ path: name, fullPage: !!full });
  console.log(name, errors.length ? "ERRORS: " + errors.join(" | ") : "");
  await ctx.close();
}
await browser.close();
