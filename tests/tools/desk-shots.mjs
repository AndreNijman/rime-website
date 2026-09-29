// Full-page desktop screenshots of every page, for before/after pixel diffs.
//   node tests/tools/desk-shots.mjs <out-dir> [base]
import { chromium } from "@playwright/test";
const out = process.argv[2];
const base = process.argv[3] ?? "http://127.0.0.1:8788";
const PAGES = ["/", "/shell", "/system", "/personalise", "/security", "/download", "/updates", "/updates/2026.09.28.4",
  "/updates/apex-v2.1.0", "/docs", "/docs/install", "/docs/updating", "/docs/shortcuts", "/journal", "/journal/springs-on-the-wall-clock",
  "/source", "/privacy", "/brand", "/sitemap", "/nope"];
const b = await chromium.launch();
for (const [w, h] of [[1440, 900], [2560, 1080], [1024, 768]]) {
  for (const scheme of ["dark", "light"]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: "reduce" });
    for (const path of PAGES) {
      const p = await ctx.newPage();
      await p.goto(base + path, { waitUntil: "networkidle" });
      await p.waitForTimeout(2700);   // reveal failsafe
      await p.screenshot({ path: `${out}/${w}-${scheme}${path.replace(/[\/.?=]/g, "_")}.png`, fullPage: true, mask: [p.locator(".lab-hz")] });
      await p.close();
    }
    await ctx.close();
  }
}
await b.close();
