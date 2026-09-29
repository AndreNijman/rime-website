// WebKit as an iPhone: overflow on every page, and the frame's touch behaviour.
//   node tests/tools/iphone-check.mjs <out-dir> [base]   (run in the Playwright container)
import { webkit, devices } from "@playwright/test";
const out = process.argv[2];
const base = process.argv[3] ?? "http://127.0.0.1:8788";
const PAGES = ["/", "/shell", "/system", "/personalise", "/security", "/download", "/updates", "/updates/2026.09.28.4",
  "/docs", "/docs/install", "/docs/updating", "/docs/shortcuts", "/journal/springs-on-the-wall-clock", "/source", "/privacy", "/sitemap"];
const b = await webkit.launch();
const ctx = await b.newContext({ ...devices["iPhone 13"], colorScheme: "dark" });
for (const path of PAGES) {
  const p = await ctx.newPage();
  await p.goto(base + path, { waitUntil: "networkidle" });
  const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth, stacked: document.querySelectorAll(".t-stack").length }));
  console.log(path, r.sw > r.vw ? `OVERFLOW ${r.sw}>${r.vw}` : "ok", r.stacked ? `stacked tables: ${r.stacked}` : "");
  await p.close();
}
const p = await ctx.newPage();
await p.goto(base + "/", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
await p.tap("[data-bloom-trigger]"); await p.waitForTimeout(900);
console.log("menu focus:", await p.evaluate(() => document.activeElement?.id || document.activeElement?.tagName));
await p.screenshot({ path: `${out}/wk-menu.png` });
await p.tap(".lens-close"); await p.waitForTimeout(900);
console.log("after close, bloom hidden:", await p.evaluate(() => document.querySelector("[data-bloom]").hidden));
await p.tap("[data-search-trigger]"); await p.waitForTimeout(700);
console.log("search focus:", await p.evaluate(() => document.activeElement?.id || document.activeElement?.tagName));
await p.tap(".lens-close"); await p.waitForTimeout(900);
await p.tap(".frame-get"); await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/wk-pour.png` });
await p.goto(base + "/docs/install", { waitUntil: "networkidle" });
await p.tap(".docs-toc-m summary"); await p.waitForTimeout(400);
await p.screenshot({ path: `${out}/wk-docs.png` });
await b.close();
